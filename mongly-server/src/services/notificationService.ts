import { AppError } from "../lib/errors";
import { notificationRepository } from "../repositories/notificationRepository";
import { NotificationQuery, notificationCursorSchema } from "../schemas/notification";
import { decodeCursor, encodeCursor } from "../utils/pagination";

export const notificationService = {
  async list(userId: string, query: NotificationQuery) {
    let cursor;
    if (query.cursor) {
      const decoded = notificationCursorSchema.safeParse(decodeCursor(query.cursor));
      if (!decoded.success || decoded.data.type !== (query.type ?? null)) {
        throw new AppError(400, "VALIDATION", "알림 커서가 올바르지 않아요.", { fieldErrors: { cursor: ["현재 알림 유형에 맞는 커서를 사용해주세요."] } });
      }
      cursor = { createdAt: new Date(decoded.data.createdAt), id: decoded.data.id };
    }
    const rows = await notificationRepository.list(userId, query.limit, query.type, cursor);
    const hasMore = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const notifications = page.map((row) => {
      const common = { id: row.id, createdAt: row.createdAt, readAt: row.readAt };
      if (row.type === "JAR_LIKED" && row.jarLike) {
        return {
          ...common,
          type: "JAR_LIKED" as const,
          actor: { loginId: row.jarLike.user.loginId },
          target: { type: "JAR" as const, id: row.jarLike.jar.id, recordDate: row.jarLike.jar.recordDate.toISOString().slice(0, 10) },
        };
      }
      if (row.type === "FRIEND_REQUEST" && row.friendRequest) {
        return {
          ...common,
          type: "FRIEND_REQUEST" as const,
          actor: { loginId: row.friendRequest.from.loginId },
          target: { type: "FRIEND_REQUEST" as const, id: row.friendRequest.id },
        };
      }
      throw new Error("Notification target invariant violated");
    });
    const last = page[page.length - 1];
    return {
      notifications,
      nextCursor: hasMore && last
        ? encodeCursor({ v: 1, createdAt: last.createdAt.toISOString(), id: last.id, type: query.type ?? null })
        : null,
      hasMore,
    };
  },

  summary(userId: string) {
    return notificationRepository.summary(userId);
  },

  async markRead(userId: string, id: string) {
    const row = await notificationRepository.markRead(userId, id);
    if (!row) throw new AppError(404, "NOTIFICATION_NOT_FOUND", "존재하지 않는 알림이에요.");
    return row;
  },
};
