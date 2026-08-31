"use client";

import Image from "next/image";
import { useMemo } from "react";
import { computeBeadLayout } from "@/lib/beadLayout";
import type { JarEmotionCount } from "@/lib/api/jars";

interface StaticJarProps {
  /** 유리병에 담긴 감정 카운트 — 구슬 배치의 원천 */
  emotions: JarEmotionCount[];
  /** 선택 하이라이트 글로우 등 유리병 이미지에 덧댈 클래스 */
  glowClassName?: string;
  /** 배치 seed — 같은 유리병이면 항상 같은 구슬 배치가 나오도록 고정(보통 jar id) */
  seedKey?: string;
}

// 저장된 PNG 대신 감정 카운트로부터 유리병+구슬을 정적으로 렌더링.
// 홈과 동일한 물리 배치를 쓰되 애니메이션 없이 최종 위치만 그려서, 선반을 화살표로
// 넘겨도 구슬이 튀지 않음. 부모(정사각형 영역)를 꽉 채우도록 absolute inset-0.
export default function StaticJar({
  emotions,
  glowClassName = "",
  seedKey,
}: StaticJarProps) {
  const layout = useMemo(
    () => computeBeadLayout(emotions, seedKey ?? ""),
    [emotions, seedKey]
  );

  return (
    <div className="absolute inset-0">
      <Image
        src="/images/bottle.png"
        alt="유리병"
        fill
        sizes="120px"
        className={`object-contain ${glowClassName}`}
      />

      {/* Jar.tsx의 interior 박스와 동일한 비율 — 구슬이 유리 안쪽에 담기도록 */}
      <div className="absolute left-[27%] right-[30%] top-[19%] bottom-[11%]">
        {layout.map((bead) => (
          <div
            key={bead.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${bead.cx * 100}%`,
              top: `${bead.cy * 100}%`,
              width: `${bead.r * 2 * 100}%`,
              aspectRatio: "1 / 1",
            }}
          >
            <Image
              src={bead.emotion.image}
              alt={bead.emotion.label}
              fill
              sizes="40px"
              className="object-contain drop-shadow"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
