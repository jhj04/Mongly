"use client";

import { useMemo, useState } from "react";
import Button from "@/components/common/Button";
import Shelf from "@/components/common/Shelf";
import ShelfCharacterView from "@/components/common/ShelfCharacterView";
import ConfirmModal from "@/components/common/ConfirmModal";
import { useSnackbar } from "@/components/common/SnackbarProvider";
import { useJarsList, useDeleteJar } from "@/hooks/useJars";
import { getJarImageUrl } from "@/lib/api/jars";
import { formatShortDate } from "@/lib/date";

// 서재 선반 — 완성한 유리병들을 날짜 라벨과 함께 보여줌.
// 유리병을 고르면 하단 "캐릭터 보기"가 활성화되고, 누르면 병 색상으로 색 입힌 몽글리 화면으로 전환됨.
export default function StudyShelf() {
  const { jars: apiJars, isLoading, refetch } = useJarsList();
  const { deleteJar, isLoading: isDeletingJar } = useDeleteJar();
  const { showSnackbar } = useSnackbar();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCharacter, setShowCharacter] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const items = useMemo(
    () =>
      apiJars.map((jar) => ({
        id: jar.id,
        label: formatShortDate(jar.recordDate),
        image: getJarImageUrl(jar.id),
        emotions: jar.emotions,
        dominantEmotionId: jar.dominantEmotionId,
      })),
    [apiJars]
  );

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const handleDelete = async () => {
    if (!selectedId) return;
    const { ok, error } = await deleteJar(selectedId);
    if (!ok) {
      showSnackbar(error?.message ?? "삭제에 실패했어요.");
      return;
    }
    setConfirmDelete(false);
    setSelectedId(null);
    await refetch();
    showSnackbar("유리병을 삭제했어요.");
  };

  if (showCharacter && selected?.emotions) {
    return (
      <ShelfCharacterView
        emotions={selected.emotions}
        dominantEmotionId={selected.dominantEmotionId ?? null}
        onBack={() => setShowCharacter(false)}
      />
    );
  }

  return (
    <>
      <Shelf
        items={items}
        isLoading={isLoading}
        emptyMessage="아직 담긴 유리병이 없어요"
        selectedId={selectedId}
        onSelectId={setSelectedId}
      />

      <div className="flex items-center justify-between gap-3 sm:justify-center sm:gap-128 px-6 pb-20 mt-auto">
        <Button
          label="삭제하기"
          variant="outlined"
          size="lg"
          disabled={!selected}
          onClick={() => setConfirmDelete(true)}
        />
        <Button
          label="캐릭터 보기"
          variant="filled"
          size="lg"
          disabled={!selected?.emotions?.length}
          onClick={() => setShowCharacter(true)}
        />
      </div>

      {confirmDelete && selected && (
        <ConfirmModal
          title="유리병을 삭제할까요?"
          message={`${selected.label} 유리병을 삭제하면 되돌릴 수 없어요.`}
          confirmLabel="삭제하기"
          confirmVariant="danger"
          isLoading={isDeletingJar}
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
