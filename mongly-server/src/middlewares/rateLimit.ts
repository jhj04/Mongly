import rateLimit from "express-rate-limit";
import { AppError } from "../lib/errors";

// check-login-id·signup은 아이디 존재 여부가 새는 열거 오라클이라 rate limit이 완화책의 핵심 (계획서 §6.3)
// 로그인은 브루트포스, signup은 열거 + bcrypt CPU 소모 방지. 인증 구현과 동시에 적용 — 스트레치로 미루지 않는다.

function limiter(limit: number) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    // 봉투 조립은 errorHandler 한 곳에서만 — 여기서도 next(AppError)로 위임
    handler: (_req, _res, next) => next(new AppError(429, "RATE_LIMITED", "잠시 후 다시 시도해주세요.")),
  });
}

export const loginLimiter = limiter(10); // 분당 10회
export const signupLimiter = limiter(5); // 분당 5회 (bcrypt 연산 + 열거 방지)
export const checkLoginIdLimiter = limiter(30); // 분당 30회 (타이핑 중 중복확인 고려)
