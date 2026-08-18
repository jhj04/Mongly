import { describe, expect, it } from "vitest";
import { AppError } from "./errors";
import { JAR_IMAGE_MAX_BYTES, decodeJarImage } from "./image";

// 1×1 투명 PNG — 완성하기 이미지의 최소 유효 입력
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const codeOf = (fn: () => void) => {
  try {
    fn();
    return null;
  } catch (err) {
    return err instanceof AppError ? { code: err.code, status: err.status } : { code: "?", status: 0 };
  }
};

describe("decodeJarImage", () => {
  it("순수 base64 PNG 통과", () => {
    const buf = decodeJarImage(TINY_PNG_B64);
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it("canvas.toDataURL 형식(data URL 접두어) 통과", () => {
    const buf = decodeJarImage(`data:image/png;base64,${TINY_PNG_B64}`);
    expect(buf.length).toBeGreaterThan(8);
  });

  it("PNG가 아닌 data URL(jpeg) → 400 IMAGE_INVALID", () => {
    expect(codeOf(() => decodeJarImage(`data:image/jpeg;base64,${TINY_PNG_B64}`))).toEqual({
      code: "IMAGE_INVALID",
      status: 400,
    });
  });

  it("base64가 아닌 문자열 → 400 IMAGE_INVALID", () => {
    expect(codeOf(() => decodeJarImage("이건base64가아님!!@@"))).toEqual({
      code: "IMAGE_INVALID",
      status: 400,
    });
  });

  it("base64는 맞지만 PNG 매직이 아님 → 400 IMAGE_INVALID", () => {
    const notPng = Buffer.from("hello world, not a png").toString("base64");
    expect(codeOf(() => decodeJarImage(notPng))).toEqual({ code: "IMAGE_INVALID", status: 400 });
  });

  it("1MB 초과 → 413 IMAGE_TOO_LARGE", () => {
    const big = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(JAR_IMAGE_MAX_BYTES), // 매직 8바이트 + 1MB → 총 1MB+8B
    ]);
    expect(codeOf(() => decodeJarImage(big.toString("base64")))).toEqual({
      code: "IMAGE_TOO_LARGE",
      status: 413,
    });
  });

  it("정확히 1MB는 통과 (경계값)", () => {
    const exact = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(JAR_IMAGE_MAX_BYTES - 8),
    ]);
    expect(decodeJarImage(exact.toString("base64")).length).toBe(JAR_IMAGE_MAX_BYTES);
  });

  it("빈 data URL → 400 IMAGE_INVALID", () => {
    expect(codeOf(() => decodeJarImage("data:image/png;base64,"))).toEqual({
      code: "IMAGE_INVALID",
      status: 400,
    });
  });
});
