import { z } from "zod";

// 드래그 1회 = 감정 1개 담기. 되돌리기·완성은 바디가 없다(서버 드래프트 기준).
export const addDraftEmotionSchema = z.object({
  emotionId: z.number().int().min(1),
});
