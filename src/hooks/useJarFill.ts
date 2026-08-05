"use client";

import { useCallback, useRef, useState } from "react";
import type { Emotion } from "@/lib/emotions";

export interface JarBead {
  id: string;
  emotion: Emotion;
}

// 캐릭터가 구슬을 들고 날아가는 "운반 중" 상태만 관리.
// 실제 병 속 구슬 목록·물리 시뮬레이션·최대 개수 판단은 useJarPhysics가 담당.
export function useJarFill() {
  const [pendingBead, setPendingBead] = useState<JarBead | null>(null);
  const nextId = useRef(0);

  const isCharacterActive = pendingBead !== null;

  const addBead = useCallback(
    (emotion: Emotion) => {
      if (isCharacterActive) return;
      nextId.current += 1;
      setPendingBead({ id: `bead-${nextId.current}`, emotion });
    },
    [isCharacterActive]
  );

  const clearPending = useCallback(() => {
    setPendingBead(null);
  }, []);

  return { pendingBead, isCharacterActive, addBead, clearPending };
}
