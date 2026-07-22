import { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE, clearAuthCookie } from "../lib/cookies";
import { AppError } from "../lib/errors";
import { verifyAuthToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

// 매 요청 사용자 존재를 확인한다 — 탈퇴한 유저의 살아있는 토큰이 통과해
// FK 오류 500을 내는 것을 방지 (계획서 §7). 이 규모에선 조회 비용 무시 가능.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token: unknown = req.cookies?.[AUTH_COOKIE];
    if (typeof token !== "string" || !token) {
      throw new AppError(401, "UNAUTHORIZED", "로그인이 필요해요.");
    }

    const userId = verifyAuthToken(token);
    if (!userId) {
      clearAuthCookie(res); // 만료/위조 토큰은 쿠키도 정리
      throw new AppError(401, "UNAUTHORIZED", "로그인이 만료됐어요.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, loginId: true },
    });
    if (!user) {
      clearAuthCookie(res); // 탈퇴자 토큰 — 쿠키도 정리
      throw new AppError(401, "UNAUTHORIZED", "존재하지 않는 계정이에요.");
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
