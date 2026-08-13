"use client";

import { useState } from "react";
import { PiX } from "react-icons/pi";
import { glassSurface } from "@/lib/styles";
import Button from "./Button";
import TextField from "./TextField";
import Portal from "./Portal";

interface AddFriendModalProps {
  isLoading: boolean;
  onSubmit: (loginId: string) => void;
  onClose: () => void;
}

export default function AddFriendModal({ isLoading, onSubmit, onClose }: AddFriendModalProps) {
  const [loginId, setLoginId] = useState("");

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

          <h2 className="relative z-10 text-center font-point text-2xl text-primary-800">친구 추가</h2>
          <p className="relative z-10 mt-3 text-center text-sm text-primary-900">
            추가할 친구의 아이디를 입력해 주세요.
          </p>

          <div className="relative z-10 mt-8">
            <TextField label="친구 아이디" value={loginId} onChange={setLoginId} />
          </div>

          <div className="relative z-10 mt-8">
            <Button
              label={isLoading ? "추가 중..." : "추가하기"}
              variant="filled"
              className="w-full"
              onClick={() => onSubmit(loginId.trim())}
              disabled={!loginId.trim() || isLoading}
            />
          </div>
        </div>
      </div>
    </Portal>
  );
}
