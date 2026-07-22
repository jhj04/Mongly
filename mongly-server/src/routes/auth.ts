import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { clearAuthCookie, setAuthCookie } from "../lib/cookies";
import { signAuthToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { loginLimiter, signupLimiter } from "../middlewares/rateLimit";
import { loginSchema, signupSchema } from "../schemas/auth";
import { authService } from "../services/authService";

export const authRouter = Router();

// 성공 201 + 자동 로그인(쿠키 즉시 발급) — 가입 직후 재로그인 생략 (계획서 §5)
authRouter.post(
  "/auth/signup",
  signupLimiter,
  asyncHandler(async (req, res) => {
    const body = signupSchema.parse(req.body);
    const user = await authService.signup(body);
    setAuthCookie(res, signAuthToken(user.id));
    res.status(201).json({ loginId: user.loginId });
  }),
);

authRouter.post(
  "/auth/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await authService.login(body);
    setAuthCookie(res, signAuthToken(user.id));
    res.json({ loginId: user.loginId });
  }),
);

// requireAuth를 걸지 않는다 — 만료/위조 토큰 상태에서도 로그아웃(쿠키 제거)은 항상 성공해야 한다
authRouter.post("/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/auth/me", requireAuth, (req, res) => {
  res.json({ loginId: req.user!.loginId });
});
