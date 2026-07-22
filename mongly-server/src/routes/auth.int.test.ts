// 인증·계정 통합 테스트 — 실제 DB 필요 (docker compose up 후 `npm run test:int`)
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

process.env.JWT_SECRET ??= "test-secret";

// 매 실행 유니크한 아이디 (2~16자 규칙 준수)
const uid = `t${Date.now().toString(36)}`; // 예: t1a2b3c4 (9자 내외)
const uid2 = `${uid}z`;
const PW = "password123";

const app = createApp();
const agent = request.agent(app); // 쿠키 유지

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`; // DB 미기동이면 여기서 즉시 실패 — test:int는 DB 필수
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { loginId: { startsWith: uid } } });
  await prisma.$disconnect();
});

describe("회원가입 → 세션 → 계정 관리 전체 플로우", () => {
  it("회원가입 201 + 자동 로그인 쿠키 발급", async () => {
    const res = await agent
      .post("/api/auth/signup")
      .send({ loginId: uid, password: PW, termsAgreed: true });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ loginId: uid });
    expect(res.headers["set-cookie"]?.[0]).toMatch(/mongly_token=.+HttpOnly/i);
  });

  it("가입 직후 me 200", async () => {
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ loginId: uid });
  });

  it("약관 미동의 가입 400", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ loginId: uid2, password: PW, termsAgreed: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
  });

  it("중복 아이디 가입 409 LOGIN_ID_TAKEN", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ loginId: uid, password: PW, termsAgreed: true });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("LOGIN_ID_TAKEN");
  });

  it("틀린 비밀번호 로그인 401 (아이디 존재 여부 미노출 메시지)", async () => {
    const res = await request(app).post("/api/auth/login").send({ loginId: uid, password: "wrong123" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("중복확인: 사용 중 false / 미사용 true", async () => {
    const taken = await request(app).get(`/api/users/check-login-id?loginId=${uid}`);
    expect(taken.body).toEqual({ available: false });
    const free = await request(app).get(`/api/users/check-login-id?loginId=${uid}free`);
    expect(free.body).toEqual({ available: true });
  });

  it("비로그인 me 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("아이디 수정 → me에 반영", async () => {
    const res = await agent.patch("/api/users/me/login-id").send({ loginId: uid2 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ loginId: uid2 });
    const me = await agent.get("/api/auth/me");
    expect(me.body).toEqual({ loginId: uid2 });
  });

  it("비밀번호 변경: 현재 비밀번호 틀리면 400 WRONG_PASSWORD", async () => {
    const res = await agent
      .patch("/api/users/me/password")
      .send({ currentPassword: "wrong123", newPassword: "newpass123" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("WRONG_PASSWORD");
  });

  it("비밀번호 변경 성공 → 새 비밀번호로 로그인 가능", async () => {
    const change = await agent
      .patch("/api/users/me/password")
      .send({ currentPassword: PW, newPassword: "newpass123" });
    expect(change.status).toBe(200);

    const oldLogin = await request(app).post("/api/auth/login").send({ loginId: uid2, password: PW });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ loginId: uid2, password: "newpass123" });
    expect(newLogin.status).toBe(200);
  });

  it("form Content-Type은 415 (CSRF 완화)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .type("form")
      .send({ loginId: uid2, password: "newpass123" });
    expect(res.status).toBe(415);
  });

  it("계정 삭제: 비밀번호 틀리면 400, 맞으면 200 → 이후 me 401", async () => {
    const wrong = await agent.delete("/api/users/me").send({ password: "wrong123" });
    expect(wrong.status).toBe(400);

    const ok = await agent.delete("/api/users/me").send({ password: "newpass123" });
    expect(ok.status).toBe(200);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401); // 탈퇴자 토큰 차단 (auth 미들웨어의 존재 확인)
  });

  it("로그아웃 후 me 401", async () => {
    const a = request.agent(app);
    await a.post("/api/auth/signup").send({ loginId: `${uid}x`, password: PW, termsAgreed: true });
    await a.post("/api/auth/logout").send();
    const me = await a.get("/api/auth/me");
    expect(me.status).toBe(401);
  });

  it("세션 없이도 로그아웃 200 (만료 토큰 사용자의 로그아웃 보장)", async () => {
    const res = await request(app).post("/api/auth/logout").send();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("깨진 JSON 바디 → 400 INVALID_BODY (500 아님)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"loginId":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_BODY");
  });
});
