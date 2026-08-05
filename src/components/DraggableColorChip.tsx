"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Emotion } from "@/lib/emotions";

interface DraggableColorChipProps {
  emotion: Emotion;
  disabled?: boolean;
  /** 유리병(드롭 타겟) DOM ref. getBoundingClientRect로 충돌 판정에 사용 */
  jarRef: React.RefObject<HTMLDivElement | null>;
  /** 유리병 영역 안에서 놓였을 때 호출 */
  onDropSuccess: (emotion: Emotion) => void;
  className?: string;
}

// PointerEvent/MouseEvent는 clientX/clientY를 갖고, TouchEvent는 changedTouches에서 꺼내야 함.
// getBoundingClientRect()도 뷰포트 기준 좌표라 이렇게 맞춰야 스크롤 여부와 무관하게 판정이 정확함.
function getClientPoint(event: MouseEvent | TouchEvent | PointerEvent) {
  if ("clientX" in event) {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = event.changedTouches[0];
  return { x: touch.clientX, y: touch.clientY };
}

export default function DraggableColorChip({
  emotion,
  disabled = false,
  jarRef,
  onDropSuccess,
  className = "",
}: DraggableColorChipProps) {
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent) => {
    const jarEl = jarRef.current;
    if (!jarEl) return;

    const jarRect = jarEl.getBoundingClientRect();
    const { x, y } = getClientPoint(event);

    const isDroppedOnJar =
      x >= jarRect.left && x <= jarRect.right && y >= jarRect.top && y <= jarRect.bottom;

    if (isDroppedOnJar) {
      onDropSuccess(emotion);
    }
    // 병 위가 아니면 dragSnapToOrigin에 의해 자동으로 원래 슬롯 위치로 복귀됨
  };

  return (
    <motion.div
      role="button"
      aria-label={`${emotion.label} 구슬 선택`}
      drag={!disabled}
      dragSnapToOrigin
      dragElastic={0.15}
      dragMomentum={false}
      whileDrag={{ scale: 1.2, zIndex: 50 }}
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      onDragEnd={(event) => handleDragEnd(event)}
      className={`relative w-10 h-10 flex-shrink-0 ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"
      } ${className}`}
      style={{ touchAction: "none" }}
    >
      <Image src={emotion.image} alt={emotion.label} fill sizes="40px" className="pointer-events-none select-none drop-shadow" />
    </motion.div>
  );
}
