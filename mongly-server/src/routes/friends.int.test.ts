// 친구 기능 통합 테스트 — 실제 DB + 시드 필요 (npm run test:int)
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

process.env.JWT_SECRET ??= "test-secret";

const uid = `f${Date.now().toString(36)}`; // 접두사 f + 유니크
const uidA = `${uid}에이`; // 한글 아이디 — URL 인코딩 경로 검증 겸용
const uidB = `${uid}비`;
const uidC = `${uid}씨`;
const PW = "password123";

const app = createApp();
const a = request.agent(app);
const b = request.agent(app);
const c = request.agent(app);

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
  await a.post("/api/auth/signup").send({ loginId: uidA, password: PW, termsAgreed: true });
  await b.post("/api/auth/signup").send({ loginId: uidB, password: PW, termsAgreed: true });
  await c.post("/api/auth/signup").send({ loginId: uidC, password: PW, termsAgreed: true });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { loginId: { startsWith: uid } } });
  await prisma.$disconnect();
});

describe("친구 추가", () => {
  it("정확한 아이디로 추가 201 → 쌍방 성립", async () => {
    const res = await a.post("/api/friends").send({ friendLoginId: uidB });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ loginId: uidB });

    // 상대(B) 목록에도 내가 보인다 (쌍방 2행)
    const bList = await b.get("/api/friends");
    expect(bList.body.total).toBe(1);
    expect(bList.body.friends[0].loginId).toBe(uidA);
  });

  it("없는 아이디 404 / 자기 자신 400 / 이미 친구 409 — 에러 코드 구분", async () => {
    const notFound = await a.post("/api/friends").send({ friendLoginId: "없는아이디입니다" });
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe("USER_NOT_FOUND");

    const self = await a.post("/api/friends").send({ friendLoginId: uidA });
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe("SELF_FRIEND");

    const dup = await a.post("/api/friends").send({ friendLoginId: uidB });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("ALREADY_FRIEND");
  });
});

describe("친구 서재 열람", () => {
  it("친구의 유리병 목록 { owner, jars } — 한글 아이디 URL 인코딩 경로", async () => {
    await b.post("/api/jars").send({ emotions: [{ emotionId: 2, count: 1 }] });

    const res = await a.get(`/api/friends/${encodeURIComponent(uidB)}/jars`);
    expect(res.status).toBe(200);
    expect(res.body.owner).toBe(uidB);
    expect(res.body.jars).toHaveLength(1);
    expect(res.body.jars[0].emotions[0]).toHaveProperty("colorHex");
  });

  it("친구가 아니면 403", async () => {
    const res = await c.get(`/api/friends/${encodeURIComponent(uidB)}/jars`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("친구 다중 삭제", () => {
  it("전체 성공 — { deleted: n }, 쌍방 해제", async () => {
    await a.post("/api/friends").send({ friendLoginId: uidC });

    const res = await a.delete("/api/friends").send({ friendLoginIds: [uidB, uidC] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: 2 });

    const myList = await a.get("/api/friends");
    expect(myList.body.total).toBe(0);
    // 상대 쪽 행도 함께 삭제됨
    const bList = await b.get("/api/friends");
    expect(bList.body.total).toBe(0);
    // 해제 후 서재 접근 403
    const jars = await a.get(`/api/friends/${encodeURIComponent(uidB)}/jars`);
    expect(jars.status).toBe(403);
  });

  it("목록에 없는 아이디가 섞이면 전체 실패 (부분 삭제 없음)", async () => {
    await a.post("/api/friends").send({ friendLoginId: uidB });

    const res = await a.delete("/api/friends").send({ friendLoginIds: [uidB, uidC] }); // C는 친구 아님
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("FRIEND_NOT_FOUND");

    const myList = await a.get("/api/friends"); // B와의 관계는 그대로
    expect(myList.body.total).toBe(1);
  });
});

describe("친구 10명 제한", () => {
  it("내가 가득 차면 FRIEND_LIMIT_ME, 상대가 가득 차면 FRIEND_LIMIT_TARGET", async () => {
    // A를 10명으로 채운다 (B 1명 + 더미 9명 직접 삽입)
    const aRow = await prisma.user.findUnique({ where: { loginId: uidA } });
    const dummies = await Promise.all(
      Array.from({ length: 9 }, (_, i) =>
        prisma.user.create({
          data: { loginId: `${uid}더미${i}`, passwordHash: "x", termsAgreedAt: new Date() },
        }),
      ),
    );
    await prisma.friendship.createMany({
      data: dummies.flatMap((d) => [
        { userId: aRow!.id, friendId: d.id },
        { userId: d.id, friendId: aRow!.id },
      ]),
    });

    const mine = await a.post("/api/friends").send({ friendLoginId: uidC });
    expect(mine.status).toBe(409);
    expect(mine.body.error.code).toBe("FRIEND_LIMIT_ME");

    // C가 (가득 찬) A를 추가하려는 방향 — 상대 한도
    const target = await c.post("/api/friends").send({ friendLoginId: uidA });
    expect(target.status).toBe(409);
    expect(target.body.error.code).toBe("FRIEND_LIMIT_TARGET");
  });
});
