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

describe("친구 탭 — 친구별 최신 유리병 1개", () => {
  it("GET /friends/jars — 친구마다 최신 유리병, 없는 친구는 null", async () => {
    // B: 어제 유리병(직접 삽입) + 오늘 유리병(API) 2개 → "최신"이 오늘 것인지 검증
    const bRow = await prisma.user.findUnique({ where: { loginId: uidB } });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await prisma.jar.create({
      data: {
        userId: bRow!.id,
        recordDate: new Date(`${yesterday}T00:00:00.000Z`),
        emotions: { create: [{ emotionId: 10, count: 1 }] },
      },
    });
    const todayJar = await b.post("/api/jars").send({ emotions: [{ emotionId: 2, count: 1 }] });

    await a.post("/api/friends").send({ friendLoginId: uidC }); // C는 유리병 없음

    const res = await a.get("/api/friends/jars");
    expect(res.status).toBe(200);
    expect(res.body.friends).toHaveLength(2);

    const byLoginId = Object.fromEntries(res.body.friends.map((f: any) => [f.loginId, f.jar]));
    expect(byLoginId[uidB].id).toBe(todayJar.body.id); // 어제 것이 아닌 오늘(최신) 것
    expect(byLoginId[uidB].emotions[0]).toHaveProperty("colorHex");
    expect(byLoginId[uidC]).toBeNull(); // 완성 안 한 친구 → 비활성 슬롯
  });
});

describe("친구 다중 삭제", () => {
  it("전체 성공 — { deleted: n }, 쌍방 해제", async () => {
    const res = await a.delete("/api/friends").send({ friendLoginIds: [uidB, uidC] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: 2 });

    const myList = await a.get("/api/friends");
    expect(myList.body.total).toBe(0);
    // 상대 쪽 행도 함께 삭제됨
    const bList = await b.get("/api/friends");
    expect(bList.body.total).toBe(0);
    // 해제 후 친구 탭 선반도 빈 배열
    const shelf = await a.get("/api/friends/jars");
    expect(shelf.body.friends).toHaveLength(0);
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
