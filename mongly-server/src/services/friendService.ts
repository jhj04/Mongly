import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors";
import { lockUsers } from "../lib/locks";
import { prisma } from "../lib/prisma";
import { isForeignKeyViolation, isUniqueViolation } from "../lib/prismaError";
import { friendRepository } from "../repositories/friendRepository";
import { jarRepository } from "../repositories/jarRepository";
import { notificationRepository } from "../repositories/notificationRepository";
import { userRepository } from "../repositories/userRepository";
import { toJarResponses } from "./jarService";

export const FRIEND_LIMIT = 10;
export const REQUEST_INBOX_LIMIT = 20;

const alreadyFriendError = () => new AppError(409, "ALREADY_FRIEND", "이미 친구예요.");
const requestNotFoundError = () => new AppError(404, "REQUEST_NOT_FOUND", "이미 처리됐거나 없는 요청이에요.");
const userNotFoundError = () => new AppError(404, "USER_NOT_FOUND", "존재하지 않는 아이디예요.");
const requestAlreadySentError = () => new AppError(409, "REQUEST_ALREADY_SENT", "이미 친구 요청을 보냈어요.");

// 호출자가 양쪽 사용자 잠금을 잡은 트랜잭션을 전달한다.
// 한도 실패는 요청 소비까지 롤백하므로 친구를 비운 뒤 다시 수락할 수 있다.
async function establishFriendship(tx: Prisma.TransactionClient, meId: string, otherId: string, requestId: string) {
  const consumed = await tx.friendRequest.deleteMany({ where: { id: requestId } });
  if (consumed.count === 0) throw requestNotFoundError();
  if (await tx.friendship.findUnique({ where: { userId_friendId: { userId: meId, friendId: otherId } } })) {
    throw alreadyFriendError();
  }
  if (await tx.friendship.count({ where: { userId: meId } }) >= FRIEND_LIMIT) {
    throw new AppError(409, "FRIEND_LIMIT_ME", "내 친구가 가득 찼어요. (최대 10명)");
  }
  if (await tx.friendship.count({ where: { userId: otherId } }) >= FRIEND_LIMIT) {
    throw new AppError(409, "FRIEND_LIMIT_TARGET", "상대방의 친구가 가득 찼어요.");
  }
  await tx.friendship.createMany({ data: [{ userId: meId, friendId: otherId }, { userId: otherId, friendId: meId }] });
  // 요청 삭제는 연결된 친구 요청 알림도 cascade로 삭제한다.
  await tx.friendRequest.deleteMany({
    where: { OR: [{ fromUserId: meId, toUserId: otherId }, { fromUserId: otherId, toUserId: meId }] },
  });
}

