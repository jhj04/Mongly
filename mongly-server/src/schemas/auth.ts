import { z } from "zod";

// 닉네임 정책: 2~16자, 한글/영문/숫자 (친구 추가 키·표시명)
export const loginIdSchema = z
  .string()
  .regex(/^[가-힣a-zA-Z0-9]{2,16}$/, "닉네임은 2~16자의 한글/영문/숫자만 가능해요.");

// 이메일: 소문자로 정규화한 뒤 검증 (저장·로그인 비교 모두 소문자 기준). zod 3.25에서 체인 순서대로 변환→검증
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("올바른 이메일 형식이 아니에요.")
  .max(254, "이메일이 너무 길어요.");

// bcrypt는 앞 72"바이트"만 반영한다 — 한글은 글자당 3바이트라 문자 수(.max)로는 못 막고
// 바이트 길이로 제한해야 절단된 비밀번호끼리 서로 로그인되는 문제를 막는다
export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 해요.")
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "비밀번호가 너무 길어요.");

export const signupSchema = z.object({
  email: emailSchema,
  loginId: loginIdSchema,
  password: passwordSchema,
  termsAgreed: z.boolean().refine((v) => v === true, "약관 동의가 필요해요."),
});

// 로그인은 이메일+비밀번호. email은 정규화만 하고 형식 실패도 자격증명 실패로 통일(열거 완화)
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

export const updateLoginIdSchema = z.object({ loginId: loginIdSchema });

// currentPassword는 열린 문제 ① 결정 대기 — 보안상 필수로 구현해 두고 프론트에 필드 추가 요청
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const deleteAccountSchema = z.object({ password: z.string().min(1) });
