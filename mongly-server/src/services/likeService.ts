import { AppError } from "../lib/errors";
import { lockUsers } from "../lib/locks";
import { prisma } from "../lib/prisma";
import { likeRepository } from "../repositories/likeRepository";
import { notificationRepository } from "../repositories/notificationRepository";

const jarNotFound = () => new AppError(404, "JAR_NOT_FOUND", "존재하지 않는 유리병이에요.");

export const likeService = {
  async setLike(userId: string, jarId: string, isActive: boolean) {
    const initial = await prisma.jar.findUnique({ where: { id: jarId }, select: { userId: true } });
    if (!initial) throw jarNotFound();
    return prisma.$transaction(async (tx) => {
      await lockUsers(tx, [userId, initial.userId]);
      const jar = await tx.jar.findUnique({ where: { id: jarId }, select: { userId: true } });
      if (!jar) throw jarNotFound();
      if (jar.userId === userId) {
        throw new AppError(400, "SELF_LIKE_NOT_ALLOWED", "내 유리병에는 좋아요를 누를 수 없어요.");
      }
      const friendship = await tx.friendship.findUnique({
        where: { userId_friendId: { userId, friendId: jar.userId } },
      });
      if (!friendship) throw new AppError(403, "FORBIDDEN", "친구의 유리병에만 좋아요를 누를 수 있어요.");

      const existing = await likeRepository.find(jarId, userId, tx);
      if (!existing && isActive) {
        const like = await tx.jarLike.create({ data: { jarId, userId } });
        await notificationRepository.createLike(jar.userId, like.id, tx);
      } else if (existing) {
        if (existing.isActive !== isActive) {
          await tx.jarLike.update({ where: { id: existing.id }, data: { isActive } });
        }
        // 상태 행은 재알림 방지 이력이다. 취소 시 알림만 삭제하고, 재등록 때 복원하지 않는다.
        if (!isActive) await notificationRepository.deleteForLike(existing.id, tx);
      }
      return { jarId, likedByMe: isActive, likeCount: await likeRepository.countActive(jarId, tx) };
    });
  },
};
