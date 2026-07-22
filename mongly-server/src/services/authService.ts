import { AppError, loginIdTakenError } from "../lib/errors";
import { comparePassword, hashPassword } from "../lib/password";
import { isUniqueViolation } from "../lib/prismaError";
import { userRepository } from "../repositories/userRepository";

export const authService = {
  async signup(input: { loginId: string; password: string }) {
    // 중복 방어는 DB 유니크 제약 + P2002 catch 한 곳으로 충분하다 (사전 SELECT는 중복 쿼리라 제거)
    const passwordHash = await hashPassword(input.password);
    try {
      return await userRepository.create({
        loginId: input.loginId,
        passwordHash,
        termsAgreedAt: new Date(),
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw loginIdTakenError();
      throw err;
    }
  },

  async login(input: { loginId: string; password: string }) {
    const user = await userRepository.findByLoginId(input.loginId);
    // 아이디 존재 여부가 응답 차이로 새지 않도록 메시지를 통일한다
    if (!user || !(await comparePassword(input.password, user.passwordHash))) {
      throw new AppError(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않아요.");
    }
    return user;
  },
};
