"use client";

import { useState } from "react";
import { PiX } from "react-icons/pi";
import Button from "./Button";
import Portal from "./Portal";
import { countGraphemes, truncateToGraphemes, NOTE_MAX_GRAPHEMES } from "@/lib/text";

export interface NoteModalProps {
  mode: "complete" | "edit";
  /** edit 모드에서 기존 note로 프리필 */
  initialNote?: string;
  isSubmitting?: boolean;
  onSubmit: (note: string) => void;
  /** complete 모드의 "건너뛰기"에서만 사용 */
  onSkip?: () => void;
  /** edit 모드의 닫기(X)에서만 사용 — complete 모드엔 렌더하지 않음 */
  onClose?: () => void;
}

// 한 줄 일기 — 완료하기(오늘 병 완성)와 수정하기(오늘 병 note 수정)가 공유하는 모달.
// 서버가 note를 grapheme 단위로 50자 제한하고 개행/제어문자를 거부하므로,
// 글자수 카운트는 Intl.Segmenter 기준으로 맞추고 Enter 키는 막아서 시각적 줄바꿈만 허용함.
export default function NoteModal({
  mode,
  initialNote = "",
  isSubmitting = false,
  onSubmit,
  onSkip,
  onClose,
}: NoteModalProps) {
  const [note, setNote] = useState(initialNote);
  const count = countGraphemes(note);

  const handleChange = (value: string) => {
    setNote(countGraphemes(value) > NOTE_MAX_GRAPHEMES ? truncateToGraphemes(value, NOTE_MAX_GRAPHEMES) : value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") e.preventDefault();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
        <div className="relative w-full max-w-md rounded-[2rem] px-8 py-10 bg-secondary text-primary-900">
          {mode === "edit" && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="absolute right-6 top-6 z-10 text-primary-900"
            >
              <PiX size={22} />
            </button>
          )}

          <h2 className="relative z-10 text-center font-point text-2xl text-primary-800">한 줄 일기</h2>
          <p className="relative z-10 mt-3 text-center text-sm text-primary-900">
            {mode === "complete" ? "오늘의 일기를 한 줄로 완성해보세요." : "오늘의 한 줄 일기를 수정해보세요."}
          </p>

          <div className="relative z-10 mt-8 flex flex-col gap-1">
            <textarea
              value={note}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="오늘 하루는 어땠나요?"
              className="w-full resize-none rounded-2xl bg-white/60 px-4 py-3 text-base text-primary-900 outline-none placeholder:text-primary-900/40 shadow-drop"
            />
            <span className="self-end text-xs text-primary-900/60">
              {count}/{NOTE_MAX_GRAPHEMES}
            </span>
          </div>

          <div className="relative z-10 mt-8 flex flex-col items-center gap-3">
            <Button
              label={isSubmitting ? "저장 중..." : mode === "complete" ? "완료하기" : "수정하기"}
              variant="filled"
              className="w-full"
              onClick={() => onSubmit(note)}
              disabled={isSubmitting}
            />
            {mode === "complete" && onSkip && (
              <button
                type="button"
                onClick={onSkip}
                disabled={isSubmitting}
                className="text-sm text-primary-900/70 underline-offset-2 hover:underline disabled:opacity-50"
              >
                건너뛰기
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
