import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const friendRepository = {
  listByUser(userId: string, db: Prisma.TransactionClient = prisma) {
    return db.friendship.findMany({
      where: { userId },
      include: { friend: { select: { loginId: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  find(userId: string, friendId: string, db: Prisma.TransactionClient = prisma) {
    return db.friendship.findUnique({
      where: { userId_friendId: { userId, friendId } },
    });
  },
};
