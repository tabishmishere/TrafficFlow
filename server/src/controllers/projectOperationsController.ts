import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

async function findOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { gatewayId: projectId, userId },
    select: { id: true, healthEndpoint: true },
  });
}

export async function getProjectHealth(req: Request<{ projectId: string }>, res: Response) {
  const project = await findOwnedProject(req.params.projectId, req.userId);
  if (!project) return res.status(404).json({ message: "Project not found." });
  if (!project.healthEndpoint) return res.json({ health: null });

  const latest = await prisma.apiHealthCheck.findFirst({
    where: { projectId: project.id },
    orderBy: { checkedAt: "desc" },
    select: { status: true, responseMs: true, statusCode: true, checkedAt: true },
  });
  return res.json({ health: latest });
}

export async function listProjectRequests(req: Request<{ projectId: string }>, res: Response) {
  const project = await findOwnedProject(req.params.projectId, req.userId);
  if (!project) return res.status(404).json({ message: "Project not found." });

  const rawLimit = req.query.limit;
  const limit = rawLimit === undefined ? 50 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ message: "limit must be an integer between 1 and 100." });
  }

  const rawCursor = req.query.cursor;
  if (rawCursor !== undefined && typeof rawCursor !== "string") {
    return res.status(400).json({ message: "cursor must be a request ID." });
  }
  const cursor = typeof rawCursor === "string" ? rawCursor : undefined;

  if (cursor) {
    const cursorLog = await prisma.requestLog.findFirst({
      where: { requestId: cursor, projectId: project.id },
      select: { requestId: true },
    });
    if (!cursorLog) return res.status(400).json({ message: "cursor is not a request in this project." });
  }

  const entries = await prisma.requestLog.findMany({
    where: { projectId: project.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { requestId: cursor }, skip: 1 } : {}),
    take: limit + 1,
    select: {
      requestId: true,
      method: true,
      path: true,
      statusCode: true,
      latencyMs: true,
      ip: true,
      createdAt: true,
    },
  });

  const hasMore = entries.length > limit;
  const requests = hasMore ? entries.slice(0, limit) : entries;
  return res.json({
    requests,
    nextCursor: hasMore ? requests[requests.length - 1].requestId : null,
  });
}
