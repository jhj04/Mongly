"use client";

import { PiX } from "react-icons/pi";
import { glassSurface } from "@/lib/styles";
import Button from "./Button";
import Portal from "./Portal";
import type { FriendRequest } from "@/hooks/useFriendRequests";

interface FriendRequestModalProps {
  requests: FriendRequest[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onClose: () => void;
}

export default function FriendRequestModal({
  requests,
  onAccept,
  onReject,
  onClose,
}: FriendRequestModalProps) {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
        <div className={`w-full max-w-md rounded-[2rem] px-8 py-10 bg-secondary/10 text-primary-900 ${glassSurface}`}>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-6 top-6 z-10 text-primary-900"
          >
            <PiX size={22} />
          </button>

          <h2 className="relative z-10 text-center font-point text-2xl text-primary-800">친구 요청</h2>
          <p className="relative z-10 mt-3 text-center text-sm text-primary-900">
            팔로우 요청이 도착했어요. 확인하거나 삭제해 주세요.
          </p>

          <div className="relative z-10 mt-10 flex flex-col gap-5">
            {requests.length === 0 ? (
              <p className="text-center text-sm text-primary-900/70">받은 요청이 없어요</p>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-3">
                  <span className="truncate text-base text-primary-900">{request.loginId}</span>
                  <div className="flex flex-shrink-0 gap-2">
                    <Button label="확인" variant="filled" size="sm" onClick={() => onAccept(request.id)} />
                    <Button label="삭제" variant="outlined" size="sm" onClick={() => onReject(request.id)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
