import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { AUTH_COOKIE } from "../lib/cookies";
import { signAuthToken } from "../lib/jwt";
import { hashPassword } from "../lib/password";
import { prisma } from "../lib/prisma";
import { getKstToday, kstDateToDb } from "../utils/kst";

process.env.JWT_SECRET ??= "test-secret";
const app = createApp();
const prefix = `s${Date.now().toString(36)}`;
let users: { id: string; loginId: string }[];
let jarId: string;
const cookie = (index: number) => `${AUTH_COOKIE}=${signAuthToken(users[index].id)}`;
const api = (index: number) => ({
  get: (path: string) => request(app).get(`/api${path}`).set("Cookie", cookie(index)),
  post: (path: string) => request(app).post(`/api${path}`).set("Cookie", cookie(index)),
  put: (path: string) => request(app).put(`/api${path}`).set("Cookie", cookie(index)),
  patch: (path: string) => request(app).patch(`/api${path}`).set("Cookie", cookie(index)),
  delete: (path: string) => request(app).delete(`/api${path}`).set("Cookie", cookie(index)),
});

async function pair(a: number, b: number) {
  await prisma.friendship.createMany({ data: [
    { userId: users[a].id, friendId: users[b].id },
    { userId: users[b].id, friendId: users[a].id },
  ] });
}