export const friendService = {
  async sendRequest(userId: string, toLoginId: string) {
    const initial = await userRepository.findByLoginId(toLoginId);
    if (!initial) throw userNotFoundError();
    if (initial.id === userId) throw new AppError(400, "SELF_FRIEND", "자기 자신에게는 친구 요청을 보낼 수 없어요.");

    try {
      return await prisma.$transaction(async (tx) => {
        await lockUsers(tx, [userId, initial.id]);
        const target = await tx.user.findUnique({ where: { id: initial.id }, select: { id: true, loginId: true } });
        if (!target || target.loginId !== toLoginId) throw userNotFoundError();
        if (!(await tx.user.findUnique({ where: { id: userId }, select: { id: true } }))) {
          throw new AppError(401, "UNAUTHORIZED", "존재하지 않는 계정이에요.");
        }
        if (await tx.friendship.findUnique({ where: { userId_friendId: { userId, friendId: target.id } } })) {
          throw alreadyFriendError();
        }
        if (await tx.friendship.count({ where: { userId } }) >= FRIEND_LIMIT) {
          throw new AppError(409, "FRIEND_LIMIT_ME", "내 친구가 가득 찼어요. (최대 10명)");
        }

        // 잠금 이후 역방향 요청을 확인: 동시에 맞요청해도 두 요청이 대기로 남지 않는다.
        const reverse = await tx.friendRequest.findUnique({
          where: { fromUserId_toUserId: { fromUserId: target.id, toUserId: userId } },
        });
        if (reverse) {
          await establishFriendship(tx, userId, target.id, reverse.id);
          return { loginId: target.loginId, status: "accepted" as const };
        }
        const sent = await tx.friendRequest.findUnique({
          where: { fromUserId_toUserId: { fromUserId: userId, toUserId: target.id } },
        });
        if (sent) throw requestAlreadySentError();
        if (await tx.friendRequest.count({ where: { toUserId: target.id } }) >= REQUEST_INBOX_LIMIT) {
          throw new AppError(409, "REQUEST_INBOX_FULL", "상대에게 대기 중인 요청이 가득 찼어요. 나중에 다시 시도해주세요.");
        }
        const request = await tx.friendRequest.create({
          data: { fromUserId: userId, toUserId: target.id, createdAt: new Date() },
        });
        await notificationRepository.createFriendRequest(target.id, request.id, tx);
        return { loginId: target.loginId, status: "pending" as const };
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw requestAlreadySentError();
      if (isForeignKeyViolation(err)) throw userNotFoundError();
      throw err;
    }
  },

  // 기존 계약 유지: total은 읽음 여부와 관계없는 대기 요청 수.
  async listReceivedRequests(userId: string) {
    const rows = await prisma.friendRequest.findMany({
      where: { toUserId: userId },
      include: { from: { select: { loginId: true } } },
      orderBy: { createdAt: "desc" },
    });
    return {
      total: rows.length,
      requests: rows.map((r) => ({ id: r.id, fromLoginId: r.from.loginId, createdAt: r.createdAt })),
    };
  },

  async acceptRequest(userId: string, requestId: string) {
    const initial = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!initial) throw requestNotFoundError();
    if (initial.toUserId !== userId) throw new AppError(403, "FORBIDDEN", "내가 받은 요청만 처리할 수 있어요.");
    try {
      return await prisma.$transaction(async (tx) => {
        await lockUsers(tx, [userId, initial.fromUserId]);
        const row = await tx.friendRequest.findUnique({
          where: { id: requestId }, include: { from: { select: { loginId: true } } },
        });
        if (!row) throw requestNotFoundError();
        await establishFriendship(tx, userId, row.fromUserId, row.id);
        return { loginId: row.from.loginId };
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw alreadyFriendError();
      if (isForeignKeyViolation(err)) throw requestNotFoundError();
      throw err;
    }
  },

  async rejectRequest(userId: string, requestId: string) {
    const initial = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!initial) throw requestNotFoundError();
    if (initial.toUserId !== userId) throw new AppError(403, "FORBIDDEN", "내가 받은 요청만 처리할 수 있어요.");
    await prisma.$transaction(async (tx) => {
      await lockUsers(tx, [userId, initial.fromUserId]);
      const { count } = await tx.friendRequest.deleteMany({ where: { id: requestId, toUserId: userId } });
      if (count === 0) throw requestNotFoundError();
    });
    return { ok: true };
  },

  async listFriends(userId: string) {
    const rows = await friendRepository.listByUser(userId);
    return { total: rows.length, friends: rows.map((r) => ({ loginId: r.friend.loginId, createdAt: r.createdAt })) };
  },

  async removeFriends(userId: string, friendLoginIds: string[]) {
    const targets = await prisma.user.findMany({ where: { loginId: { in: friendLoginIds } }, select: { id: true } });
    if (targets.length !== friendLoginIds.length) {
      throw new AppError(404, "FRIEND_NOT_FOUND", "친구 목록에 없는 아이디가 포함돼 있어요.");
    }
    const targetIds = targets.map((target) => target.id);
    await prisma.$transaction(async (tx) => {
      await lockUsers(tx, [userId, ...targetIds]);
      if (await tx.friendship.count({ where: { userId, friendId: { in: targetIds } } }) !== targetIds.length) {
        throw new AppError(404, "FRIEND_NOT_FOUND", "친구 목록에 없는 아이디가 포함돼 있어요.");
      }
      // 비활성 상태 행도 지운다. 재친구 이후의 좋아요는 새 관계에서의 첫 좋아요다.
      await tx.jarLike.deleteMany({
        where: { OR: [
          { userId, jar: { userId: { in: targetIds } } },
          { userId: { in: targetIds }, jar: { userId } },
        ] },
      });
      await tx.friendship.deleteMany({
        where: { OR: [{ userId, friendId: { in: targetIds } }, { userId: { in: targetIds }, friendId: userId }] },
      });
    });
    return { deleted: targetIds.length };
  },

  async getFriendsLatestJars(userId: string) {
    return prisma.$transaction(async (tx) => {
      // 권한·감정·좋아요가 같은 스냅샷에 속하도록 한다. 해제 전 권한과 편집 후 내용이 섞이지 않는다.
      const rows = await friendRepository.listByUser(userId, tx);
      const jars = await jarRepository.findLatestByUsers(rows.map((row) => row.friendId), tx);
      const responses = await toJarResponses(jars, userId, tx);
      const latestByUser = new Map(jars.map((jar, index) => [jar.userId, responses[index]]));
      return { friends: rows.map((row) => ({ loginId: row.friend.loginId, jar: latestByUser.get(row.friendId) ?? null })) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  },
};
