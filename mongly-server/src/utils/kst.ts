// "하루 1병"의 '하루'는 KST 자정 기준 (계획서 §6.1).
// 서버(Render)·DB(Neon)는 UTC로 돌기 때문에 TZ 환경변수에 의존하지 않고 +9h를 명시 계산한다.
// recordDate 생성 · JAR_ALREADY_TODAY 판정 · GET /jars/today 는 전부 이 함수만 사용할 것.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 기준 오늘 날짜를 "YYYY-MM-DD"로 반환 */
export function getKstToday(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD"를 Prisma @db.Date 컬럼에 넣을 Date(UTC 자정)로 변환 */
export function kstDateToDb(kstDate: string): Date {
  return new Date(`${kstDate}T00:00:00.000Z`);
}
