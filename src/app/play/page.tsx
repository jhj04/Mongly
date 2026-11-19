"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, animate } from "framer-motion";
import { useSnackbar } from "@/components/common/SnackbarProvider";
import { useSound } from "@/hooks/useSound";

const CHARACTER_SIZE = 250;
// 거리에 비례한 이동 시간(px당 ms) — 멀수록 오래 걸려서 속도가 일정하게 느껴짐
const MS_PER_PX = 4;
const MIN_DURATION = 0.6;
const MAX_DURATION = 2.5;
// monglyhover.webp는 캔버스(1080x1080) 안에서 캐릭터 자체가 다른 모션보다 작게
// 그려져 있어(알파 채널 기준 픽셀 면적 비교 결과 약 1.27배 차이) 시각적으로만 보정
const HOVER_SCALE = 1.27;
// mongly_click.png는 캔버스(1254x1254) 안에서 캐릭터가 다른 모션보다 크게
// 그려져 있어(캔버스 대비 캐릭터 비율 비교 결과 약 0.84배 차이) 시각적으로만 보정
const CLICK_SCALE = 0.84;
// 클릭 모션이 보였다가 기본 상태로 돌아가기까지의 시간
const CLICK_DURATION = 450;

type CharacterState = "idle" | "hover" | "moving" | "dragging" | "clicked";

export default function PlayPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [state, setState] = useState<CharacterState>("idle");
  const isHoveredRef = useRef(false);
  const justDraggedRef = useRef(false);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walkingAudioRef = useRef<HTMLAudioElement | null>(null);
  const { showSnackbar } = useSnackbar();
  const playHoverSound = useSound("/audios/hover_sound.mp3", { volume: 0.5 });
  const playPockSound = useSound("/audios/pock_sound.mp3", { volume: 0.5 });

  useEffect(() => {
    const audio = new Audio("/audios/walking_sound.mp3");
    audio.loop = true;
    audio.volume = 0.5;
    walkingAudioRef.current = audio;
    return () => {
      audio.pause();
      walkingAudioRef.current = null;
    };
  }, []);

  // 입장 시 화면 중앙에 배치
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    x.set((bounds.width - CHARACTER_SIZE) / 2);
    y.set((bounds.height - CHARACTER_SIZE) / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 입장 시 사용법 안내
  useEffect(() => {
    showSnackbar("몽글리를 클릭하거나 드래그하고, 빈 공간도 눌러보세요!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  const handleCharacterClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 캐릭터 클릭은 컨테이너의 이동 클릭과 분리
    e.stopPropagation();
    if (justDraggedRef.current || state === "moving" || state === "dragging") return;

    setState("clicked");
    playPockSound();
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      setState(isHoveredRef.current ? "hover" : "idle");
    }, CLICK_DURATION);
  };

  const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    // 드래그 종료 직후 발생하는 클릭은 이동으로 처리하지 않음
    if (justDraggedRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    const relativeX = e.clientX - bounds.left;
    const relativeY = e.clientY - bounds.top;

    const clampedX = Math.min(
      Math.max(relativeX - CHARACTER_SIZE / 2, 0),
      bounds.width - CHARACTER_SIZE
    );
    const clampedY = Math.min(
      Math.max(relativeY - CHARACTER_SIZE / 2, 0),
      bounds.height - CHARACTER_SIZE
    );

    const currentX = x.get();
    const currentY = y.get();

    if (clampedX > currentX) setFacing("right");
    else if (clampedX < currentX) setFacing("left");

    const distance = Math.hypot(clampedX - currentX, clampedY - currentY);
    const duration = Math.min(
      Math.max(distance * (MS_PER_PX / 1000), MIN_DURATION),
      MAX_DURATION
    );

    setState("moving");
    walkingAudioRef.current?.play().catch(() => {
      // 자동재생 차단 등으로 실패해도 조용히 무시
    });
    await Promise.all([
      animate(x, clampedX, { duration, ease: "easeInOut" }),
      animate(y, clampedY, { duration, ease: "easeInOut" }),
    ]);
    walkingAudioRef.current?.pause();
    if (walkingAudioRef.current) walkingAudioRef.current.currentTime = 0;
    setState(isHoveredRef.current ? "hover" : "idle");
  };

  return (
    <main
      ref={containerRef}
      onClick={handleClick}
      className="relative flex flex-1 flex-col overflow-hidden"
    >
      <motion.div
        className="absolute left-0 top-0 cursor-grab active:cursor-grabbing"
        style={{ x, y }}
        drag
        dragConstraints={containerRef}
        dragElastic={0.1}
        dragMomentum={false}
        onClick={handleCharacterClick}
        onDragStart={() => setState("dragging")}
        onDragEnd={() => {
          setState(isHoveredRef.current ? "hover" : "idle");
          justDraggedRef.current = true;
          setTimeout(() => {
            justDraggedRef.current = false;
          }, 0);
        }}
        onMouseEnter={() => {
          isHoveredRef.current = true;
          if (state === "idle") {
            setState("hover");
            playHoverSound();
          }
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false;
          if (state === "hover") setState("idle");
        }}
      >
        <div
          className="relative"
          style={{ width: CHARACTER_SIZE, height: CHARACTER_SIZE }}
        >
          {state === "dragging" ? (
            <Image
              src="/images/motions/mongly_test.webp"
              alt="몽글리"
              fill
              unoptimized
              draggable={false}
            />
          ) : state === "clicked" ? (
            <Image
              src="/images/motions/mongly_click.png"
              alt="몽글리"
              fill
              unoptimized
              draggable={false}
              className="scale-[var(--click-scale)]"
              style={{ "--click-scale": CLICK_SCALE } as React.CSSProperties}
            />
          ) : state === "moving" ? (
            <Image
              src={`/images/motions/monglyrun${facing}.webp`}
              alt="몽글리"
              fill
              unoptimized
              draggable={false}
            />
          ) : state === "hover" ? (
            <Image
              src="/images/motions/monglyhover.webp"
              alt="몽글리"
              fill
              unoptimized
              draggable={false}
              className="scale-[var(--hover-scale)]"
              style={{ "--hover-scale": HOVER_SCALE } as React.CSSProperties}
            />
          ) : (
            <Image
              src="/images/motions/monglytilt.webp"
              alt="몽글리"
              fill
              unoptimized
              draggable={false}
            />
          )}
        </div>
      </motion.div>
    </main>
  );
}
