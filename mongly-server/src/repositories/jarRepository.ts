import { prisma } from "../lib/prisma";

// 조회 시 항상 감정+기준색을 함께 내려준다 — 프론트가 유리병 하나만 받아도 색 조합 가능
const withEmotions = {
  emotions: {
    include: { emotion: { select: { name: true, colorHex: true } } },
    orderBy: { emotion: { sortOrder: "asc" } },
  },
} as const;

export type JarWithEmotions = NonNullable<Awaited<ReturnType<typeof jarRepository.findById>>>;

export const jarRepository = {
  findManyByUser(userId: string) {
    return prisma.jar.findMany({
      where: { userId },
      include: withEmotions,
      orderBy: { recordDate: "desc" },
    });
  },

  // 친구 탭용 — 여러 유저의 유리병을 최신순으로 (유저당 최대 7개 × 친구 10명 = 최대 70행이라 전량 조회로 충분)
  findManyByUsers(userIds: string[]) {
    return prisma.jar.findMany({
      where: { userId: { in: userIds } },
      include: withEmotions,
      orderBy: { recordDate: "desc" },
    });
  },

  findByUserAndDate(userId: string, recordDate: Date) {
    return prisma.jar.findUnique({
      where: { userId_recordDate: { userId, recordDate } },
      include: withEmotions,
    });
  },

  findById(id: string) {
    return prisma.jar.findUnique({ where: { id }, include: withEmotions });
  },

  deleteById(id: string) {
    return prisma.jar.delete({ where: { id } }); // JarEmotion은 Cascade
  },
};

export { withEmotions };
