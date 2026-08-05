"use client";

import { useEffect, useState } from "react";
import {
  addFriend,
  getFriends,
  deleteFriends,
  getFriendsJars,
  AddFriendRequest,
  DeleteFriendsRequest,
  Friend,
  FriendShelfEntry,
} from "@/lib/api/friends";
import { ApiError } from "@/lib/axios";

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError({ code: "NETWORK_ERROR", message: "네트워크 오류가 발생했어요." });
}

export function useAddFriend() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (data: AddFriendRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await addFriend(data);
      return { loginId: result.loginId, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { loginId: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { addFriend: submit, isLoading, error };
}

// 설정/친구 탭 친구 목록 — 마운트 시 조회, 추가/삭제 후 refetch로 갱신
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

export function useDeleteFriends() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (data: DeleteFriendsRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await deleteFriends(data);
      return { deleted: result.deleted, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { deleted: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteFriends: submit, isLoading, error };
}

// 친구 탭 선반 — 친구별 최신 유리병 1개씩
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
