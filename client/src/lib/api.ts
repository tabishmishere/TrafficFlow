import { clearSession } from "@/lib/session";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  projectId: string;
  name: string;
  description: string | null;
  targetApiUrl: string;
  healthEndpoint: string | null;
  rateLimit: {
    requests: number;
    windowSeconds: number;
  };
  gatewayUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestRecord {
  requestId: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  statusCode: number;
  latencyMs: number;
  ip: string;
  createdAt: string;
}

export interface RequestLog extends RequestRecord {
  projectId: string;
}

export interface HealthCheck {
  status: "HEALTHY" | "UNHEALTHY";
  responseMs: number | null;
  statusCode: number | null;
  checkedAt: string;
}

export interface Dashboard {
  projects: number;
  requestsToday: number;
  successfulRequests: number;
  failedRequests: number;
  successRatePercent: number | null;
  errorRatePercent: number | null;
  averageLatencyMs: number | null;
  topEndpoints: Array<{ path: string; requests: number }>;
  statusCodes: Array<{ statusCode: number; requests: number }>;
  apiHealth: { healthy: number; unhealthy: number; unknown: number };
  asOf: string;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    token?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    cache: "no-store",
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  if (response.status === 401 && options.token) clearSession();
  if (response.status === 204) {
    if (!response.ok) throw new ApiError(`Request failed with status ${response.status}.`, response.status);
    return undefined as T;
  }

  const responseText = await response.text();
  let responseBody: unknown;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = undefined;
    }
  }

  if (!response.ok) {
    const message = typeof responseBody === "object"
      && responseBody !== null
      && "message" in responseBody
      && typeof responseBody.message === "string"
      ? responseBody.message
      : `Request failed with status ${response.status}.`;
    throw new ApiError(message, response.status);
  }

  return responseBody as T;
}
