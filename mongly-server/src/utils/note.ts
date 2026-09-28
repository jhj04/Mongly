export const NOTE_MAX_GRAPHEMES = 50;
export const NOTE_MAX_BYTES = 2048;

const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
const controlCharacters = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;

export function normalizeNote(value: string): string {
  return value.normalize("NFC").trim();
}

export function countGraphemes(value: string): number {
  return Array.from(segmenter.segment(value)).length;
}

/** 검증은 trim 전에 수행해 앞뒤의 개행·탭도 조용히 제거하지 않는다. */
export function noteValidationError(value: string): string | null {
  if (Buffer.byteLength(value, "utf8") > NOTE_MAX_BYTES) {
    return "일기 입력은 2,048바이트를 넘을 수 없어요.";
  }
  if (controlCharacters.test(value)) {
    return "일기는 줄바꿈이나 제어문자 없이 한 줄로 입력해주세요.";
  }
  // JSON은 단독 surrogate도 표현할 수 있지만 PostgreSQL UTF-8 TEXT에는 저장할 수 없다.
  if (Array.from(value).some((char) => char.length === 1 && /[\ud800-\udfff]/u.test(char))) {
    return "올바른 유니코드 문자열을 입력해주세요.";
  }
  const normalized = normalizeNote(value);
  if (Buffer.byteLength(normalized, "utf8") > NOTE_MAX_BYTES) {
    return "일기 입력은 2,048바이트를 넘을 수 없어요.";
  }
  if (countGraphemes(normalized) > NOTE_MAX_GRAPHEMES) {
    return "일기는 최대 50자까지 입력할 수 있어요.";
  }
  return null;
}
