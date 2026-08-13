"use client";

import Image from "next/image";
import { PiX } from "react-icons/pi";
import { glassSurface } from "@/lib/styles";
import { findEmotionByEmotionId } from "@/lib/emotions";
import type { JarEmotionCount } from "@/lib/api/jars";
import Portal from "@/components/common/Portal";

interface EmotionCompositionModalProps {
  emotions: JarEmotionCount[];
  dominantEmotionId: number | null;
  onClose: () => void;
}

// 한글 단어의 마지막 글자에 받침이 있는지 확인 — "이/가" 조사 선택용
function hasBatchim(word: string): boolean {
  const lastCode = word.charCodeAt(word.length - 1);
  if (lastCode < 0xac00 || lastCode > 0xd7a3) return false;
  return (lastCode - 0xac00) % 28 !== 0;
}

export default function EmotionCompositionModal({
  emotions,
  dominantEmotionId,
  onClose,
}: EmotionCompositionModalProps) {
  const dominant = emotions.find((emotion) => emotion.emotionId === dominantEmotionId);
  const subtitle = dominant
    ? `이번 기록은 ${dominant.name}${hasBatchim(dominant.name) ? "이" : "가"} 조금 더 많은 편이에요.`
    : "이번 기록엔 다양한 감정이 담겼어요.";

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

          <h2 className="relative z-10 text-center font-point text-2xl text-primary-800">감정 구성</h2>
          <p className="relative z-10 mt-3 text-center text-sm text-primary-900">{subtitle}</p>

          <div className="relative z-10 mt-10 flex flex-wrap justify-center gap-x-6 gap-y-6">
            {emotions.map((emotion) => {
              const localEmotion = findEmotionByEmotionId(emotion.emotionId);
              return (
                <div key={emotion.emotionId} className="flex flex-col items-center gap-2">
                  <div className="relative h-16 w-16">
                    {localEmotion ? (
                      <Image
                        src={localEmotion.image}
                        alt={emotion.name}
                        fill
                        sizes="64px"
                        className="drop-shadow"
                      />
                    ) : (
                      <div
                        className="h-full w-full rounded-full shadow-drop"
                        style={{ backgroundColor: emotion.colorHex }}
                      />
                    )}
                  </div>
                  <span className="font-point text-base text-primary-900">{emotion.name}</span>
                  <span className="text-sm text-primary-900">{emotion.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Portal>
  );
}
