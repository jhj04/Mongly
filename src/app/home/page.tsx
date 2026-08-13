"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import ColorPicker from "@/components/home/ColorPicker";
import Jar from "@/components/home/Jar";
import { useJarFill } from "@/hooks/useJarFill";
import { useJarPhysics } from "@/hooks/useJarPhysics";
import { useTodayJar, useAddDraftEmotion, useRemoveDraftEmotion } from "@/hooks/useJars";
import { findEmotionByEmotionId, type Emotion } from "@/lib/emotions";
import { useSnackbar } from "@/components/common/SnackbarProvider";
import { captureNodeAsPng } from "@/lib/captureImage";
import { setPendingJarImage } from "@/hooks/useLocalJars";

export default function Home() {
  const router = useRouter();
  const jarRef = useRef<HTMLDivElement>(null);
  const interiorRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const { showSnackbar } = useSnackbar();

  const { jar: completedJar, draft, isLoading: isLoadingToday } = useTodayJar();
  const { addDraftEmotion } = useAddDraftEmotion();
  const { removeDraftEmotion } = useRemoveDraftEmotion();

  const { pendingBead, isCharacterActive, addBead, clearPending } = useJarFill();
  const { beads, count, max, isFull, registerBeadEl, dropBead, removeBead } =
    useJarPhysics(interiorRef);

  const [isDone, setIsDone] = useState(false);
  const hydratedRef = useRef(false);

  // 오늘 상태(완성본 or 드래프트)를 서버에서 받아오면 기존 구슬을 물리 시뮬레이션에 그대로 채워 넣음.
  // 마운트 시 한 번만 수행(재조회로 다시 실행되지 않도록 ref로 가드).
  useEffect(() => {
    if (isLoadingToday || hydratedRef.current) return;
    hydratedRef.current = true;

    const source = completedJar ?? draft;
    if (completedJar) {
      // 서버에서 비동기로 조회된 오늘 상태(외부 시스템)를 로컬 상태로 동기화하는 용도
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDone(true);
      showSnackbar("오늘은 이미 감정을 다 담았어요!");
    }
    source?.emotions.forEach(({ emotionId, count: emotionCount }) => {
      const emotion = findEmotionByEmotionId(emotionId);
      if (!emotion) return;
      for (let i = 0; i < emotionCount; i++) {
        dropBead(emotion, `hydrated-${emotionId}-${i}`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingToday, completedJar, draft]);

  const handleAddEmotion = async (emotion: Emotion) => {
    const { error } = await addDraftEmotion({ emotionId: emotion.emotionId });
    if (error) {
      showSnackbar(error.message);
      return;
    }
    addBead(emotion);
  };

  const handleDropComplete = () => {
    if (pendingBead) dropBead(pendingBead.emotion, pendingBead.id);
    clearPending();
  };

  const handleUndo = async () => {
    const { error } = await removeDraftEmotion();
    if (error) {
      showSnackbar(error.message);
      return;
    }
    removeBead();
  };

  // 여기서는 서재에 확정 저장하지 않음 — 결과 페이지에서 "저장하기"를 눌러야 저장됨.
  // 감정은 담는 즉시(handleAddEmotion) 서버 드래프트에 저장돼 있어서 그냥 넘어가기만 하면 됨.
  // 유리병+구슬 PNG는 (아직 서버가 이미지를 안 받아주니) 여기서 미리 캡처해뒀다가
  // 결과 페이지의 "저장하기"에서 로컬에 확정 저장함.
  const handleComplete = async () => {
    if (count === 0) return;
    if (captureRef.current) {
      try {
        const image = await captureNodeAsPng(captureRef.current);
        setPendingJarImage(image);
      } catch (e) {
        console.error("jar capture failed", e);
      }
    }
    router.push("/home/result");
  };

  return (
    <main className="flex flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Jar
        jarRef={jarRef}
        interiorRef={interiorRef}
        captureRef={captureRef}
        beads={beads}
        registerBeadEl={registerBeadEl}
        count={count}
        max={max}
        isCharacterActive={isCharacterActive}
        pendingEmotion={pendingBead?.emotion ?? null}
        onDropComplete={handleDropComplete}
      />

      <div className="flex items-center justify-center gap-4 px-6 pb-20 mt-auto">
        <Button
          label="되돌리기"
          variant="outlined"
          size="lg"
          onClick={handleUndo}
          disabled={count === 0 || isDone}
        />
        <ColorPicker
          jarRef={jarRef}
          disabled={isFull || isCharacterActive || isDone}
          onDropSuccess={handleAddEmotion}
        />
        <Button
          label="완료하기"
          variant="filled"
          size="lg"
          onClick={handleComplete}
          disabled={count === 0 || isDone}
        />
      </div>
    </main>
  );
}
