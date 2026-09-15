import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";

export const healthRouter = Router();

// ── 슬립 방지 핑 전용 (UptimeRobot 5분 간격은 반드시 이쪽으로) ──
// DB를 건드리지 않는 것이 핵심: Render(재기동 ~1분)만 깨워두고 Neon은 자게 둔다.
// Neon 무료는 100 CU-h/월 = 최소 컴퓨트 0.25 CU 기준 400시간뿐이라,
// 핑이 DB까지 깨우면 24/7 가동(730h×0.25=182.5 CU-h)으로 약 17일 만에 한도가 소진되어
// 남은 달 내내 컴퓨트가 정지된다. Neon 웨이크업은 ~1초라 실사용자 체감은 거의 없다.
healthRouter.get("/health/live", (_req, res) => {
  res.json({ ok: true });
});

// ── 심층 헬스체크 (DB 포함) ──
// 배포 직후 확인·수동 점검·발표 전 워밍업용. 모니터링에 걸려면 60분 이상 간격으로만.
healthRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "up" });
  }),
);
