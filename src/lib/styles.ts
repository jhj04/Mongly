// Liquid-glass 공통 스타일 (배경색·모서리·텍스트 색은 사용하는 쪽에서 지정)
// 그림자는 globals.css @theme 의 --shadow-* 토큰(shadow-drop/surface/glass) 사용

const before =
  "before:content-[''] before:absolute before:inset-0 before:pointer-events-none";

// 은은한 유리 — 헤더 바, 컬러피커, outlined 버튼처럼 배경이 비치는 표면
export const glassSurface =
  `relative overflow-hidden border border-white/35 shadow-surface ` +
  `backdrop-blur-md backdrop-saturate-150 ` +
  `${before} before:bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.35),transparent_55%)]`;

// 채운 유리 — filled / danger 버튼처럼 배경색이 진한 표면 (inner shadow 포함)
export const glassSolid =
  `relative overflow-hidden border border-white/20 shadow-glass ` +
  `backdrop-blur-md backdrop-saturate-150 ` +
  `${before} before:bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.18),transparent_55%)]`;
