export interface Emotion {
  id: string;
  label: string;
  image: string;
}

export const EMOTIONS: Emotion[] = [
  { id: "happy", label: "행복", image: "/images/emotions/행복.png" },
  { id: "hope", label: "희망", image: "/images/emotions/희망.png" },
  { id: "love", label: "사랑", image: "/images/emotions/사랑.png" },
  { id: "excitement", label: "설렘", image: "/images/emotions/설렘.png" },
  { id: "surprise", label: "놀람", image: "/images/emotions/놀람.png" },
  { id: "sadness", label: "슬픔", image: "/images/emotions/슬픔.png" },
  { id: "anxiety", label: "불안", image: "/images/emotions/불안.png" },
  { id: "anger", label: "분노", image: "/images/emotions/분노.png" },
  { id: "irritation", label: "짜증", image: "/images/emotions/짜증.png" },
  { id: "regret", label: "후회", image: "/images/emotions/후회.png" },
];
