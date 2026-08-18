import { Prisma } from "@prisma/client";

/** 유니크 제약 위반(P2002) — 중복 방어의 최종 방어선은 항상 DB 제약이다 */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** FK 제약 위반(P2003) — 참조 대상(유저 등)이 경합 삭제된 경우. 호출부가 404 계열로 매핑한다 */
export function isForeignKeyViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003";
}

/**
 * P2002가 어느 필드에서 났는지 판별한다. meta.target은 Prisma/DB 버전에 따라
 * 배열(['email']) 또는 문자열/인덱스명일 수 있어 둘 다 방어적으로 처리하고,
 * 판별 불가 시 null을 반환한다 (호출부가 포괄 에러로 폴백하도록).
 */
export function uniqueViolationTarget(err: unknown): "email" | "loginId" | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return null;
  const target = err.meta?.target;
  const hay = Array.isArray(target) ? target.join(",") : typeof target === "string" ? target : "";
  if (hay.includes("email")) return "email";
  if (hay.includes("loginId")) return "loginId";
  return null;
}
