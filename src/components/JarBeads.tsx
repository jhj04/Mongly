"use client";

import Image from "next/image";
import type { PhysicsBead } from "@/hooks/useJarPhysics";

interface JarBeadsProps {
  beads: PhysicsBead[];
  registerBeadEl: (id: string, el: HTMLDivElement | null) => void;
}

// 위치는 useJarPhysics가 매 물리 틱마다 각 엘리먼트의 transform을 직접 갱신해서 반영함
// (React 리렌더 없이 이동시키기 위함). 여기서는 DOM만 만들고 ref만 등록함.
// 바깥 div는 물리 위치(transform: translate), 안쪽 div는 등장 애니메이션(scale/opacity)을
// 담당해서 두 transform이 서로 덮어쓰지 않게 분리함.
export default function JarBeads({ beads, registerBeadEl }: JarBeadsProps) {
  return (
    <>
      {beads.map((bead) => (
        <div
          key={bead.id}
          ref={(el) => registerBeadEl(bead.id, el)}
          className="absolute left-0 top-0"
          style={{ width: bead.radius * 2, height: bead.radius * 2, willChange: "transform" }}
        >
          <div className="relative w-full h-full animate-[bead-in_0.2s_ease-out]">
            <Image
              src={bead.emotion.image}
              alt={bead.emotion.label}
              fill
              sizes={`${bead.radius * 2}px`}
              className="drop-shadow"
            />
          </div>
        </div>
      ))}
    </>
  );
}
