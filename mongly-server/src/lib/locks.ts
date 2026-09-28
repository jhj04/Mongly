import { Prisma } from "@prisma/client";

/** 관계/병/좋아요/탈퇴 변경은 사용자 잠금을 같은 순서로 잡는다. 트랜잭션 안에서만 호출. */
export async function lockUsers(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
  for (const id of [...new Set(ids)].sort()) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
  }
}
