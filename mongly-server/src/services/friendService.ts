import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { isUniqueViolation } from "../lib/prismaError";
import { friendRepository } from "../repositories/friendRepository";
import { jarRepository } from "../repositories/jarRepository";
import { userRepository } from "../repositories/userRepository";
import { toJarResponse } from "./jarService";

export const FRIEND_LIMIT = 10; // 설정 화면 "9/10" 카운터의 그 10

const alreadyFriendError = () => new AppError(409, "ALREADY_FRIEND", "이미 친구예요.");

export const friendService = {
  // 요청/수락 없는 즉시 친구 — 추가 성립 시 쌍방 2행을 한 트랜잭션으로 생성
  async addFriend(userId: string, friendLoginId: string) {
    const target = await userRepository.findByLoginId(friendLoginId);
    if (!target) throw new AppError(404, "USER_NOT_FOUND", "존재하지 않는 아이디예요.");
    if (target.id === userId) throw new AppError(400, "SELF_FRIEND", "자기 자신은 추가할 수 없어요.");

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.friendship.findUnique({
          where: { userId_friendId: { userId, friendId: target.id } },
        });
        if (existing) throw alreadyFriendError();

        // 양쪽 모두 10명 미만이어야 성립 — 에러 코드를 나눠 프론트 모달 문구가 갈리게 한다
        const mine = await tx.friendship.count({ where: { userId } });
        if (mine >= FRIEND_LIMIT) {
          throw new AppError(409, "FRIEND_LIMIT_ME", "내 친구가 가득 찼어요. (최대 10명)");
        }
        const theirs = await tx.friendship.count({ where: { userId: target.id } });
        if (theirs >= FRIEND_LIMIT) {
          throw new AppError(409, "FRIEND_LIMIT_TARGET", "상대방의 친구가 가득 찼어요.");
        }

        await tx.friendship.createMany({
          data: [
            { userId, friendId: target.id },
            { userId: target.id, friendId: userId },
          ],
        });
      });
    } catch (err) {
      // 동시 추가 race — 복합 PK 위반의 최종 방어선은 DB
      if (isUniqueViolation(err)) throw alreadyFriendError();
      throw err;
    }
    return { loginId: target.loginId };
  },

  async listFriends(userId: string) {
    const rows = await friendRepository.listByUser(userId);
    return {
      total: rows.length, // 설정 "9/10" 카운터용
      friends: rows.map((r) => ({ loginId: r.friend.loginId, createdAt: r.createdAt })),
    };
  },

  // 다중 삭제 — 전체 성공/전체 실패(트랜잭션): 부분 성공 상태를 만들지 않아 프론트 처리 단순화
  async removeFriends(userId: string, friendLoginIds: string[]) {
    const targets = await prisma.user.findMany({
      where: { loginId: { in: friendLoginIds } },
      select: { id: true },
    });
    if (targets.length !== friendLoginIds.length) {
      throw new AppError(404, "FRIEND_NOT_FOUND", "친구 목록에 없는 아이디가 포함돼 있어요.");
    }
    const targetIds = targets.map((t) => t.id);

    await prisma.$transaction(async (tx) => {
      const friendRows = await tx.friendship.count({
        where: { userId, friendId: { in: targetIds } },
      });
      if (friendRows !== targetIds.length) {
        throw new AppError(404, "FRIEND_NOT_FOUND", "친구 목록에 없는 아이디가 포함돼 있어요.");
      }
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { userId, friendId: { in: targetIds } },
            { userId: { in: targetIds }, friendId: userId },
          ],
        },
      });
    });
    return { deleted: targetIds.length };
  },

  // 친구의 서재 — 친구 관계 검증 후 유리병 목록 (계획서 §5: { owner, jars } 래핑)
  async getFriendJars(viewerId: string, friendLoginId: string) {
    const target = await userRepository.findByLoginId(friendLoginId);
    if (!target) throw new AppError(404, "USER_NOT_FOUND", "존재하지 않는 아이디예요.");

    if (target.id !== viewerId) {
      const friendship = await friendRepository.find(viewerId, target.id);
      if (!friendship) throw new AppError(403, "FORBIDDEN", "친구의 서재만 볼 수 있어요.");
    }

    const jars = await jarRepository.findManyByUser(target.id);
    return { owner: target.loginId, jars: jars.map(toJarResponse) };
  },
};
