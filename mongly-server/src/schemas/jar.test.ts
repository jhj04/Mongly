import { describe, expect, it } from "vitest";
import { encodeCursor } from "../utils/pagination";
import { completeJarSchema, jarIdParamsSchema, listJarsQuerySchema, updateJarSchema } from "./jar";

describe("유리병 ID", () => {
  it.each(["", "bad\0id", "가나다", "a".repeat(129), "bad/id"])("잘못된 ID를 DB 조회 전에 거부: %j", (id) => {
    expect(jarIdParamsSchema.safeParse({ id }).success).toBe(false);
  });
  it("cuid와 테스트용 영문/숫자/구분자를 허용한다", () => {
    expect(jarIdParamsSchema.parse({ id: "cuid_123-test" }).id).toBe("cuid_123-test");
  });
});

describe("일기 — 정규화, 50 grapheme, 한 줄", () => {
  it.each([{}, { note: null }, { note: "" }, { note: "   " }])("선택 입력 %j", (input) => {
    expect(completeJarSchema.parse(input).note ?? null).toBeNull();
  });

  it("한글을 NFC로 정규화하고 앞뒤 일반 공백만 제거한다", () => {
    expect(completeJarSchema.parse({ note: "  한글 일기  " }).note).toBe("한글 일기");
  });

  it.each(["가", "a", "😀", "👨‍👩‍👧‍👦", "🇰🇷", "👍🏽", "e\u0301"])("%s를 사용자가 보는 한 글자로 센다", (letter) => {
    expect(completeJarSchema.safeParse({ note: letter.repeat(50) }).success).toBe(true);
    expect(completeJarSchema.safeParse({ note: letter.repeat(51) }).success).toBe(false);
  });

  it("중간 공백도 글자 수에 포함한다", () => {
    expect(completeJarSchema.safeParse({ note: "가".repeat(25) + " " + "나".repeat(25) }).success).toBe(false);
  });

  it.each(["\n일기", "일기\r\n", "\t", "a\u2028b", "a\u2029b", "a\0b", "a\u0085b"])("앞뒤에 있어도 개행·제어문자 거부: %j", (note) => {
    expect(completeJarSchema.safeParse({ note }).success).toBe(false);
  });

  it.each([1, [], {}, true, "\ud800", "\udfff"])("잘못된 문자열 입력 거부: %j", (note) => {
    expect(completeJarSchema.safeParse({ note }).success).toBe(false);
  });

  it("하나의 grapheme에 붙인 과도한 결합문자도 byte 제한으로 거부한다", () => {
    expect(completeJarSchema.safeParse({ note: "a" + "\u0301".repeat(1200) }).success).toBe(false);
  });

  it("trim 전 raw byte 제한도 적용한다", () => {
    expect(completeJarSchema.safeParse({ note: " ".repeat(2050) }).success).toBe(false);
  });

  it("HTML처럼 생긴 문자열도 일반 텍스트로 보존한다", () => {
    expect(completeJarSchema.parse({ note: "<b>기쁜 날</b>" }).note).toBe("<b>기쁜 날</b>");
  });

  it("생성 시 감정·날짜·소유자를 받지 않는다", () => {
    expect(completeJarSchema.safeParse({ note: "일기", userId: "other" }).success).toBe(false);
    expect(completeJarSchema.safeParse({ emotions: [{ emotionId: 1, count: 1 }] }).success).toBe(false);
  });
});

describe("완성본 수정 입력", () => {
  it("note-only, emotions-only, 둘 다 수정과 null 지우기를 지원한다", () => {
    expect(updateJarSchema.parse({ expectedVersion: 1, note: null })).toEqual({ expectedVersion: 1, note: null });
    expect(updateJarSchema.parse({ expectedVersion: 2, note: "  " }).note).toBeNull();
    const emotionsOnly = updateJarSchema.parse({ expectedVersion: 1, emotions: [{ emotionId: 2, count: 7 }] });
    expect(emotionsOnly).not.toHaveProperty("note");
    expect(updateJarSchema.safeParse({ expectedVersion: 1, note: "기록", emotions: [{ emotionId: 2, count: 1 }] }).success).toBe(true);
  });

  it.each([
    {}, { note: "일기" }, { expectedVersion: 1 }, { expectedVersion: 0, note: null },
    { expectedVersion: 1.5, note: null }, { expectedVersion: "1", note: null },
    { expectedVersion: 2147483648, note: null }, { expectedVersion: 1, note: null, recordDate: "2026-09-24" },
  ])("버전·수정 필드 검증: %j", (input) => {
    expect(updateJarSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    [], [{ emotionId: 1, count: 0 }], [{ emotionId: 1, count: -1 }], [{ emotionId: 1, count: 1.5 }],
    [{ emotionId: 1, count: 8 }], [{ emotionId: 0, count: 1 }], [{ emotionId: 2147483648, count: 1 }],
    [{ emotionId: 1, count: 1 }, { emotionId: 1, count: 1 }],
    [{ emotionId: 1, count: 4 }, { emotionId: 2, count: 4 }],
  ].map((emotions) => ({ emotions })))("전체 감정 구성 검증: $emotions", ({ emotions }) => {
    expect(updateJarSchema.safeParse({ expectedVersion: 1, emotions }).success).toBe(false);
  });
});

describe("날짜 기반 서재 커서", () => {
  it("기본 limit 7, 상한 50", () => {
    expect(listJarsQuerySchema.parse({})).toEqual({ limit: 7 });
    expect(listJarsQuerySchema.parse({ limit: "50" })).toEqual({ limit: 50 });
  });

  it("올바른 커서를 날짜 조건으로 해석한다", () => {
    expect(listJarsQuerySchema.parse({ limit: "2", cursor: encodeCursor({ v: 1, recordDate: "2024-02-29" }) }))
      .toEqual({ limit: 2, cursor: "2024-02-29" });
  });

  it.each(["0", "-1", "51", "1.5", "1e1", "", " 7", "07", ["7", "8"], {}])("잘못된 limit 거부: %j", (limit) => {
    expect(listJarsQuerySchema.safeParse({ limit }).success).toBe(false);
  });

  it.each([
    "", "not-a-cursor", "e30=", "A".repeat(513), ["one", "two"],
    encodeCursor({ v: 2, recordDate: "2026-09-24" }),
    encodeCursor({ v: 1, recordDate: "2026-02-29" }),
    encodeCursor({ v: 1, recordDate: "2026-02-31" }),
    encodeCursor({ v: 1, recordDate: "0000-01-01" }),
    encodeCursor({ v: 1, recordDate: "2026-09-24", userId: "other" }),
  ])("잘못된/확장된 커서 거부: %j", (cursor) => {
    expect(listJarsQuerySchema.safeParse({ cursor }).success).toBe(false);
  });
});
