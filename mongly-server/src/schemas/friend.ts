import { z } from "zod";
import { loginIdSchema } from "./auth";

export const sendFriendRequestSchema = z.object({
  toLoginId: loginIdSchema, // 정확 일치만 — 검색/부분 일치 API는 만들지 않는다 (프라이버시)
});

// 피그마 친구 삭제 모달: 다중 선택 → "OO님 외 2명을 삭제하시겠습니까?"
export const removeFriendsSchema = z.object({
  friendLoginIds: z
    .array(loginIdSchema)
    .min(1, "삭제할 친구를 선택해주세요.")
    .max(10, "친구는 최대 10명이라 한 번에 그 이상 삭제할 수 없어요.")
    .refine((arr) => new Set(arr).size === arr.length, "같은 아이디가 중복돼 있어요."),
});
