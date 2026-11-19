"use client";

import { useMemo, useState } from "react";
import Button from "@/components/common/Button";
import Shelf from "@/components/common/Shelf";
import ShelfCharacterView from "@/components/common/ShelfCharacterView";
import { useSnackbar } from "@/components/common/SnackbarProvider";
import { useFriendsJars } from "@/hooks/useFriends";
import { useLikeJar } from "@/hooks/useJars";
import { getJarImageUrl } from "@/lib/api/jars";

interface LikeOverride {
  likedByMe: boolean;
  likeCount: number;
}

// 친구 탭 선반 — 친구마다 최신 유리병 1개씩, 라벨은 친구 ID.
// 오늘 담긴 유리병이 없는 친구는 흐리게(dimmed) 표시되고 선택할 수 없음.
// 유리병을 고르면 하단 "캐릭터 보기"가 활성화되고, 누르면 병 색상으로 색 입힌 몽글리 화면으로 전환됨.
export default function FriendsShelf() {
  const { friends, isLoading } = useFriendsJars();
  const { setLike, isLoading: isLiking } = useLikeJar();
  const { showSnackbar } = useSnackbar();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCharacter, setShowCharacter] = useState(false);
  // 좋아요 토글 직후 즉시 반영하기 위한 로컬 낙관적 오버레이(jarId 기준).
  // 친구 목록 전체 재조회(분당 30회 제한) 없이도 UI가 바로 갱신됨.
  const [likeOverrides, setLikeOverrides] = useState<Record<string, LikeOverride>>({});

  const items = useMemo(
    () =>
      friends.map((entry) => {
        const jar = entry.jar;
        const override = jar ? likeOverrides[jar.id] : undefined;
        return {
          id: entry.loginId,
          label: entry.loginId,
          image: jar ? getJarImageUrl(jar.id) : undefined,
          dimmed: jar === null,
          emotions: jar?.emotions,
          dominantEmotionId: jar?.dominantEmotionId ?? null,
          jarId: jar?.id ?? null,
          canLike: jar?.canLike ?? false,
          likedByMe: override?.likedByMe ?? jar?.likedByMe ?? false,
          likeCount: override?.likeCount ?? jar?.likeCount ?? 0,
        };
      }),
    [friends, likeOverrides]
  );

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const handleToggleLike = async () => {
    if (!selected?.jarId) return;
    const jarId = selected.jarId;
    const nextLiked = !selected.likedByMe;
    const prev = { likedByMe: selected.likedByMe, likeCount: selected.likeCount };

    setLikeOverrides((o) => ({
      ...o,
      [jarId]: { likedByMe: nextLiked, likeCount: Math.max(0, prev.likeCount + (nextLiked ? 1 : -1)) },
    }));

    const { result, error } = await setLike(jarId, nextLiked);
    if (error) {
      setLikeOverrides((o) => ({ ...o, [jarId]: prev }));
      if (error.code === "RATE_LIMITED") showSnackbar("좋아요를 너무 자주 눌렀어요. 잠시 후 다시 시도해주세요.");
      else if (error.code === "SELF_LIKE_NOT_ALLOWED") showSnackbar("내 유리병에는 좋아요를 누를 수 없어요.");
      else if (error.code === "FORBIDDEN") showSnackbar("더 이상 친구가 아니에요.");
      else showSnackbar(error.message);
      return;
    }
    if (result) {
      setLikeOverrides((o) => ({ ...o, [jarId]: { likedByMe: result.likedByMe, likeCount: result.likeCount } }));
    }
  };

  if (showCharacter && selected?.emotions) {
    return (
      <ShelfCharacterView
        emotions={selected.emotions}
        dominantEmotionId={selected.dominantEmotionId ?? null}
        onBack={() => setShowCharacter(false)}
        canLike={selected.canLike}
        likedByMe={selected.likedByMe}
        likeCount={selected.likeCount}
        isLikeLoading={isLiking}
        onToggleLike={handleToggleLike}
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
        {/* 친구 탭엔 삭제하기가 없지만, 캐릭터 보기 버튼 위치를 서재 탭과 동일하게 유지하려고
            같은 폭의 투명 placeholder로 자리만 채움(렌더는 되지만 안 보이고 클릭 불가) */}
        <div className="invisible" aria-hidden>
          <Button label="삭제하기" variant="outlined" size="lg" />
        </div>
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
