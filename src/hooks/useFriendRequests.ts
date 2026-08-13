"use client";

import { useCallback, useEffect, useState } from "react";
import { DUMMY_FRIEND_REQUESTS } from "@/data/dummy";

const STORAGE_KEY = "mongly:friendRequests";

export interface FriendRequest {
  id: string;
  loginId: string;
}

function readRequests(): FriendRequest[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as FriendRequest[];
  } catch {
    // 무시하고 더미로 시드
  }
  // 첫 방문이면 더미 요청 몇 개로 시드해서 알림 벨 동작을 바로 확인할 수 있게 함
  const seeded = DUMMY_FRIEND_REQUESTS.map((loginId, i) => ({ id: `dummy-${i}`, loginId }));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

// addFriend가 아직 즉시 성립 방식이라 실제 "요청 대기" API가 없음 —
// 백엔드가 요청-승인 방식으로 바뀌면 이 훅 내부만 API 호출로 교체하면 됨(컴포넌트 쪽은 그대로).
export function useFriendRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRequests(readRequests());
  }, []);

  const removeRequest = useCallback((id: string) => {
    setRequests((prev) => {
      const next = prev.filter((r) => r.id !== id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // 확인(수락)/삭제(거절) 모두 지금은 목록에서 제거하는 것만 함 — 실제 친구 목록 반영은
  // addFriend가 요청-승인 방식으로 바뀐 뒤 acceptRequest에서 API 호출을 추가하면 됨
  const acceptRequest = useCallback((id: string) => removeRequest(id), [removeRequest]);
  const rejectRequest = useCallback((id: string) => removeRequest(id), [removeRequest]);

  return { requests, hasUnread: requests.length > 0, acceptRequest, rejectRequest };
}
