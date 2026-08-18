import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { isForeignKeyViolation, isUniqueViolation } from "../lib/prismaError";
import { friendRepository } from "../repositories/friendRepository";
import { jarRepository } from "../repositories/jarRepository";
import { userRepository } from "../repositories/userRepository";
import { toJarResponse } from "./jarService";

export const FRIEND_LIMIT = 10; // 설정 화면 "9/10" 카운터의 그 10
export const REQUEST_INBOX_LIMIT = 20; // 한 사람이 받아둘 수 있는 대기 요청 상한 — 요청 스팸으로 알림함이 무한히 크는 것 방지

const alreadyFriendError = () => new AppError(409, "ALREADY_FRIEND", "이미 친구예요.");
const requestNotFoundError = () =>
  new AppError(404, "REQUEST_NOT_FOUND", "이미 처리됐거나 없는 요청이에요.");

// 친구 성립 — 쌍방 Friendship 2행 생성 + 대기 요청 정리를 한 트랜잭션으로.
// meId = 이 동작을 실행하는 사용자 (수락자 또는 맞요청 보낸 쪽) — FRIEND_LIMIT_ME/TARGET의 기준.
// consumeRequestId = 이 성립의 근거가 되는 대기 요청 — 트랜잭션 안에서 삭제(소비)하며,
//   이미 사라졌으면(동시 거절·상대 탈퇴) REQUEST_NOT_FOUND로 롤백해 "거절했는데 친구가 됨"을 막는다.
// 한도 초과로 실패하면 롤백되어 요청 행이 보존된다 — 친구를 비운 뒤 다시 수락 가능
async function establishFriendship(meId: string, otherId: string, consumeRequestId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // count 기반 한도 검사는 Read Committed에서 write skew로 뚫린다(동시 수락 2건이 모두 9<10 통과 → 11명).
      // 유저별 advisory lock을 정렬된 순서로 잡아 성립 경로를 직렬화한다 (트랜잭션 종료 시 자동 해제, 데드락 없음)
      const [first, second] = [meId, otherId].sort();
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${first}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${second}))`;

      const consumed = await tx.friendRequest.deleteMany({ where: { id: consumeRequestId } });
      if (consumed.count === 0) throw requestNotFoundError();

      const existing = await tx.friendship.findUnique({
        where: { userId_friendId: { userId: meId, friendId: otherId } },
      });
      if (existing) throw alreadyFriendError();

      // 양쪽 모두 10명 미만이어야 성립 — 에러 코드를 나눠 프론트 모달 문구가 갈리게 한다
      const mine = await tx.friendship.count({ where: { userId: meId } });
      if (mine >= FRIEND_LIMIT) {
        throw new AppError(409, "FRIEND_LIMIT_ME", "내 친구가 가득 찼어요. (최대 10명)");
      }
      const theirs = await tx.friendship.count({ where: { userId: otherId } });
      if (theirs >= FRIEND_LIMIT) {
        throw new AppError(409, "FRIEND_LIMIT_TARGET", "상대방의 친구가 가득 찼어요.");
      }

      await tx.friendship.createMany({
        data: [
          { userId: meId, friendId: otherId },
          { userId: otherId, friendId: meId },
        ],
      });
      // 맞요청(양방향 동시 요청)까지 함께 정리 — 성립 후 대기 요청이 남지 않는 불변식
      await tx.friendRequest.deleteMany({
        where: {
          OR: [
            { fromUserId: meId, toUserId: otherId },
            { fromUserId: otherId, toUserId: meId },
          ],
        },
      });
    });
  } catch (err) {
    // 동시 성립 race — 복합 PK 위반의 최종 방어선은 DB. 이미 친구가 됐으니 남은 요청 행만 정리
    if (isUniqueViolation(err) || (err instanceof AppError && err.code === "ALREADY_FRIEND")) {
      await prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { fromUserId: meId, toUserId: otherId },
            { fromUserId: otherId, toUserId: meId },
          ],
        },
      });
      throw alreadyFriendError();
    }
    // 상대 탈퇴와의 경합 — 유저가 cascade로 사라져 Friendship insert가 FK 위반(P2003).
    // 요청도 함께 사라졌으므로 "이미 처리된 요청"과 동일하게 404로 응답 (500 방지)
    if (isForeignKeyViolation(err)) throw requestNotFoundError();
    throw err;
  }
}

export const friendService = {
  // 친구 요청 보내기 — 설정 모달. 상대가 나에게 이미 요청해 둔 상태면 맞요청으로 보고 즉시 성립
  async sendRequest(userId: string, toLoginId: string) {
    const target = await userRepository.findByLoginId(toLoginId);
    if (!target) throw new AppError(404, "USER_NOT_FOUND", "존재하지 않는 아이디예요.");
    if (target.id === userId) {
      throw new AppError(400, "SELF_FRIEND", "자기 자신에게는 친구 요청을 보낼 수 없어요.");
    }
    if (await friendRepository.find(userId, target.id)) throw alreadyFriendError();

    // 내가 이미 가득이면 수락될 수 없는 요청 — 보내는 시점에 막는다 (상대 한도는 수락 시 판정)
    const mine = await prisma.friendship.count({ where: { userId } });
    if (mine >= FRIEND_LIMIT) {
      throw new AppError(409, "FRIEND_LIMIT_ME", "내 친구가 가득 찼어요. (최대 10명)");
    }

    // 맞요청 — 상대가 이미 나에게 보낸 대기 요청이 있으면 서로 원한 것이므로 수락과 동일하게 즉시 성립.
    // 참고: 이 경로는 establishFriendship을 타므로 상대 친구가 가득이면 FRIEND_LIMIT_TARGET이 여기서도 나온다 (API.md 문서화됨)
    const reverse = await prisma.friendRequest.findUnique({
      where: { fromUserId_toUserId: { fromUserId: target.id, toUserId: userId } },
    });
    if (reverse) {
      try {
        await establishFriendship(userId, target.id, reverse.id);
        return { loginId: target.loginId, status: "accepted" as const };
      } catch (err) {
        // 맞요청이 그 사이 사라진 경우(내가 다른 탭에서 거절 등) — 일반 요청 생성으로 폴백
        if (!(err instanceof AppError && err.code === "REQUEST_NOT_FOUND")) throw err;
      }
    }

    // 상대 알림함 상한 — 요청 스팸으로 종 아이콘 목록이 무한히 크는 것 방지
    const targetInbox = await prisma.friendRequest.count({ where: { toUserId: target.id } });
    if (targetInbox >= REQUEST_INBOX_LIMIT) {
      throw new AppError(409, "REQUEST_INBOX_FULL", "상대에게 대기 중인 요청이 가득 찼어요. 나중에 다시 시도해주세요.");
    }

    try {
      await prisma.friendRequest.create({ data: { fromUserId: userId, toUserId: target.id } });
    } catch (err) {
      // 더블클릭/동시 요청 race — 유니크 제약이 최종 방어선
      if (isUniqueViolation(err)) {
        throw new AppError(409, "REQUEST_ALREADY_SENT", "이미 친구 요청을 보냈어요.");
      }
      // 상대가 조회~생성 사이에 탈퇴한 경합 — 없는 아이디와 동일하게 응답 (500 방지)
      if (isForeignKeyViolation(err)) {
        throw new AppError(404, "USER_NOT_FOUND", "존재하지 않는 아이디예요.");
      }
      throw err;
    }
    return { loginId: target.loginId, status: "pending" as const };
  },

  // 종 아이콘 팝업 — 내가 받은 대기 요청 목록. total이 빨간 점 배지 값
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

  // 수락 — 받은 사람만. 성립하면 요청 행은 사라진다 (요청 소비는 establishFriendship 트랜잭션 안에서 재검증)
  async acceptRequest(userId: string, requestId: string) {
    const row = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: { from: { select: { loginId: true } } },
    });
    if (!row) throw requestNotFoundError();
    if (row.toUserId !== userId) {
      throw new AppError(403, "FORBIDDEN", "내가 받은 요청만 처리할 수 있어요.");
    }
    await establishFriendship(userId, row.fromUserId, row.id);
    return { loginId: row.from.loginId };
  },

  // 거절 — 받은 사람만. 요청 행 삭제, 상대는 다시 신청할 수 있다 (거절 사실은 상대에게 알리지 않음)
  async rejectRequest(userId: string, requestId: string) {
    const row = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!row) throw requestNotFoundError();
    if (row.toUserId !== userId) {
      throw new AppError(403, "FORBIDDEN", "내가 받은 요청만 처리할 수 있어요.");
    }
    // 동시 수락/거절 race — 이미 지워졌으면 404로 통일
    const { count } = await prisma.friendRequest.deleteMany({ where: { id: requestId } });
    if (count === 0) throw requestNotFoundError();
    return { ok: true };
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

  // 친구 탭 선반 — 친구마다 "가장 최근" 유리병 1개씩.
  // 유리병이 없는 친구는 jar: null → 프론트가 비활성(완성 안 한 친구) 슬롯으로 렌더
  async getFriendsLatestJars(userId: string) {
    const rows = await friendRepository.listByUser(userId);
    const jars = await jarRepository.findManyByUsers(rows.map((r) => r.friendId));

    // 최신순 정렬 상태이므로 유저별 처음 만나는 유리병이 최신
    const latestByUser = new Map<string, (typeof jars)[number]>();
    for (const jar of jars) {
      if (!latestByUser.has(jar.userId)) latestByUser.set(jar.userId, jar);
    }

    return {
      friends: rows.map((r) => {
        const latest = latestByUser.get(r.friendId);
        return { loginId: r.friend.loginId, jar: latest ? toJarResponse(latest) : null };
      }),
    };
  },
};
