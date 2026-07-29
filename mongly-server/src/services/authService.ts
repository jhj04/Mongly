import { AppError, emailTakenError, loginIdTakenError, signupConflictError } from "../lib/errors";
import { compareWithDummy, comparePassword, hashPassword } from "../lib/password";
import { isUniqueViolation, uniqueViolationTarget } from "../lib/prismaError";
import { userRepository } from "../repositories/userRepository";

const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않아요.");

export const authService = {
  async signup(input: { email: string; loginId: string; password: string }) {
    // 중복 방어는 DB 유니크 제약 + P2002 catch 한 곳으로 충분하다 (사전 SELECT는 중복 쿼리라 제거)
    const passwordHash = await hashPassword(input.password);
    try {
      return await userRepository.create({
        email: input.email,
        loginId: input.loginId,
        passwordHash,
        termsAgreedAt: new Date(),
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        const target = uniqueViolationTarget(err);
        if (target === "email") throw emailTakenError();
        if (target === "loginId") throw loginIdTakenError();
        throw signupConflictError(); // 판별 불가 시 포괄 폴백 (email/loginId 어느 쪽이든 재입력 유도)
      }
      throw err;
    }
  },

  async login(input: { email: string; password: string }) {
    const user = await userRepository.findByEmail(input.email);
    // 미가입 이메일에도 더미 bcrypt를 태워 응답 시간을 균일화(타이밍 열거 완화),
    // 이메일 존재 여부가 응답 차이로 새지 않도록 메시지도 통일한다
    const valid = user
      ? await comparePassword(input.password, user.passwordHash)
      : await compareWithDummy(input.password);
    if (!user || !valid) throw invalidCredentials();
    return user;
  },
};
