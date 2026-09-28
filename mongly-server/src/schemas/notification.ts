import { z } from "zod";

export const notificationIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const notificationTypeSchema = z.enum(["FRIEND_REQUEST", "JAR_LIKED"]);

export const notificationQuerySchema = z.object({
  limit: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(50)).optional()
    .transform((value) => value ?? 20),
  type: notificationTypeSchema.optional(),
  cursor: z.string().min(1).max(512).optional(),
}).strict();

export type NotificationQuery = z.infer<typeof notificationQuerySchema>;

export const notificationCursorSchema = z.object({
  v: z.literal(1),
  createdAt: z.string().datetime().refine((value) => {
    const date = new Date(value);
    return !value.startsWith("0000-") && Number.isFinite(date.getTime()) && date.toISOString() === value;
  }),
  id: notificationIdSchema,
  type: notificationTypeSchema.nullable(),
}).strict();
