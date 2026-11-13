import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import gatewayRoutes from "./routes/gatewayRoutes";
import projectRoutes from "./routes/projectRoutes";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";

const app = express();

if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:3000" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (!redis.isReady) return res.status(503).json({ status: "not ready" });
    return res.json({ status: "ready" });
  } catch {
    return res.status(503).json({ status: "not ready" });
  }
});

app.use("/g/:projectId", gatewayRoutes);
app.use(express.json({ limit: "10kb" }));
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error." });
});

export default app;