import { loginIdTakenError, wrongPasswordError } from "../lib/errors";
import { comparePassword, hashPassword } from "../lib/password";
import { lockUsers } from "../lib/locks";
import { prisma } from "../lib/prisma";
import { isUniqueViolation } from "../lib/prismaError";
import { userRepository } from "../repositories/userRepository";

async function assertCurrentPassword(userId: string, password: string) {
  const user = await userRepository.findById(userId);
  if (!user || !(await comparePassword(password, user.passwordHash))) throw wrongPasswordError();
}

export const userService = {
  async isLoginIdAvailable(loginId: string): Promise<boolean> {
    return !(await userRepository.findByLoginId(loginId));
  },

  async changeLoginId(userId: string, loginId: string) {
    // 자기 현재 아이디로의 변경은 그대로 성공하고, 타인 아이디면 P2002가 잡는다 — 사전 SELECT 불필요
    try {
      return await userRepository.updateLoginId(userId, loginId);
    } catch (err) {
      if (isUniqueViolation(err)) throw loginIdTakenError();
      throw err;
    }
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    await assertCurrentPassword(userId, currentPassword);
    await userRepository.updatePasswordHash(userId, await hashPassword(newPassword));
    // 기존 토큰 무효화는 하지 않음 — 7일 만료로 수용 (계획서 §7 명시적 결정)
  },

  async deleteAccount(userId: string, password: string) {
    await assertCurrentPassword(userId, password);
    await prisma.$transaction(async (tx) => {
      await lockUsers(tx, [userId]);
      // 동시 탈퇴도 성공. Jar·친구·좋아요·알림은 FK cascade로 함께 정리한다.
      await tx.user.deleteMany({ where: { id: userId } });
    });
  },
};
