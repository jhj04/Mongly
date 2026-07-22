import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";

export const healthRouter = Router();

// SELECT 1을 포함해 UptimeRobot 핑이 Render와 Neon을 함께 깨우게 한다 (계획서 §8)
healthRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "up" });
  }),
);
