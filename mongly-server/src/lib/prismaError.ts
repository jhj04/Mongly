import { Prisma } from "@prisma/client";

/** 유니크 제약 위반(P2002) — 중복 방어의 최종 방어선은 항상 DB 제약이다 */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
