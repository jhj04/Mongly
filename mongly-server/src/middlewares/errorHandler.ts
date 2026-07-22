import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";

export { AppError };

// express.json()(body-parser)이 던지는 오류 — status 400(파싱 실패)·413(용량 초과) 등을 갖는다
function isBodyParserError(err: unknown): err is Error & { status: number } {
  return (
    err instanceof Error &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number" &&
    (err as { status: number }).status < 500
  );
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, "NOT_FOUND", "존재하지 않는 경로예요."));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "VALIDATION", message: "요청 형식이 올바르지 않아요.", details: err.flatten() },
    });
  }
  if (isBodyParserError(err)) {
    // 클라이언트 잘못(4xx)을 500으로 오분류하지 않는다
    const message = err.status === 413 ? "요청 본문이 너무 커요." : "본문이 올바른 JSON이 아니에요.";
    return res.status(err.status).json({ error: { code: "INVALID_BODY", message } });
  }
  console.error(err);
  return res.status(500).json({ error: { code: "INTERNAL", message: "서버에 문제가 생겼어요." } });
}
