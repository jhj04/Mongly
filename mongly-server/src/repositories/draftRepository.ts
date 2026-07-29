import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

// 모든 쿼리는 (userId, recordDate=오늘 KST)로 필터한다 — 어제 잔재 드래프트를 절대 건드리지 않기 위함.
// tx 인자를 받아 완성 트랜잭션 안에서도 같은 함수를 재사용한다.
type Db = Prisma.TransactionClient | typeof prisma;

export const draftRepository = {
  // 오늘 드래프트를 감정별 개수로 집계 (삽입 순서 무관, count만 필요)
  async aggregate(
    userId: string,
    recordDate: Date,
    db: Db = prisma,
  ): Promise<{ emotionId: number; count: number }[]> {
    const grouped = await db.draftEmotion.groupBy({
      by: ["emotionId"],
      where: { userId, recordDate },
      _count: { emotionId: true },
    });
    return grouped.map((g) => ({ emotionId: g.emotionId, count: g._count.emotionId }));
  },

  count(userId: string, recordDate: Date, db: Db = prisma) {
    return db.draftEmotion.count({ where: { userId, recordDate } });
  },

  add(userId: string, recordDate: Date, emotionId: number, db: Db = prisma) {
    return db.draftEmotion.create({ data: { userId, recordDate, emotionId } });
  },

  // 되돌리기 — 오늘 드래프트 중 마지막(id 최대) 1행을 원자적으로 삭제. 삭제 행 수 반환(0이면 빈 병).
  // 단일 SQL문이라 동시 되돌리기가 같은 행을 지우려는 경합이 없다(2단계 find→delete의 위험 제거).
  async removeLast(userId: string, recordDate: Date, db: Db = prisma): Promise<number> {
    const deleted = await db.$queryRaw<{ id: number }[]>`
      DELETE FROM "DraftEmotion"
      WHERE "id" = (
        SELECT "id" FROM "DraftEmotion"
        WHERE "userId" = ${userId} AND "recordDate" = ${recordDate}
        ORDER BY "id" DESC LIMIT 1
      )
      RETURNING "id"
    `;
    return deleted.length;
  },

  clear(userId: string, recordDate: Date, db: Db = prisma) {
    return db.draftEmotion.deleteMany({ where: { userId, recordDate } });
  },

  // 유계 유지 — 오늘 이전의 잔재 드래프트 정리 (정확성이 아니라 청소 목적이므로 실패해도 무해)
  clearStale(userId: string, today: Date, db: Db = prisma) {
    return db.draftEmotion.deleteMany({ where: { userId, recordDate: { lt: today } } });
  },
};
