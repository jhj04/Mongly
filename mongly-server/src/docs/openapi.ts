// 프론트와의 API 계약 문서 (/api/docs 에서 열람).
// 기능을 구현할 때마다 paths에 추가한다 — 상세 명세는 Mongly_백엔드_개발계획서_최종.md §5 참조.

const errorExample = (code: string, message: string) => ({
  "application/json": { example: { error: { code, message } } },
});

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Mongly API",
    version: "0.2.0",
    description:
      "몽글리 백엔드. 에러 포맷: { error: { code, message, details? } }. " +
      "인증: httpOnly 쿠키(mongly_token) — 프론트는 Next rewrites 프록시 경유로 자동 전송. " +
      "상태 변경 요청은 Content-Type: application/json 필수(아니면 415).",
  },
  paths: {
    "/api/health": {
      get: {
        summary: "헬스체크 (DB SELECT 1 포함)",
        responses: {
          "200": { description: "정상", content: { "application/json": { example: { ok: true, db: "up" } } } },
        },
      },
    },
    "/api/auth/signup": {
      post: {
        summary: "회원가입 — 성공 시 자동 로그인(쿠키 발급)",
        requestBody: {
          content: {
            "application/json": {
              example: { loginId: "몽글리", password: "password123", termsAgreed: true },
            },
          },
        },
        responses: {
          "201": { description: "가입 완료", content: { "application/json": { example: { loginId: "몽글리" } } } },
          "400": { description: "형식 오류/약관 미동의 (VALIDATION) 또는 깨진 JSON (INVALID_BODY)" },
          "409": { description: "아이디 중복", content: errorExample("LOGIN_ID_TAKEN", "이미 사용 중인 아이디예요.") },
          "429": { description: "요청 과다 (RATE_LIMITED, 분당 5회)" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "로그인 (분당 10회 제한)",
        requestBody: {
          content: { "application/json": { example: { loginId: "몽글리", password: "password123" } } },
        },
        responses: {
          "200": { description: "성공, 쿠키 발급", content: { "application/json": { example: { loginId: "몽글리" } } } },
          "401": { description: "인증 실패", content: errorExample("INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않아요.") },
          "429": { description: "요청 과다 (RATE_LIMITED)" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        summary: "로그아웃 (쿠키 삭제) — 인증 불필요: 만료된 세션에서도 항상 성공",
        responses: { "200": { description: "{ ok: true }" } },
      },
    },
    "/api/auth/me": {
      get: {
        summary: "현재 로그인 사용자 🔒 — 프론트 부팅 시 세션 확인",
        responses: {
          "200": { description: "로그인 상태", content: { "application/json": { example: { loginId: "몽글리" } } } },
          "401": { description: "비로그인/만료/탈퇴 (UNAUTHORIZED)" },
        },
      },
    },
    "/api/users/check-login-id": {
      get: {
        summary: "아이디 중복 확인 (분당 30회 제한) — 가입·아이디 수정 공용",
        parameters: [{ name: "loginId", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "확인 결과", content: { "application/json": { example: { available: true } } } },
          "400": { description: "아이디 형식 오류 (VALIDATION)" },
        },
      },
    },
    "/api/users/me/login-id": {
      patch: {
        summary: "아이디 수정 🔒 — 서버가 최종 유니크 재검증",
        requestBody: { content: { "application/json": { example: { loginId: "새몽글리" } } } },
        responses: {
          "200": { description: "변경 완료", content: { "application/json": { example: { loginId: "새몽글리" } } } },
          "409": { description: "중복", content: errorExample("LOGIN_ID_TAKEN", "이미 사용 중인 아이디예요.") },
        },
      },
    },
    "/api/users/me/password": {
      patch: {
        summary: "비밀번호 변경 🔒 (currentPassword는 열린 문제 ① — 결정 대기)",
        requestBody: {
          content: { "application/json": { example: { currentPassword: "password123", newPassword: "newpass123" } } },
        },
        responses: {
          "200": { description: "{ ok: true }" },
          "400": { description: "현재 비밀번호 불일치", content: errorExample("WRONG_PASSWORD", "비밀번호가 올바르지 않아요.") },
        },
      },
    },
    "/api/users/me": {
      delete: {
        summary: "계정 삭제 🔒 — 비밀번호 확인, 유리병·친구 관계 Cascade 삭제",
        requestBody: { content: { "application/json": { example: { password: "password123" } } } },
        responses: {
          "200": { description: "{ ok: true } + 쿠키 삭제" },
          "400": { description: "비밀번호 불일치 (WRONG_PASSWORD)" },
        },
      },
    },
    "/api/emotions": {
      get: {
        summary: "감정 마스터 10종 — 팔레트 렌더링·색 조합의 원천 데이터",
        responses: {
          "200": {
            description: "감정 목록",
            content: {
              "application/json": {
                example: { emotions: [{ id: 1, name: "분노", colorHex: "#F05B5B", sortOrder: 1 }] },
              },
            },
          },
        },
      },
    },
    "/api/jars": {
      post: {
        summary: "완료하기 🔒 — 감정 합계 1~7개(중복은 count), recordDate는 서버가 KST로 계산",
        requestBody: {
          content: {
            "application/json": {
              example: { emotions: [{ emotionId: 6, count: 1 }, { emotionId: 1, count: 2 }] },
            },
          },
        },
        responses: {
          "201": {
            description: "유리병 생성",
            content: {
              "application/json": {
                example: {
                  id: "clx8f...",
                  recordDate: "2026-09-14",
                  dominantEmotionId: 1,
                  emotions: [
                    { emotionId: 1, name: "분노", colorHex: "#F05B5B", count: 2 },
                    { emotionId: 6, name: "슬픔", colorHex: "#4966B6", count: 1 },
                  ],
                },
              },
            },
          },
          "400": { description: "형식 오류(VALIDATION) / 없는 감정(INVALID_EMOTION)" },
          "409": {
            description:
              "오늘 이미 완성(JAR_ALREADY_TODAY) / 서재 가득(JAR_LIMIT — details.jars에 현재 7개 목록)",
          },
        },
      },
      get: {
        summary: "서재 🔒 — 내 유리병 목록 (최대 7개, 날짜 내림차순, 감정 포함)",
        responses: {
          "200": { description: "{ jars: [유리병...] }" },
        },
      },
    },
    "/api/jars/today": {
      get: {
        summary: "오늘(KST)의 유리병 🔒 — 몽글리 탭 진입 시 확인, 없으면 null",
        responses: { "200": { description: "{ jar: 유리병 | null }" } },
      },
    },
    "/api/jars/{id}": {
      get: {
        summary: "유리병 상세 🔒 — 캐릭터 보기/감정 구성 보기. 본인 또는 친구만",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "유리병 (dominantEmotionId 포함)" },
          "403": { description: "친구 아님 (FORBIDDEN)" },
          "404": { description: "없는 유리병 (JAR_NOT_FOUND)" },
        },
      },
      delete: {
        summary: "삭제하기 🔒 — 본인만",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "{ ok: true }" },
          "403": { description: "본인 아님 (FORBIDDEN)" },
          "404": { description: "없는 유리병 (JAR_NOT_FOUND)" },
        },
      },
    },
  },
} as const;
