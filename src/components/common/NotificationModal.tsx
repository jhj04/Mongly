"use client";

import { useState } from "react";
import { PiX } from "react-icons/pi";
import Portal from "./Portal";
import FriendRequestList from "./FriendRequestList";
import LikeNotificationList from "./LikeNotificationList";
import type { FriendRequestItem } from "@/lib/api/friends";
import type { JarLikedNotification } from "@/lib/api/notifications";
import { useSound } from "@/hooks/useSound";

type NotificationTab = "friend" | "like";

interface NotificationModalProps {
  requests: FriendRequestItem[];
  onAcceptRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  hasPendingRequests: boolean;
  likeNotifications: JarLikedNotification[];
  hasUnreadLikes: boolean;
  /** 좋아요 탭을 처음 열 때 목록 로드 + 읽음 처리 */
  onOpenLikeTab: () => void;
  onClose: () => void;
}

// 친구 요청 + 좋아요 통합 알림 모달. 폴더탭 스타일로 위에 "친구"/"좋아요" 탭을 띄우고
// 보고 있지 않은 탭에만 읽지 않음 점을 표시함(지금 보는 탭은 이미 확인 중이므로 점을 숨김).
export default function NotificationModal({
  requests,
  onAcceptRequest,
  onRejectRequest,
  hasPendingRequests,
  likeNotifications,
  hasUnreadLikes,
  onOpenLikeTab,
  onClose,
}: NotificationModalProps) {
  const [tab, setTab] = useState<NotificationTab>("friend");
  const playClickSound = useSound("/audios/click_sound.mp3", { volume: 0.5 });

  const selectTab = (next: NotificationTab) => {
    playClickSound();
    setTab(next);
    if (next === "like") onOpenLikeTab();
  };

  const handleClose = () => {
    playClickSound();
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
        <div className="relative w-full max-w-md">
          <div className="relative z-10 flex gap-2 px-4">
            {(["friend", "like"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => selectTab(key)}
                className={`relative rounded-t-2xl px-6 py-2 font-point text-sm transition-colors ${
                  tab === key ? "bg-secondary text-primary-800" : "bg-secondary/60 text-primary-900/70"
                }`}
              >
                {key === "friend" ? "친구" : "좋아요"}
                {tab !== key && (key === "friend" ? hasPendingRequests : hasUnreadLikes) && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
                )}
              </button>
            ))}
          </div>

          <div className="relative rounded-[2rem] rounded-tl-none px-8 py-10 bg-secondary text-primary-900">
            <button
              type="button"
              onClick={handleClose}
              aria-label="닫기"
              className="absolute right-6 top-6 z-10 text-primary-900"
            >
              <PiX size={22} />
            </button>

            <h2 className="relative z-10 text-center font-point text-2xl text-primary-800">
              {tab === "friend" ? "친구 요청" : "좋아요"}
            </h2>
            {tab === "friend" && (
              <p className="relative z-10 mt-3 text-center text-sm text-primary-900">
                팔로우 요청이 도착했어요. 확인하거나 삭제해 주세요.
              </p>
            )}

            <div className="relative z-10 mt-10">
              {tab === "friend" ? (
                <FriendRequestList requests={requests} onAccept={onAcceptRequest} onReject={onRejectRequest} />
              ) : (
                <LikeNotificationList notifications={likeNotifications} />
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
