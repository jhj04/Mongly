import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

// 에러 포맷 계약: { error: { code, message, details? } } (계획서 §5)
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "존재하지 않는 경로예요." } });
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
  console.error(err);
  return res.status(500).json({ error: { code: "INTERNAL", message: "서버에 문제가 생겼어요." } });
}
