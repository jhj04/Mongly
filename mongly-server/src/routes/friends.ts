import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/auth";
import { friendAddLimiter, friendJarsLimiter } from "../middlewares/rateLimit";
import { addFriendSchema, removeFriendsSchema } from "../schemas/friend";
import { friendService } from "../services/friendService";

export const friendsRouter = Router();

friendsRouter.use("/friends", requireAuth);

// 설정 — 친구 추가 모달
friendsRouter.post(
  "/friends",
  friendAddLimiter,
  asyncHandler(async (req, res) => {
    const { friendLoginId } = addFriendSchema.parse(req.body);
    const friend = await friendService.addFriend(req.user!.id, friendLoginId);
    res.status(201).json(friend);
  }),
);

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

// 친구 탭 — 친구의 유리병 선반 (한글 아이디는 프론트가 encodeURIComponent, Express가 자동 디코딩)
friendsRouter.get(
  "/friends/:loginId/jars",
  friendJarsLimiter,
  asyncHandler(async (req, res) => {
    res.json(await friendService.getFriendJars(req.user!.id, req.params.loginId));
  }),
);
