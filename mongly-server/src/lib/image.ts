import { AppError } from "./errors";

// 유리병 PNG 업로드 한도 — 프론트와의 합의값 (512~768px 캔버스 PNG 기준. 초과 시 413)
export const JAR_IMAGE_MAX_BYTES = 1_048_576; // 1MB

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const imageInvalidError = () =>
  new AppError(400, "IMAGE_INVALID", "이미지는 PNG(base64)만 업로드할 수 있어요.");

/**
 * 완성하기 요청의 image 필드(base64 또는 data URL)를 PNG Buffer로 디코드한다.
 * multipart 대신 base64 JSON을 쓰는 이유: requireJson의 CSRF 방어(JSON만 허용)를 유지하기 위함.
 * 실패 시 400 IMAGE_INVALID, 1MB 초과 시 413 IMAGE_TOO_LARGE.
 */
export function decodeJarImage(image: string): Buffer {
  // canvas.toDataURL() 그대로 보내도 되도록 data URL 접두어 허용
  const base64 = image.startsWith("data:")
    ? (image.match(/^data:image\/png;base64,(.*)$/s)?.[1] ?? "")
    : image;
  if (!base64) throw imageInvalidError();

  // base64 문자열 길이로 먼저 상한을 걸어 과대 입력의 디코드 비용 자체를 차단 (4/3 배 + 패딩)
  if (base64.length > (JAR_IMAGE_MAX_BYTES * 4) / 3 + 4) {
    throw new AppError(413, "IMAGE_TOO_LARGE", "이미지는 1MB 이하여야 해요.");
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(base64, "base64");
  } catch {
    throw imageInvalidError();
  }
  // Buffer.from은 잘못된 문자를 조용히 버리므로 왕복 비교로 유효성을 확정한다
  if (buf.length === 0 || buf.toString("base64").replace(/=+$/, "") !== base64.replace(/=+$/, "")) {
    throw imageInvalidError();
  }
  if (buf.length > JAR_IMAGE_MAX_BYTES) {
    throw new AppError(413, "IMAGE_TOO_LARGE", "이미지는 1MB 이하여야 해요.");
  }
  if (buf.length < PNG_MAGIC.length || !buf.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    throw imageInvalidError();
  }
  return buf;
}
