import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const notificationRelations = {
  jarLike: { select: { user: { select: { loginId: true } }, jar: { select: { id: true, recordDate: true } } } },
  friendRequest: { select: { id: true, from: { select: { loginId: true } } } },
} satisfies Prisma.NotificationInclude;

export type NotificationCursor = { createdAt: Date; id: string };

export const notificationRepository = {
  createLike(recipientId: string, jarLikeId: string, tx: Prisma.TransactionClient) {
    return tx.notification.create({
      data: { recipientId, jarLikeId, type: "JAR_LIKED", createdAt: new Date() },
    });
  },

  createFriendRequest(recipientId: string, friendRequestId: string, tx: Prisma.TransactionClient) {
    return tx.notification.create({
      data: { recipientId, friendRequestId, type: "FRIEND_REQUEST", createdAt: new Date() },
    });
  },

  deleteForLike(jarLikeId: string, tx: Prisma.TransactionClient) {
    return tx.notification.deleteMany({ where: { jarLikeId } });
  },

  list(recipientId: string, limit: number, type?: NotificationType, cursor?: NotificationCursor) {
    // 관계를 별도 SELECT로 로드하는 Prisma 설정에서도 취소/탈퇴 중 고아 응답을 만들지 않는다.
    return prisma.$transaction((tx) => tx.notification.findMany({
      where: {
        recipientId,
        ...(type ? { type } : {}),
        ...(cursor ? {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        } : {}),
      },
      include: notificationRelations,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    }), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  },

  async summary(recipientId: string) {
    const [unreadLikeCount, pendingFriendRequestCount] = await prisma.$transaction([
      prisma.notification.count({ where: { recipientId, type: "JAR_LIKED", readAt: null } }),
      prisma.friendRequest.count({ where: { toUserId: recipientId } }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { unreadLikeCount, pendingFriendRequestCount, badgeCount: unreadLikeCount + pendingFriendRequestCount };
  },

  markRead(recipientId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      // CAS: 동시 read 요청도 최초 readAt을 덮어쓰지 않는다.
      await tx.notification.updateMany({ where: { id, recipientId, readAt: null }, data: { readAt: new Date() } });
      return tx.notification.findFirst({ where: { id, recipientId }, select: { id: true, readAt: true } });
    });
  },
};
