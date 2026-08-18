// 유리병 + 드래프트 통합 테스트 — 실제 DB + 감정 시드 필요 (`npm run test:int`)
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { JAR_IMAGE_MAX_BYTES } from "../lib/image";
import { prisma } from "../lib/prisma";
import { kstDateToDb } from "../utils/kst";

process.env.JWT_SECRET ??= "test-secret";

const uid = `j${Date.now().toString(36)}`;
const PW = "password123";

// 1×1 투명 PNG — 완성하기 이미지 페이로드 (프론트 canvas.toDataURL 대역)
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const IMAGE_BODY = { image: `data:image/png;base64,${TINY_PNG_B64}` };

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
  it("GET /emotions — 시드된 10종 + 기준색 (2026-08-17 합의 목록)", async () => {
    const res = await request(app).get("/api/emotions");
    expect(res.status).toBe(200);
    expect(res.body.emotions).toHaveLength(10);
    expect(res.body.emotions[0]).toMatchObject({ id: 1, name: "기쁨", colorHex: expect.stringMatching(/^#/) });
    expect(res.body.emotions.map((e: any) => e.name)).toEqual([
      "기쁨", "슬픔", "분노", "놀람", "불안", "사랑", "짜증", "설렘", "후회", "희망",
    ]);
  });
});

describe("드래프트: 담기 / 되돌리기 / 오늘 상태", () => {
  beforeEach(resetToday);

  it("드래그하면 즉시 집계 반영 (기쁨2+사랑1, dominant=기쁨)", async () => {
    await drag(owner, 1);
    await drag(owner, 6);
    const res = await drag(owner, 1);
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(3);
    expect(res.body.dominantEmotionId).toBe(1);
    const joy = res.body.emotions.find((e: any) => e.emotionId === 1);
    expect(joy).toMatchObject({ count: 2, colorHex: expect.stringMatching(/^#/) });
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
    expect(undo.body.emotions[0].emotionId).toBe(1); // 사랑(마지막)이 제거되고 기쁨만 남음
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

  it("완성하기(PNG 포함) 201 → 드래프트가 유리병으로, imageUrl 포함, 드래프트는 비워짐", async () => {
    await drag(owner, 6);
    await drag(owner, 1);
    await drag(owner, 1);
    const res = await owner.post("/api/jars").send(IMAGE_BODY);
    expect(res.status).toBe(201);
    expect(res.body.dominantEmotionId).toBe(1);
    expect(res.body.emotions).toHaveLength(2);
    expect(res.body.id).toBeTruthy();
    expect(res.body.imageUrl).toBe(`/api/jars/${res.body.id}/image`);

    // 완성 후 오늘 상태는 완성본 + draft:null
    const today = await owner.get("/api/jars/today");
    expect(today.body.jar.id).toBe(res.body.id);
    expect(today.body.draft).toBeNull();
  });

  it("이미지 없이 완성 → 400 VALIDATION", async () => {
    await drag(owner, 2);
    const res = await owner.post("/api/jars").send();
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
  });

  it("PNG가 아닌 이미지로 완성 → 400 IMAGE_INVALID (드래프트 보존)", async () => {
    await drag(owner, 2);
    const res = await owner
      .post("/api/jars")
      .send({ image: Buffer.from("not a png").toString("base64") });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("IMAGE_INVALID");

    const state = await owner.get("/api/jars/today");
    expect(state.body.draft.total).toBe(1); // 실패했으니 드래프트 그대로
  });

  it("1MB 초과 이미지로 완성 → 413 IMAGE_TOO_LARGE", async () => {
    await drag(owner, 2);
    const big = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(JAR_IMAGE_MAX_BYTES),
    ]);
    const res = await owner.post("/api/jars").send({ image: big.toString("base64") });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("IMAGE_TOO_LARGE");
  });

  it("빈 병 완성 → 400 DRAFT_EMPTY", async () => {
    const res = await owner.post("/api/jars").send(IMAGE_BODY);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("DRAFT_EMPTY");
  });

  it("완성 후 재드래그 → 409 JAR_ALREADY_TODAY", async () => {
    await drag(owner, 2);
    await owner.post("/api/jars").send(IMAGE_BODY);
    const again = await drag(owner, 3);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("JAR_ALREADY_TODAY");
  });

  it("완성 후 재완성 → 409 JAR_ALREADY_TODAY", async () => {
    await drag(owner, 2);
    await owner.post("/api/jars").send(IMAGE_BODY);
    const again = await owner.post("/api/jars").send(IMAGE_BODY);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("JAR_ALREADY_TODAY");
  });

  it("서재 목록 / 남의 상세 403 / 삭제 본인만", async () => {
    await drag(owner, 6);
    const jar = await owner.post("/api/jars").send(IMAGE_BODY);
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

  it("GET /jars/:id/image — 본인 200 image/png(업로드 원본 그대로) / 남 403 / 삭제 후 404", async () => {
    await drag(owner, 4);
    const jar = await owner.post("/api/jars").send(IMAGE_BODY);
    const jarId = jar.body.id;

    const img = await owner.get(`/api/jars/${jarId}/image`);
    expect(img.status).toBe(200);
    expect(img.headers["content-type"]).toContain("image/png");
    expect(img.headers["cache-control"]).toBe("private, max-age=3600");
    expect(Buffer.from(img.body).equals(Buffer.from(TINY_PNG_B64, "base64"))).toBe(true);

    const forbidden = await stranger.get(`/api/jars/${jarId}/image`);
    expect(forbidden.status).toBe(403);

    await owner.delete(`/api/jars/${jarId}`).send(); // JarImage는 Cascade 삭제
    const gone = await owner.get(`/api/jars/${jarId}/image`);
    expect(gone.status).toBe(404);
    expect(gone.body.error.code).toBe("JAR_NOT_FOUND");
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
    const res = await owner.post("/api/jars").send(IMAGE_BODY);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("JAR_LIMIT");
    expect(res.body.error.details.jars).toHaveLength(7);

    // 드래프트는 보존되어 서재 비운 뒤 재완성 가능
    const state = await owner.get("/api/jars/today");
    expect(state.body.draft.total).toBe(1);

    await prisma.jar.deleteMany({ where: { userId: ownerId } });
  });
});
