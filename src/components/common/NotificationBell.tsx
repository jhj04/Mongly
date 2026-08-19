"use client";

import { useState } from "react";
import { PiBell } from "react-icons/pi";
import { glassSurface } from "@/lib/styles";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useSnackbar } from "./SnackbarProvider";
import FriendRequestModal from "./FriendRequestModal";

// 헤더 오른쪽 알림 벨 — 친구 요청이 하나라도 있으면 빨간 점, 누르면 요청 목록 모달
export default function NotificationBell() {
  const { requests, hasUnread, refetch, acceptRequest, rejectRequest } = useFriendRequests();
  const { showSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    refetch();
  };

  const handleAccept = async (id: string) => {
    const { result, error } = await acceptRequest(id);
    if (error) {
      showSnackbar(error.message);
      return;
    }
    showSnackbar(`${result?.loginId}님과 친구가 됐어요!`);
  };

  const handleReject = async (id: string) => {
    const { error } = await rejectRequest(id);
    if (error) showSnackbar(error.message);
  };

  return (
    <>
      <button
        type="button"
        aria-label="알림"
        onClick={handleOpen}
        className={`${glassSurface} relative flex-shrink-0 rounded-full p-3 bg-secondary/20 text-primary-900`}
      >
        <span className="relative z-10 flex">
          <PiBell size={22} />
        </span>
        {hasUnread && (
          <span className="absolute right-2.5 top-2.5 z-10 h-2.5 w-2.5 rounded-full bg-danger" />
        )}
      </button>

      {open && (
        <FriendRequestModal
          requests={requests}
          onAccept={handleAccept}
          onReject={handleReject}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
