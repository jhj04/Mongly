import { describe, expect, it } from "vitest";
import { createJarSchema } from "./jar";

const body = (emotions: { emotionId: number; count: number }[]) => ({ emotions });

describe("createJarSchema — 감정 1~7개, 중복은 count로 (계획서 §6.2)", () => {
  it("정상: 합계 4개", () => {
    expect(createJarSchema.safeParse(body([{ emotionId: 1, count: 2 }, { emotionId: 6, count: 2 }])).success).toBe(true);
  });

  it("정상: 정확히 7개", () => {
    expect(createJarSchema.safeParse(body([{ emotionId: 1, count: 7 }])).success).toBe(true);
  });

  it("거부: 합계 8개 초과", () => {
    expect(createJarSchema.safeParse(body([{ emotionId: 1, count: 4 }, { emotionId: 2, count: 4 }])).success).toBe(false);
  });

  it("거부: 같은 감정 행 중복 (count로 합쳐야 함)", () => {
    expect(createJarSchema.safeParse(body([{ emotionId: 1, count: 1 }, { emotionId: 1, count: 1 }])).success).toBe(false);
  });

  it("거부: 빈 배열", () => {
    expect(createJarSchema.safeParse(body([])).success).toBe(false);
  });

  it("거부: count 0", () => {
    expect(createJarSchema.safeParse(body([{ emotionId: 1, count: 0 }])).success).toBe(false);
  });
});
