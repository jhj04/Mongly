import { z } from "zod";

// 드래그 1회 = 감정 1개 담기. 되돌리기는 바디 없음, 완성의 note는 jar schema에서 검증한다.
export const addDraftEmotionSchema = z.object({
  emotionId: z.number().int().min(1).max(2147483647),
});
