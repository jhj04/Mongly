// 유리병에 담긴 감정 색을 기반으로 결과 페이지 배경 그라데이션을 만듦.
// 원색 그대로 쓰면 파스텔 톤인 앱 분위기와 안 맞아서, 채도/명도를 눌러 톤을 맞춘 뒤 사용함.

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// 원색을 앱 톤에 맞게 조정 — lightness가 낮을수록, saturationScale이 클수록 색이 진해짐
export function toPastel(hex: string, lightness = 80, saturationScale = 0.9): string {
  const [h, s] = hexToHsl(hex);
  return hslToHex(h, s * saturationScale, lightness);
}

export interface EmotionGradientSegment {
  colorHex: string;
  count: number;
}

const FALLBACK_CONIC = "conic-gradient(from 0deg, #FFE8D6, #F5D9EA, #D8E4F5, #FFE8D6)";

// 각 감정 색을 담은 개수 비율만큼의 각도 구간으로 배치한 원형(conic) 그라데이션.
// 원형 blob에 이 값을 배경으로 넣고 회전시키면 색이 서로 섞여 도는 것처럼 보임.
// 비율이 큰 감정일수록 원 안에서 더 넓은 구간을 차지함.
export function buildEmotionConicGradient(segments: EmotionGradientSegment[]): string {
  const active = segments.filter((segment) => segment.count > 0);
  const total = active.reduce((sum, segment) => sum + segment.count, 0);
  if (total === 0) return FALLBACK_CONIC;

  if (active.length === 1) {
    const solid = toPastel(active[0].colorHex);
    return `conic-gradient(from 0deg, ${solid}, ${solid})`;
  }

  let cursor = 0;
  const stops = active.map((segment) => {
    const pastel = toPastel(segment.colorHex);
    const stop = `${pastel} ${cursor.toFixed(1)}%`;
    cursor += (segment.count / total) * 100;
    return stop;
  });
  // 마지막에 시작 색을 한 번 더 찍어서 360도가 이어질 때 이음매가 안 보이게 함
  stops.push(`${toPastel(active[0].colorHex)} 100%`);

  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}
