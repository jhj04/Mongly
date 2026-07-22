import { NextFunction, Request, RequestHandler, Response } from "express";

// async 라우트의 reject를 errorHandler로 전달한다.
// 모든 async 핸들러는 이 래퍼로 감쌀 것 — try/catch{next(err)} 복붙 금지.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
