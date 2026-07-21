import { Router } from "express";
import { prisma } from "../lib/prisma";

export const healthRouter = Router();

// SELECT 1을 포함해 UptimeRobot 핑이 Render와 Neon을 함께 깨우게 한다 (계획서 §8)
healthRouter.get("/health", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "up" });
  } catch (err) {
    next(err);
  }
});
