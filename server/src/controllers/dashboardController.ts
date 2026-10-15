import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function getDashboard(req: Request, res: Response) {
  const now = new Date();
  const utcStartOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [projects, requestTotals, latency] = await Promise.all([
    prisma.project.findMany({
      where: { userId: req.userId },
      select: {
        healthChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
          select: { status: true, checkedAt: true },
        },
      },
    }),
    prisma.requestLog.groupBy({
      by: ["success"],
      where: {
        createdAt: { gte: utcStartOfDay },
        project: { userId: req.userId },
      },
      _count: { _all: true },
    }),
    prisma.requestLog.aggregate({
      where: {
        createdAt: { gte: utcStartOfDay },
        project: { userId: req.userId },
      },
      _avg: { latencyMs: true },
    }),
  ]);

  const successfulRequests = requestTotals.find((item) => item.success)?._count._all ?? 0;
  const failedRequests = requestTotals.find((item) => !item.success)?._count._all ?? 0;
  const requestsToday = successfulRequests + failedRequests;
  const healthStates = projects.map((project) => project.healthChecks[0]?.status ?? null);

  return res.json({
    projects: projects.length,
    requestsToday,
    successfulRequests,
    failedRequests,
    successRatePercent: requestsToday ? Number(((successfulRequests / requestsToday) * 100).toFixed(1)) : null,
    averageLatencyMs: latency._avg.latencyMs === null ? null : Math.round(latency._avg.latencyMs),
    apiHealth: {
      healthy: healthStates.filter((status) => status === "HEALTHY").length,
      unhealthy: healthStates.filter((status) => status === "UNHEALTHY").length,
      unknown: healthStates.filter((status) => status === null).length,
    },
    asOf: now.toISOString(),
  });
}