beforeAll(async () => {
  users = await Promise.all(Array.from({ length: 4 }, (_, i) => prisma.user.create({ data: {
    email: `${prefix}${i}@example.com`, loginId: `${prefix}${i}`,
    passwordHash: "fixture", termsAgreedAt: new Date(),
  } })));
});
beforeEach(async () => {
  const ids = users.map((u) => u.id);
  await prisma.friendRequest.deleteMany({ where: { OR: [{ fromUserId: { in: ids } }, { toUserId: { in: ids } }] } });
  await prisma.friendship.deleteMany({ where: { userId: { in: ids } } });
  await prisma.jar.deleteMany({ where: { userId: { in: ids } } });
  await pair(0, 1);
  await pair(0, 2);
  const jar = await prisma.jar.create({ data: {
    userId: users[0].id, recordDate: kstDateToDb(getKstToday()), note: "오늘의 기록",
    emotions: { create: [{ emotionId: 1, count: 2 }] },
  } });
  jarId = jar.id;
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { loginId: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe("좋아요 상태와 알림 원자성", () => {
  it("반복·동시 PUT은 좋아요와 최초 알림 하나, 취소 후 재좋아요는 재알림 없음", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => api(1).put(`/jars/${jarId}/like`).send()));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await prisma.jarLike.count({ where: { jarId } })).toBe(1);
    expect(await prisma.notification.count({ where: { recipientId: users[0].id } })).toBe(1);
    const summary = await api(0).get("/notifications/summary");
    expect(summary.body).toEqual({ unreadLikeCount: 1, pendingFriendRequestCount: 0, badgeCount: 1 });
    expect((await api(1).get(`/jars/${jarId}`)).body).toMatchObject({ likedByMe: true, likeCount: 1, canLike: true });
    const unfav = await api(1).delete(`/jars/${jarId}/like`).send();
    expect(unfav.body).toEqual({ jarId, likedByMe: false, likeCount: 0 });
    expect((await api(1).delete(`/jars/${jarId}/like`).send()).status).toBe(200);
    expect(await prisma.jarLike.count({ where: { jarId, isActive: false } })).toBe(1);
    expect((await api(0).get("/notifications")).body.notifications).toHaveLength(0);
    expect((await api(1).put(`/jars/${jarId}/like`).send()).body.likeCount).toBe(1);
    expect(await prisma.notification.count({ where: { recipientId: users[0].id } })).toBe(0);
  });

  it("두 친구의 좋아요를 집계하고 본인·비친구·비로그인·없는 병은 차단", async () => {
    const results = await Promise.all([api(1).put(`/jars/${jarId}/like`).send(), api(2).put(`/jars/${jarId}/like`).send()]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect((await api(0).get(`/jars/${jarId}`)).body).toMatchObject({ likeCount: 2, likedByMe: false, canLike: false });
    expect((await api(0).put(`/jars/${jarId}/like`).send()).status).toBe(400);
    expect((await api(3).put(`/jars/${jarId}/like`).send()).status).toBe(403);
    expect((await request(app).put(`/api/jars/${jarId}/like`).send()).status).toBe(401);
    expect((await api(1).put("/jars/missing/like").send()).status).toBe(404);
    expect((await api(1).delete("/jars/missing/like").send()).status).toBe(404);
  });

  it("감정·일기 편집 후에도 같은 좋아요와 읽은 알림을 유지", async () => {
    await api(1).put(`/jars/${jarId}/like`).send();
    const notif = (await api(0).get("/notifications")).body.notifications[0];
    const read = await api(0).patch(`/notifications/${notif.id}/read`).send();
    const edited = await api(0).patch(`/jars/${jarId}`).send({ expectedVersion: 1, note: "수정한 기록", emotions: [{ emotionId: 6, count: 3 }] });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ id: jarId, note: "수정한 기록", version: 2, likeCount: 1 });
    const after = (await api(0).get("/notifications")).body.notifications[0];
    expect(after).toMatchObject({ id: notif.id, createdAt: notif.createdAt, readAt: read.body.readAt });
    expect((await api(1).get(`/jars/${jarId}`)).body.note).toBe("수정한 기록");
  });

  it("친구 해제는 양방향 반응을 제거하고 다시 친구가 되면 첫 알림 생성", async () => {
    const other = await prisma.jar.create({ data: { userId: users[1].id, recordDate: kstDateToDb(getKstToday()) } });
    await api(1).put(`/jars/${jarId}/like`).send();
    await api(0).put(`/jars/${other.id}/like`).send();
    await api(2).put(`/jars/${jarId}/like`).send();
    const removed = await api(0).delete("/friends").send({ friendLoginIds: [users[1].loginId] });
    expect(removed.status).toBe(200);
    expect(await prisma.jarLike.count({ where: { jarId: { in: [jarId, other.id] } } })).toBe(1);
    expect((await api(0).get("/notifications")).body.notifications).toHaveLength(1);
    expect((await api(1).get("/notifications")).body.notifications).toHaveLength(0);
    expect((await api(1).get(`/jars/${jarId}`)).status).toBe(403);
    await pair(0, 1);
    await api(1).put(`/jars/${jarId}/like`).send();
    expect((await api(0).get("/notifications")).body.notifications).toHaveLength(2);
  });

  it("좋아요와 친구 해제 경합 뒤 반응·알림은 남지 않음", async () => {
    const [like, remove] = await Promise.all([
      api(1).put(`/jars/${jarId}/like`).send(),
      api(0).delete("/friends").send({ friendLoginIds: [users[1].loginId] }),
    ]);
    expect([200, 403]).toContain(like.status);
    expect(remove.status).toBe(200);
    expect(await prisma.jarLike.count({ where: { jarId } })).toBe(0);
    expect(await prisma.notification.count({ where: { recipientId: users[0].id } })).toBe(0);
  });

  it("병 삭제와 좋아요 경합 뒤 고아 반응·알림은 남지 않음", async () => {
    const [like, remove] = await Promise.all([
      api(1).put(`/jars/${jarId}/like`).send(), api(0).delete(`/jars/${jarId}`).send(),
    ]);
    expect([200, 404]).toContain(like.status);
    expect(remove.status).toBe(200);
    expect(await prisma.jarLike.count({ where: { jarId } })).toBe(0);
    expect(await prisma.notification.count({ where: { recipientId: users[0].id } })).toBe(0);
  });

  it.each(["actor", "owner"])("%s 탈퇴와 좋아요가 경합해도 고아 데이터·500 없음", async (role) => {
    const temporary = await prisma.user.create({ data: {
      email: `${prefix}${role}@example.com`, loginId: `${prefix}${role}`,
      passwordHash: await hashPassword("password123"), termsAgreedAt: new Date(),
    } });
    await prisma.friendship.createMany({ data: [
      { userId: users[0].id, friendId: temporary.id }, { userId: temporary.id, friendId: users[0].id },
    ] });
    const targetId = role === "owner" ? (await prisma.jar.create({ data: {
      userId: temporary.id, recordDate: kstDateToDb(getKstToday()),
    } })).id : jarId;
    const temporaryCookie = `${AUTH_COOKIE}=${signAuthToken(temporary.id)}`;
    const [liked, deleted] = await Promise.all([
      request(app).put(`/api/jars/${targetId}/like`).set("Cookie", role === "actor" ? temporaryCookie : cookie(0)).send(),
      request(app).delete("/api/users/me").set("Cookie", temporaryCookie).send({ password: "password123" }),
    ]);
    expect([200, 401, 403, 404]).toContain(liked.status);
    expect(deleted.status).toBe(200);
    expect(await prisma.jarLike.count({ where: { OR: [{ userId: temporary.id }, { jarId: targetId }] } })).toBe(0);
    expect(await prisma.notification.count({ where: { recipientId: { in: [users[0].id, temporary.id] } } })).toBe(0);
  });

  it("알림 INSERT 실패 시 첫 좋아요도 롤백", async () => {
    // 실제 SQL trigger로 두 번째 INSERT 실패를 주입한다(유효한 전용 테스트 DB에서만 실행).
    await prisma.$executeRawUnsafe(`CREATE FUNCTION mongly_test_reject_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER mongly_test_reject_notification BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION mongly_test_reject_notification()`);
    try {
      expect((await api(1).put(`/jars/${jarId}/like`).send()).status).toBe(500);
      expect(await prisma.jarLike.count({ where: { jarId } })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER mongly_test_reject_notification ON "Notification"');
      await prisma.$executeRawUnsafe("DROP FUNCTION mongly_test_reject_notification()");
    }
  });

  it("좋아요 PUT·DELETE는 사용자별 분당 60회 공유, 같은 IP의 다른 사용자는 독립", async () => {
    const previous = process.env.INT;
    process.env.INT = "0"; // 이 사례는 테스트용 limiter 우회를 끄고 실제 미들웨어를 검증한다.
    try {
      for (let i = 0; i < 60; i++) {
        const response = i % 2 === 0
          ? await api(1).put(`/jars/${jarId}/like`).send()
          : await api(1).delete(`/jars/${jarId}/like`).send();
        expect(response.status).toBe(200);
      }
      const blocked = await api(1).put(`/jars/${jarId}/like`).send();
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe("RATE_LIMITED");
      expect((await api(2).put(`/jars/${jarId}/like`).send()).status).toBe(200);
    } finally {
      if (previous === undefined) delete process.env.INT;
      else process.env.INT = previous;
    }
  });
});

