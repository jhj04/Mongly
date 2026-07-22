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
export const loginIdTakenError = () => new AppError(409, "LOGIN_ID_TAKEN", "이미 사용 중인 아이디예요.");

// 400인 이유: 프론트가 401을 전역 "로그인 만료"로 처리해도 로그인 상태가 풀리지 않게
export const wrongPasswordError = () => new AppError(400, "WRONG_PASSWORD", "비밀번호가 올바르지 않아요.");
