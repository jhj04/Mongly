"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getNotificationSummary,
  getNotifications,
  markNotificationRead,
  NotificationSummary,
  JarLikedNotification,
} from "@/lib/api/notifications";

const SUMMARY_POLL_MS = 30000;
const LIKE_LIST_LIMIT = 50;

// 벨 배지 — 화면이 보이는 동안 30초 간격 폴링 + 마운트/재진입 시 즉시 재조회.
// 서버는 타이머가 없으므로(문서 주석 기준) 클라이언트가 폴링을 책임짐.
export function useNotificationSummary() {
  const [summary, setSummary] = useState<NotificationSummary | null>(null);

  const refetch = useCallback(async () => {
    try {
      setSummary(await getNotificationSummary());
    } catch {
      // 배지는 조용히 실패해도 됨 — 다음 폴링에서 재시도됨
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refetch();
    }, SUMMARY_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refetch]);

  return { badgeCount: summary?.badgeCount ?? 0, unreadLikeCount: summary?.unreadLikeCount ?? 0, refetch };
}

// 좋아요 탭 — JAR_LIKED 알림 목록. 탭을 열 때 loadAndMarkRead()로 미확인 항목을 전부 읽음 처리.
export function useLikeNotifications() {
  const [notifications, setNotifications] = useState<JarLikedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAndMarkRead = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getNotifications({ type: "JAR_LIKED", limit: LIKE_LIST_LIMIT });
      const items = result.notifications as JarLikedNotification[];
      setNotifications(items);
      const unread = items.filter((n) => n.readAt === null);
      // 이미 처리/삭제된 알림(NOTIFICATION_NOT_FOUND)은 배지 정합성에 영향 없어 개별적으로 무시
      await Promise.all(unread.map((n) => markNotificationRead(n.id).catch(() => null)));
    } catch {
      // 목록 로드 실패는 조용히 둠 — 탭을 다시 열면 재시도됨
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { notifications, isLoading, loadAndMarkRead };
}
