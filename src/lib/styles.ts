// Liquid-glass 공통 스타일 (배경색·모서리·텍스트 색은 사용하는 쪽에서 지정)
// 그림자는 globals.css @theme 의 --shadow-* 토큰(shadow-drop/surface/glass) 사용

const before =
  "before:content-[''] before:absolute before:inset-0 before:pointer-events-none";

// 은은한 유리 — 컬러피커, Shelf 이전/다음 버튼처럼 배경이 비치는 표면
export const glassSurface =
  `relative overflow-hidden border border-white/35 shadow-surface ` +
  `backdrop-blur-md backdrop-saturate-150 ` +
  `${before} before:bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.35),transparent_55%)]`;

// 블러 없는 납작한 표면 — 헤더 바, 알림 벨, outlined 버튼처럼 흐림 효과 없이
// 배경색 + shadow-drop만 쓰는 pill 모양
export const flatSurface = "relative overflow-hidden shadow-drop";

// 채운 유리 — filled / danger 버튼처럼 배경색이 진한 표면 (inner shadow 포함)
export const glassSolid =
  `relative overflow-hidden border border-white/20 shadow-glass ` +
  `backdrop-blur-md backdrop-saturate-150 ` +
  `${before} before:bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.18),transparent_55%)]`;
