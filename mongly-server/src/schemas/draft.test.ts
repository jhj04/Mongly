import { describe, expect, it } from "vitest";
import { addDraftEmotionSchema } from "./draft";

describe("addDraftEmotionSchema — 드래그 1회", () => {
  it("정상 emotionId 통과", () => {
    expect(addDraftEmotionSchema.safeParse({ emotionId: 3 }).success).toBe(true);
  });

  it.each([{ emotionId: 0 }, { emotionId: -1 }, { emotionId: 1.5 }, {}, { emotionId: "1" }])(
    "거부: %j",
    (v) => {
      expect(addDraftEmotionSchema.safeParse(v).success).toBe(false);
    },
  );
});
