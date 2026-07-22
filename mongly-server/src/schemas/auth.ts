import { z } from "zod";

// 아이디 정책: 2~16자, 한글/영문/숫자 (계획서 §7 — 피그마 "9/16" 카운터 기준)
export const loginIdSchema = z
  .string()
  .regex(/^[가-힣a-zA-Z0-9]{2,16}$/, "아이디는 2~16자의 한글/영문/숫자만 가능해요.");

// bcrypt는 앞 72"바이트"만 반영한다 — 한글은 글자당 3바이트라 문자 수(.max)로는 못 막고
// 바이트 길이로 제한해야 절단된 비밀번호끼리 서로 로그인되는 문제를 막는다
export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 해요.")
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "비밀번호가 너무 길어요.");

export const signupSchema = z.object({
  loginId: loginIdSchema,
  password: passwordSchema,
  termsAgreed: z.boolean().refine((v) => v === true, "약관 동의가 필요해요."),
});

export const loginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

export const updateLoginIdSchema = z.object({ loginId: loginIdSchema });

// currentPassword는 열린 문제 ① 결정 대기 — 보안상 필수로 구현해 두고 프론트에 필드 추가 요청 (계획서 §5)
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const deleteAccountSchema = z.object({ password: z.string().min(1) });
