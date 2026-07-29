// 유리병 + 드래프트 통합 테스트 — 실제 DB + 감정 시드 필요 (`npm run test:int`)
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { kstDateToDb } from "../utils/kst";

process.env.JWT_SECRET ??= "test-secret";

const uid = `j${Date.now().toString(36)}`;
const PW = "password123";

const app = createApp();
const owner = request.agent(app);
const stranger = request.agent(app);

const signup = (a: ReturnType<typeof request.agent>, tag: string) =>
  a.post("/api/auth/signup").send({
    email: `${uid}${tag}@example.com`,
    loginId: `${uid}${tag}`,
    password: PW,
    termsAgreed: true,
  });

// 드래그 여러 번 → 완성. (하루 1병이라 테스트당 owner 드래프트를 비우고 시작)
async function drag(a: ReturnType<typeof request.agent>, emotionId: number) {
  return a.post("/api/jars/draft/emotions").send({ emotionId });
}

let ownerId: string;

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
  await signup(owner, "o");
  await signup(stranger, "s");
  ownerId = (await prisma.user.findUnique({ where: { loginId: `${uid}o` } }))!.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { loginId: { startsWith: uid } } });
  await prisma.$disconnect();
});

// 각 describe가 깨끗한 오늘 상태에서 시작하도록 owner의 오늘 유리병·드래프트 정리
async function resetToday() {
  const today = kstDateToDb(new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10));
  await prisma.jar.deleteMany({ where: { userId: ownerId, recordDate: today } });
  await prisma.draftEmotion.deleteMany({ where: { userId: ownerId } });
}

describe("감정 마스터", () => {
  it("GET /emotions — 시드된 10종 + 기준색", async () => {
    const res = await request(app).get("/api/emotions");
    expect(res.status).toBe(200);
    expect(res.body.emotions).toHaveLength(10);
    expect(res.body.emotions[0]).toMatchObject({ id: 1, colorHex: expect.stringMatching(/^#/) });
  });
});

describe("드래프트: 담기 / 되돌리기 / 오늘 상태", () => {
  beforeEach(resetToday);

  it("드래그하면 즉시 집계 반영 (분노2+슬픔1, dominant=분노)", async () => {
    await drag(owner, 1);
    await drag(owner, 6);
    const res = await drag(owner, 1);
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(3);
    expect(res.body.dominantEmotionId).toBe(1);
    const anger = res.body.emotions.find((e: any) => e.emotionId === 1);
    expect(anger).toMatchObject({ count: 2, colorHex: expect.stringMatching(/^#/) });
  });

  it("GET /jars/today — 담는 중이면 { jar:null, draft:{...} }", async () => {
    await drag(owner, 3);
    const res = await owner.get("/api/jars/today");
    expect(res.status).toBe(200);
    expect(res.body.jar).toBeNull();
    expect(res.body.draft.total).toBe(1);
  });

  it("되돌리기 — 마지막 담은 감정 1개 제거", async () => {
    await drag(owner, 1);
    await drag(owner, 6);
    const undo = await owner.delete("/api/jars/draft/emotions").send();
    expect(undo.status).toBe(200);
    expect(undo.body.total).toBe(1);
    expect(undo.body.emotions[0].emotionId).toBe(1); // 슬픔(마지막)이 제거되고 분노만 남음
  });

  it("빈 병에서 되돌리기 → 409 DRAFT_EMPTY", async () => {
    const undo = await owner.delete("/api/jars/draft/emotions").send();
    expect(undo.status).toBe(409);
    expect(undo.body.error.code).toBe("DRAFT_EMPTY");
  });

  it("존재하지 않는 감정 담기 → 400 INVALID_EMOTION", async () => {
    const res = await drag(owner, 999);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_EMOTION");
  });

  it("8번째 담기 → 409 DRAFT_FULL", async () => {
    for (let i = 0; i < 7; i++) await drag(owner, 1);
    const eighth = await drag(owner, 2);
    expect(eighth.status).toBe(409);
    expect(eighth.body.error.code).toBe("DRAFT_FULL");
  });
});

describe("완성 / 조회 / 삭제", () => {
  beforeEach(resetToday);

  it("완성하기(바디 없음) 201 → 드래프트가 유리병으로, 드래프트는 비워짐", async () => {
    await drag(owner, 6);
    await drag(owner, 1);
    await drag(owner, 1);
    const res = await owner.post("/api/jars").send();
    expect(res.status).toBe(201);
    expect(res.body.dominantEmotionId).toBe(1);
    expect(res.body.emotions).toHaveLength(2);
    expect(res.body.id).toBeTruthy();

    // 완성 후 오늘 상태는 완성본 + draft:null
    const today = await owner.get("/api/jars/today");
    expect(today.body.jar.id).toBe(res.body.id);
    expect(today.body.draft).toBeNull();
  });

  it("빈 병 완성 → 400 DRAFT_EMPTY", async () => {
    const res = await owner.post("/api/jars").send();
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("DRAFT_EMPTY");
  });

  it("완성 후 재드래그 → 409 JAR_ALREADY_TODAY", async () => {
    await drag(owner, 2);
    await owner.post("/api/jars").send();
    const again = await drag(owner, 3);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("JAR_ALREADY_TODAY");
  });

  it("완성 후 재완성 → 409 JAR_ALREADY_TODAY", async () => {
    await drag(owner, 2);
    await owner.post("/api/jars").send();
    const again = await owner.post("/api/jars").send();
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("JAR_ALREADY_TODAY");
  });

  it("서재 목록 / 남의 상세 403 / 삭제 본인만", async () => {
    await drag(owner, 6);
    const jar = await owner.post("/api/jars").send();
    const jarId = jar.body.id;

    const list = await owner.get("/api/jars");
    expect(list.body.jars.some((j: any) => j.id === jarId)).toBe(true);

    const forbidden = await stranger.get(`/api/jars/${jarId}`);
    expect(forbidden.status).toBe(403);

    const del = await owner.delete(`/api/jars/${jarId}`).send();
    expect(del.status).toBe(200);
    const today = await owner.get("/api/jars/today");
    expect(today.body.jar).toBeNull();
  });
});

describe("서재 7개 제한", () => {
  beforeEach(resetToday);

  it("과거 7병 보관 중 오늘 완성 → 409 JAR_LIMIT + 드래프트 보존", async () => {
    // 하루 1병 제약 때문에 과거 날짜 7병은 직접 삽입 (백데이트)
    for (let i = 1; i <= 7; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      await prisma.jar.create({
        data: {
          userId: ownerId,
          recordDate: kstDateToDb(d),
          emotions: { create: [{ emotionId: 1, count: 1 }] },
        },
      });
    }
    await drag(owner, 3);
    const res = await owner.post("/api/jars").send();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("JAR_LIMIT");
    expect(res.body.error.details.jars).toHaveLength(7);

    // 드래프트는 보존되어 서재 비운 뒤 재완성 가능
    const state = await owner.get("/api/jars/today");
    expect(state.body.draft.total).toBe(1);

    await prisma.jar.deleteMany({ where: { userId: ownerId } });
  });
});