describe("통합 알림 목록·필터·읽음", () => {
  it("친구 요청과 좋아요를 같은 목록으로 반환하고 타입별 분리 가능", async () => {
    await api(1).put(`/jars/${jarId}/like`).send();
    const sent = await api(3).post("/friend-requests").send({ toLoginId: users[0].loginId });
    expect(sent.status).toBe(201);
    const all = await api(0).get("/notifications");
    expect(all.status).toBe(200);
    expect(new Set(all.body.notifications.map((n: any) => n.type))).toEqual(new Set(["JAR_LIKED", "FRIEND_REQUEST"]));
    expect((await api(0).get("/notifications?type=JAR_LIKED")).body.notifications).toHaveLength(1);
    const requests = (await api(0).get("/notifications?type=FRIEND_REQUEST")).body.notifications;
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ actor: { loginId: users[3].loginId }, target: { type: "FRIEND_REQUEST" } });
    const summary = await api(0).get("/notifications/summary");
    expect(summary.body).toEqual({ unreadLikeCount: 1, pendingFriendRequestCount: 1, badgeCount: 2 });
    await api(0).patch(`/notifications/${requests[0].id}/read`).send();
    expect((await api(0).get("/notifications/summary")).body.badgeCount).toBe(2);
    const accepted = await api(0).post(`/friend-requests/${requests[0].target.id}/accept`).send();
    expect(accepted.status).toBe(200);
    expect((await api(0).get("/notifications")).body.notifications).toHaveLength(1);
    expect((await api(0).get("/notifications/summary")).body.badgeCount).toBe(1);
  });

  it("동시에 읽어도 첫 readAt 유지, 다른 수신자·삭제된 알림은 404", async () => {
    await api(1).put(`/jars/${jarId}/like`).send();
    const id = (await api(0).get("/notifications")).body.notifications[0].id;
    expect((await api(0).get("/notifications/summary")).body.unreadLikeCount).toBe(1);
    const reads = await Promise.all(Array.from({ length: 6 }, () => api(0).patch(`/notifications/${id}/read`).send()));
    expect(reads.every((r) => r.status === 200)).toBe(true);
    expect(new Set(reads.map((r) => r.body.readAt)).size).toBe(1);
    expect((await api(0).get("/notifications/summary")).body.unreadLikeCount).toBe(0);
    expect((await api(1).patch(`/notifications/${id}/read`).send()).status).toBe(404);
    expect((await api(1).get("/notifications")).body.notifications).toHaveLength(0);
    await api(1).delete(`/jars/${jarId}/like`).send();
    expect((await api(0).patch(`/notifications/${id}/read`).send()).status).toBe(404);
  });

  it("같은 생성 시각에서도 cursor 기준 알림 삭제 후 누락·중복 없이 다음 페이지", async () => {
    await api(1).put(`/jars/${jarId}/like`).send();
    await api(2).put(`/jars/${jarId}/like`).send();
    await api(3).post("/friend-requests").send({ toLoginId: users[0].loginId });
    await prisma.notification.updateMany({ where: { recipientId: users[0].id }, data: { createdAt: new Date("2026-01-01T00:00:00.000Z") } });
    const initial = (await api(0).get("/notifications")).body.notifications;
    const first = (await api(0).get("/notifications?limit=1")).body;
    expect(first.hasMore).toBe(true);
    expect(first.notifications[0].id).toBe(initial[0].id);
    await prisma.notification.delete({ where: { id: first.notifications[0].id } });
    const second = (await api(0).get(`/notifications?limit=2&cursor=${encodeURIComponent(first.nextCursor)}`)).body;
    expect(second.notifications.map((n: any) => n.id)).toEqual(initial.slice(1).map((n: any) => n.id));
    expect(second.hasMore).toBe(false);
    expect(second.nextCursor).toBeNull();
  });

  it("요청 거절·동시 맞요청 처리 후 대기 요청 알림을 정리", async () => {
    await api(3).post("/friend-requests").send({ toLoginId: users[0].loginId });
    const n = (await api(0).get("/notifications")).body.notifications[0];
    expect((await api(0).post(`/friend-requests/${n.target.id}/reject`).send()).status).toBe(200);
    expect((await api(0).get("/notifications")).body.notifications).toHaveLength(0);
    const res = await Promise.all([
      api(3).post("/friend-requests").send({ toLoginId: users[0].loginId }),
      api(0).post("/friend-requests").send({ toLoginId: users[3].loginId }),
    ]);
    expect(res.map((r) => r.status)).toEqual([201, 201]);
    expect(new Set(res.map((r) => r.body.status))).toEqual(new Set(["pending", "accepted"]));
    expect(await prisma.friendRequest.count({ where: { OR: [{ fromUserId: users[3].id }, { toUserId: users[3].id }] } })).toBe(0);
    expect(await prisma.notification.count({ where: { recipientId: { in: [users[0].id, users[3].id] } } })).toBe(0);
  });

  it("잘못된 query·미인증 차단, 개인 응답 캐시 금지", async () => {
    for (const query of ["limit=0", "limit=51", "limit=1&limit=2", "type=UNKNOWN", "cursor=invalid"]) {
      expect((await api(0).get(`/notifications?${query}`)).status).toBe(400);
    }
    expect((await request(app).get("/api/notifications")).status).toBe(401);
    expect((await api(0).get("/notifications")).headers["cache-control"]).toContain("no-store");
  });

  it("알림은 현재 닉네임을 표시하고 일기 내용은 포함하지 않음", async () => {
    await api(1).put(`/jars/${jarId}/like`).send();
    const original = users[1].loginId;
    await prisma.user.update({ where: { id: users[1].id }, data: { loginId: `${prefix}new` } });
    try {
      const body = (await api(0).get("/notifications")).body;
      expect(body.notifications[0].actor.loginId).toBe(`${prefix}new`);
      expect(JSON.stringify(body)).not.toContain("오늘의 기록");
    } finally {
      await prisma.user.update({ where: { id: users[1].id }, data: { loginId: original } });
    }
  });
});
