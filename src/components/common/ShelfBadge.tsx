import { glassSurface } from "@/lib/styles";

interface ShelfBadgeProps {
  label: string;
}

// 홈 화면 유리병의 "0/7" 카운트 배지와 동일한 스타일 — 선반에서는 날짜/친구 ID 등 라벨을 보여줌
export default function ShelfBadge({ label }: ShelfBadgeProps) {
  return (
    <span className={`${glassSurface} inline-block max-w-[72px] rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-primary-900`}>
      <span className="relative z-10 block truncate">{label}</span>
    </span>
  );
}
