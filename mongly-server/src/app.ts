import cookieParser from "cookie-parser";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { openapi } from "./docs/openapi";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { requireJson } from "./middlewares/requireJson";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { usersRouter } from "./routes/users";

export function createApp() {
  const app = express();

  // rate limit이 실제 클라이언트 IP를 보도록 프록시 홉 수를 신뢰한다.
  // 로컬/단일 프록시=1, 배포(Vercel rewrites → Render)=2 — Render 환경변수 TRUST_PROXY_HOPS=2 필수.
  // 홉 수가 틀리면 전 사용자가 프록시 IP 하나로 묶여 rate limit이 오작동한다.
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));

  app.use(requireJson);
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", usersRouter);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
