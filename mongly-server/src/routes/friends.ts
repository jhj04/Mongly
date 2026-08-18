import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/auth";
import { friendAddLimiter, friendJarsLimiter } from "../middlewares/rateLimit";
import { removeFriendsSchema, sendFriendRequestSchema } from "../schemas/friend";
import { friendService } from "../services/friendService";

export const friendsRouter = Router();

friendsRouter.use("/friends", requireAuth);
friendsRouter.use("/friend-requests", requireAuth);

// ── 친구 요청 (요청 → 수락으로 성립. 즉시 친구였던 POST /friends는 제거됨) ──

// 설정 — 친구 추가 모달: 이제 "요청 보내기". 상대가 이미 나에게 요청해 뒀으면 즉시 성립(status: "accepted")
friendsRouter.post(
  "/friend-requests",
  friendAddLimiter,
  asyncHandler(async (req, res) => {
    const { toLoginId } = sendFriendRequestSchema.parse(req.body);
    res.status(201).json(await friendService.sendRequest(req.user!.id, toLoginId));
  }),
);

// 종 아이콘 팝업 — 내가 받은 대기 요청 목록 (total = 빨간 점 배지 값)
friendsRouter.get(
  "/friend-requests",
  asyncHandler(async (req, res) => {
    res.json(await friendService.listReceivedRequests(req.user!.id));
  }),
);

// 수락 — 받은 사람만. 쌍방 친구 성립
friendsRouter.post(
  "/friend-requests/:id/accept",
  asyncHandler(async (req, res) => {
    res.json(await friendService.acceptRequest(req.user!.id, req.params.id));
  }),
);

// 거절 — 받은 사람만. 요청 삭제 (상대는 다시 신청 가능)
friendsRouter.post(
  "/friend-requests/:id/reject",
  asyncHandler(async (req, res) => {
    res.json(await friendService.rejectRequest(req.user!.id, req.params.id));
  }),
);

// ── 친구 목록/삭제/선반 (기존과 동일) ──

// 친구 탭 칩 목록 + 설정 목록 (최대 10명이라 페이지네이션 없이 전체 반환)
friendsRouter.get(
  "/friends",
  asyncHandler(async (req, res) => {
    res.json(await friendService.listFriends(req.user!.id));
  }),
);

// 설정 — 친구 삭제 모달 (다중 선택, 전체 성공/전체 실패)
friendsRouter.delete(
  "/friends",
  asyncHandler(async (req, res) => {
    const { friendLoginIds } = removeFriendsSchema.parse(req.body);
    res.json(await friendService.removeFriends(req.user!.id, friendLoginIds));
  }),
);

// 친구 탭 선반 — 친구마다 최신 유리병 1개씩 (유리병 클릭 → GET /jars/:id로 캐릭터 보기)
friendsRouter.get(
  "/friends/jars",
  friendJarsLimiter,
  asyncHandler(async (req, res) => {
    res.json(await friendService.getFriendsLatestJars(req.user!.id));
  }),
);
