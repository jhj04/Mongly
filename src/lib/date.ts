// "YYYY-MM-DD" -> "M.D" — Date로 파싱하면 로컬 타임존에 따라 하루 밀릴 수 있어서 문자열을 직접 자름
export function formatShortDate(recordDate: string): string {
  const [, month, day] = recordDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}
