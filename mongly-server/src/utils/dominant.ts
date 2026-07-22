// 감정 구성 요약: count 최대 감정 — 동률이면 null
// ("이번 기록은 슬픔이 조금 더 많은 편이에요" / 동률 시 "여러 감정이 고르게 섞였어요"는 프론트가 렌더)
export function dominantEmotionId(emotions: { emotionId: number; count: number }[]): number | null {
  let best: number | null = null;
  let bestCount = -1;
  let tie = false;

  for (const e of emotions) {
    if (e.count > bestCount) {
      best = e.emotionId;
      bestCount = e.count;
      tie = false;
    } else if (e.count === bestCount) {
      tie = true;
    }
  }
  return tie ? null : best;
}
