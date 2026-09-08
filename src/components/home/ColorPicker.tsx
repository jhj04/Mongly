"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { EMOTIONS, type Emotion } from "@/lib/emotions";
import DraggableColorChip from "./DraggableColorChip";

interface ColorPickerProps {
  emotions?: Emotion[];
  jarRef: RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  onDropSuccess: (emotion: Emotion) => void;
}

const TRACK_WIDTH = 96; // px, 스크롤 핸들 트랙 폭
const MIN_THUMB_WIDTH = 24; // px, 트랙이 아무리 넓어도 손가락으로 잡을 수 있는 최소 크기

export default function ColorPicker({
  emotions = EMOTIONS,
  jarRef,
  disabled = false,
  onDropSuccess,
}: ColorPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const [scrollMetrics, setScrollMetrics] = useState({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 });

  // 구슬(motion.div, drag 활성화)은 framer-motion이 touchAction을 강제로 "none"으로
  // 덮어써서 그 위를 터치하면 네이티브 가로스크롤이 안 먹음. 카드 바깥에 별도 스크롤바
  // 모양 핸들을 두고, 거기서만 scrollLeft를 직접 옮겨 가로스크롤을 흉내내면서
  // 지금 스크롤 위치/전체 대비 비율도 함께 보여줌.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measure = () => {
      setScrollMetrics({ scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
    };
    measure();

    el.addEventListener("scroll", measure);
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", measure);
      resizeObserver.disconnect();
    };
  }, [emotions]);

  const { scrollLeft, scrollWidth, clientWidth } = scrollMetrics;
  const maxScrollLeft = Math.max(scrollWidth - clientWidth, 0);
  const thumbWidth =
    maxScrollLeft > 0 ? Math.max((clientWidth / scrollWidth) * TRACK_WIDTH, MIN_THUMB_WIDTH) : TRACK_WIDTH;
  const maxThumbLeft = TRACK_WIDTH - thumbWidth;
  const thumbLeft = maxScrollLeft > 0 && maxThumbLeft > 0 ? (scrollLeft / maxScrollLeft) * maxThumbLeft : 0;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || maxScrollLeft <= 0) return;
    dragState.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !dragState.current || maxThumbLeft <= 0) return;
    const dx = e.clientX - dragState.current.startX;
    const scale = maxScrollLeft / maxThumbLeft;
    el.scrollLeft = dragState.current.startScrollLeft + dx * scale;
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* glassSurface의 overflow-hidden을 카드 배경 레이어로만 한정해서, 드래그 중인 구슬이
          카드 경계를 벗어나도 잘리지 않게 함(카드 자체가 잘라버리면 드래그가 위로 안 올라가는 것처럼 보임). */}
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
          ref={scrollRef}
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

      {/* 카드 바깥의 전용 가로스크롤 핸들 — 구슬 드래그와 안 겹치고, 스크롤할 게 있을 때만 보임 */}
      {maxScrollLeft > 0 && (
        <div
          className="relative h-1.5 rounded-full bg-white/25 sm:hidden"
          style={{ width: TRACK_WIDTH, touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            className="absolute inset-y-0 cursor-grab rounded-full bg-white/70 active:cursor-grabbing"
            style={{ width: thumbWidth, left: thumbLeft }}
          />
        </div>
      )}
    </div>
  );
}
