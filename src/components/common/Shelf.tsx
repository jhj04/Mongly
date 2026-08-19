"use client";

import { useEffect, useState } from "react";
import { PiCaretLeftFill, PiCaretRightFill } from "react-icons/pi";
import { glassSurface } from "@/lib/styles";
import type { JarEmotionCount } from "@/lib/api/jars";
import ShelfJarItem from "./ShelfJarItem";

// 한 선반(페이지)에 놓는 유리병 수 — 데스크톱 5개, 모바일 4개
const PAGE_SIZE_DESKTOP = 5;
const PAGE_SIZE_MOBILE = 4;

// sm(640px) 미만이면 모바일로 보고 페이지당 개수를 줄임.
// SSR·클라이언트 첫 렌더는 모두 데스크톱(5)으로 시작해 하이드레이션 불일치를 피하고,
// 마운트 후 실제 뷰포트에 맞게 보정함.
function useShelfPageSize() {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE;
}

// outlined Button과 동일한 표면 스타일(glassSurface + bg-secondary/10)을 원형 아이콘 버튼에 적용
const navButton =
  `${glassSurface} bg-secondary/10 text-primary-900 rounded-full p-2 ` +
  "transition-all active:scale-95 disabled:opacity-0 disabled:pointer-events-none";

export interface ShelfItem {
  id: string;
  label: string;
  image?: string;
  dimmed?: boolean;
  /** 유리병에 담긴 감정 — "캐릭터 보기" 시 색 조합·감정 구성의 원천. 없으면 캐릭터를 볼 수 없음 */
  emotions?: JarEmotionCount[];
  /** 가장 많이 담긴 감정 — 감정 구성 보기 문구에 사용 */
  dominantEmotionId?: number | null;
}

interface ShelfProps {
  items: ShelfItem[];
  isLoading?: boolean;
  emptyMessage: string;
  /** 현재 선택된 유리병 id(없으면 null) — 선택은 래퍼(서재/친구)가 소유함 */
  selectedId: string | null;
  /** 유리병을 누르거나 선택이 해제될 때 호출(같은 병을 다시 누르면 null) */
  onSelectId: (id: string | null) => void;
}

// 선반형 리스트 — 아이템을 페이지당 5개씩 가로로 나열하고, 화면 양쪽 삼각형 버튼으로 페이지 넘김.
// 서재 탭/친구 탭이 데이터만 다르게 넣어서 이 구조를 그대로 공유함.
// 선택 상태는 하단 "캐릭터 보기" 버튼과 공유해야 해서 래퍼가 소유하고 props로 내려줌.
export default function Shelf({
  items,
  isLoading = false,
  emptyMessage,
  selectedId,
  onSelectId,
}: ShelfProps) {
  const [page, setPage] = useState(0);
  const pageSize = useShelfPageSize();

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // 뷰포트가 바뀌어 페이지 수가 줄면 현재 page가 범위를 벗어날 수 있어 클램프
  const safePage = Math.min(page, pageCount - 1);
  const currentItems = items.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const hasPrev = safePage > 0;
  const hasNext = safePage < pageCount - 1;

  // 페이지를 넘기면 현재 선택은 의미가 없어지므로 함께 해제
  const goToPage = (next: number) => {
    onSelectId(null);
    setPage(next);
  };

  if (isLoading) {
    return <div className="relative flex flex-1 items-center justify-center" />;
  }

  return (
    <div className="relative flex flex-1 items-center justify-center px-10 sm:px-16">
      <button
        type="button"
        aria-label="이전 페이지"
        disabled={!hasPrev}
        onClick={() => goToPage(safePage - 1)}
        className={`absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-10 ${navButton}`}
      >
        <span className="relative z-10 flex">
          <PiCaretLeftFill size={20} />
        </span>
      </button>

      {items.length === 0 ? (
        <p className="text-sm text-primary-900/70">{emptyMessage}</p>
      ) : (
        <div className="flex items-center justify-center gap-2 sm:gap-6">
          {currentItems.map((item) => (
            <ShelfJarItem
              key={item.id}
              label={item.label}
              image={item.image}
              dimmed={item.dimmed}
              selected={item.id === selectedId}
              onSelect={() => onSelectId(item.id === selectedId ? null : item.id)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        aria-label="다음 페이지"
        disabled={!hasNext}
        onClick={() => goToPage(safePage + 1)}
        className={`absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-10 ${navButton}`}
      >
        <span className="relative z-10 flex">
          <PiCaretRightFill size={20} />
        </span>
      </button>
    </div>
  );
}
