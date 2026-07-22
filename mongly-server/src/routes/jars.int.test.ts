// 유리병 코어 통합 테스트 — 실제 DB + 감정 시드 필요 (docker compose up → db:migrate → db:seed → npm run test:int)
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { kstDateToDb } from "../utils/kst";

process.env.JWT_SECRET ??= "test-secret";

const uid = `j${Date.now().toString(36)}`;
const uidFriend = `${uid}f`;
const uidStranger = `${uid}s`;
const PW = "password123";

const app = createApp();
const owner = request.agent(app);
const stranger = request.agent(app);

let jarId: string;

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
  await owner.post("/api/auth/signup").send({ loginId: uid, password: PW, termsAgreed: true });
  await stranger.post("/api/auth/signup").send({ loginId: uidStranger, password: PW, termsAgreed: true });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { loginId: { startsWith: uid } } });
  await prisma.$disconnect();
});

describe("감정 마스터", () => {
  it("GET /emotions — 시드된 감정 10종 + 기준색", async () => {
    const res = await request(app).get("/api/emotions");
    expect(res.status).toBe(200);
    expect(res.body.emotions).toHaveLength(10);
    expect(res.body.emotions[0]).toMatchObject({ id: 1, colorHex: expect.stringMatching(/^#/) });
  });
});

describe("유리병 생성/조회/삭제", () => {
  it("완료하기 201 — dominantEmotionId 계산 포함", async () => {
    const res = await owner
      .post("/api/jars")
      .send({ emotions: [{ emotionId: 6, count: 1 }, { emotionId: 1, count: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.dominantEmotionId).toBe(1);
    expect(res.body.emotions).toHaveLength(2);
    expect(res.body.emotions[0]).toHaveProperty("colorHex");
    jarId = res.body.id;
  });

  it("같은 날 두 번째 완료하기 → 409 JAR_ALREADY_TODAY", async () => {
    const res = await owner.post("/api/jars").send({ emotions: [{ emotionId: 2, count: 1 }] });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("JAR_ALREADY_TODAY");
  });

  it("GET /jars/today — 오늘 기록 반환", async () => {
    const res = await owner.get("/api/jars/today");
    expect(res.status).toBe(200);
    expect(res.body.jar.id).toBe(jarId);
  });

  it("존재하지 않는 감정 → 400 INVALID_EMOTION", async () => {
    // 유리병이 없는 stranger로 시도 (owner는 이미 오늘 기록이 있어 409가 먼저 걸림)
    const res = await stranger.post("/api/jars").send({ emotions: [{ emotionId: 999, count: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_EMOTION");
  });

  it("서재 목록 — 감정 포함", async () => {
    const res = await owner.get("/api/jars");
    expect(res.status).toBe(200);
    expect(res.body.jars).toHaveLength(1);
  });

  it("남의 유리병 상세 → 403 (친구 아님)", async () => {
    const res = await stranger.get(`/api/jars/${jarId}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("친구 관계면 상세 열람 가능", async () => {
    const friend = request.agent(app);
    await friend.post("/api/auth/signup").send({ loginId: uidFriend, password: PW, termsAgreed: true });
    const [ownerRow, friendRow] = await Promise.all([
      prisma.user.findUnique({ where: { loginId: uid } }),
      prisma.user.findUnique({ where: { loginId: uidFriend } }),
    ]);
    // 친구 API는 다음 단계 — 지금은 쌍방 2행을 직접 삽입해 접근 제어만 검증
    await prisma.friendship.createMany({
      data: [
        { userId: friendRow!.id, friendId: ownerRow!.id },
        { userId: ownerRow!.id, friendId: friendRow!.id },
      ],
    });
    const res = await friend.get(`/api/jars/${jarId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(jarId);
  });

  it("남의 유리병 삭제 → 403, 내 유리병 삭제 → 200", async () => {
    const forbidden = await stranger.delete(`/api/jars/${jarId}`).send();
    expect(forbidden.status).toBe(403);

    const ok = await owner.delete(`/api/jars/${jarId}`).send();
    expect(ok.status).toBe(200);

    const today = await owner.get("/api/jars/today");
    expect(today.body.jar).toBeNull();
  });
});

describe("서재 7개 제한", () => {
  it("7개 보관 중 완료하기 → 409 JAR_LIMIT + details에 현재 목록", async () => {
    // 하루 1병 제약 때문에 과거 날짜 유리병은 직접 삽입 (계획서 §8 백데이트 헬퍼와 동일 방식)
    const ownerRow = await prisma.user.findUnique({ where: { loginId: uid } });
    for (let i = 1; i <= 7; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await prisma.jar.create({
        data: {
          userId: ownerRow!.id,
          recordDate: kstDateToDb(d),
          emotions: { create: [{ emotionId: 1, count: 1 }] },
        },
      });
    }

    const res = await owner.post("/api/jars").send({ emotions: [{ emotionId: 3, count: 1 }] });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("JAR_LIMIT");
    expect(res.body.error.details.jars).toHaveLength(7);
  });

  it("가득 찬 서재에 오늘 기록이 포함돼 있으면 JAR_LIMIT이 아니라 JAR_ALREADY_TODAY", async () => {
    // 가장 오래된 병 하나 비우고 오늘 병 생성 → 다시 7개(오늘 포함)
    const ownerRow = await prisma.user.findUnique({ where: { loginId: uid } });
    const oldest = await prisma.jar.findFirst({
      where: { userId: ownerRow!.id },
      orderBy: { recordDate: "asc" },
    });
    await prisma.jar.delete({ where: { id: oldest!.id } });

    const created = await owner.post("/api/jars").send({ emotions: [{ emotionId: 3, count: 1 }] });
    expect(created.status).toBe(201);

    const retry = await owner.post("/api/jars").send({ emotions: [{ emotionId: 4, count: 1 }] });
    expect(retry.status).toBe(409);
    expect(retry.body.error.code).toBe("JAR_ALREADY_TODAY"); // "비우세요" 오안내 방지
  });
});
