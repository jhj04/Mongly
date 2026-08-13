"use client";

import Shelf from "@/components/common/Shelf";
import { useFriendsJars } from "@/hooks/useFriends";

// 친구 탭 선반 — 친구마다 최신 유리병 1개씩, 라벨은 친구 ID.
// 오늘 담긴 유리병이 없는 친구는 흐리게(dimmed) 표시됨
export default function FriendsShelf() {
  const { friends, isLoading } = useFriendsJars();

  const items = friends.map((entry) => ({
    id: entry.loginId,
    label: entry.loginId,
    dimmed: entry.jar === null,
  }));

  return <Shelf items={items} isLoading={isLoading} emptyMessage="아직 친구가 없어요" />;
}
