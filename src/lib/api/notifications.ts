import { api } from "@/lib/axios";

export type NotificationType = "FRIEND_REQUEST" | "JAR_LIKED";

export interface NotificationActor {
  loginId: string;
}

export interface JarLikedNotification {
  id: string;
  type: "JAR_LIKED";
  actor: NotificationActor;
  target: { type: "JAR"; id: string; recordDate: string };
  createdAt: string;
  readAt: string | null;
}

export interface FriendRequestNotification {
  id: string;
  type: "FRIEND_REQUEST";
  actor: NotificationActor;
  target: { type: "FRIEND_REQUEST"; id: string };
  createdAt: string;
  readAt: string | null;
}

export type Notification = JarLikedNotification | FriendRequestNotification;

export interface GetNotificationsParams {
  type?: NotificationType;
  limit?: number;
  cursor?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  nextCursor: string | null;
  hasMore: boolean;
}

// 통합 알림 목록 — FRIEND_REQUEST/JAR_LIKED. GET은 읽음 상태를 바꾸지 않음.
export const getNotifications = (params?: GetNotificationsParams) =>
  api.get<NotificationsResponse>("/api/notifications", { params }).then((res) => res.data);

export interface NotificationSummary {
  unreadLikeCount: number;
  pendingFriendRequestCount: number;
  badgeCount: number;
}

// 종 배지 집계 — badgeCount = unreadLikeCount + pendingFriendRequestCount.
// 서버에 타이머가 없으므로 화면이 보이는 동안 폴링은 클라이언트가 직접 구현해야 함.
export const getNotificationSummary = () =>
  api.get<NotificationSummary>("/api/notifications/summary").then((res) => res.data);

export interface MarkNotificationReadResponse {
  id: string;
  readAt: string;
}

// 알림 하나 읽음 처리 — 최초 읽음 시각 유지(반복 호출해도 동일).
// 친구 요청 알림을 읽어도 pendingFriendRequestCount는 그대로(수락/거절만 줄어듦).
export const markNotificationRead = (id: string) =>
  api.patch<MarkNotificationReadResponse>(`/api/notifications/${id}/read`).then((res) => res.data);
