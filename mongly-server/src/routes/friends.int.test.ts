// 친구 요청/수락 + 친구 기능 통합 테스트 — 실제 DB + 시드 필요 (npm run test:int)
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

// 1×1 투명 PNG — 완성하기 이미지 페이로드
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const app = createApp();
const a = request.agent(app);
const b = request.agent(app);
const c = request.agent(app);

const signup = (agent: ReturnType<typeof request.agent>, nick: string, tag: string) =>
  agent.post("/api/auth/signup").send({
    email: `${uid}${tag}@example.com`,
    loginId: nick,
    password: PW,
    termsAgreed: true,
  });

// 유리병 완성 = 드래그 후 PNG와 함께 완성
async function makeJar(agent: ReturnType<typeof request.agent>, emotionId: number) {
  await agent.post("/api/jars/draft/emotions").send({ emotionId });
  return agent.post("/api/jars").send({ image: `data:image/png;base64,${TINY_PNG_B64}` });
}

// A→B 요청을 보내고 B가 수락 — 여러 describe에서 재사용하는 성립 헬퍼
async function becomeFriends(
  from: ReturnType<typeof request.agent>,
  toLoginId: string,
  to: ReturnType<typeof request.agent>,
) {
  await from.post("/api/friend-requests").send({ toLoginId });
  const inbox = await to.get("/api/friend-requests");
  const req = inbox.body.requests[0];
  return to.post(`/api/friend-requests/${req.id}/accept`).send();
}

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
  await signup(a, uidA, "a");
  await signup(b, uidB, "b");
  await signup(c, uidC, "c");
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { loginId: { startsWith: uid } } });
  await prisma.$disconnect();
});

describe("친구 요청 → 수락으로 성립", () => {
  it("요청 201 pending → 종 아이콘 목록에 뜸 → 수락하면 쌍방 성립 + 요청 사라짐", async () => {
    const sent = await a.post("/api/friend-requests").send({ toLoginId: uidB });
    expect(sent.status).toBe(201);
    expect(sent.body).toEqual({ loginId: uidB, status: "pending" });

    // 요청만으로는 아직 친구가 아니다
    const aList0 = await a.get("/api/friends");
    expect(aList0.body.total).toBe(0);

    // B의 종 아이콘 — 받은 요청 1건 (total = 빨간 점 배지)
    const inbox = await b.get("/api/friend-requests");
    expect(inbox.status).toBe(200);
    expect(inbox.body.total).toBe(1);
    expect(inbox.body.requests[0]).toMatchObject({ fromLoginId: uidA });

    // 수락 → 쌍방 성립
    const accept = await b.post(`/api/friend-requests/${inbox.body.requests[0].id}/accept`).send();
    expect(accept.status).toBe(200);
    expect(accept.body).toEqual({ loginId: uidA });

    const aList = await a.get("/api/friends");
    expect(aList.body.total).toBe(1);
    expect(aList.body.friends[0].loginId).toBe(uidB);
    const bList = await b.get("/api/friends");
    expect(bList.body.total).toBe(1);

    // 처리된 요청은 목록에서 사라짐
    const inboxAfter = await b.get("/api/friend-requests");
    expect(inboxAfter.body.total).toBe(0);
  });

  it("없는 아이디 404 / 자기 자신 400 / 이미 친구 409 — 에러 코드 구분", async () => {
    const notFound = await a.post("/api/friend-requests").send({ toLoginId: "없는아이디입니다" });
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe("USER_NOT_FOUND");

    const self = await a.post("/api/friend-requests").send({ toLoginId: uidA });
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe("SELF_FRIEND");

    const dup = await a.post("/api/friend-requests").send({ toLoginId: uidB }); // 위에서 이미 친구됨
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("ALREADY_FRIEND");
  });

  it("같은 상대에게 두 번 요청 → 409 REQUEST_ALREADY_SENT", async () => {
    await a.post("/api/friend-requests").send({ toLoginId: uidC });
    const again = await a.post("/api/friend-requests").send({ toLoginId: uidC });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("REQUEST_ALREADY_SENT");
  });

  it("거절 — 요청 삭제, 상대는 다시 신청 가능", async () => {
    // 위 테스트에서 A→C 대기 중
    const inbox = await c.get("/api/friend-requests");
    expect(inbox.body.total).toBe(1);

    const reject = await c.post(`/api/friend-requests/${inbox.body.requests[0].id}/reject`).send();
    expect(reject.status).toBe(200);
    expect(reject.body).toEqual({ ok: true });

    expect((await c.get("/api/friend-requests")).body.total).toBe(0);
    expect((await a.get("/api/friends")).body.total).toBe(1); // 여전히 B뿐

    // 재신청 가능
    const resend = await a.post("/api/friend-requests").send({ toLoginId: uidC });
    expect(resend.status).toBe(201);
    expect(resend.body.status).toBe("pending");
  });

  it("받은 사람이 아니면 수락/거절 403, 처리된 요청은 404", async () => {
    // 위 테스트에서 A→C 대기 중
    const inbox = await c.get("/api/friend-requests");
    const reqId = inbox.body.requests[0].id;

    const notMineAccept = await b.post(`/api/friend-requests/${reqId}/accept`).send();
    expect(notMineAccept.status).toBe(403);
    expect(notMineAccept.body.error.code).toBe("FORBIDDEN");

    await c.post(`/api/friend-requests/${reqId}/reject`).send();
    const alreadyGone = await c.post(`/api/friend-requests/${reqId}/accept`).send();
    expect(alreadyGone.status).toBe(404);
    expect(alreadyGone.body.error.code).toBe("REQUEST_NOT_FOUND");
  });

  it("맞요청 — 상대가 이미 나에게 요청해 뒀으면 보내는 즉시 성립(accepted)", async () => {
    await c.post("/api/friend-requests").send({ toLoginId: uidA }); // C→A 대기
    const mutual = await a.post("/api/friend-requests").send({ toLoginId: uidC }); // A→C 맞요청
    expect(mutual.status).toBe(201);
    expect(mutual.body).toEqual({ loginId: uidC, status: "accepted" });

    // 쌍방 성립 + 양쪽 대기 요청 모두 정리
    expect((await a.get("/api/friends")).body.total).toBe(2); // B, C
    expect((await c.get("/api/friends")).body.total).toBe(1);
    expect((await a.get("/api/friend-requests")).body.total).toBe(0);
    expect((await c.get("/api/friend-requests")).body.total).toBe(0);
  });
});

