import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

async function findOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { gatewayId: projectId, userId },
    select: { id: true },
  });
}

function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export async function generateApiKey(req: Request<{ projectId: string }>, res: Response) {
  const project = await findOwnedProject(req.params.projectId, req.userId);
  if (!project) return res.status(404).json({ message: "Project not found." });

  const apiKey = `tf_live_${randomBytes(32).toString("base64url")}`;
  await prisma.apiKey.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      keyHash: hashApiKey(apiKey),
      keyPrefix: apiKey.slice(0, 12),
      keyLastFour: apiKey.slice(-4),
    },
    update: {
      keyHash: hashApiKey(apiKey),
      keyPrefix: apiKey.slice(0, 12),
      keyLastFour: apiKey.slice(-4),
      createdAt: new Date(),
      lastUsedAt: null,
    },
  });

  return res.status(201).json({
    apiKey,
    message: "Copy this key now. It cannot be retrieved again.",
  });
}

export async function getApiKey(req: Request<{ projectId: string }>, res: Response) {
  const project = await findOwnedProject(req.params.projectId, req.userId);
  if (!project) return res.status(404).json({ message: "Project not found." });

  const apiKey = await prisma.apiKey.findUnique({ where: { projectId: project.id } });
  if (!apiKey) return res.json({ apiKey: null });
  return res.json({
    apiKey: {
      maskedKey: `${apiKey.keyPrefix}...${apiKey.keyLastFour}`,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
    },
  });
}

export async function revokeApiKey(req: Request<{ projectId: string }>, res: Response) {
  const project = await findOwnedProject(req.params.projectId, req.userId);
  if (!project) return res.status(404).json({ message: "Project not found." });

  const result = await prisma.apiKey.deleteMany({ where: { projectId: project.id } });
  if (!result.count) return res.status(404).json({ message: "Project has no active API key." });
  return res.status(204).send();
}