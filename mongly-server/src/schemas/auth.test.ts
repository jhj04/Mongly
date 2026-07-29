import { describe, expect, it } from "vitest";
import { emailSchema, loginIdSchema, signupSchema } from "./auth";

describe("loginIdSchema — 2~16자 한글/영문/숫자", () => {
  it.each(["몽글리", "mongly123", "열여섯글자가최대아이디길이입니다", "ab"])("허용: %s", (v) => {
    expect(loginIdSchema.safeParse(v).success).toBe(true);
  });

  it.each([
    "a", // 1자
    "열여섯글자가최대아이디길이입니다만", // 17자
    "mon gly", // 공백
    "mongly!", // 특수문자
    "몽글리\n", // 개행
    "", // 빈 문자열
  ])("거부: %j", (v) => {
    expect(loginIdSchema.safeParse(v).success).toBe(false);
  });
});

describe("emailSchema — 정규화 후 검증", () => {
  it("공백 trim + 대문자 소문자화", () => {
    const r = emailSchema.safeParse("  MONG@Example.COM ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("mong@example.com");
  });

  it.each(["a@b.com", "user.name+tag@sub.domain.co.kr"])("허용: %s", (v) => {
    expect(emailSchema.safeParse(v).success).toBe(true);
  });

  it.each(["notanemail", "no@domain", "@nolocal.com", ""])("거부: %j", (v) => {
    expect(emailSchema.safeParse(v).success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = { email: "mong@example.com", loginId: "몽글리", password: "password123", termsAgreed: true };

  it("정상 가입 바디 통과", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("이메일 누락 거부", () => {
    const { email, ...noEmail } = valid;
    void email;
    expect(signupSchema.safeParse(noEmail).success).toBe(false);
  });

  it("약관 미동의(false) 거부", () => {
    expect(signupSchema.safeParse({ ...valid, termsAgreed: false }).success).toBe(false);
  });

  it("비밀번호 8자 미만 거부", () => {
    expect(signupSchema.safeParse({ ...valid, password: "1234567" }).success).toBe(false);
  });

  it("비밀번호 72바이트 초과 거부 — 한글 25자(75바이트)는 bcrypt가 절단하므로 막아야 함", () => {
    const korean25 = "가".repeat(25); // 75바이트
    expect(signupSchema.safeParse({ ...valid, password: korean25 }).success).toBe(false);
  });

  it("한글 24자(72바이트)는 허용", () => {
    const korean24 = "가".repeat(24); // 정확히 72바이트
    expect(signupSchema.safeParse({ ...valid, password: korean24 }).success).toBe(true);
  });
});
