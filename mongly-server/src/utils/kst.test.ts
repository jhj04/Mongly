import { describe, expect, it } from "vitest";
import { getKstToday, kstDateToDb } from "./kst";

describe("getKstToday — KST 자정 경계 (계획서 §6.1)", () => {
  it("UTC 15:30 = KST 다음날 00:30 → 다음날로 판정", () => {
    expect(getKstToday(new Date("2026-09-14T15:30:00Z"))).toBe("2026-09-15");
  });

  it("UTC 14:50 = KST 같은날 23:50 → 같은날로 판정", () => {
    expect(getKstToday(new Date("2026-09-14T14:50:00Z"))).toBe("2026-09-14");
  });

  it("UTC 15:00 정각 = KST 자정 정각 → 다음날로 판정", () => {
    expect(getKstToday(new Date("2026-09-14T15:00:00Z"))).toBe("2026-09-15");
  });

  it("연말 경계: UTC 12/31 15:00 → KST 1/1", () => {
    expect(getKstToday(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  });
});

describe("kstDateToDb", () => {
  it("날짜 문자열을 UTC 자정 Date로 변환 (@db.Date 저장용)", () => {
    expect(kstDateToDb("2026-09-15").toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });
});
