import jwt from "jsonwebtoken";

// 7일 만료 단일 토큰 (액세스/리프레시 이중 토큰은 과설계로 배제 — 계획서 §7)
const EXPIRES_IN = "7d";

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET 환경변수가 설정되지 않았어요.");
  return s;
}

export function signAuthToken(userId: string): string {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: EXPIRES_IN });
}

/** 유효하면 userId, 아니면 null (만료·위조 모두 null) */
export function verifyAuthToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, secret());
    return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
