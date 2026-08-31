"use client";

import { PiX } from "react-icons/pi";
import { glassSurface } from "@/lib/styles";
import Button from "./Button";
import Portal from "./Portal";

interface ConfirmModalProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** confirm 버튼 색 — 삭제 등 되돌릴 수 없는 동작이면 danger */
  confirmVariant?: "filled" | "danger";
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// 예/아니오 확인용 공용 모달. AddFriendModal과 동일한 유리 패널 스타일을 따름.
// 배경(딤) 클릭 또는 X 버튼으로 닫히고, 확인 버튼은 처리 중(isLoading)엔 비활성화됨.
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  confirmVariant = "filled",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
        onClick={onClose}
      >
        <div
          className={`relative w-full max-w-md rounded-[2rem] px-8 py-10 bg-secondary/10 text-primary-900 ${glassSurface}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-6 top-6 z-10 text-primary-900"
          >
            <PiX size={22} />
          </button>

          <h2 className="relative z-10 text-center font-point text-2xl text-primary-800">
            {title}
          </h2>
          {message && (
            <p className="relative z-10 mt-3 text-center text-sm text-primary-900">{message}</p>
          )}

          <div className="relative z-10 mt-8 flex gap-3">
            <Button
              label={cancelLabel}
              variant="outlined"
              className="flex-1"
              onClick={onClose}
              disabled={isLoading}
            />
            <Button
              label={confirmLabel}
              variant={confirmVariant}
              className="flex-1"
              onClick={onConfirm}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </Portal>
  );
}
