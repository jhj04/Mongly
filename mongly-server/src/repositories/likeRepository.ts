import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type LikeSummary = { likeCount: number; likedByMe: boolean };

export const likeRepository = {
  find(jarId: string, userId: string, client: Prisma.TransactionClient = prisma) {
    return client.jarLike.findUnique({ where: { jarId_userId: { jarId, userId } } });
  },

  countActive(jarId: string, client: Prisma.TransactionClient = prisma) {
    return client.jarLike.count({ where: { jarId, isActive: true } });
  },

  async summarize(
    jarIds: string[],
    viewerId: string,
    client: Prisma.TransactionClient = prisma,
  ): Promise<Map<string, LikeSummary>> {
    const summaries = new Map<string, LikeSummary>();
    if (jarIds.length === 0) return summaries;
    // 친구 최대 10명 + 해제 시 반응 제거: 현재 페이지당 최대 50×10행.
    // 단일 조회로 count와 내 상태가 서로 다른 시점을 읽는 것도 피한다.
    const rows = await client.jarLike.findMany({
      where: { jarId: { in: jarIds }, isActive: true },
      select: { jarId: true, userId: true },
    });
    for (const jarId of jarIds) summaries.set(jarId, { likeCount: 0, likedByMe: false });
    for (const row of rows) {
      const summary = summaries.get(row.jarId)!;
      summary.likeCount += 1;
      if (row.userId === viewerId) summary.likedByMe = true;
    }
    return summaries;
  },
};
