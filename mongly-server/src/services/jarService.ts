import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors";
import { lockUsers } from "../lib/locks";
import { prisma } from "../lib/prisma";
import { isUniqueViolation } from "../lib/prismaError";
import { draftRepository } from "../repositories/draftRepository";
import { JarWithEmotions, jarRepository, withEmotions } from "../repositories/jarRepository";
import { likeRepository } from "../repositories/likeRepository";
import { CompleteJarInput, ListJarsQuery, UpdateJarInput } from "../schemas/jar";
import { dominantEmotionId } from "../utils/dominant";
import { getKstToday, kstDateToDb } from "../utils/kst";
import { encodeCursor } from "../utils/pagination";

export const DRAFT_LIMIT = 7; // 병 하나의 구슬 수. 서재의 저장 개수는 제한하지 않는다.

const alreadyTodayError = () => new AppError(409, "JAR_ALREADY_TODAY", "오늘의 유리병은 이미 완성했어요.");
const jarNotFoundError = () => new AppError(404, "JAR_NOT_FOUND", "존재하지 않는 유리병이에요.");
const versionConflictError = (currentVersion: number) => new AppError(
  409, "JAR_VERSION_CONFLICT", "다른 곳에서 기록이 수정됐어요. 최신 기록을 다시 확인해주세요.", { currentVersion },
);

/** 모든 오늘 상태 변경/정리는 동일한 사용자 잠금을 사용하고, 잠금 후 날짜를 판정한다. */
async function withOwnerTransaction<T>(
  userId: string,
  work: (tx: Prisma.TransactionClient, today: Date) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await lockUsers(tx, [userId]);
    if (!await tx.user.findUnique({ where: { id: userId }, select: { id: true } })) {
      throw new AppError(401, "UNAUTHORIZED", "로그인이 필요해요.");
    }
    return work(tx, kstDateToDb(getKstToday()));
  });
}

async function toDraftResponse(counts: { emotionId: number; count: number }[], tx: Prisma.TransactionClient) {
  const masters = counts.length === 0 ? [] : await tx.emotion.findMany({
    where: { id: { in: counts.map((count) => count.emotionId) } },
    select: { id: true, name: true, colorHex: true },
    orderBy: { sortOrder: "asc" },
  });
  const byId = new Map(counts.map((count) => [count.emotionId, count.count]));
  const emotions = masters.map((emotion) => ({
    emotionId: emotion.id, name: emotion.name, colorHex: emotion.colorHex, count: byId.get(emotion.id)!,
  }));
  return {
    total: counts.reduce((total, count) => total + count.count, 0),
    dominantEmotionId: dominantEmotionId(emotions),
    emotions,
  };
}

/** 이미 본인/친구 열람 권한을 확인한 병에 사용한다. 순서는 입력과 동일하다. */
export async function toJarResponses(jars: JarWithEmotions[], viewerId: string, client?: Prisma.TransactionClient) {
  if (jars.length === 0) return [];
  const summaries = await likeRepository.summarize(jars.map((jar) => jar.id), viewerId, client);
  const today = getKstToday();
  return jars.map((jar) => {
    const emotions = jar.emotions.map((emotion) => ({
      emotionId: emotion.emotionId,
      name: emotion.emotion.name,
      colorHex: emotion.emotion.colorHex,
      count: emotion.count,
    }));
    const isOwner = jar.userId === viewerId;
    const recordDate = jar.recordDate.toISOString().slice(0, 10);
    const likes = summaries.get(jar.id) ?? { likeCount: 0, likedByMe: false };
    return {
      id: jar.id,
      recordDate,
      note: jar.note,
      createdAt: jar.createdAt.toISOString(),
      updatedAt: jar.updatedAt.toISOString(),
      version: jar.version,
      dominantEmotionId: dominantEmotionId(emotions),
      emotions,
      ...likes,
      canLike: !isOwner,
      canEdit: isOwner && recordDate === today,
    };
  });
}

