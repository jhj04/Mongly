import { describe, expect, it } from "vitest";
import { addFriendSchema, removeFriendsSchema } from "./friend";

describe("addFriendSchema", () => {
  it("정상 아이디 통과 (한글 포함)", () => {
    expect(addFriendSchema.safeParse({ friendLoginId: "허수현" }).success).toBe(true);
  });

  it("아이디 형식 위반 거부", () => {
    expect(addFriendSchema.safeParse({ friendLoginId: "a" }).success).toBe(false);
    expect(addFriendSchema.safeParse({ friendLoginId: "spa ce" }).success).toBe(false);
  });
});

describe("removeFriendsSchema — 다중 삭제", () => {
  it("정상: 1~10명", () => {
    expect(removeFriendsSchema.safeParse({ friendLoginIds: ["친구하나", "친구둘"] }).success).toBe(true);
  });

  it("거부: 빈 배열", () => {
    expect(removeFriendsSchema.safeParse({ friendLoginIds: [] }).success).toBe(false);
  });

  it("거부: 중복 아이디", () => {
    expect(removeFriendsSchema.safeParse({ friendLoginIds: ["친구하나", "친구하나"] }).success).toBe(false);
  });

  it("거부: 11명 초과", () => {
    const ids = Array.from({ length: 11 }, (_, i) => `친구${i}번째입니다`);
    expect(removeFriendsSchema.safeParse({ friendLoginIds: ids }).success).toBe(false);
  });
});
