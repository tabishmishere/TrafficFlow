import { performance } from "node:perf_hooks";
import { prisma } from "../lib/prisma";

const defaultIntervalMs = 60_000;
const defaultTimeoutMs = 5_000;

function positiveIntegerSetting(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function checkProject(project: { id: string; healthEndpoint: string }): Promise<void> {
  const startedAt = performance.now();
  let status: "HEALTHY" | "UNHEALTHY" = "UNHEALTHY";
  let statusCode: number | null = null;

  try {
    const response = await fetch(project.healthEndpoint, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(positiveIntegerSetting("HEALTH_CHECK_TIMEOUT_MS", defaultTimeoutMs)),
    });
    statusCode = response.status;
    status = response.status >= 200 && response.status < 400 ? "HEALTHY" : "UNHEALTHY";
    await response.body?.cancel();
  } catch (error) {
    console.error("Health check request failed", {
      projectId: project.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  await prisma.apiHealthCheck.create({
    data: {
      projectId: project.id,
      status,
      statusCode,
      responseMs: Math.round(performance.now() - startedAt),
    },
  });
}

async function runHealthChecks(): Promise<void> {
  const projects = await prisma.project.findMany({
    where: { healthEndpoint: { not: null } },
    select: { id: true, healthEndpoint: true },
  });
  await Promise.all(projects.map((project) => {
    if (!project.healthEndpoint) return Promise.resolve();
    return checkProject({ id: project.id, healthEndpoint: project.healthEndpoint });
  }));
}

export function startHealthMonitor(): void {
  const intervalMs = positiveIntegerSetting("HEALTH_CHECK_INTERVAL_MS", defaultIntervalMs);
  let checking = false;

  const run = async () => {
    if (checking) return;
    checking = true;
    try {
      await runHealthChecks();
    } catch (error) {
      console.error("Unable to complete scheduled health checks", error);
    } finally {
      checking = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), intervalMs);
  timer.unref();
}
