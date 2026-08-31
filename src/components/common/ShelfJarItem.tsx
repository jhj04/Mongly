import Image from "next/image";
import type { JarEmotionCount } from "@/lib/api/jars";
import ShelfBadge from "./ShelfBadge";
import StaticJar from "./StaticJar";

interface ShelfJarItemProps {
  label: string;
  /** GET /api/jars/{id}/image URL. 없으면 빈 병 기본 이미지를 보여줌 */
  image?: string;
  /** 유리병에 담긴 감정 카운트 — 저장 PNG 대신 이걸로 구슬을 정적 렌더링 */
  emotions?: JarEmotionCount[];
  /** 배치 seed(보통 jar id) — 같은 유리병이면 항상 같은 구슬 배치 */
  seedKey?: string;
  /** 오늘 담긴 유리병이 없는 친구 등 비활성 슬롯 표시용 */
  dimmed?: boolean;
  /** 현재 선택된 유리병인지 — 흰 테두리 하이라이트 + 살짝 확대 */
  selected?: boolean;
  /** 유리병(이미지 영역) 클릭. dimmed 슬롯은 넘기지 않음 */
  onSelect?: () => void;
}

// 선반 위 유리병 한 칸 — 라벨(날짜/친구ID) 배지 + 그 아래 유리병 이미지.
// 유리병을 누르면 선택되어 테두리가 하이라이트되고 살짝 커짐.
export default function ShelfJarItem({
  label,
  image,
  emotions,
  seedKey,
  dimmed = false,
  selected = false,
  onSelect,
}: ShelfJarItemProps) {
  const selectable = !dimmed && !!onSelect;

  // 선택 시 흰색 하이라이트 — 사각 테두리 대신 PNG 실루엣을 따라가는 drop-shadow 글로우라
  // 병 윤곽 그대로 빛남. 여러 겹 쌓아 또렷한 외곽선처럼 보이게 함.
  const selectedGlow =
    "[filter:drop-shadow(0_0_2px_#fff)_drop-shadow(0_0_4px_#fff)_drop-shadow(0_0_8px_rgba(255,255,255,0.9))]";

  return (
    <div className={`relative top-[30px] flex flex-col items-center gap-1 ${dimmed ? "opacity-40" : ""}`}>
      {/* 데스크톱 배경은 선반이 살짝 오른쪽·아래라 right-[1.7%] 스큐를 줬는데,
          모바일 배경은 선반이 가운데라 스큐를 빼서 정중앙 정렬 */}
      <div className="relative top-[-30px] right-0 sm:top-0 sm:right-[1.7%]">
        <ShelfBadge label={label} />
      </div>
      <button
        type="button"
        onClick={selectable ? onSelect : undefined}
        aria-pressed={selected}
        disabled={!selectable}
        className={`relative -top-[20px] sm:top-[20px] w-[clamp(52px,13.75vw,120px)] h-[clamp(52px,13.75vw,120px)] transition-transform duration-200 ${
          selected ? "scale-110" : ""
        } ${selectable ? "cursor-pointer" : "cursor-default"}`}
      >
        {/* 기존: 저장된 PNG를 그대로 보여줌 — 캡처 타이밍 이슈로 빈병/깨진 이미지가
            섞여서, 감정 카운트로 구슬을 정적 렌더링하는 방식(StaticJar)으로 교체함.
            (되돌릴 수 있게 남겨둠)
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- 인증 쿠키 필요한 same-origin 바이너리라 next/image 최적화 대상이 아님
          <img
            src={image}
            alt={label}
            className={`absolute inset-0 h-full w-full object-contain ${selected ? selectedGlow : ""}`}
          />
        ) : (
          <Image
            src="/images/bottle.png"
            alt={label}
            fill
            sizes="120px"
            className={`object-contain ${selected ? selectedGlow : ""}`}
          />
        )}
        */}
        {emotions && emotions.length > 0 ? (
          <StaticJar
            emotions={emotions}
            seedKey={seedKey ?? label}
            glowClassName={selected ? selectedGlow : ""}
          />
        ) : (
          <Image
            src="/images/bottle.png"
            alt={label}
            fill
            sizes="120px"
            className={`object-contain ${selected ? selectedGlow : ""}`}
          />
        )}
      </button>
    </div>
  );
}
