export interface Emotion {
  id: string;
  /** 서버 감정 마스터(GET /api/emotions)의 id — 드래프트에 담을 때 그대로 전송 */
  emotionId: number;
  label: string;
  image: string;
}

// 서버 감정 마스터는 10종(분노/기쁨/행복/희망/평온/슬픔/불안/사랑/설렘/무덤덤)인데
// 아직 구슬 이미지가 7종(겹치는 것)만 있어서, 일단 이미지가 있는 감정만 연동함.
// 기쁨(2)/평온(5)/무덤덤(10)은 이미지 준비되면 추가.
export const EMOTIONS: Emotion[] = [
  { id: "anger", emotionId: 1, label: "분노", image: "/images/emotions/분노.png" },
  { id: "happy", emotionId: 3, label: "행복", image: "/images/emotions/행복.png" },
  { id: "hope", emotionId: 4, label: "희망", image: "/images/emotions/희망.png" },
  { id: "sadness", emotionId: 6, label: "슬픔", image: "/images/emotions/슬픔.png" },
  { id: "anxiety", emotionId: 7, label: "불안", image: "/images/emotions/불안.png" },
  { id: "love", emotionId: 8, label: "사랑", image: "/images/emotions/사랑.png" },
  { id: "excitement", emotionId: 9, label: "설렘", image: "/images/emotions/설렘.png" },
];

export function findEmotionByEmotionId(emotionId: number): Emotion | undefined {
  return EMOTIONS.find((emotion) => emotion.emotionId === emotionId);
}
