import { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";

// CSRF 완화: 상태 변경 요청은 application/json만 허용 (계획서 §7).
// HTML form은 urlencoded/multipart만 보낼 수 있으므로 타 사이트 form 전송이 차단된다.
// Content-Type이 아예 없는 요청은 통과시킨다 — form/sendBeacon은 CT를 항상 붙이므로 공격 벡터가 아니고,
// 바디 없는 정상 요청(로그아웃 등)을 막지 않기 위함.
export function requireJson(req: Request, _res: Response, next: NextFunction) {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    const contentType = req.headers["content-type"];
    if (contentType && !contentType.includes("application/json")) {
      return next(new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type은 application/json이어야 해요."));
    }
  }
  next();
}
