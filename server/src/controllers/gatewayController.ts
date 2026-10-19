import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { consumeRateLimit } from "../lib/rateLimit";

const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
  "x-trafficflow-key",
]);

function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

async function recordRequest(
  requestId: string,
  projectId: string,
  method: string,
  path: string,
  ip: string,
  statusCode: number,
  latencyMs: number,
) {
  try {
    await prisma.requestLog.create({
      data: {
        requestId,
        projectId,
        method,
        path,
        ip,
        statusCode,
        success: statusCode >= 200 && statusCode < 400,
        latencyMs,
      },
    });
  } catch (error) {
    console.error("Unable to record gateway request", { requestId, projectId, error });
  }
}

function getTimeoutMs(): number {
  const configured = Number(process.env.GATEWAY_TIMEOUT_MS);
  return Number.isInteger(configured) && configured > 0 ? configured : 30_000;
}

export async function forwardGatewayRequest(req: Request, res: Response) {
  const requestId = `req_${randomUUID().replaceAll("-", "")}`;
  const startedAt = performance.now();
  const method = req.method.toUpperCase();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  res.setHeader("X-Request-Id", requestId);

  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const project = await prisma.project.findUnique({
    where: { gatewayId: projectId },
    select: {
      id: true,
      targetApiUrl: true,
      rateLimitRequests: true,
      rateLimitWindowSeconds: true,
    },
  });
  if (!project) return res.status(404).json({ message: "Unknown gateway project." });

  let forwardedPath = "/";
  try {
    const incomingUrl = new URL(req.originalUrl, "http://trafficflow.local");
    forwardedPath = incomingUrl.pathname.slice(req.baseUrl.length) || "/";
  } catch {
    forwardedPath = req.path || "/";
  }

  const logResponse = async (statusCode: number) => {
    await recordRequest(
      requestId,
      project.id,
      method,
      forwardedPath,
      ip,
      statusCode,
      Math.round(performance.now() - startedAt),
    );
  };

  const presentedKey = req.header("x-trafficflow-key");
  if (!presentedKey) {
    await logResponse(401);
    return res.status(401).json({ message: "X-TrafficFlow-Key is required." });
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: { projectId: project.id, keyHash: hashApiKey(presentedKey) },
    select: { id: true },
  });
  if (!apiKey) {
    await logResponse(401);
    return res.status(401).json({ message: "Invalid or revoked API key." });
  }

  if (!allowedMethods.has(method)) {
    res.setHeader("Allow", [...allowedMethods].join(", "));
    await logResponse(405);
    return res.status(405).json({ message: "HTTP method is not supported by this gateway." });
  }

  let rateLimit;
  try {
    rateLimit = await consumeRateLimit(
      project.id,
      ip,
      project.rateLimitRequests,
      project.rateLimitWindowSeconds,
    );
  } catch (error) {
    console.error("Unable to enforce gateway rate limit", {
      requestId,
      projectId: project.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    await logResponse(503);
    return res.status(503).json({ message: "Rate limiting service is unavailable." });
  }

  res.setHeader("RateLimit-Limit", project.rateLimitRequests);
  res.setHeader("RateLimit-Remaining", rateLimit.remaining);
  res.setHeader("RateLimit-Reset", Math.ceil(Date.now() / 1000) + rateLimit.retryAfterSeconds);
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", rateLimit.retryAfterSeconds);
    await logResponse(429);
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  void prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch((error: unknown) => console.error("Unable to update API key usage", error));

  let targetUrl: URL;
  try {
    targetUrl = new URL(project.targetApiUrl);
    const incomingUrl = new URL(req.originalUrl, "http://trafficflow.local");
    const basePath = targetUrl.pathname.replace(/\/+$/, "");
    targetUrl.pathname = `${basePath}${forwardedPath.startsWith("/") ? forwardedPath : `/${forwardedPath}`}` || "/";
    incomingUrl.searchParams.forEach((value, key) => targetUrl.searchParams.append(key, value));
    targetUrl.hash = "";
  } catch {
    await logResponse(502);
    return res.status(502).json({ message: "Project target URL is invalid." });
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined || hopByHopHeaders.has(name.toLowerCase())) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  headers.set("accept-encoding", "identity");
  headers.set("x-request-id", requestId);

  const requestBody = Buffer.isBuffer(req.body) ? req.body : undefined;
  const fetchBody = requestBody
    ? new Uint8Array(requestBody).buffer as ArrayBuffer
    : undefined;
  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body: method === "GET" ? undefined : fetchBody,
      redirect: "manual",
      signal: AbortSignal.timeout(getTimeoutMs()),
    });

    upstream.headers.forEach((value, name) => {
      if (!hopByHopHeaders.has(name.toLowerCase()) && name.toLowerCase() !== "content-encoding") {
        res.setHeader(name, value);
      }
    });
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader("set-cookie", cookies);

    const responseBody = Buffer.from(await upstream.arrayBuffer());
    const latencyMs = Math.round(performance.now() - startedAt);
    await recordRequest(requestId, project.id, method, forwardedPath, ip, upstream.status, latencyMs);
    return res.status(upstream.status).send(responseBody);
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    const cause = error instanceof Error && typeof error.cause === "object" && error.cause !== null
      ? error.cause as { code?: unknown }
      : undefined;
    console.error("Gateway upstream request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: typeof cause?.code === "string" ? cause.code : undefined,
    });
    const statusCode = timedOut ? 504 : 502;
    await recordRequest(requestId, project.id, method, forwardedPath, ip, statusCode, latencyMs);
    return res.status(statusCode).json({
      message: timedOut ? "The target API timed out." : "Unable to reach the target API.",
    });
  }
}