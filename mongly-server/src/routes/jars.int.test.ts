// 유리병 + 드래프트 통합 테스트 — 실제 DB + 감정 시드 필요 (`npm run test:int`)
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { getKstToday, kstDateToDb } from "../utils/kst";

process.env.JWT_SECRET ??= "test-secret";

const uid = `j${Date.now().toString(36)}`;
const PW = "password123";
const inactiveEmotionId = 1000 + Number.parseInt(uid.slice(-5), 36);

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

function daysAgo(days: number): Date {
  const date = kstDateToDb(getKstToday());
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

async function makeJar(note?: string) {
  await drag(owner, 1);
  return owner.post("/api/jars").send(note === undefined ? {} : { note });
}

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
  await signup(owner, "o");
  await signup(stranger, "s");
  ownerId = (await prisma.user.findUnique({ where: { loginId: `${uid}o` } }))!.id;
  await prisma.emotion.createMany({ data: [0, 1].map((offset) => ({
    id: inactiveEmotionId + offset, name: `${uid}retired${offset}`, colorHex: "#000000",
    sortOrder: 100 + offset, isActive: false,
  })) });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { loginId: { startsWith: uid } } });
  await prisma.emotion.deleteMany({ where: { id: { in: [inactiveEmotionId, inactiveEmotionId + 1] } } });
  await prisma.$disconnect();
});

