import { Response } from "express";

export const AUTH_COOKIE = "mongly_token";

// Next rewrites 프록시로 first-party가 되므로 SameSite=Lax로 충분 (계획서 §7)
// localStorage 저장 금지 — 반드시 httpOnly 쿠키로만
export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
}
