"use client";

import type { RefObject } from "react";
import { EMOTIONS, type Emotion } from "@/lib/emotions";
import DraggableColorChip from "./DraggableColorChip";

interface ColorPickerProps {
  emotions?: Emotion[];
  jarRef: RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  onDropSuccess: (emotion: Emotion) => void;
}

export default function ColorPicker({
  emotions = EMOTIONS,
  jarRef,
  disabled = false,
  onDropSuccess,
}: ColorPickerProps) {
  return (
    // glassSurface의 overflow-hidden을 카드 배경 레이어로만 한정해서, 드래그 중인 구슬이
    // 카드 경계를 벗어나도 잘리지 않게 함(카드 자체가 잘라버리면 드래그가 위로 안 올라가는 것처럼 보임).
    <div className="relative rounded-[2rem]">
      <div
        className={
          "absolute inset-0 overflow-hidden rounded-[2rem] border border-white/35 bg-white/10 " +
          "shadow-surface backdrop-blur-md backdrop-saturate-150 " +
          "before:content-[''] before:absolute before:inset-0 before:pointer-events-none " +
          "before:bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.35),transparent_55%)]"
        }
      />
      <div
        className={
          "relative z-10 w-[236px] sm:w-auto -mt-[70vh] pt-[70vh] overflow-x-auto sm:overflow-x-visible " +
          "pointer-events-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }
      >
        {/* 위쪽 pt-[70vh] 여백은 클리핑 범위만 늘리려는 용도라 눈에 안 보이는데,
            부모를 pointer-events-none으로 비워두고 실제 보이는 줄만 다시 켜서
            그 빈 공간이 유리병 위의 마우스 이벤트를 가로채지 않게 함. */}
        <div className="flex items-center gap-3 px-5 py-3 w-max pointer-events-auto">
          {emotions.map((emotion) => (
            <DraggableColorChip
              key={emotion.id}
              emotion={emotion}
              jarRef={jarRef}
              disabled={disabled}
              onDropSuccess={onDropSuccess}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
