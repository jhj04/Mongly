import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { isUniqueViolation } from "../lib/prismaError";
import { emotionRepository } from "../repositories/emotionRepository";
import { JarWithEmotions, jarRepository, withEmotions } from "../repositories/jarRepository";
import { dominantEmotionId } from "../utils/dominant";
import { getKstToday, kstDateToDb } from "../utils/kst";

export const JAR_LIMIT = 7; // 서재 최대 보관 개수

// API 응답 표준 형태
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

export const jarService = {
  // 완료하기 — recordDate는 서버가 KST 기준으로 계산, 클라이언트 값을 받지 않는다
  async createJar(userId: string, emotions: { emotionId: number; count: number }[]) {
    // 서비스 재검증(이중 방어) — zod를 우회한 호출에서도 도메인 규칙을 보장.
    // 중복 emotionId를 여기서 못 걸러내면 아래 존재 확인(IN은 DISTINCT 반환)과
    // JarEmotion 복합 PK 위반이 각각 엉뚱한 에러로 둔갑한다.
    const ids = emotions.map((e) => e.emotionId);
    const total = emotions.reduce((sum, e) => sum + e.count, 0);
    if (
      emotions.length === 0 ||
      new Set(ids).size !== ids.length ||
      emotions.some((e) => e.count < 1) ||
      total > 7
    ) {
      throw new AppError(400, "VALIDATION", "감정은 1~7개, 같은 감정은 count로 합쳐서 보내주세요.");
    }

    const found = await emotionRepository.findActiveByIds(ids);
    if (found.length !== ids.length) {
      throw new AppError(400, "INVALID_EMOTION", "존재하지 않는 감정이 포함돼 있어요.");
    }

    const recordDate = kstDateToDb(getKstToday());
    try {
      const jar = await prisma.$transaction(async (tx) => {
        // 7개 제한은 count 확인과 생성을 한 트랜잭션으로 묶는다
        const count = await tx.jar.count({ where: { userId } });
        if (count >= JAR_LIMIT) {
          const jars = await tx.jar.findMany({
            where: { userId },
            include: withEmotions,
            orderBy: { recordDate: "desc" },
          });
          // 가득 찬 7개에 오늘 기록이 포함돼 있으면 "서재를 비우세요"가 아니라
          // "오늘은 이미 완성"이 맞는 안내다 — 비워도 재시도가 계속 실패하므로 우선 판정
          if (jars.some((j) => j.recordDate.getTime() === recordDate.getTime())) {
            throw new AppError(409, "JAR_ALREADY_TODAY", "오늘의 유리병은 이미 완성했어요.");
          }
          throw new AppError(409, "JAR_LIMIT", "서재가 가득 찼어요. 유리병을 비우고 다시 담아주세요.", {
            jars: jars.map(toJarResponse),
          });
        }
        return tx.jar.create({
          data: {
            userId,
            recordDate,
            emotions: { create: emotions.map((e) => ({ emotionId: e.emotionId, count: e.count })) },
          },
          include: withEmotions,
        });
      });
      return toJarResponse(jar);
    } catch (err) {
      // (userId, recordDate) 유니크 — 하루 1병의 최종 방어선은 DB 제약
      if (isUniqueViolation(err)) {
        throw new AppError(409, "JAR_ALREADY_TODAY", "오늘의 유리병은 이미 완성했어요.");
      }
      throw err;
    }
  },

  async getTodayJar(userId: string) {
    const jar = await jarRepository.findByUserAndDate(userId, kstDateToDb(getKstToday()));
    return jar ? toJarResponse(jar) : null;
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
      const friendship = await prisma.friendship.findUnique({
        where: { userId_friendId: { userId: viewerId, friendId: jar.userId } },
      });
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
