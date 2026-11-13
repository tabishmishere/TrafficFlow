import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parsePublicHttpUrl } from "../lib/safeUrl";

interface ProjectBody {
  name?: unknown;
  description?: unknown;
  targetApiUrl?: unknown;
  healthEndpoint?: unknown;
  rateLimitRequests?: unknown;
  rateLimitWindowSeconds?: unknown;
}

function gatewayUrl(gatewayId: string): string {
  const configuredBaseUrl = process.env.GATEWAY_BASE_URL;
  if (!configuredBaseUrl && process.env.NODE_ENV === "production") {
    throw new Error("GATEWAY_BASE_URL must be set in production.");
  }
  const baseUrl = (configuredBaseUrl || "http://localhost:4000").replace(/\/$/, "");
  return `${baseUrl}/g/${gatewayId}`;
}

function toProjectResponse(project: {
  gatewayId: string;
  name: string;
  description: string | null;
  targetApiUrl: string;
  healthEndpoint: string | null;
  rateLimitRequests: number;
  rateLimitWindowSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    projectId: project.gatewayId,
    name: project.name,
    description: project.description,
    targetApiUrl: project.targetApiUrl,
    healthEndpoint: project.healthEndpoint,
    rateLimit: {
      requests: project.rateLimitRequests,
      windowSeconds: project.rateLimitWindowSeconds,
    },
    gatewayUrl: gatewayUrl(project.gatewayId),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

export async function listProjects(req: Request, res: Response) {
  const projects = await prisma.project.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ projects: projects.map(toProjectResponse) });
}

export async function createProject(req: Request<unknown, unknown, ProjectBody>, res: Response) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const targetApiUrl = await parsePublicHttpUrl(req.body.targetApiUrl);
  const description = req.body.description === undefined || req.body.description === null
    ? null
    : typeof req.body.description === "string"
      ? req.body.description.trim() || null
      : undefined;
  const healthEndpoint = req.body.healthEndpoint === undefined || req.body.healthEndpoint === null
    ? null
    : await parsePublicHttpUrl(req.body.healthEndpoint);
  const rateLimitRequests = req.body.rateLimitRequests === undefined ? 100 : req.body.rateLimitRequests;
  const rateLimitWindowSeconds = req.body.rateLimitWindowSeconds === undefined
    ? 60
    : req.body.rateLimitWindowSeconds;

  if (!name) return res.status(400).json({ message: "Project name is required." });
  if (!targetApiUrl) {
    return res.status(400).json({ message: "A valid public HTTP or HTTPS targetApiUrl is required." });
  }
  if (description === undefined) {
    return res.status(400).json({ message: "Description must be a string." });
  }
  if (req.body.healthEndpoint !== undefined && req.body.healthEndpoint !== null && !healthEndpoint) {
    return res.status(400).json({ message: "healthEndpoint must be a public HTTP or HTTPS URL." });
  }
  if (!isIntegerBetween(rateLimitRequests, 1, 1_000_000)) {
    return res.status(400).json({ message: "rateLimitRequests must be an integer between 1 and 1000000." });
  }
  if (!isIntegerBetween(rateLimitWindowSeconds, 1, 86400)) {
    return res.status(400).json({ message: "rateLimitWindowSeconds must be an integer between 1 and 86400." });
  }

  const project = await prisma.project.create({
    data: {
      gatewayId: `proj_${randomUUID().replaceAll("-", "")}`,
      name,
      description,
      targetApiUrl,
      healthEndpoint,
      rateLimitRequests,
      rateLimitWindowSeconds,
      userId: req.userId,
    },
  });
  return res.status(201).json({ project: toProjectResponse(project) });
}

export async function updateProject(req: Request<{ projectId: string }, unknown, ProjectBody>, res: Response) {
  const data: {
    name?: string;
    description?: string | null;
    targetApiUrl?: string;
    healthEndpoint?: string | null;
    rateLimitRequests?: number;
    rateLimitWindowSeconds?: number;
  } = {};

  if (req.body.name !== undefined) {
    if (typeof req.body.name !== "string" || !req.body.name.trim()) {
      return res.status(400).json({ message: "Project name cannot be empty." });
    }
    data.name = req.body.name.trim();
  }

  if (req.body.description !== undefined) {
    if (req.body.description !== null && typeof req.body.description !== "string") {
      return res.status(400).json({ message: "Description must be a string or null." });
    }
    data.description = typeof req.body.description === "string" ? req.body.description.trim() || null : null;
  }

  if (req.body.targetApiUrl !== undefined) {
    const targetApiUrl = await parsePublicHttpUrl(req.body.targetApiUrl);
    if (!targetApiUrl) {
      return res.status(400).json({ message: "A valid public HTTP or HTTPS targetApiUrl is required." });
    }
    data.targetApiUrl = targetApiUrl;
  }

  if (req.body.healthEndpoint !== undefined) {
    if (req.body.healthEndpoint === null || req.body.healthEndpoint === "") {
      data.healthEndpoint = null;
    } else {
      const healthEndpoint = await parsePublicHttpUrl(req.body.healthEndpoint);
      if (!healthEndpoint) {
        return res.status(400).json({ message: "healthEndpoint must be a public HTTP or HTTPS URL, or null to disable." });
      }
      data.healthEndpoint = healthEndpoint;
    }
  }
  if (req.body.rateLimitRequests !== undefined) {
    if (!isIntegerBetween(req.body.rateLimitRequests, 1, 1_000_000)) {
      return res.status(400).json({ message: "rateLimitRequests must be an integer between 1 and 1000000." });
    }
    data.rateLimitRequests = req.body.rateLimitRequests;
  }

  if (req.body.rateLimitWindowSeconds !== undefined) {
    if (!isIntegerBetween(req.body.rateLimitWindowSeconds, 1, 86400)) {
      return res.status(400).json({ message: "rateLimitWindowSeconds must be an integer between 1 and 86400." });
    }
    data.rateLimitWindowSeconds = req.body.rateLimitWindowSeconds;
  }

  if (!Object.keys(data).length) {
    return res.status(400).json({ message: "Provide at least one project field to update." });
  }

  const result = await prisma.project.updateMany({
    where: { gatewayId: req.params.projectId, userId: req.userId },
    data,
  });
  if (!result.count) return res.status(404).json({ message: "Project not found." });

  const project = await prisma.project.findUniqueOrThrow({ where: { gatewayId: req.params.projectId } });
  return res.json({ project: toProjectResponse(project) });
}

export async function deleteProject(req: Request<{ projectId: string }>, res: Response) {
  const result = await prisma.project.deleteMany({
    where: { gatewayId: req.params.projectId, userId: req.userId },
  });
  if (!result.count) return res.status(404).json({ message: "Project not found." });
  return res.status(204).send();
}