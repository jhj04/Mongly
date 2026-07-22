import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { clearAuthCookie } from "../lib/cookies";
import { requireAuth } from "../middlewares/auth";
import { checkLoginIdLimiter } from "../middlewares/rateLimit";
import {
  deleteAccountSchema,
  loginIdSchema,
  updateLoginIdSchema,
  updatePasswordSchema,
} from "../schemas/auth";
import { userService } from "../services/userService";

export const usersRouter = Router();

// 회원가입·아이디 수정 공용 중복 확인 (피그마 "중복 확인" 버튼)
usersRouter.get(
  "/users/check-login-id",
  checkLoginIdLimiter,
  asyncHandler(async (req, res) => {
    const loginId = loginIdSchema.parse(req.query.loginId);
    res.json({ available: await userService.isLoginIdAvailable(loginId) });
  }),
);

usersRouter.patch(
  "/users/me/login-id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { loginId } = updateLoginIdSchema.parse(req.body);
    const user = await userService.changeLoginId(req.user!.id, loginId);
    res.json({ loginId: user.loginId });
  }),
);

usersRouter.patch(
  "/users/me/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = updatePasswordSchema.parse(req.body);
    await userService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json({ ok: true });
  }),
);

// 피그마 계정 삭제 모달: "정말로 몽글리 계정을 삭제하시겠습니까?" + 비밀번호 확인
usersRouter.delete(
  "/users/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { password } = deleteAccountSchema.parse(req.body);
    await userService.deleteAccount(req.user!.id, password);
    clearAuthCookie(res);
    res.json({ ok: true });
  }),
);
