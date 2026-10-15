import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface ProjectBody {
  name?: unknown;
  description?: unknown;
  targetApiUrl?: unknown;
}

function gatewayUrl(gatewayId: string): string {
  const baseUrl = (process.env.GATEWAY_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
  return `${baseUrl}/g/${gatewayId}`;
}

function toProjectResponse(project: {
  gatewayId: string;
  name: string;
  description: string | null;
  targetApiUrl: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    projectId: project.gatewayId,
    name: project.name,
    description: project.description,
    targetApiUrl: project.targetApiUrl,
    gatewayUrl: gatewayUrl(project.gatewayId),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function parseTargetUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
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
  const targetApiUrl = parseTargetUrl(req.body.targetApiUrl);
  const description = req.body.description === undefined || req.body.description === null
    ? null
    : typeof req.body.description === "string"
      ? req.body.description.trim() || null
      : undefined;

  if (!name) return res.status(400).json({ message: "Project name is required." });
  if (!targetApiUrl) {
    return res.status(400).json({ message: "A valid HTTP or HTTPS targetApiUrl is required." });
  }
  if (description === undefined) {
    return res.status(400).json({ message: "Description must be a string." });
  }

  const project = await prisma.project.create({
    data: {
      gatewayId: `proj_${randomUUID().replaceAll("-", "")}`,
      name,
      description,
      targetApiUrl,
      userId: req.userId,
    },
  });
  return res.status(201).json({ project: toProjectResponse(project) });
}

export async function updateProject(req: Request<{ projectId: string }, unknown, ProjectBody>, res: Response) {
  const data: { name?: string; description?: string | null; targetApiUrl?: string } = {};

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
    const targetApiUrl = parseTargetUrl(req.body.targetApiUrl);
    if (!targetApiUrl) {
      return res.status(400).json({ message: "A valid HTTP or HTTPS targetApiUrl is required." });
    }
    data.targetApiUrl = targetApiUrl;
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