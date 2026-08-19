export interface Emotion {
  id: string;
  /** 서버 감정 마스터(GET /api/emotions)의 id — 드래프트에 담을 때 그대로 전송 */
  emotionId: number;
  label: string;
  image: string;
}

// 서버 감정 마스터(GET /api/emotions) 10종과 emotionId를 그대로 맞춰서 매핑.
export const EMOTIONS: Emotion[] = [
  { id: "joy", emotionId: 1, label: "기쁨", image: "/images/emotions/행복.png" },
  { id: "sadness", emotionId: 2, label: "슬픔", image: "/images/emotions/슬픔.png" },
  { id: "anger", emotionId: 3, label: "분노", image: "/images/emotions/분노.png" },
  { id: "surprise", emotionId: 4, label: "놀람", image: "/images/emotions/놀람.png" },
  { id: "anxiety", emotionId: 5, label: "불안", image: "/images/emotions/불안.png" },
  { id: "love", emotionId: 6, label: "사랑", image: "/images/emotions/사랑.png" },
  { id: "annoyance", emotionId: 7, label: "짜증", image: "/images/emotions/짜증.png" },
  { id: "excitement", emotionId: 8, label: "설렘", image: "/images/emotions/설렘.png" },
  { id: "regret", emotionId: 9, label: "후회", image: "/images/emotions/후회.png" },
  { id: "hope", emotionId: 10, label: "희망", image: "/images/emotions/희망.png" },
];

export function findEmotionByEmotionId(emotionId: number): Emotion | undefined {
  return EMOTIONS.find((emotion) => emotion.emotionId === emotionId);
}
