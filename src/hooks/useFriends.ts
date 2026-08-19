"use client";

import { useEffect, useState } from "react";
import {
  getFriends,
  getFriendsJars,
  sendFriendRequest,
  deleteFriends,
  Friend,
  FriendShelfEntry,
} from "@/lib/api/friends";
import { ApiError } from "@/lib/axios";

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError({ code: "NETWORK_ERROR", message: "네트워크 오류가 발생했어요." });
}

// 설정 페이지 친구 목록 — 'N/10' 카운터 및 삭제 대상 선택에 사용
export function useFriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getFriends();
      setFriends(result.friends);
      setTotal(result.total);
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, []);

  return { friends, total, isLoading, error, refetch };
}

// 친구 탭 선반 — 친구마다 최신 유리병 1개씩(없으면 jar: null)
export function useFriendsJars() {
  const [friends, setFriends] = useState<FriendShelfEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getFriendsJars();
      setFriends(result.friends);
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, []);

  return { friends, isLoading, error, refetch };
}

// 설정 페이지 친구 추가 — 요청을 보냄(상대가 이미 나에게 요청해 뒀으면 즉시 성립)
export function useSendFriendRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (toLoginId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await sendFriendRequest({ toLoginId });
      return { result, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { result: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { sendFriendRequest: submit, isLoading, error };
}

// 설정 페이지 친구 삭제 — 선택한 loginId들을 한 번에 해제(전체 성공/전체 실패)
export function useDeleteFriends() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (friendLoginIds: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await deleteFriends({ friendLoginIds });
      return { result, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { result: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteFriends: submit, isLoading, error };
}
