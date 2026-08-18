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
import { usersRouter } from "./routes/users";

export function createApp() {
  const app = express();

  // rate limit이 실제 클라이언트 IP를 보도록 프록시 홉 수를 신뢰한다.
  // 로컬/단일 프록시=1, 배포(Vercel rewrites → Render)=2 — Render 환경변수 TRUST_PROXY_HOPS=2 필수.
  // 홉 수가 틀리면 전 사용자가 프록시 IP 하나로 묶여 rate limit이 오작동한다.
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));

  app.use(requireJson);
  // 큰 바디(2mb)는 유리병 PNG(원본 1MB의 base64, ±37%)가 실려 오는 완성하기 한 곳에만 허용하고
  // 나머지 전부(비인증·미존재 경로 포함)는 기본 100kb 유지 — 전역 2mb는 커넥션당 버퍼링을 20배 키우는 DoS 표면이 된다.
  // 초과 시 413 INVALID_BODY — 이미지 자체의 1MB 판정(413 IMAGE_TOO_LARGE)은 lib/image가 담당
  const jsonDefault = express.json();
  const jsonLarge = express.json({ limit: "2mb" });
  app.use((req, res, next) => {
    const isComplete = req.method === "POST" && req.path.replace(/\/+$/, "") === "/api/jars";
    return (isComplete ? jsonLarge : jsonDefault)(req, res, next);
  });
  app.use(cookieParser());

  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", usersRouter);
  app.use("/api", emotionsRouter);
  app.use("/api", jarsRouter);
  app.use("/api", friendsRouter);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
