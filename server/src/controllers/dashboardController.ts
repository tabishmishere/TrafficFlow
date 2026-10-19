import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function getDashboard(req: Request, res: Response) {
  const now = new Date();
  const utcStartOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const requestWhere = {
    createdAt: { gte: utcStartOfDay },
    project: { userId: req.userId },
  };

  const [projects, requestTotals, latency, endpoints, statusCodes] = await Promise.all([
    prisma.project.findMany({
      where: { userId: req.userId },
      select: {
        healthEndpoint: true,
        healthChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
          select: { status: true, checkedAt: true },
        },
      },
    }),
    prisma.requestLog.groupBy({
      by: ["success"],
      where: requestWhere,
      _count: { _all: true },
    }),
    prisma.requestLog.aggregate({
      where: requestWhere,
      _avg: { latencyMs: true },
    }),
    prisma.requestLog.groupBy({
      by: ["path"],
      where: requestWhere,
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    prisma.requestLog.groupBy({
      by: ["statusCode"],
      where: requestWhere,
      _count: { _all: true },
      orderBy: { statusCode: "asc" },
    }),
  ]);

  const successfulRequests = requestTotals.find((item) => item.success)?._count._all ?? 0;
  const failedRequests = requestTotals.find((item) => !item.success)?._count._all ?? 0;
  const requestsToday = successfulRequests + failedRequests;
  const healthStates = projects.map((project) => (
    project.healthEndpoint ? project.healthChecks[0]?.status ?? null : null
  ));

  return res.json({
    projects: projects.length,
    requestsToday,
    successfulRequests,
    failedRequests,
    successRatePercent: requestsToday ? Number(((successfulRequests / requestsToday) * 100).toFixed(1)) : null,
    errorRatePercent: requestsToday ? Number(((failedRequests / requestsToday) * 100).toFixed(1)) : null,
    averageLatencyMs: latency._avg.latencyMs === null ? null : Math.round(latency._avg.latencyMs),
    topEndpoints: endpoints.map((endpoint) => ({ path: endpoint.path, requests: endpoint._count._all })),
    statusCodes: statusCodes.map((item) => ({ statusCode: item.statusCode, requests: item._count._all })),
    apiHealth: {
      healthy: healthStates.filter((status) => status === "HEALTHY").length,
      unhealthy: healthStates.filter((status) => status === "UNHEALTHY").length,
      unknown: healthStates.filter((status) => status === null).length,
    },
    asOf: now.toISOString(),
  });
}