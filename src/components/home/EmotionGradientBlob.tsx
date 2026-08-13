import { buildEmotionConicGradient, type EmotionGradientSegment } from "@/lib/emotionGradient";

interface EmotionGradientBlobProps {
  emotions: EmotionGradientSegment[];
  /** true면 캐릭터 등장 전 "로딩" 연출용으로 훨씬 빠르게 여러 바퀴 돌고, false면 평소의 느린 회전 */
  fast?: boolean;
}

// 결과 페이지 배경 장식 — 담긴 감정 색으로 만든 원형 그라데이션을 회전시켜서
// 색이 서로 섞여 도는 듯한 모션을 줌. blur로 경계를 흐려 구름/오로라 같은 느낌.
export default function EmotionGradientBlob({ emotions, fast = false }: EmotionGradientBlobProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute left-1/2 top-1/2 h-[60vw] max-h-[560px] w-[60vw] max-w-[560px] rounded-full blur-3xl ${
        fast ? "animate-[gradient-spin_0.5s_linear_3]" : "animate-[gradient-spin_16s_linear_infinite]"
      }`}
      style={{ background: buildEmotionConicGradient(emotions) }}
    />
  );
}
