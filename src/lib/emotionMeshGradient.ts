// 캐릭터 실루엣 위에 올릴 "메쉬 그라데이션" — 감정별 부드러운 radial 블롭을 여러 개 겹쳐서
// conic-gradient처럼 한가운데 한 점으로 색이 모이는 꼭짓점 없이 자연스럽게 섞이게 함.
// (buildEmotionConicGradient와 달리 캐릭터 실루엣에 블러를 쓸 수 없어서 별도로 둠)

import { toPastel, type EmotionGradientSegment } from "@/lib/emotionGradient";

export interface EmotionMeshBlob {
  /** toPastel 적용된 색 */
  colorHex: string;
  /** 블롭 중심, 박스 기준 0~100 */
  xPct: number;
  yPct: number;
  /** max(width, height) 대비 반지름 % */
  radiusPct: number;
}

const FALLBACK_BLOBS: EmotionMeshBlob[] = [
  { colorHex: "#FFE8D6", xPct: 36, yPct: 42, radiusPct: 28 },
  { colorHex: "#D8E4F5", xPct: 64, yPct: 58, radiusPct: 28 },
];

const GOLDEN_ANGLE_DEG = 137.50776;
const ORBIT_PCT = [20, 27, 34];
const MIN_RADIUS_PCT = 18;
const RADIUS_SPREAD_PCT = 18;
// 배경 블롭(buildEmotionConicGradient)의 기본 파스텔(lightness 80, saturationScale 0.9)보다
// 캐릭터 틴트는 더 진하게 — 배경은 건드리지 않고 여기서만 별도로 적용
const MESH_LIGHTNESS = 60;
const MESH_SATURATION_SCALE = 1;

// 각도는 균등 링 배치(바퀴살처럼 보임) 대신 골든 앵글로 흩어서 결정론적이면서도
// 자연스럽게 겹치도록 하고, 궤도 반지름도 3단계로 순환시켜 완벽한 원을 피함.
export function buildEmotionMeshBlobs(segments: EmotionGradientSegment[]): EmotionMeshBlob[] {
  const active = segments.filter((segment) => segment.count > 0);
  const total = active.reduce((sum, segment) => sum + segment.count, 0);
  if (total === 0) return FALLBACK_BLOBS;

  if (active.length === 1) {
    const colorHex = toPastel(active[0].colorHex, MESH_LIGHTNESS, MESH_SATURATION_SCALE);
    return [{ colorHex, xPct: 50, yPct: 50, radiusPct: 34 }];
  }

  return active.map((segment, i) => {
    const fraction = segment.count / total;
    const angleRad = ((i * GOLDEN_ANGLE_DEG) % 360) * (Math.PI / 180);
    const orbit = ORBIT_PCT[i % ORBIT_PCT.length];

    const xPct = clamp(50 + orbit * Math.cos(angleRad), 14, 86);
    const yPct = clamp(50 + orbit * Math.sin(angleRad), 14, 86);
    const radiusPct = MIN_RADIUS_PCT + fraction * RADIUS_SPREAD_PCT;

    const colorHex = toPastel(segment.colorHex, MESH_LIGHTNESS, MESH_SATURATION_SCALE);
    return { colorHex, xPct, yPct, radiusPct };
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
