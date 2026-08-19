"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  FriendRequestItem,
} from "@/lib/api/friends";
import { ApiError } from "@/lib/axios";

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError({ code: "NETWORK_ERROR", message: "네트워크 오류가 발생했어요." });
}

export type { FriendRequestItem as FriendRequest };

// 알림 벨 — 받은 대기 중 친구 요청 목록. total이 빨간 점 배지 값(requests.length가 아님)
export function useFriendRequests() {
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getFriendRequests();
      setRequests(result.requests);
      setTotal(result.total);
    } catch {
      // 벨 배지는 조용히 실패해도 됨 — 모달을 열 때 다시 시도됨
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  const removeRequest = useCallback((id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  const acceptRequest = useCallback(
    async (id: string) => {
      try {
        const result = await acceptFriendRequest(id);
        removeRequest(id);
        return { result, error: null as ApiError | null };
      } catch (e) {
        return { result: null, error: toApiError(e) };
      }
    },
    [removeRequest]
  );

  const rejectRequest = useCallback(
    async (id: string) => {
      try {
        await rejectFriendRequest(id);
        removeRequest(id);
        return { error: null as ApiError | null };
      } catch (e) {
        return { error: toApiError(e) };
      }
    },
    [removeRequest]
  );

  return { requests, total, isLoading, hasUnread: total > 0, refetch, acceptRequest, rejectRequest };
}
