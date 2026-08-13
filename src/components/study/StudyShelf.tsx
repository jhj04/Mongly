"use client";

import { useMemo } from "react";
import Shelf from "@/components/common/Shelf";
import { useJarsList } from "@/hooks/useJars";
import { useLocalJars } from "@/hooks/useLocalJars";
import { formatShortDate } from "@/lib/date";

// 서재 선반 — 완성한 유리병들을 날짜 라벨과 함께 보여줌
export default function StudyShelf() {
  const { jars: apiJars, isLoading } = useJarsList();
  const { jars: localJars } = useLocalJars();

  // API가 아직 이미지를 안 내려주니, 캡처본을 들고 있는 로컬 저장분을 앞쪽에 합쳐서 보여줌
  // (나중에 API 응답에 이미지가 생기면 localJars 병합은 걷어내면 됨)
  const items = useMemo(
    () => [
      ...localJars.map((jar) => ({ id: jar.id, label: formatShortDate(jar.recordDate), image: jar.image })),
      ...apiJars.map((jar) => ({ id: jar.id, label: formatShortDate(jar.recordDate) })),
    ],
    [apiJars, localJars]
  );

  return <Shelf items={items} isLoading={isLoading} emptyMessage="아직 담긴 유리병이 없어요" />;
}
