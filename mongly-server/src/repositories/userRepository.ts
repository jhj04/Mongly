import { prisma } from "../lib/prisma";

export const userRepository = {
  findByLoginId(loginId: string) {
    return prisma.user.findUnique({ where: { loginId } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: { loginId: string; passwordHash: string; termsAgreedAt: Date }) {
    return prisma.user.create({ data });
  },

  updateLoginId(id: string, loginId: string) {
    return prisma.user.update({ where: { id }, data: { loginId } });
  },

  updatePasswordHash(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  // Jar·JarEmotion·Friendship(양방향)은 스키마의 onDelete: Cascade가 정리 (계획서 §4)
  deleteById(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
