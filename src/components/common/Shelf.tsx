"use client";

import { useState } from "react";
import { PiCaretLeftFill, PiCaretRightFill } from "react-icons/pi";
import { glassSurface } from "@/lib/styles";
import ShelfJarItem from "./ShelfJarItem";

const PAGE_SIZE = 5;

// outlined Button과 동일한 표면 스타일(glassSurface + bg-secondary/10)을 원형 아이콘 버튼에 적용
const navButton =
  `${glassSurface} bg-secondary/10 text-primary-900 rounded-full p-2 ` +
  "transition-all active:scale-95 disabled:opacity-0 disabled:pointer-events-none";

export interface ShelfItem {
  id: string;
  label: string;
  image?: string;
  dimmed?: boolean;
}

interface ShelfProps {
  items: ShelfItem[];
  isLoading?: boolean;
  emptyMessage: string;
}

// 선반형 리스트 — 아이템을 페이지당 5개씩 가로로 나열하고, 화면 양쪽 삼각형 버튼으로 페이지 넘김.
// 서재 탭/친구 탭이 데이터만 다르게 넣어서 이 구조를 그대로 공유함.
export default function Shelf({ items, isLoading = false, emptyMessage }: ShelfProps) {
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentItems = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const hasPrev = page > 0;
  const hasNext = page < pageCount - 1;

  if (isLoading) {
    return <div className="relative flex flex-1 items-center justify-center" />;
  }

  return (
    <div className="relative flex flex-1 items-center justify-center px-16">
      <button
        type="button"
        aria-label="이전 페이지"
        disabled={!hasPrev}
        onClick={() => setPage((p) => p - 1)}
        className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 ${navButton}`}
      >
        <span className="relative z-10 flex">
          <PiCaretLeftFill size={20} />
        </span>
      </button>

      {items.length === 0 ? (
        <p className="text-sm text-primary-900/70">{emptyMessage}</p>
      ) : (
        <div className="flex items-center justify-center gap-6">
          {currentItems.map((item) => (
            <ShelfJarItem key={item.id} label={item.label} image={item.image} dimmed={item.dimmed} />
          ))}
        </div>
      )}

      <button
        type="button"
        aria-label="다음 페이지"
        disabled={!hasNext}
        onClick={() => setPage((p) => p + 1)}
        className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 ${navButton}`}
      >
        <span className="relative z-10 flex">
          <PiCaretRightFill size={20} />
        </span>
      </button>
    </div>
  );
}
