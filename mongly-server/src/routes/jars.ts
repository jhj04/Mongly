import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/auth";
import { createJarSchema } from "../schemas/jar";
import { jarService } from "../services/jarService";

export const jarsRouter = Router();

jarsRouter.use("/jars", requireAuth);

// 몽글리 탭 진입 시 오늘(KST) 기록 확인 — "오늘" 판정의 단일 기준은 서버
// 주의: "/jars/:id"보다 먼저 선언해야 "today"가 id로 매칭되지 않는다
jarsRouter.get(
  "/jars/today",
  asyncHandler(async (req, res) => {
    res.json({ jar: await jarService.getTodayJar(req.user!.id) });
  }),
);

// 완료하기
jarsRouter.post(
  "/jars",
  asyncHandler(async (req, res) => {
    const { emotions } = createJarSchema.parse(req.body);
    const jar = await jarService.createJar(req.user!.id, emotions);
    res.status(201).json(jar);
  }),
);

// 서재 — 내 유리병 목록 (최대 7개)
jarsRouter.get(
  "/jars",
  asyncHandler(async (req, res) => {
    res.json({ jars: await jarService.listJars(req.user!.id) });
  }),
);

// 캐릭터 보기 / 감정 구성 보기 — 본인 또는 친구
jarsRouter.get(
  "/jars/:id",
  asyncHandler(async (req, res) => {
    res.json(await jarService.getJarForViewer(req.user!.id, req.params.id));
  }),
);

// 서재 — 삭제하기
jarsRouter.delete(
  "/jars/:id",
  asyncHandler(async (req, res) => {
    await jarService.deleteJar(req.user!.id, req.params.id);
    res.json({ ok: true });
  }),
);
