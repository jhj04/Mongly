"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipPos {
  x: number;
  y: number;
}

// 구슬을 감싸는 카드/유리병 내부가 overflow-hidden이라 툴팁이 위로 잘리는 문제가 있어서,
// 좌표만 대상 엘리먼트 기준으로 계산하고 실제 DOM은 document.body에 포탈로 그림.
export function useEscapingTooltip<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [pos, setPos] = useState<TooltipPos | null>(null);

  const show = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setPos({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return { ref, pos, show, hide };
}

interface BeadTooltipPortalProps {
  pos: TooltipPos | null;
  label: string;
}

export function BeadTooltipPortal({ pos, label }: BeadTooltipPortalProps) {
  if (!pos || typeof document === "undefined") return null;

  return createPortal(
    <span
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-primary-900 shadow-drop"
      style={{ left: pos.x, top: pos.y - 4 }}
    >
      {label}
    </span>,
    document.body
  );
}
