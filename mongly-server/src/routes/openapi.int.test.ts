import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv, { ValidateFunction } from "ajv-draft-04";
import request, { Response } from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { openapi } from "../docs/openapi";
import { AUTH_COOKIE } from "../lib/cookies";
import { signAuthToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

process.env.JWT_SECRET ??= "test-secret";
const app = createApp();
const prefix = `c${Date.now().toString(36)}`;
const ajv = new Ajv({ strict: false, validateFormats: false, allErrors: true });
const validators = new Map<string, ValidateFunction>();
let spec: any;
let people: { id: string; loginId: string }[];
const cookie = (i: number) => `${AUTH_COOKIE}=${signAuthToken(people[i].id)}`;
const api = (i: number) => ({
  get: (path: string) => request(app).get(`/api${path}`).set("Cookie", cookie(i)),
  post: (path: string) => request(app).post(`/api${path}`).set("Cookie", cookie(i)),
  put: (path: string) => request(app).put(`/api${path}`).set("Cookie", cookie(i)),
  patch: (path: string) => request(app).patch(`/api${path}`).set("Cookie", cookie(i)),
  delete: (path: string) => request(app).delete(`/api${path}`).set("Cookie", cookie(i)),
});

function check(method: string, path: string, response: Response, status = 200) {
  expect(response.status, `${method} ${path}: ${JSON.stringify(response.body)}`).toBe(status);
  const key = `${method} ${path} ${status}`;
  if (!validators.has(key)) {
    const schema = spec.paths[`/api${path}`]?.[method]?.responses[status]?.content?.["application/json"]?.schema;
    expect(schema, `Missing response schema: ${key}`).toBeDefined();
    validators.set(key, ajv.compile(schema));
  }
  const validate = validators.get(key)!;
  expect(validate(response.body), `${key}: ${JSON.stringify(validate.errors)}`).toBe(true);
  return response.body;
}

beforeAll(async () => {
  spec = await SwaggerParser.dereference(JSON.parse(JSON.stringify(openapi)));
  people = await Promise.all([0, 1].map((i) => prisma.user.create({ data: {
    email: `${prefix}${i}@example.com`, loginId: `${prefix}${i}`,
    passwordHash: "fixture", termsAgreedAt: new Date(),
  } })));
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { loginId: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe("프론트엔드 OpenAPI 계약 — 실제 HTTP 응답", () => {
  it("새 기능 전체 흐름을 공개 Swagger schema로 검증", async () => {
    check("get", "/auth/me", await api(0).get("/auth/me"));
    check("get", "/emotions", await api(0).get("/emotions"));
    check("post", "/friend-requests", await api(1).post("/friend-requests").send({ toLoginId: people[0].loginId }), 201);
    const initialNotifications = check("get", "/notifications", await api(0).get("/notifications"));
    const friendRequest = initialNotifications.notifications[0];
    check("patch", "/notifications/{id}/read", await api(0).patch(`/notifications/${friendRequest.id}/read`).send());
    check("post", "/friend-requests/{id}/accept", await api(0).post(`/friend-requests/${friendRequest.target.id}/accept`).send());
    check("get", "/friends", await api(0).get("/friends"));
    check("get", "/friends/jars", await api(0).get("/friends/jars")); // nullable jar branch
    check("get", "/jars/today", await api(0).get("/jars/today")); // draft branch
    check("post", "/jars/draft/emotions", await api(0).post("/jars/draft/emotions").send({ emotionId: 1 }), 201);
    check("delete", "/jars/draft/emotions", await api(0).delete("/jars/draft/emotions").send());
    check("post", "/jars/draft/emotions", await api(0).post("/jars/draft/emotions").send({ emotionId: 6 }), 201);
    const jar = check("post", "/jars", await api(0).post("/jars").send({ note: "오늘은 행복했다 👨‍👩‍👧‍👦" }), 201);
    check("get", "/jars", await api(0).get("/jars?limit=7"));
    check("get", "/jars/{id}", await api(1).get(`/jars/${jar.id}`));
    check("get", "/friends/jars", await api(1).get("/friends/jars"));
    check("put", "/jars/{id}/like", await api(1).put(`/jars/${jar.id}/like`).send());
    const likes = check("get", "/notifications", await api(0).get("/notifications?type=JAR_LIKED"));
    check("get", "/notifications/summary", await api(0).get("/notifications/summary"));
    check("patch", "/jars/{id}", await api(0).patch(`/jars/${jar.id}`).send({
      expectedVersion: 1, note: null, emotions: [{ emotionId: 1, count: 2 }, { emotionId: 6, count: 2 }],
    })); // nullable note/dominantEmotionId
    check("get", "/jars/today", await api(0).get("/jars/today")); // completed branch
    check("patch", "/jars/{id}", await api(0).patch(`/jars/${jar.id}`).send({ expectedVersion: 1, note: "충돌" }), 409);
    check("patch", "/notifications/{id}/read", await api(0).patch(`/notifications/${likes.notifications[0].id}/read`).send());
    check("delete", "/jars/{id}/like", await api(1).delete(`/jars/${jar.id}/like`).send());
    check("delete", "/jars/{id}", await api(0).delete(`/jars/${jar.id}`).send());
    check("get", "/notifications", await api(0).get("/notifications"));
  });

  it("Swagger UI와 내보낸 JSON을 HTTP로 열 수 있음", async () => {
    const response = await request(app).get("/api/openapi.json");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(openapi);
    const ui = await request(app).get("/api/docs/");
    expect(ui.status).toBe(200);
    expect(ui.headers["content-type"]).toContain("text/html");
    expect(ui.text).toContain("swagger-ui");
  });
});
