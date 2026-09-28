import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { AUTH_COOKIE } from "../lib/cookies";
import { signAuthToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { getKstToday, kstDateToDb } from "../utils/kst";

process.env.JWT_SECRET ??= "test-secret";
const prefix = `atomic${Date.now().toString(36)}`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { loginId: prefix } });
  await prisma.$disconnect();
});

describe("완성본 편집 DB 원자성", () => {
  it("감정 재생성 실패 시 이미 UPDATE한 note/version/time과 DELETE한 감정을 모두 복원", async () => {
    const user = await prisma.user.create({ data: {
      email: `${prefix}@example.com`, loginId: prefix, passwordHash: "fixture", termsAgreedAt: new Date(),
    } });
    const jar = await prisma.jar.create({ data: {
      userId: user.id, recordDate: kstDateToDb(getKstToday()), note: "수정 전 기록",
      emotions: { create: [{ emotionId: 1, count: 2 }] },
    }, include: { emotions: true } });
    await prisma.$executeRawUnsafe(`CREATE FUNCTION mongly_test_reject_emotion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER mongly_test_reject_emotion BEFORE INSERT ON "JarEmotion" FOR EACH ROW EXECUTE FUNCTION mongly_test_reject_emotion()`);
    try {
      const res = await request(createApp()).patch(`/api/jars/${jar.id}`)
        .set("Cookie", `${AUTH_COOKIE}=${signAuthToken(user.id)}`)
        .send({ expectedVersion: 1, note: "변경 시도", emotions: [{ emotionId: 6, count: 3 }] });
      expect(res.status).toBe(500);
      const saved = await prisma.jar.findUnique({ where: { id: jar.id }, include: { emotions: true } });
      expect(saved).toEqual(jar);
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER mongly_test_reject_emotion ON "JarEmotion"');
      await prisma.$executeRawUnsafe("DROP FUNCTION mongly_test_reject_emotion()");
    }
  });
});
