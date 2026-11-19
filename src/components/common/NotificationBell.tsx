"use client";

import { useState } from "react";
import { PiBell } from "react-icons/pi";
import { flatSurface } from "@/lib/styles";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useNotificationSummary, useLikeNotifications } from "@/hooks/useNotifications";
import { useSound } from "@/hooks/useSound";
import { useSnackbar } from "./SnackbarProvider";
import NotificationModal from "./NotificationModal";

// 헤더 오른쪽 알림 벨 — 친구요청+좋아요 통합 배지. badgeCount는 /notifications/summary 기준이고
// 친구요청 목록/수락/거절은 기존 /friend-requests 그대로 씀(백엔드가 그렇게 유지하도록 지시).
export default function NotificationBell() {
  const { requests, total: pendingRequestCount, refetch: refetchRequests, acceptRequest, rejectRequest } =
    useFriendRequests();
  const { badgeCount, unreadLikeCount, refetch: refetchSummary } = useNotificationSummary();
  const { notifications: likeNotifications, loadAndMarkRead } = useLikeNotifications();
  const { showSnackbar } = useSnackbar();
  const playClickSound = useSound("/audios/click_sound.mp3", { volume: 0.5 });
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    playClickSound();
    setOpen(true);
    refetchRequests();
    refetchSummary();
  };

  const handleAccept = async (id: string) => {
    const { result, error } = await acceptRequest(id);
    if (error) {
      showSnackbar(error.message);
      return;
    }
    showSnackbar(`${result?.loginId}님과 친구가 됐어요!`);
    refetchSummary();
  };

  const handleReject = async (id: string) => {
    const { error } = await rejectRequest(id);
    if (error) showSnackbar(error.message);
    refetchSummary();
  };

  const handleOpenLikeTab = async () => {
    await loadAndMarkRead();
    refetchSummary();
  };

  return (
    <>
      <button
        type="button"
        aria-label="알림"
        onClick={handleOpen}
        className={`${flatSurface} flex-shrink-0 rounded-full p-3 bg-secondary/20 text-primary-900`}
      >
        <span className="relative z-10 flex">
          <PiBell size={22} />
        </span>
        {badgeCount > 0 && (
          <span className="absolute right-2.5 top-2.5 z-10 h-2.5 w-2.5 rounded-full bg-danger" />
        )}
      </button>

      {open && (
        <NotificationModal
          requests={requests}
          onAcceptRequest={handleAccept}
          onRejectRequest={handleReject}
          hasPendingRequests={pendingRequestCount > 0}
          likeNotifications={likeNotifications}
          hasUnreadLikes={unreadLikeCount > 0}
          onOpenLikeTab={handleOpenLikeTab}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
