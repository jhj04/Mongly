import bcrypt from "bcryptjs";

// bcryptjs 채택: 네이티브 빌드가 없어 팀원 환경 어디서나 설치가 실패하지 않음.
// 순수 JS라 해싱이 이벤트 루프에서 돌지만, 이 서비스 규모(동시 수십 명)에선 수용 (검증된 트레이드오프)
const BCRYPT_COST = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
