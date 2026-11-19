// 서버가 grapheme(화면에 보이는 "글자") 단위로 50자 제한을 두므로, JS .length(UTF-16 코드 유닛)
// 대신 Intl.Segmenter로 세고 잘라야 서버 검증과 어긋나지 않음.
export const NOTE_MAX_GRAPHEMES = 50;

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

export function countGraphemes(text: string): number {
  if (!segmenter) return [...text].length;
  return [...segmenter.segment(text)].length;
}

export function truncateToGraphemes(text: string, max: number): string {
  if (!segmenter) return [...text].slice(0, max).join("");
  const segments = [...segmenter.segment(text)].map((s) => s.segment);
  return segments.slice(0, max).join("");
}
