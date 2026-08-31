import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { isUniqueViolation } from "../lib/prismaError";
import { draftRepository } from "../repositories/draftRepository";
import { emotionRepository } from "../repositories/emotionRepository";
import { friendRepository } from "../repositories/friendRepository";
import { JarWithEmotions, jarRepository, withEmotions } from "../repositories/jarRepository";
import { dominantEmotionId } from "../utils/dominant";
import { getKstToday, kstDateToDb } from "../utils/kst";

export const JAR_LIMIT = 7; // 서재 최대 보관 개수
export const DRAFT_LIMIT = 7; // 유리병에 담을 수 있는 감정 최대 개수

const alreadyTodayError = () => new AppError(409, "JAR_ALREADY_TODAY", "오늘의 유리병은 이미 완성했어요.");

// { emotionId, count } → 이름·색을 붙인 표준 감정 배열 + dominantEmotionId (유리병/드래프트 공용)
async function enrich(counts: { emotionId: number; count: number }[]) {
  if (counts.length === 0) return { emotions: [], dominantEmotionId: null };
  const masters = await emotionRepository.findByIds(counts.map((c) => c.emotionId));
  const emotions = masters // sortOrder 정렬 유지
    .map((m) => ({
      emotionId: m.id,
      name: m.name,
      colorHex: m.colorHex,
      count: counts.find((c) => c.emotionId === m.id)!.count,
    }));
  return { emotions, dominantEmotionId: dominantEmotionId(emotions) };
}

// 유리병 응답 (id·recordDate 포함)
export function toJarResponse(jar: JarWithEmotions) {
  const emotions = jar.emotions.map((je) => ({
    emotionId: je.emotionId,
    name: je.emotion.name,
    colorHex: je.emotion.colorHex,
    count: je.count,
  }));
  return {
    id: jar.id,
    recordDate: jar.recordDate.toISOString().slice(0, 10),
    dominantEmotionId: dominantEmotionId(emotions),
    emotions,
  };
}

// 드래프트(담는 중) 응답 — id·recordDate 없음, total 있음. 빈 병이면 total 0
async function toDraftResponse(counts: { emotionId: number; count: number }[]) {
  const { emotions, dominantEmotionId: dom } = await enrich(counts);
  return {
    total: counts.reduce((sum, c) => sum + c.count, 0),
    dominantEmotionId: dom,
    emotions,
  };
}

