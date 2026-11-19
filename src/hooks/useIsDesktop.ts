"use client";

import { useEffect, useState } from "react";

// Tailwind 기본 sm 브레이크포인트(640px)와 동일 기준.
// SSR·클라이언트 첫 렌더는 모두 데스크톱(true)으로 시작해 하이드레이션 불일치를 피하고,
// 마운트 후 실제 뷰포트에 맞게 보정함(Shelf.tsx의 useShelfPageSize와 동일 패턴).
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
