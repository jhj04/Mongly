import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { decodeJarImage } from "../lib/image";
import { requireAuth } from "../middlewares/auth";
import { addDraftEmotionSchema } from "../schemas/draft";
import { completeJarSchema } from "../schemas/jar";
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

// ── 완성하기: 서버 드래프트를 확정 + 프론트가 렌더한 유리병 PNG 저장 ──
// 바디: { image: "<canvas.toDataURL('image/png') 결과 또는 순수 base64>" }
jarsRouter.post(
  "/jars",
  asyncHandler(async (req, res) => {
    const { image } = completeJarSchema.parse(req.body);
    const jar = await jarService.completeJar(req.user!.id, decodeJarImage(image));
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

// 유리병 PNG — 서재·친구 탭 렌더용. 본인 또는 친구만 (상세와 동일한 접근 제어)
// 캐시는 1시간 + ETag 재검증: 병당 1장 불변이지만, 더 길게 잡으면 친구 삭제·병 삭제 후에도
// 브라우저 캐시가 접근 회수(403/404)보다 오래 살아남는다. 재검증 요청은 이 핸들러를 다시 타므로 접근 제어가 재실행됨
jarsRouter.get(
  "/jars/:id/image",
  asyncHandler(async (req, res) => {
    const image = await jarService.getJarImageForViewer(req.user!.id, req.params.id);
    res
      .set("Cache-Control", "private, max-age=3600")
      .type("image/png")
      .send(Buffer.from(image.data));
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