export const jarService = {
  // 몽글리 탭 진입 — 오늘(KST) 상태를 한 번에. 완성본 있으면 draft:null, 없으면 담는 중 드래프트
  async getTodayState(userId: string) {
    const today = kstDateToDb(getKstToday());
    await draftRepository.clearStale(userId, today); // 어제 잔재 청소 (유계 유지)

    const jar = await jarRepository.findByUserAndDate(userId, today);
    if (jar) {
      // 불변식: 완성본이 있으면 오늘 드래프트는 존재하지 않는다 — 남아있으면 정리
      await draftRepository.clear(userId, today);
      return { jar: toJarResponse(jar), draft: null };
    }
    return { jar: null, draft: await toDraftResponse(await draftRepository.aggregate(userId, today)) };
  },

  // 드래그 1회 — 감정 1개 담기 (즉시 DB 반영). 응답 = 갱신된 드래프트 전체.
  // 동시성 참고: 같은 유저의 담기/되돌리기를 병렬로 쏘면(더블탭) Read Committed에서
  // count 검사·마지막 행 삭제에 경합이 있을 수 있다. 프론트가 뮤테이션을 직렬 전송하는 것을
  // 계약(API.md)으로 삼고, 완성 시점의 total 1~7 재검증을 최종 백스톱으로 둔다.
  async addDraftEmotion(userId: string, emotionId: number) {
    const today = kstDateToDb(getKstToday());
    await draftRepository.clearStale(userId, today);

    // 오늘 이미 완성했으면 담기 불가 (완성 직후 재드래그 차단).
    // completeJar·getTodayState와 동일하게 잔재 드래프트를 정리해 "완성본 있으면 드래프트 없음" 불변식 통일
    if (await jarRepository.findByUserAndDate(userId, today)) {
      await draftRepository.clear(userId, today);
      throw alreadyTodayError();
    }

    const found = await emotionRepository.findActiveByIds([emotionId]);
    if (found.length === 0) throw new AppError(400, "INVALID_EMOTION", "존재하지 않는 감정이에요.");

    const counts = await prisma.$transaction(async (tx) => {
      const count = await draftRepository.count(userId, today, tx);
      if (count >= DRAFT_LIMIT) {
        throw new AppError(409, "DRAFT_FULL", "감정은 최대 7개까지 담을 수 있어요.");
      }
      await draftRepository.add(userId, today, emotionId, tx);
      return draftRepository.aggregate(userId, today, tx);
    });
    return toDraftResponse(counts);
  },

  // 되돌리기 — 마지막으로 담은 감정 1개 제거. 응답 = 갱신된 드래프트
  async undoDraftEmotion(userId: string) {
    const today = kstDateToDb(getKstToday());
    const removed = await draftRepository.removeLast(userId, today);
    if (removed === 0) throw new AppError(409, "DRAFT_EMPTY", "되돌릴 감정이 없어요.");
    return toDraftResponse(await draftRepository.aggregate(userId, today));
  },

  // 완성하기 — 서버에 저장된 오늘 드래프트를 확정해 유리병으로.
  async completeJar(userId: string) {
    const today = kstDateToDb(getKstToday());
    await draftRepository.clearStale(userId, today);

    // 오늘 이미 완성됨 → 드래프트는 무의미하므로 정리하고 409 (DB 불변식 유지)
    if (await jarRepository.findByUserAndDate(userId, today)) {
      await draftRepository.clear(userId, today);
      throw alreadyTodayError();
    }

    try {
      const jar = await prisma.$transaction(async (tx) => {
        const counts = await draftRepository.aggregate(userId, today, tx);
        const total = counts.reduce((sum, c) => sum + c.count, 0);
        if (total === 0) throw new AppError(400, "DRAFT_EMPTY", "담은 감정이 없어요.");
        // 더블탭 경합으로 7 초과가 된 극단 케이스 — 되돌리기로 맞추도록 안내
        if (total > DRAFT_LIMIT) {
          throw new AppError(409, "DRAFT_FULL", "감정이 너무 많아요. 되돌리기로 7개 이하로 맞춰주세요.");
        }

        // 서재 7개 제한: 7개 이상이면 가장 오래된 유리병을 삭제하여 항상 최대 7개 유지 (FIFO)
        const jarCount = await tx.jar.count({ where: { userId } });
        if (jarCount >= JAR_LIMIT) {
          const toDeleteCount = jarCount - JAR_LIMIT + 1;
          const oldestJars = await tx.jar.findMany({
            where: { userId },
            orderBy: { recordDate: "asc" },
            take: toDeleteCount,
            select: { id: true },
          });
          if (oldestJars.length > 0) {
            await tx.jar.deleteMany({
              where: { id: { in: oldestJars.map((j) => j.id) } },
            });
          }
        }

        const created = await tx.jar.create({
          data: {
            userId,
            recordDate: today,
            emotions: { create: counts.map((c) => ({ emotionId: c.emotionId, count: c.count })) },
          },
          include: withEmotions,
        });
        await draftRepository.clear(userId, today, tx); // 완성됐으니 드래프트 비움
        return created;
      });
      return toJarResponse(jar);
    } catch (err) {
      // 완성 직전 동시 완성(race)으로 (userId, today) 유니크 위반 → 오늘 완성됨. 드래프트 정리 후 409
      if (isUniqueViolation(err)) {
        await draftRepository.clear(userId, today);
        throw alreadyTodayError();
      }
      throw err;
    }
  },

  async listJars(userId: string) {
    const jars = await jarRepository.findManyByUser(userId);
    return jars.map(toJarResponse);
  },

  // 상세 열람 — 본인 또는 친구만 (접근 제어)
  async getJarForViewer(viewerId: string, jarId: string) {
    const jar = await jarRepository.findById(jarId);
    if (!jar) throw new AppError(404, "JAR_NOT_FOUND", "존재하지 않는 유리병이에요.");

    if (jar.userId !== viewerId) {
      const friendship = await friendRepository.find(viewerId, jar.userId);
      if (!friendship) throw new AppError(403, "FORBIDDEN", "친구의 유리병만 볼 수 있어요.");
    }
    return toJarResponse(jar);
  },

  async deleteJar(userId: string, jarId: string) {
    const jar = await jarRepository.findById(jarId);
    if (!jar) throw new AppError(404, "JAR_NOT_FOUND", "존재하지 않는 유리병이에요.");
    if (jar.userId !== userId) throw new AppError(403, "FORBIDDEN", "내 유리병만 삭제할 수 있어요.");
    await jarRepository.deleteById(jarId);
  },
};
