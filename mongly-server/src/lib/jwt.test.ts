import { beforeAll, describe, expect, it } from "vitest";
import { signAuthToken, verifyAuthToken } from "./jwt";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret";
});

describe("JWT 발급/검증", () => {
  it("발급한 토큰에서 userId를 복원한다", () => {
    const token = signAuthToken("user_123");
    expect(verifyAuthToken(token)).toBe("user_123");
  });

  it("위조된 토큰은 null", () => {
    const token = signAuthToken("user_123");
    expect(verifyAuthToken(token.slice(0, -2) + "xx")).toBeNull();
  });

  it("빈 문자열/엉터리 토큰은 null", () => {
    expect(verifyAuthToken("")).toBeNull();
    expect(verifyAuthToken("not-a-jwt")).toBeNull();
  });
});
