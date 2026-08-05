"use client";

import type { RefObject } from "react";
import { glassSurface } from "@/lib/styles";
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
    <div className={`${glassSurface} rounded-[2rem] bg-white/10`}>
      <div className="relative z-10 w-[236px] sm:w-auto overflow-x-auto sm:overflow-x-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-3 px-5 py-3 w-max">
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