describe("친구 탭 — 친구별 최신 유리병 1개", () => {
  it("GET /friends/jars — 친구마다 최신 유리병(imageUrl 포함), 없는 친구는 null", async () => {
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
    const todayJar = await makeJar(b, 2);

    const res = await a.get("/api/friends/jars");
    expect(res.status).toBe(200);
    expect(res.body.friends).toHaveLength(2); // B, C (맞요청으로 성립)

    const byLoginId = Object.fromEntries(res.body.friends.map((f: any) => [f.loginId, f.jar]));
    expect(byLoginId[uidB].id).toBe(todayJar.body.id); // 어제 것이 아닌 오늘(최신) 것
    expect(byLoginId[uidB].emotions[0]).toHaveProperty("colorHex");
    expect(byLoginId[uidB].imageUrl).toBe(`/api/jars/${todayJar.body.id}/image`);
    expect(byLoginId[uidC]).toBeNull(); // 완성 안 한 친구 → 비활성 슬롯

    // 친구는 유리병 PNG도 볼 수 있다 (선반 렌더)
    const img = await a.get(byLoginId[uidB].imageUrl);
    expect(img.status).toBe(200);
    expect(img.headers["content-type"]).toContain("image/png");
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
    await becomeFriends(a, uidB, b);

    const res = await a.delete("/api/friends").send({ friendLoginIds: [uidB, uidC] }); // C는 친구 아님
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("FRIEND_NOT_FOUND");

    const myList = await a.get("/api/friends"); // B와의 관계는 그대로
    expect(myList.body.total).toBe(1);
  });
});

describe("친구 10명 제한", () => {
  it("보낼 때 내가 가득이면 FRIEND_LIMIT_ME, 수락 시점에 상대가 가득 차 있으면 FRIEND_LIMIT_TARGET(요청 보존)", async () => {
    // A를 10명으로 채운다 (B 1명 + 더미 9명 직접 삽입)
    const aRow = await prisma.user.findUnique({ where: { loginId: uidA } });
    const dummies = await Promise.all(
      Array.from({ length: 9 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `${uid}dummy${i}@example.com`,
            loginId: `${uid}더미${i}`,
            passwordHash: "x",
            termsAgreedAt: new Date(),
          },
        }),
      ),
    );
    await prisma.friendship.createMany({
      data: dummies.flatMap((d) => [
        { userId: aRow!.id, friendId: d.id },
        { userId: d.id, friendId: aRow!.id },
      ]),
    });

    // 가득 찬 내가 요청 보내기 → 수락될 수 없으므로 보내는 시점에 차단
    const mine = await a.post("/api/friend-requests").send({ toLoginId: uidC });
    expect(mine.status).toBe(409);
    expect(mine.body.error.code).toBe("FRIEND_LIMIT_ME");

    // C→A 요청 자체는 가능 (상대 한도는 수락 시점에 판정)
    const sent = await c.post("/api/friend-requests").send({ toLoginId: uidA });
    expect(sent.status).toBe(201);

    // 가득 찬 A가 수락 시도 → 내 한도 초과. 요청은 보존되어 다시 수락 가능해야 함
    const inbox = await a.get("/api/friend-requests");
    const acceptFull = await a.post(`/api/friend-requests/${inbox.body.requests[0].id}/accept`).send();
    expect(acceptFull.status).toBe(409);
    expect(acceptFull.body.error.code).toBe("FRIEND_LIMIT_ME");
    expect((await a.get("/api/friend-requests")).body.total).toBe(1); // 요청 보존

    // 반대 방향: C(요청 보낸 쪽)가 가득 찬 경우 — B가 C의 요청을 수락하는 시나리오로 검증
    await c.post("/api/friend-requests").send({ toLoginId: uidB }); // C→B 대기 (C는 아직 여유)
    const cRow = await prisma.user.findUnique({ where: { loginId: uidC } });
    await prisma.friendship.createMany({
      data: dummies.flatMap((d) => [
        { userId: cRow!.id, friendId: d.id },
        { userId: d.id, friendId: cRow!.id },
      ]),
    });
    // C를 10명으로 채우기 위한 10번째 더미
    const tenth = await prisma.user.create({
      data: {
        email: `${uid}dummy9@example.com`,
        loginId: `${uid}더미아홉`,
        passwordHash: "x",
        termsAgreedAt: new Date(),
      },
    });
    await prisma.friendship.createMany({
      data: [
        { userId: cRow!.id, friendId: tenth.id },
        { userId: tenth.id, friendId: cRow!.id },
      ],
    });

    const bInbox = await b.get("/api/friend-requests");
    const target = await b.post(`/api/friend-requests/${bInbox.body.requests[0].id}/accept`).send();
    expect(target.status).toBe(409);
    expect(target.body.error.code).toBe("FRIEND_LIMIT_TARGET");
  });
});