export const jarService = {
  async getTodayState(userId: string) {
    return withOwnerTransaction(userId, async (tx, today) => {
      await draftRepository.clearStale(userId, today, tx);
      const jar = await jarRepository.findByUserAndDate(userId, today, tx);
      if (jar) {
        await draftRepository.clear(userId, today, tx);
        return { jar: (await toJarResponses([jar], userId, tx))[0], draft: null };
      }
      return { jar: null, draft: await toDraftResponse(await draftRepository.aggregate(userId, today, tx), tx) };
    });
  },

  async addDraftEmotion(userId: string, emotionId: number) {
    const draft = await withOwnerTransaction(userId, async (tx, today) => {
      await draftRepository.clearStale(userId, today, tx);
      if (await jarRepository.findByUserAndDate(userId, today, tx)) {
        await draftRepository.clear(userId, today, tx);
        return null; // 잔재 청소는 커밋하고 호출자에게 409를 반환한다.
      }
      const emotion = await tx.emotion.findFirst({ where: { id: emotionId, isActive: true }, select: { id: true } });
      if (!emotion) throw new AppError(400, "INVALID_EMOTION", "존재하지 않는 감정이에요.");
      if (await draftRepository.count(userId, today, tx) >= DRAFT_LIMIT) {
        throw new AppError(409, "DRAFT_FULL", "감정은 최대 7개까지 담을 수 있어요.");
      }
      await draftRepository.add(userId, today, emotionId, tx);
      return toDraftResponse(await draftRepository.aggregate(userId, today, tx), tx);
    });
    if (!draft) throw alreadyTodayError();
    return draft;
  },

  async undoDraftEmotion(userId: string) {
    return withOwnerTransaction(userId, async (tx, today) => {
      const removed = await draftRepository.removeLast(userId, today, tx);
      if (removed === 0) throw new AppError(409, "DRAFT_EMPTY", "되돌릴 감정이 없어요.");
      return toDraftResponse(await draftRepository.aggregate(userId, today, tx), tx);
    });
  },

  async completeJar(userId: string, input: CompleteJarInput = {}) {
    try {
      const jar = await withOwnerTransaction(userId, async (tx, today) => {
        await draftRepository.clearStale(userId, today, tx);
        if (await jarRepository.findByUserAndDate(userId, today, tx)) {
          await draftRepository.clear(userId, today, tx);
          return null;
        }
        const counts = await draftRepository.aggregate(userId, today, tx);
        const total = counts.reduce((sum, count) => sum + count.count, 0);
        if (total === 0) throw new AppError(400, "DRAFT_EMPTY", "담은 감정이 없어요.");
        if (total > DRAFT_LIMIT) {
          throw new AppError(409, "DRAFT_FULL", "감정이 너무 많아요. 되돌리기로 7개 이하로 맞춰주세요.");
        }
        const now = new Date();
        const created = await tx.jar.create({
          data: {
            userId, recordDate: today, note: input.note ?? null, createdAt: now, updatedAt: now,
            emotions: { create: counts.map((count) => ({ emotionId: count.emotionId, count: count.count })) },
          },
          include: withEmotions,
        });
        await draftRepository.clear(userId, today, tx);
        return (await toJarResponses([created], userId, tx))[0];
      });
      if (!jar) throw alreadyTodayError();
      return jar;
    } catch (error) {
      if (isUniqueViolation(error)) throw alreadyTodayError();
      throw error;
    }
  },

  async listJars(userId: string, query: ListJarsQuery = { limit: 7 }) {
    return prisma.$transaction(async (tx) => {
      const rows = await jarRepository.findPageByUser(userId, query.limit, query.cursor ? kstDateToDb(query.cursor) : undefined, tx);
      const hasMore = rows.length > query.limit;
      const page = rows.slice(0, query.limit);
      return {
        jars: await toJarResponses(page, userId, tx),
        nextCursor: hasMore ? encodeCursor({ v: 1, recordDate: page[page.length - 1].recordDate.toISOString().slice(0, 10) }) : null,
        hasMore,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  },

  async getJarForViewer(viewerId: string, jarId: string) {
    return prisma.$transaction(async (tx) => {
      const jar = await jarRepository.findById(jarId, tx);
      if (!jar) throw jarNotFoundError();
      if (jar.userId !== viewerId && !await tx.friendship.findUnique({
        where: { userId_friendId: { userId: viewerId, friendId: jar.userId } },
      })) {
        throw new AppError(403, "FORBIDDEN", "친구의 유리병만 볼 수 있어요.");
      }
      return (await toJarResponses([jar], viewerId, tx))[0];
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  },

  async updateJar(userId: string, jarId: string, input: UpdateJarInput) {
    return withOwnerTransaction(userId, async (tx, today) => {
      const jar = await jarRepository.findById(jarId, tx);
      if (!jar) throw jarNotFoundError();
      if (jar.userId !== userId) throw new AppError(403, "FORBIDDEN", "내 유리병만 수정할 수 있어요.");
      if (jar.recordDate.getTime() !== today.getTime()) {
        throw new AppError(409, "JAR_EDIT_WINDOW_CLOSED", "오늘의 유리병만 수정할 수 있어요.");
      }
      if (jar.version !== input.expectedVersion) throw versionConflictError(jar.version);

      const previousCounts = new Map(jar.emotions.map((emotion) => [emotion.emotionId, emotion.count]));
      if (input.emotions !== undefined) {
        const masters = await tx.emotion.findMany({
          where: { id: { in: input.emotions.map((emotion) => emotion.emotionId) } },
          select: { id: true, isActive: true },
        });
        const byId = new Map(masters.map((emotion) => [emotion.id, emotion]));
        for (const emotion of input.emotions) {
          const master = byId.get(emotion.emotionId);
          if (!master || (!master.isActive && emotion.count > (previousCounts.get(emotion.emotionId) ?? 0))) {
            throw new AppError(400, "INVALID_EMOTION", "새 감정은 활성 감정만 사용할 수 있어요. 비활성 감정은 기존 개수 이하로 유지할 수 있어요.");
          }
        }
      }
      const note = input.note === undefined ? jar.note : input.note;
      const sameEmotions = input.emotions === undefined || (
        input.emotions.length === jar.emotions.length &&
        input.emotions.every((emotion) => previousCounts.get(emotion.emotionId) === emotion.count)
      );
      if (note === jar.note && sameEmotions) return (await toJarResponses([jar], userId, tx))[0];

      const updated = await tx.jar.updateMany({
        where: { id: jarId, userId, version: input.expectedVersion },
        data: { note, version: { increment: 1 }, updatedAt: new Date() },
      });
      if (updated.count !== 1) {
        const current = await tx.jar.findUnique({ where: { id: jarId }, select: { version: true } });
        if (!current) throw jarNotFoundError();
        throw versionConflictError(current.version);
      }
      if (input.emotions !== undefined) {
        await tx.jarEmotion.deleteMany({ where: { jarId } });
        await tx.jarEmotion.createMany({ data: input.emotions.map((emotion) => ({ jarId, ...emotion })) });
      }
      const saved = await jarRepository.findById(jarId, tx);
      if (!saved) throw jarNotFoundError();
      return (await toJarResponses([saved], userId, tx))[0];
    });
  },

  async deleteJar(userId: string, jarId: string) {
    await withOwnerTransaction(userId, async (tx) => {
      const jar = await jarRepository.findById(jarId, tx);
      if (!jar) throw jarNotFoundError();
      if (jar.userId !== userId) throw new AppError(403, "FORBIDDEN", "내 유리병만 삭제할 수 있어요.");
      await jarRepository.deleteById(jarId, tx);
    });
  },
};
