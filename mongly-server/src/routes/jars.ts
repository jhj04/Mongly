import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/auth";
import { addDraftEmotionSchema } from "../schemas/draft";
import { completeJarSchema, jarIdParamsSchema, listJarsQuerySchema, updateJarSchema } from "../schemas/jar";
import { jarService } from "../services/jarService";

export const jarsRouter = Router();

jarsRouter.use("/jars", requireAuth);

// ── 몽글리 탭 진입: 오늘(KST) 상태 (완성본 or 담는 중 드래프트) ──
// 주의: "/jars/:id"보다 먼저 선언해야 today·draft가 :id로 매칭되지 않는다.
//       단일 세그먼트 "/jars/draft"는 만들지 않는다(:id에 흡수되므로).
jarsRouter.get(
  "/jars/today",
  asyncHandler(async (req, res) => {
    res.json(await jarService.getTodayState(req.user!.id));
  }),
);

// ── 드래그 1회: 감정 담기 (즉시 DB 반영) ──
jarsRouter.post(
  "/jars/draft/emotions",
  asyncHandler(async (req, res) => {
    const { emotionId } = addDraftEmotionSchema.parse(req.body);
    const draft = await jarService.addDraftEmotion(req.user!.id, emotionId);
    res.status(201).json(draft);
  }),
);

// ── 되돌리기: 마지막 담은 감정 1개 제거 ──
jarsRouter.delete(
  "/jars/draft/emotions",
  asyncHandler(async (req, res) => {
    res.json(await jarService.undoDraftEmotion(req.user!.id));
  }),
);

// ── 완성하기: 서버 드래프트를 확정해 오늘의 유리병으로 생성 ──
jarsRouter.post(
  "/jars",
  asyncHandler(async (req, res) => {
    const input = completeJarSchema.parse(req.body ?? {});
    const jar = await jarService.completeJar(req.user!.id, input);
    res.status(201).json(jar);
  }),
);

// 서재 — 저장 개수 제한 없이 날짜순 페이지 조회 (기본 7개).
jarsRouter.get(
  "/jars",
  asyncHandler(async (req, res) => {
    const query = listJarsQuerySchema.parse(req.query);
    res.json(await jarService.listJars(req.user!.id, query));
  }),
);

// 캐릭터 보기 / 감정 구성 보기 — 본인 또는 친구
jarsRouter.get(
  "/jars/:id",
  asyncHandler(async (req, res) => {
    const { id } = jarIdParamsSchema.parse(req.params);
    res.json(await jarService.getJarForViewer(req.user!.id, id));
  }),
);

// 완성된 오늘 병 편집 — 감정 구성 전체 교체 및/또는 일기 변경.
jarsRouter.patch(
  "/jars/:id",
  asyncHandler(async (req, res) => {
    const { id } = jarIdParamsSchema.parse(req.params);
    const input = updateJarSchema.parse(req.body);
    res.json(await jarService.updateJar(req.user!.id, id, input));
  }),
);

// 서재 — 삭제하기
jarsRouter.delete(
  "/jars/:id",
  asyncHandler(async (req, res) => {
    const { id } = jarIdParamsSchema.parse(req.params);
    await jarService.deleteJar(req.user!.id, id);
    res.json({ ok: true });
  }),
);
