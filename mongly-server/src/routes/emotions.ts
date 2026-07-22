import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { emotionRepository } from "../repositories/emotionRepository";

export const emotionsRouter = Router();

// 감정 마스터 — 프론트 팔레트 렌더링과 색 조합의 원천 데이터 (비인증 허용)
emotionsRouter.get(
  "/emotions",
  asyncHandler(async (_req, res) => {
    res.json({ emotions: await emotionRepository.findActive() });
  }),
);
