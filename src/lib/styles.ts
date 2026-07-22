// Liquid-glass 공통 스타일 (배경색·모서리·텍스트 색은 사용하는 쪽에서 지정)

const before =
  "before:content-[''] before:absolute before:inset-0 before:pointer-events-none";

// 채운 표면 그림자 (drop + inner) — filled/danger 버튼
export const glassShadow =
  "shadow-[2px_2px_8px_rgba(184,110,67,0.6),inset_0_1px_2px_rgba(255,255,255,0.25),inset_2px_2px_8px_rgba(184,110,67,0.6)]";

// 은은한 유리 — 헤더 바, 컬러피커, outlined 버튼처럼 배경이 비치는 표면
export const glassSurface =
  `relative overflow-hidden border border-white/35 ` +
  `shadow-[2px_2px_8px_rgba(184,110,67,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] ` +
  `backdrop-blur-md backdrop-saturate-150 ` +
  `${before} before:bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.35),transparent_55%)]`;

// 채운 유리 — filled / danger 버튼처럼 배경색이 진한 표면 (inner shadow 포함)
export const glassSolid =
  `relative overflow-hidden border border-white/20 ` +
  `${glassShadow} ` +
  `backdrop-blur-md backdrop-saturate-150 ` +
  `${before} before:bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.18),transparent_55%)]`;
