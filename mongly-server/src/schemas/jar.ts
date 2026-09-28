import { z } from "zod";
import { normalizeNote, noteValidationError } from "../utils/note";
import { decodeCursor, isRecordDate } from "../utils/pagination";

export const noteSchema = z.string().superRefine((value, ctx) => {
  const message = noteValidationError(value);
  if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
}).transform((value) => normalizeNote(value) || null).nullable();

// 기존 body 없는 완료도 허용한다. 입력 오류는 서비스 실행 전에 거부한다.
export const completeJarSchema = z.object({ note: noteSchema.optional() }).strict();

export const jarIdParamsSchema = z.object({
  id: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/, "올바른 유리병 ID를 보내주세요."),
}).strict();

const emotionCountSchema = z.object({
  emotionId: z.number().int().min(1).max(2147483647),
  count: z.number().int().min(1).max(7),
}).strict();

export const updateJarSchema = z.object({
  expectedVersion: z.number().int().min(1).max(2147483647),
  note: noteSchema.optional(),
  emotions: z.array(emotionCountSchema).min(1).max(7).superRefine((emotions, ctx) => {
    if (new Set(emotions.map((emotion) => emotion.emotionId)).size !== emotions.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "같은 감정 ID를 중복해서 보낼 수 없어요." });
    }
    if (emotions.reduce((total, emotion) => total + emotion.count, 0) > 7) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "감정은 합계 7개까지 담을 수 있어요." });
    }
  }).optional(),
}).strict().refine((value) => value.note !== undefined || value.emotions !== undefined, {
  message: "수정할 일기 또는 감정 구성을 보내주세요.",
});

const jarCursorSchema = z.object({
  v: z.literal(1),
  recordDate: z.string().refine(isRecordDate, "올바른 기록 날짜가 아니에요."),
}).strict();

export const listJarsQuerySchema = z.object({
  limit: z.string().regex(/^[1-9]\d?$/, "limit은 1~50의 정수여야 해요.")
    .transform(Number).pipe(z.number().int().min(1).max(50)).optional().default("7"),
  cursor: z.string().min(1).max(512).transform((cursor, ctx) => {
    try {
      const result = jarCursorSchema.safeParse(decodeCursor(cursor));
      if (result.success) return result.data.recordDate;
    } catch { /* 동일한 필드 오류로 변환한다. */ }
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "올바른 페이지 커서를 보내주세요." });
    return z.NEVER;
  }).optional(),
}).strict();

export type CompleteJarInput = z.infer<typeof completeJarSchema>;
export type UpdateJarInput = z.infer<typeof updateJarSchema>;
export type ListJarsQuery = z.infer<typeof listJarsQuerySchema>;
