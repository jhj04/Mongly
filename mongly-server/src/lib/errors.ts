// 에러 포맷 계약: { error: { code, message, details? } }
// 모든 에러 응답은 AppError를 throw(또는 next)해서 errorHandler 한 곳에서만 직렬화한다 —
// res.json({ error: ... })을 손으로 조립하지 말 것.
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

// 여러 곳에서 같은 코드/문구를 쓰는 에러는 팩토리로 단일화 (드리프트 방지)
export const loginIdTakenError = () => new AppError(409, "LOGIN_ID_TAKEN", "이미 사용 중인 닉네임이에요.");
export const emailTakenError = () => new AppError(409, "EMAIL_TAKEN", "이미 가입된 이메일이에요.");
// email·loginId 판별 불가(P2002 target 미상) 시 포괄 폴백 — 어느 쪽이든 사용자는 재입력하면 됨
export const signupConflictError = () =>
  new AppError(409, "SIGNUP_CONFLICT", "이미 사용 중인 이메일 또는 닉네임이에요.");

// 400인 이유: 프론트가 401을 전역 "로그인 만료"로 처리해도 로그인 상태가 풀리지 않게
export const wrongPasswordError = () => new AppError(400, "WRONG_PASSWORD", "비밀번호가 올바르지 않아요.");
