import { prisma } from "../lib/prisma";

export const friendRepository = {
  listByUser(userId: string) {
    return prisma.friendship.findMany({
      where: { userId },
      include: { friend: { select: { loginId: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  find(userId: string, friendId: string) {
    return prisma.friendship.findUnique({
      where: { userId_friendId: { userId, friendId } },
    });
  },
};
