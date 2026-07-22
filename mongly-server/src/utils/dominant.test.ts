import { describe, expect, it } from "vitest";
import { dominantEmotionId } from "./dominant";

describe("dominantEmotionId", () => {
  it("count가 가장 큰 감정을 반환", () => {
    expect(
      dominantEmotionId([
        { emotionId: 6, count: 1 },
        { emotionId: 1, count: 2 },
        { emotionId: 9, count: 1 },
      ]),
    ).toBe(1);
  });

  it("최대 count 동률이면 null (고르게 섞임)", () => {
    expect(
      dominantEmotionId([
        { emotionId: 6, count: 2 },
        { emotionId: 1, count: 2 },
      ]),
    ).toBeNull();
  });

  it("감정 1개면 그 감정", () => {
    expect(dominantEmotionId([{ emotionId: 4, count: 3 }])).toBe(4);
  });
});
