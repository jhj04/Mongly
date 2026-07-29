import bcrypt from "bcryptjs";

// bcryptjs 채택: 네이티브 빌드가 없어 팀원 환경 어디서나 설치가 실패하지 않음.
// 순수 JS라 해싱이 이벤트 루프에서 돌지만, 이 서비스 규모(동시 수십 명)에선 수용
const BCRYPT_COST = 10;

// 미가입 이메일 로그인 시 비교할 더미 해시 — 존재하지 않는 계정도 bcrypt 1회를 돌려
// 응답 시간을 균일화한다(타이밍 기반 이메일 열거 완화). cost가 위와 같아야 시간이 맞다.
const DUMMY_HASH = bcrypt.hashSync("mongly-timing-equalizer", BCRYPT_COST);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** 미가입 계정에도 bcrypt를 태워 타이밍을 맞춘다 (결과는 항상 false) */
export function compareWithDummy(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, DUMMY_HASH);
}
