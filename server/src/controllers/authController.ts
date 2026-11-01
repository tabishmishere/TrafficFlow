import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import type { PublicUser } from "../types/user";

interface RegisterBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
}

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be set in the environment");
  }

  return jwt.sign({ sub: userId }, secret, {
    jwtid: randomUUID(),
    expiresIn: (process.env.JWT_EXPIRES_IN || "1d") as jwt.SignOptions["expiresIn"],
  });
}

export async function register(req: Request<unknown, unknown, RegisterBody>, res: Response) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const confirmPassword = typeof req.body.confirmPassword === "string" ? req.body.confirmPassword : "";

  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: "Name, email, password, and confirmPassword are required." });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }
  if (confirmPassword !== password) {
    return res.status(400).json({ message: "Password and confirmPassword must match." });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    throw error;
  }
  const token = signToken(user.id);

  return res.status(201).json({ user, token });
}

export async function login(req: Request<unknown, unknown, LoginBody>, res: Response) {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = signToken(user.id);
  return res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
}

export async function logout(req: Request, res: Response) {
  const ttlSeconds = Math.max(1, req.tokenExpiresAt - Math.floor(Date.now() / 1000));
  try {
    await redis.set(`trafficflow:auth:revoked:${req.tokenId}`, "1", { EX: ttlSeconds });
    return res.status(204).send();
  } catch (error) {
    console.error("Unable to revoke bearer token", error);
    return res.status(503).json({ message: "Authentication service is unavailable." });
  }
}