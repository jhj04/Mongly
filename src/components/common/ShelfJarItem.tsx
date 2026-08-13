import Image from "next/image";
import ShelfBadge from "./ShelfBadge";

interface ShelfJarItemProps {
  label: string;
  /** 캡처된 병+구슬 PNG(data URL). 없으면 빈 병 기본 이미지를 보여줌 */
  image?: string;
  /** 오늘 담긴 유리병이 없는 친구 등 비활성 슬롯 표시용 */
  dimmed?: boolean;
}

// 선반 위 유리병 한 칸 — 라벨(날짜/친구ID) 배지 + 그 아래 유리병 이미지
export default function ShelfJarItem({ label, image, dimmed = false }: ShelfJarItemProps) {
  return (
    <div className={`relative top-[30px] flex flex-col items-center gap-1 ${dimmed ? "opacity-40" : ""}`}>
      <ShelfBadge label={label} />
      <div className="relative top-[20px] w-[clamp(70px,13.75vw,120px)] h-[clamp(70px,13.75vw,120px)]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL 캡처본이라 next/image 최적화 대상이 아님
          <img src={image} alt={label} className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <Image src="/images/bottle.png" alt={label} fill sizes="120px" className="object-contain" />
        )}
      </div>
    </div>
  );
}
