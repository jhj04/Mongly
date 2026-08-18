import { z } from "zod";

// 완성하기 — 프론트가 캔버스를 toDataURL("image/png")로 내보낸 값 (data URL 또는 순수 base64).
// 여기서는 "문자열이 왔는가"만 검증하고, PNG 여부·1MB 한도는 lib/image.decodeJarImage가
// 전용 코드(IMAGE_INVALID / IMAGE_TOO_LARGE)로 판정한다 — 프론트 모달 분기가 code로 갈리므로
export const completeJarSchema = z.object({
  image: z.string({ required_error: "유리병 이미지가 필요해요." }).min(1, "유리병 이미지가 필요해요."),
});
