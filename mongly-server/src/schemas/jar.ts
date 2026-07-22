import { z } from "zod";

// 유리병 담기 규칙: 감정 합계 1~7개, 같은 감정은 행 중복이 아니라 count로 표현
export const createJarSchema = z.object({
  emotions: z
    .array(
      z.object({
        emotionId: z.number().int().min(1),
        count: z.number().int().min(1).max(7),
      }),
    )
    .min(1, "감정을 1개 이상 담아주세요.")
    .refine(
      (arr) => new Set(arr.map((e) => e.emotionId)).size === arr.length,
      "같은 감정은 count로 합쳐서 보내주세요.",
    )
    .refine(
      (arr) => arr.reduce((sum, e) => sum + e.count, 0) <= 7,
      "감정은 최대 7개까지 담을 수 있어요.",
    ),
});

export type CreateJarInput = z.infer<typeof createJarSchema>;
