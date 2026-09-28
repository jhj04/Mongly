import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

// 조회 시 항상 감정+기준색을 함께 내려준다 — 프론트가 유리병 하나만 받아도 색 조합 가능
const withEmotions = {
  emotions: {
    include: { emotion: { select: { name: true, colorHex: true } } },
    orderBy: { emotion: { sortOrder: "asc" } },
  },
} as const;

export type JarWithEmotions = Prisma.JarGetPayload<{ include: typeof withEmotions }>;
type Db = Prisma.TransactionClient | typeof prisma;

export const jarRepository = {
  findPageByUser(userId: string, limit: number, beforeDate?: Date, db: Db = prisma) {
    return db.jar.findMany({
      where: { userId, ...(beforeDate ? { recordDate: { lt: beforeDate } } : {}) },
      include: withEmotions,
      orderBy: { recordDate: "desc" },
      take: limit + 1,
    });
  },

  // 친구 최대 10명. 각 SELECT에 LIMIT 1을 적용해 전체 보관함을 읽지 않는다.
  // 동시에 최대 3개 쿼리만 보내 작은 DB 연결 풀을 과도하게 점유하지 않는다.
  async findLatestByUsers(userIds: string[], db: Db = prisma): Promise<JarWithEmotions[]> {
    const ids = [...new Set(userIds)];
    const jars: JarWithEmotions[] = [];
    for (let offset = 0; offset < ids.length; offset += 3) {
      const batch = await Promise.all(ids.slice(offset, offset + 3).map((userId) => db.jar.findFirst({
        where: { userId },
        include: withEmotions,
        orderBy: { recordDate: "desc" },
      })));
      for (const jar of batch) if (jar) jars.push(jar);
    }
    return jars;
  },

  findByUserAndDate(userId: string, recordDate: Date, db: Db = prisma) {
    return db.jar.findUnique({
      where: { userId_recordDate: { userId, recordDate } },
      include: withEmotions,
    });
  },

  findById(id: string, db: Db = prisma) {
    return db.jar.findUnique({ where: { id }, include: withEmotions });
  },

  deleteById(id: string, db: Db = prisma) {
    return db.jar.delete({ where: { id } }); // 감정·좋아요·알림은 cascade.
  },
};

export { withEmotions };
