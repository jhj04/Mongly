"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import NoteModal from "@/components/common/NoteModal";
import ColorPicker from "@/components/home/ColorPicker";
import Jar from "@/components/home/Jar";
import { useJarFill } from "@/hooks/useJarFill";
import { useJarPhysics } from "@/hooks/useJarPhysics";
import { useTodayJar, useAddDraftEmotion, useRemoveDraftEmotion, useCompleteJar } from "@/hooks/useJars";
import { findEmotionByEmotionId, type Emotion } from "@/lib/emotions";
import { useSnackbar } from "@/components/common/SnackbarProvider";
import { useSound } from "@/hooks/useSound";

export default function Home() {
  const router = useRouter();
  const jarRef = useRef<HTMLDivElement>(null);
  const interiorRef = useRef<HTMLDivElement>(null);
  const { showSnackbar } = useSnackbar();
  const playFillSound = useSound("/audios/상승음2.mp3", { volume: 1 });

  const { jar: completedJar, draft, isLoading: isLoadingToday } = useTodayJar();
  const { addDraftEmotion } = useAddDraftEmotion();
  const { removeDraftEmotion } = useRemoveDraftEmotion();
  const { completeJar, isLoading: isCompleting } = useCompleteJar();

  const { pendingBead, isCharacterActive, addBead, clearPending } = useJarFill();
  const { beads, count, max, isFull, registerBeadEl, dropBead, removeBead } =
    useJarPhysics(interiorRef);

  const [isDone, setIsDone] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
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
    // 구슬이 병 안에 안착하는 순간 효과음 재생
    playFillSound();
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
  // 완료하기는 더 이상 바로 이동하지 않고 한 줄 일기 모달을 띄움.
  // 실제 저장(POST /api/jars)은 모달의 완료하기/건너뛰기에서 일어남.
  const handleComplete = () => {
    if (count === 0) return;
    setShowNoteModal(true);
  };

  const handleNoteSubmit = async (note: string) => {
    const { error } = await completeJar(note);
    if (error) {
      showSnackbar(error.message);
      return;
    }
    router.push("/home/result");
  };

  const handleNoteSkip = async () => {
    const { error } = await completeJar();
    if (error) {
      showSnackbar(error.message);
      return;
    }
    router.push("/home/result");
  };

  return (
    <main className="flex flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Jar
        jarRef={jarRef}
        interiorRef={interiorRef}
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

      {showNoteModal && (
        <NoteModal
          mode="complete"
          isSubmitting={isCompleting}
          onSubmit={handleNoteSubmit}
          onSkip={handleNoteSkip}
        />
      )}
    </main>
  );
}
