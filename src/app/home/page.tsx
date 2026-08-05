"use client";

import { useRef } from "react";
import Button from "@/components/Button";
import ColorPicker from "@/components/ColorPicker";
import Jar from "@/components/Jar";
import { useJarFill } from "@/hooks/useJarFill";
import { useJarPhysics } from "@/hooks/useJarPhysics";
import { useSnackbar } from "@/components/SnackbarProvider";

export default function Home() {
  const jarRef = useRef<HTMLDivElement>(null);
  const interiorRef = useRef<HTMLDivElement>(null);
  const { showSnackbar } = useSnackbar();

  const { pendingBead, isCharacterActive, addBead, clearPending } = useJarFill();
  const { beads, count, max, isFull, registerBeadEl, dropBead, removeBead, clearBeads } =
    useJarPhysics(interiorRef);

  const handleDropComplete = () => {
    if (pendingBead) dropBead(pendingBead.emotion, pendingBead.id);
    clearPending();
  };

  const handleComplete = () => {
    if (count === 0) return;
    showSnackbar("병에 감정을 담았어요!");
    clearBeads();
  };

  return (
    <main className="flex flex-1 flex-col overflow-y-auto">
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
          onClick={removeBead}
          disabled={count === 0}
        />
        <ColorPicker jarRef={jarRef} disabled={isFull || isCharacterActive} onDropSuccess={addBead} />
        <Button
          label="완료하기"
          variant="filled"
          size="lg"
          onClick={handleComplete}
          disabled={count === 0}
        />
      </div>
    </main>
  );
}
