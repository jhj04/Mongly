import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/auth";
import { likeMutationLimiter } from "../middlewares/rateLimit";
import { likeService } from "../services/likeService";

export const jarLikesRouter = Router();
const jarIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

jarLikesRouter.put("/jars/:id/like", requireAuth, likeMutationLimiter, asyncHandler(async (req, res) => {
  const id = jarIdSchema.parse(req.params.id);
  res.json(await likeService.setLike(req.user!.id, id, true));
}));

jarLikesRouter.delete("/jars/:id/like", requireAuth, likeMutationLimiter, asyncHandler(async (req, res) => {
  const id = jarIdSchema.parse(req.params.id);
  res.json(await likeService.setLike(req.user!.id, id, false));
}));
