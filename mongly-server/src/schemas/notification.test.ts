import { describe, expect, it } from "vitest";
import { notificationCursorSchema, notificationIdSchema, notificationQuerySchema } from "./notification";

describe("알림 목록 query", () => {
  it("기본 20개와 두 알림 유형 필터를 지원한다", () => {
    expect(notificationQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(notificationQuerySchema.parse({ limit: "1", type: "FRIEND_REQUEST" }))
      .toEqual({ limit: 1, type: "FRIEND_REQUEST" });
    expect(notificationQuerySchema.parse({ limit: "50", type: "JAR_LIKED", cursor: "encoded" }))
      .toEqual({ limit: 50, type: "JAR_LIKED", cursor: "encoded" });
  });

  it.each(["0", "51", "-1", "1.5", "01", "1e1", "", " 20", "20 ", "Infinity"])(
    "잘못된 limit %j를 거부한다", (limit) => {
      expect(notificationQuerySchema.safeParse({ limit }).success).toBe(false);
    },
  );

  it("중복 파라미터·객체 주입·임의 수신자·잘못된 type을 거부한다", () => {
    const cases = [
      { limit: ["1", "20"] }, { limit: { value: "20" } }, { type: ["FRIEND_REQUEST", "JAR_LIKED"] },
      { type: "OTHER" }, { type: "" }, { recipientId: "another-user" }, { cursor: ["a", "b"] },
    ];
    for (const query of cases) expect(notificationQuerySchema.safeParse(query).success).toBe(false);
  });

  it("빈 커서와 과대 커서를 거부한다", () => {
    expect(notificationQuerySchema.safeParse({ cursor: "" }).success).toBe(false);
    expect(notificationQuerySchema.safeParse({ cursor: "a".repeat(513) }).success).toBe(false);
  });
});

describe("알림 커서 payload", () => {
  const valid = { v: 1, createdAt: "2026-09-24T01:02:03.004Z", id: "notice-one", type: null };

  it("전체/유형별 조회 스코프와 날짜·ID tie breaker를 보존한다", () => {
    expect(notificationCursorSchema.parse(valid)).toEqual(valid);
    expect(notificationCursorSchema.parse({ ...valid, type: "FRIEND_REQUEST" }).type).toBe("FRIEND_REQUEST");
    expect(notificationCursorSchema.parse({ ...valid, type: "JAR_LIKED" }).type).toBe("JAR_LIKED");
  });

  it.each(["not-a-date", "0000-01-01T00:00:00.000Z", "2026-02-30T00:00:00.000Z", "2026-13-01T00:00:00.000Z", "2026-09-24", "2026-09-24T00:00:00Z"])(
    "잘못된 날짜 %j는 예외 대신 검증 실패로 처리한다", (createdAt) => {
      expect(notificationCursorSchema.safeParse({ ...valid, createdAt }).success).toBe(false);
    },
  );

  it("다른 커서 버전·없는 스코프·추가 필드·빈 ID를 거부한다", () => {
    for (const value of [
      { ...valid, v: 2 }, { ...valid, type: undefined }, { ...valid, type: "OTHER" },
      { ...valid, recipientId: "other" }, { ...valid, id: "" }, { ...valid, id: "a".repeat(129) },
    ]) expect(notificationCursorSchema.safeParse(value).success).toBe(false);
  });
});

describe("알림 ID", () => {
  it("기존 친구 요청 backfill ID도 읽음 처리 경로에서 허용한다", () => {
    const backfilled = "friend-request-cmsreq0001okck";
    expect(notificationIdSchema.parse(backfilled)).toBe(backfilled);
  });

  it("DB 문자열에 허용되지 않는 NUL 등 제어문자를 요청 단계에서 거부한다", () => {
    expect(notificationIdSchema.safeParse("notice\u0000id").success).toBe(false);
    expect(notificationIdSchema.safeParse("notice\nid").success).toBe(false);
  });
});
