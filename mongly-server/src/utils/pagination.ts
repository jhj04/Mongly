import { AppError } from "../lib/errors";

const invalidCursor = () => new AppError(400, "VALIDATION", "올바른 페이지 커서를 보내주세요.", {
  fieldErrors: { cursor: ["올바른 페이지 커서를 보내주세요."] },
});

export function encodeCursor(payload: object): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/** Buffer의 관대한 base64 디코딩 대신 정규 base64url 문자열만 허용한다. */
export function decodeCursor(cursor: string): unknown {
  if (cursor.length === 0 || cursor.length > 512 || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
    throw invalidCursor();
  }
  try {
    const bytes = Buffer.from(cursor, "base64url");
    if (bytes.toString("base64url") !== cursor) throw invalidCursor();
    const value = bytes.toString("utf8");
    if (!Buffer.from(value, "utf8").equals(bytes)) throw invalidCursor();
    return JSON.parse(value) as unknown;
  } catch {
    throw invalidCursor();
  }
}

export function isRecordDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
