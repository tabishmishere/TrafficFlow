import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "A bearer token is required." });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "Authentication is not configured." });
  }

  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.jti !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  if (!redis.isReady) {
    return res.status(503).json({ message: "Authentication service is unavailable." });
  }

  try {
    const revoked = await redis.get(`trafficflow:auth:revoked:${payload.jti}`);
    if (revoked) return res.status(401).json({ message: "Invalid or expired token." });
  } catch (error) {
    console.error("Unable to check token revocation", error);
    return res.status(503).json({ message: "Authentication service is unavailable." });
  }

  req.userId = payload.sub;
  req.tokenId = payload.jti;
  req.tokenExpiresAt = payload.exp;
  return next();
}