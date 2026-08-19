"use client";

import { useState } from "react";
import Button from "@/components/common/Button";
import Shelf from "@/components/common/Shelf";
import ShelfCharacterView from "@/components/common/ShelfCharacterView";
import { useFriendsJars } from "@/hooks/useFriends";
import { getJarImageUrl } from "@/lib/api/jars";

// 친구 탭 선반 — 친구마다 최신 유리병 1개씩, 라벨은 친구 ID.
// 오늘 담긴 유리병이 없는 친구는 흐리게(dimmed) 표시되고 선택할 수 없음.
// 유리병을 고르면 하단 "캐릭터 보기"가 활성화되고, 누르면 병 색상으로 색 입힌 몽글리 화면으로 전환됨.
export default function FriendsShelf() {
  const { friends, isLoading } = useFriendsJars();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCharacter, setShowCharacter] = useState(false);

  const items = friends.map((entry) => ({
    id: entry.loginId,
    label: entry.loginId,
    image: entry.jar ? getJarImageUrl(entry.jar.id) : undefined,
    dimmed: entry.jar === null,
    emotions: entry.jar?.emotions,
    dominantEmotionId: entry.jar?.dominantEmotionId ?? null,
  }));

  const selected = items.find((item) => item.id === selectedId) ?? null;

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
        emptyMessage="아직 친구가 없어요"
        selectedId={selectedId}
        onSelectId={setSelectedId}
      />

      <div className="flex items-center justify-between gap-3 sm:justify-center sm:gap-128 px-6 pb-20 mt-auto">
        <Button
          label="삭제하기"
          variant="outlined"
          size="lg"
          disabled={!selected}
          onClick={() => console.log("삭제하기")}
        />
        <Button
          label="캐릭터 보기"
          variant="filled"
          size="lg"
          disabled={!selected?.emotions?.length}
          onClick={() => setShowCharacter(true)}
        />
      </div>
    </>
  );
}
