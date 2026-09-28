import cookieParser from "cookie-parser";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { openapi } from "./docs/openapi";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { requireJson } from "./middlewares/requireJson";
import { authRouter } from "./routes/auth";
import { emotionsRouter } from "./routes/emotions";
import { friendsRouter } from "./routes/friends";
import { healthRouter } from "./routes/health";
import { jarsRouter } from "./routes/jars";
import { jarLikesRouter } from "./routes/jarLikes";
import { notificationsRouter } from "./routes/notifications";
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
  // 사용자별 감정·알림이 브라우저/프록시의 공용 캐시에 남지 않도록 한다.
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    next();
  });

  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", usersRouter);
  app.use("/api", emotionsRouter);
  app.use("/api", jarLikesRouter);
  app.use("/api", jarsRouter);
  app.use("/api", friendsRouter);
  app.use("/api", notificationsRouter);
  app.get("/api/openapi.json", (_req, res) => res.json(openapi));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
