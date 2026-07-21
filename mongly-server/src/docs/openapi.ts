// 프론트와의 API 계약 문서 (/api/docs 에서 열람).
// 기능을 구현할 때마다 paths에 추가한다 — 상세 명세는 Mongly_백엔드_개발계획서_최종.md §5 참조.
export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Mongly API",
    version: "0.1.0",
    description: "몽글리 감정 기록 서비스 백엔드. 에러 포맷: { error: { code, message, details? } }",
  },
  paths: {
    "/api/health": {
      get: {
        summary: "헬스체크 (DB SELECT 1 포함)",
        responses: {
          "200": {
            description: "정상",
            content: { "application/json": { example: { ok: true, db: "up" } } },
          },
        },
      },
    },
  },
} as const;
