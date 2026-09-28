import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/auth";
import { notificationIdSchema, notificationQuerySchema } from "../schemas/notification";
import { notificationService } from "../services/notificationService";

export const notificationsRouter = Router();
notificationsRouter.use("/notifications", requireAuth);

notificationsRouter.get("/notifications/summary", asyncHandler(async (req, res) => {
  res.json(await notificationService.summary(req.user!.id));
}));

notificationsRouter.get("/notifications", asyncHandler(async (req, res) => {
  res.json(await notificationService.list(req.user!.id, notificationQuerySchema.parse(req.query)));
}));

notificationsRouter.patch("/notifications/:id/read", asyncHandler(async (req, res) => {
  const id = notificationIdSchema.parse(req.params.id);
  res.json(await notificationService.markRead(req.user!.id, id));
}));