// 각 테스트의 과거 병/오늘 병/드래프트를 격리한다. 운영 DB에서는 실행하지 않는다.
async function resetToday() {
  await prisma.jar.deleteMany({ where: { userId: ownerId } });
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

  it("6개 상태에서 동시에 두 개를 담아도 하나만 성공하고 총 7개", async () => {
    for (let i = 0; i < 6; i++) await drag(owner, 1);
    const attempts = await Promise.all([drag(owner, 2), drag(owner, 3)]);
    expect(attempts.map((response) => response.status).sort()).toEqual([201, 409]);
    expect((await owner.get("/api/jars/today")).body.draft.total).toBe(7);
  });

  it("동시 되돌리기 두 번은 서로 다른 마지막 행을 지운다", async () => {
    await drag(owner, 1);
    await drag(owner, 2);
    const responses = await Promise.all([
      owner.delete("/api/jars/draft/emotions").send(), owner.delete("/api/jars/draft/emotions").send(),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect((await owner.get("/api/jars/today")).body.draft.total).toBe(0);
  });

  it("담기와 완성 경합 시 성공한 담기를 잃지 않고 완성 후 드래프트가 남지 않는다", async () => {
    await drag(owner, 1);
    const [addition, completion] = await Promise.all([drag(owner, 2), owner.post("/api/jars").send()]);
    expect(completion.status).toBe(201);
    expect([201, 409]).toContain(addition.status);
    const today = await owner.get("/api/jars/today");
    expect(today.body.draft).toBeNull();
    const total = today.body.jar.emotions.reduce((sum: number, emotion: { count: number }) => sum + emotion.count, 0);
    expect(total).toBe(addition.status === 201 ? 2 : 1);
    expect(await prisma.draftEmotion.count({ where: { userId: ownerId } })).toBe(0);
  });
});

describe("완성 / 조회 / 삭제", () => {
  beforeEach(resetToday);

  it("완성하기 201 → 드래프트가 유리병으로(감정 데이터 포함), 드래프트는 비워짐", async () => {
    await drag(owner, 6);
    await drag(owner, 1);
    await drag(owner, 1);
    const res = await owner.post("/api/jars").send();
    expect(res.status).toBe(201);
    expect(res.body.dominantEmotionId).toBe(1);
    expect(res.body.emotions).toHaveLength(2);
    expect(res.body.id).toBeTruthy();
    expect(res.body.imageUrl).toBeUndefined();
    expect(res.body).toMatchObject({ note: null, version: 1, likeCount: 0, likedByMe: false, canLike: false, canEdit: true });
    expect(res.body.updatedAt).toBe(res.body.createdAt);

    // 완성 후 오늘 상태는 완성본 + draft:null
    const today = await owner.get("/api/jars/today");
    expect(today.body.jar.id).toBe(res.body.id);
    expect(today.body.jar.emotions).toHaveLength(2);
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

  it("동시 완성은 병 하나만 만들고 나머지는 409", async () => {
    await drag(owner, 2);
    const attempts = await Promise.all([owner.post("/api/jars").send(), owner.post("/api/jars").send()]);
    expect(attempts.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.jar.count({ where: { userId: ownerId } })).toBe(1);
  });

  it("한 줄 일기를 정규화해 저장하고 오늘/목록/상세 모두 같은 note를 반환", async () => {
    const created = await makeJar("  한글로 남긴 하루 😀  ");
    expect(created.status).toBe(201);
    const note = "한글로 남긴 하루 😀";
    expect(created.body.note).toBe(note);
    expect((await owner.get("/api/jars/today")).body.jar.note).toBe(note);
    expect((await owner.get("/api/jars")).body.jars[0].note).toBe(note);
    expect((await owner.get(`/api/jars/${created.body.id}`)).body.note).toBe(note);
  });

  it("일기 검증 실패는 드래프트를 보존한다", async () => {
    await drag(owner, 3);
    const invalid = await owner.post("/api/jars").send({ note: "가".repeat(51) });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION");
    expect((await owner.get("/api/jars/today")).body.draft.total).toBe(1);
    expect(await prisma.jar.count({ where: { userId: ownerId } })).toBe(0);
  });

  it("NUL을 포함한 병 ID는 상세/수정/삭제 모두 400으로 거부한다", async () => {
    const results = await Promise.all([
      owner.get("/api/jars/bad%00id"),
      owner.patch("/api/jars/bad%00id").send({ expectedVersion: 1, note: "기록" }),
      owner.delete("/api/jars/bad%00id"),
    ]);
    expect(results.map((result) => result.status)).toEqual([400, 400, 400]);
    for (const result of results) expect(result.body.error.code).toBe("VALIDATION");
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

describe("서재 무제한 보관 및 날짜 커서", () => {
  beforeEach(resetToday);

  it("과거 7병 보관 중 오늘 완성 → 8병 모두 보존하며 기본 목록은 첫 7병", async () => {
    // 과거 날짜 7병 삽입 (1~7일 전)
    const oldestDate = daysAgo(7).toISOString().slice(0, 10);
    for (let i = 1; i <= 7; i++) {
      const d = daysAgo(i);
      await prisma.jar.create({
        data: {
          userId: ownerId,
          recordDate: d,
          emotions: { create: [{ emotionId: 1, count: 1 }] },
        },
      });
    }

    const beforeCount = await prisma.jar.count({ where: { userId: ownerId } });
    expect(beforeCount).toBe(7);

    // 오늘 감정 담고 완성하기
    await drag(owner, 3);
    const res = await owner.post("/api/jars").send();
    expect(res.status).toBe(201);

    expect(await prisma.jar.count({ where: { userId: ownerId } })).toBe(8);
    // 기본 페이지 크기만 7개이며 저장된 병 수와는 무관하다.
    const listRes = await owner.get("/api/jars");
    expect(listRes.body.jars).toHaveLength(7);
    expect(listRes.body.hasMore).toBe(true);
    expect(listRes.body.nextCursor).toEqual(expect.any(String));

    const nextPage = await owner.get("/api/jars").query({ cursor: listRes.body.nextCursor });
    expect(nextPage.body.jars).toHaveLength(1);
    expect(nextPage.body.jars[0].recordDate).toBe(oldestDate);
    expect(nextPage.body).toMatchObject({ hasMore: false, nextCursor: null });
  });

  it("페이지 기준 병 삭제와 새 병 삽입 후에도 다음 과거 페이지를 이어 읽는다", async () => {
    for (let i = 1; i <= 5; i++) {
      await prisma.jar.create({ data: {
        userId: ownerId, recordDate: daysAgo(i), emotions: { create: [{ emotionId: 1, count: 1 }] },
      } });
    }
    const first = await owner.get("/api/jars").query({ limit: 2 });
    expect(first.body.jars).toHaveLength(2);
    await owner.delete(`/api/jars/${first.body.jars[1].id}`);
    await makeJar();
    const second = await owner.get("/api/jars").query({ limit: 2, cursor: first.body.nextCursor });
    expect(second.body.jars.map((jar: { recordDate: string }) => jar.recordDate))
      .toEqual([daysAgo(3), daysAgo(4)].map((date) => date.toISOString().slice(0, 10)));
    const third = await owner.get("/api/jars").query({ limit: 2, cursor: second.body.nextCursor });
    expect(third.body.jars[0].recordDate).toBe(daysAgo(5).toISOString().slice(0, 10));
    expect(third.body).toMatchObject({ hasMore: false, nextCursor: null });
    const ownEmpty = await stranger.get("/api/jars").query({ cursor: first.body.nextCursor });
    expect(ownEmpty.body).toEqual({ jars: [], nextCursor: null, hasMore: false });
  });

  it("빈 목록·잘못된 커서·중복 query 값", async () => {
    expect((await owner.get("/api/jars")).body).toEqual({ jars: [], nextCursor: null, hasMore: false });
    expect((await owner.get("/api/jars?limit=1&limit=2")).status).toBe(400);
    expect((await owner.get("/api/jars").query({ cursor: "invalid" })).status).toBe(400);
    expect((await owner.get("/api/jars").query({ limit: 51 })).status).toBe(400);
  });
});

describe("KST 오늘 병의 감정·일기 편집", () => {
  beforeEach(resetToday);

  it("감정 전체 교체·일기 저장이 같은 ID/날짜/생성시각에서 원자적으로 반영", async () => {
    const original = await makeJar("처음 기록");
    const changed = await owner.patch(`/api/jars/${original.body.id}`).send({
      expectedVersion: 1, note: "  달라진 마음  ", emotions: [{ emotionId: 3, count: 2 }, { emotionId: 6, count: 1 }],
    });
    expect(changed.status).toBe(200);
    expect(changed.body).toMatchObject({
      id: original.body.id, recordDate: original.body.recordDate, createdAt: original.body.createdAt,
      note: "달라진 마음", version: 2, dominantEmotionId: 3, canEdit: true,
    });
    expect(changed.body.emotions.map((emotion: { emotionId: number; count: number }) => ({ emotionId: emotion.emotionId, count: emotion.count })))
      .toEqual([{ emotionId: 3, count: 2 }, { emotionId: 6, count: 1 }]);
    const today = await owner.get("/api/jars/today");
    expect(today.body.jar).toEqual(changed.body);
    expect(today.body.draft).toBeNull();
  });

  it("note 생략은 유지, 명시적 null은 지우기, 같은 내용의 no-op은 version/updatedAt 유지", async () => {
    const original = await makeJar("유지할 일기");
    const changed = await owner.patch(`/api/jars/${original.body.id}`).send({
      expectedVersion: 1, emotions: [{ emotionId: 6, count: 1 }, { emotionId: 1, count: 1 }],
    });
    expect(changed.body.note).toBe("유지할 일기");
    const noop = await owner.patch(`/api/jars/${original.body.id}`).send({
      expectedVersion: 2, note: "  유지할 일기  ", emotions: [{ emotionId: 1, count: 1 }, { emotionId: 6, count: 1 }],
    });
    expect(noop.status).toBe(200);
    expect(noop.body).toEqual(changed.body);
    const cleared = await owner.patch(`/api/jars/${original.body.id}`).send({ expectedVersion: 2, note: null });
    expect(cleared.body).toMatchObject({ note: null, version: 3 });
    expect(cleared.body.emotions).toEqual(changed.body.emotions);
  });

  it("같은 expectedVersion의 다른 동시 편집은 하나만 성공", async () => {
    const original = await makeJar();
    const results = await Promise.all(["한 기기", "다른 기기"].map((note) => owner.patch(`/api/jars/${original.body.id}`)
      .send({ expectedVersion: 1, note })));
    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
    const winner = results.find((response) => response.status === 200)!;
    const loser = results.find((response) => response.status === 409)!;
    expect(loser.body.error).toMatchObject({ code: "JAR_VERSION_CONFLICT", details: { currentVersion: 2 } });
    expect((await owner.get(`/api/jars/${original.body.id}`)).body.note).toBe(winner.body.note);
    // 응답 유실 재시도처럼 결과 내용이 같더라도 오래된 버전은 충돌이다.
    const retry = await owner.patch(`/api/jars/${original.body.id}`).send({ expectedVersion: 1, note: winner.body.note });
    expect(retry.status).toBe(409);
  });

  it("다른 사람·과거 병·없는 병은 수정할 수 없고 오늘 초안은 유지", async () => {
    const previous = await prisma.jar.create({ data: {
      userId: ownerId, recordDate: daysAgo(1), note: "어제 일기", emotions: { create: [{ emotionId: 1, count: 1 }] },
    } });
    await drag(owner, 2);
    const past = await owner.patch(`/api/jars/${previous.id}`).send({ expectedVersion: 1, note: "바꾸기" });
    expect(past.status).toBe(409);
    expect(past.body.error.code).toBe("JAR_EDIT_WINDOW_CLOSED");
    expect((await owner.get(`/api/jars/${previous.id}`)).body).toMatchObject({ note: "어제 일기", canEdit: false, version: 1 });
    expect((await owner.get("/api/jars/today")).body.draft.total).toBe(1);
    expect((await stranger.patch(`/api/jars/${previous.id}`).send({ expectedVersion: 1, note: "침입" })).status).toBe(403);
    expect((await owner.patch("/api/jars/missing").send({ expectedVersion: 1, note: null })).status).toBe(404);
  });

  it("기존 비활성 감정은 note-only·유지·감소가 가능하지만 신규 추가·증가는 불가", async () => {
    const original = await prisma.jar.create({ data: {
      userId: ownerId, recordDate: daysAgo(0), emotions: { create: [{ emotionId: inactiveEmotionId, count: 2 }] },
    } });
    const noteOnly = await owner.patch(`/api/jars/${original.id}`).send({ expectedVersion: 1, note: "과거 감정 유지" });
    expect(noteOnly.status).toBe(200);
    const increased = await owner.patch(`/api/jars/${original.id}`).send({
      expectedVersion: 2, emotions: [{ emotionId: inactiveEmotionId, count: 3 }],
    });
    expect(increased.status).toBe(400);
    expect(increased.body.error.code).toBe("INVALID_EMOTION");
    const newInactive = await owner.patch(`/api/jars/${original.id}`).send({
      expectedVersion: 2, emotions: [{ emotionId: inactiveEmotionId + 1, count: 1 }],
    });
    expect(newInactive.status).toBe(400);
    const decreased = await owner.patch(`/api/jars/${original.id}`).send({
      expectedVersion: 2, emotions: [{ emotionId: inactiveEmotionId, count: 1 }, { emotionId: 1, count: 1 }],
    });
    expect(decreased.status).toBe(200);
    expect(decreased.body.version).toBe(3);
  });

  it("잘못된 감정 구성은 note/version/기존 감정을 함께 보존", async () => {
    const original = await makeJar("그대로");
    const invalid = await owner.patch(`/api/jars/${original.body.id}`).send({
      expectedVersion: 1, note: "저장되면 안 됨", emotions: [{ emotionId: 2147483647, count: 1 }],
    });
    expect(invalid.status).toBe(400);
    expect((await owner.get(`/api/jars/${original.body.id}`)).body).toEqual(original.body);
  });
});
