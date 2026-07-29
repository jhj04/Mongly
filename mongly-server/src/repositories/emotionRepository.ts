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

  // 드래프트 응답에 이름·색을 붙이기 위한 조회 (비활성 감정도 표시용으로 포함, sortOrder 정렬)
  findByIds(ids: number[]) {
    return prisma.emotion.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, colorHex: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });
  },
};
