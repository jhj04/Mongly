"use client";

import Image from "next/image";
import type { RefObject } from "react";
import type { PhysicsBead } from "@/hooks/useJarPhysics";
import type { Emotion } from "@/lib/emotions";
import JarBeads from "./JarBeads";
import MongleCharacter from "./MongleCharacter";

interface JarProps {
  jarRef: RefObject<HTMLDivElement | null>;
  interiorRef: RefObject<HTMLDivElement | null>;
  beads: PhysicsBead[];
  registerBeadEl: (id: string, el: HTMLDivElement | null) => void;
  count: number;
  max: number;
  isCharacterActive: boolean;
  pendingEmotion: Emotion | null;
  onDropComplete: () => void;
}

export default function Jar({
  jarRef,
  interiorRef,
  beads,
  registerBeadEl,
  count,
  max,
  isCharacterActive,
  pendingEmotion,
  onDropComplete,
}: JarProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div ref={jarRef} className="relative mt-10 w-[clamp(280px,55vw,480px)] aspect-square">
        <span className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-white px-2 py-0.5 text-xs shadow-drop">
          {count}/{max}
        </span>

        <Image
          src="/images/bottle.png"
          alt="유리병"
          fill
          priority
          sizes="(max-width: 640px) 55vw, 480px"
          className="object-contain"
        />

        {/* 실제 유리 내부 영역 근사치 — 물리 벽/구슬 렌더링 기준 좌표계 */}
        <div
          ref={interiorRef}
          className="absolute left-[27%] right-[30%] top-[18%] bottom-[11%] overflow-hidden"
        >
          <JarBeads beads={beads} registerBeadEl={registerBeadEl} />
        </div>

        <MongleCharacter
          active={isCharacterActive}
          ballEmotion={pendingEmotion}
          onDropComplete={onDropComplete}
        />
      </div>
    </div>
  );
}
