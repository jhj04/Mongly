import { prisma } from "../lib/prisma";

export const emotionRepository = {
  findActive() {
    return prisma.emotion.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, colorHex: true, sortOrder: true },
    });
  },

  findActiveByIds(ids: number[]) {
    return prisma.emotion.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true },
    });
  },
};
