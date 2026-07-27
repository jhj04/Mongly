// 프론트와의 API 계약 문서 (/api/docs 에서 열람) — 모든 응답에 실제 예시 포함.
// 상세 문서: docs/API.md. API가 바뀌면 이 파일과 API.md를 같은 PR에서 함께 갱신할 것.

// 에러 응답 예시 헬퍼 — 공통 봉투 { error: { code, message, details? } }
const err = (description: string, code: string, message: string, details?: unknown) => ({
  description,
  content: {
    "application/json": {
      example: { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    },
  },
});

// 성공 응답 예시 헬퍼
const ok = (description: string, example: unknown) => ({
  description,
  content: { "application/json": { example } },
});

// 실제 서버 응답에서 가져온 예시 데이터 (2026-07-24 데모 계정 기준)
const JAR = {
  id: "cmryptsjw0002okx0zq8c04ij",
  recordDate: "2026-07-24",
  dominantEmotionId: 1,
  emotions: [
    { emotionId: 1, name: "분노", colorHex: "#F05B5B", count: 2 },
    { emotionId: 6, name: "슬픔", colorHex: "#4966B6", count: 1 },
    { emotionId: 9, name: "설렘", colorHex: "#FFD5E8", count: 1 },
  ],
};

const FRIEND_JAR = {
  id: "cmrypu70a0005okx0sla0k6un",
  recordDate: "2026-07-24",
  dominantEmotionId: 3,
  emotions: [
    { emotionId: 3, name: "행복", colorHex: "#FFD54A", count: 3 },
    { emotionId: 5, name: "평온", colorHex: "#7ED9F8", count: 2 },
  ],
};

const EMOTIONS = [
  { id: 1, name: "분노", colorHex: "#F05B5B", sortOrder: 1 },
  { id: 2, name: "기쁨", colorHex: "#FF9D4D", sortOrder: 2 },
  { id: 3, name: "행복", colorHex: "#FFD54A", sortOrder: 3 },
  { id: 4, name: "희망", colorHex: "#B7E66B", sortOrder: 4 },
  { id: 5, name: "평온", colorHex: "#7ED9F8", sortOrder: 5 },
  { id: 6, name: "슬픔", colorHex: "#4966B6", sortOrder: 6 },
  { id: 7, name: "불안", colorHex: "#9B7AE5", sortOrder: 7 },
  { id: 8, name: "사랑", colorHex: "#FF78AE", sortOrder: 8 },
  { id: 9, name: "설렘", colorHex: "#FFD5E8", sortOrder: 9 },
  { id: 10, name: "무덤덤", colorHex: "#A9B0B8", sortOrder: 10 },
];

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Mongly API",
    version: "0.3.0",
    description:
      "몽글리 백엔드. 에러 포맷: { error: { code, message, details? } } — 모달 분기는 message가 아닌 code로. " +
      "인증: httpOnly 쿠키(mongly_token) — 로그인/회원가입을 Try it out으로 실행하면 쿠키가 저장되어 이후 🔒 API가 동작. " +
      "상태 변경 요청은 Content-Type: application/json 필수. 상세 문서: docs/API.md",
  },
  tags: [
    { name: "인증", description: "회원가입·로그인·세션" },
    { name: "계정", description: "설정 탭 — 아이디/비밀번호/탈퇴" },
    { name: "유리병", description: "몽글리 탭·서재 탭 — 감정 기록" },
    { name: "친구", description: "친구 탭·설정 탭 — 친구 관리와 친구 서재" },
    { name: "기타", description: "헬스체크" },
  ],
  paths: {
    "/api/auth/signup": {
      post: {
        tags: ["인증"],
        summary: "회원가입 — 성공 시 자동 로그인(쿠키 발급, 재로그인 불필요)",
        requestBody: {
          content: {
            "application/json": {
              example: { loginId: "데모몽글리", password: "demo12345", termsAgreed: true },
            },
          },
        },
        responses: {
          "201": ok("가입 완료 + 쿠키 발급", { loginId: "데모몽글리" }),
          "400": err("형식 오류/약관 미동의", "VALIDATION", "요청 형식이 올바르지 않아요.", {
            formErrors: [],
            fieldErrors: { password: ["비밀번호는 8자 이상이어야 해요."] },
          }),
          "409": err("아이디 중복", "LOGIN_ID_TAKEN", "이미 사용 중인 아이디예요."),
          "429": err("분당 5회 초과", "RATE_LIMITED", "잠시 후 다시 시도해주세요."),
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["인증"],
        summary: "로그인 (분당 10회 제한)",
        requestBody: {
          content: { "application/json": { example: { loginId: "데모몽글리", password: "demo12345" } } },
        },
        responses: {
          "200": ok("성공 + 쿠키 발급", { loginId: "데모몽글리" }),
          "401": err("인증 실패 — 아이디 존재 여부 미노출", "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않아요."),
          "429": err("분당 10회 초과", "RATE_LIMITED", "잠시 후 다시 시도해주세요."),
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["인증"],
        summary: "로그아웃 — 인증 불필요: 만료된 세션에서도 항상 성공",
        responses: { "200": ok("쿠키 삭제", { ok: true }) },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["인증"],
        summary: "현재 로그인 사용자 🔒 — 앱 부팅 시 세션 확인",
        responses: {
          "200": ok("로그인 상태", { loginId: "데모몽글리" }),
          "401": err("비로그인/만료/탈퇴 → 로그인 화면으로", "UNAUTHORIZED", "로그인이 필요해요."),
        },
      },
    },

    "/api/users/check-login-id": {
      get: {
        tags: ["계정"],
        summary: "아이디 중복 확인 (분당 30회) — 회원가입·아이디 수정 공용",
        parameters: [
          { name: "loginId", in: "query", required: true, schema: { type: "string" }, example: "데모몽글리" },
        ],
        responses: {
          "200": ok("사용 가능 여부", { available: false }),
          "400": err("아이디 형식 오류(2~16자 한글/영문/숫자)", "VALIDATION", "요청 형식이 올바르지 않아요."),
        },
      },
    },
    "/api/users/me/login-id": {
      patch: {
        tags: ["계정"],
        summary: "아이디 수정 🔒 — 서버가 유니크 최종 재검증",
        requestBody: { content: { "application/json": { example: { loginId: "새몽글리" } } } },
        responses: {
          "200": ok("변경 완료", { loginId: "새몽글리" }),
          "409": err("중복 → '이미 사용 중인 아이디예요' 표시", "LOGIN_ID_TAKEN", "이미 사용 중인 아이디예요."),
        },
      },
    },
    "/api/users/me/password": {
      patch: {
        tags: ["계정"],
        summary: "비밀번호 변경 🔒 (currentPassword는 열린 문제 ① — 결정 대기)",
        requestBody: {
          content: {
            "application/json": { example: { currentPassword: "demo12345", newPassword: "newpass123" } },
          },
        },
        responses: {
          "200": ok("변경 완료 (기존 로그인 유지)", { ok: true }),
          "400": err("현재 비밀번호 불일치 — 401이 아니므로 전역 로그아웃 처리에 안 걸림", "WRONG_PASSWORD", "비밀번호가 올바르지 않아요."),
        },
      },
    },
    "/api/users/me": {
      delete: {
        tags: ["계정"],
        summary: "계정 삭제 🔒 — 유리병·친구 관계 전부 삭제 + 쿠키 삭제",
        requestBody: { content: { "application/json": { example: { password: "demo12345" } } } },
        responses: {
          "200": ok("삭제 완료", { ok: true }),
          "400": err("비밀번호 불일치", "WRONG_PASSWORD", "비밀번호가 올바르지 않아요."),
        },
      },
    },

    "/api/emotions": {
      get: {
        tags: ["유리병"],
        summary: "감정 팔레트 10종 — 렌더링·색 조합의 원천 (인증 불필요, 앱 시작 시 1회 로드)",
        responses: { "200": ok("감정 마스터", { emotions: EMOTIONS }) },
      },
    },
    "/api/jars/today": {
      get: {
        tags: ["유리병"],
        summary: "오늘(KST)의 유리병 🔒 — 몽글리 탭 진입 시 확인. 프론트에서 날짜 비교 금지",
        responses: {
          "200": ok("있으면 유리병, 없으면 { jar: null } → 만들기 화면 진입", { jar: JAR }),
        },
      },
    },
    "/api/jars": {
      post: {
        tags: ["유리병"],
        summary: "완료하기 🔒 — 감정 합계 1~7개(같은 감정은 count로). 날짜·id는 서버가 생성",
        requestBody: {
          content: {
            "application/json": {
              example: {
                emotions: [
                  { emotionId: 1, count: 2 },
                  { emotionId: 6, count: 1 },
                  { emotionId: 9, count: 1 },
                ],
              },
            },
          },
        },
        responses: {
          "201": ok("생성된 유리병 — 이 응답의 id를 상세/삭제에 사용", JAR),
          "400": err("형식 오류(합계 0 또는 8+, 같은 감정 중복 행) / 없는 감정(INVALID_EMOTION)", "VALIDATION", "감정은 1~7개, 같은 감정은 count로 합쳐서 보내주세요."),
          "409": err("오늘 이미 완성 — 서재 가득(JAR_LIMIT)이면 details.jars에 현재 7개 목록 포함", "JAR_ALREADY_TODAY", "오늘의 유리병은 이미 완성했어요."),
        },
      },
      get: {
        tags: ["유리병"],
        summary: "서재 🔒 — 내 유리병 목록 (최대 7개, 날짜 내림차순). 각 항목의 id로 상세/삭제",
        responses: { "200": ok("유리병 목록", { jars: [JAR] }) },
      },
    },
    "/api/jars/{id}": {
      get: {
        tags: ["유리병"],
        summary: "유리병 상세 🔒 — 캐릭터 보기/감정 구성 보기. 본인 또는 친구만",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, example: JAR.id },
        ],
        responses: {
          "200": ok("유리병 (dominantEmotionId: 최다 감정, 동률이면 null)", JAR),
          "403": err("친구 아님", "FORBIDDEN", "친구의 유리병만 볼 수 있어요."),
          "404": err("없는 유리병", "JAR_NOT_FOUND", "존재하지 않는 유리병이에요."),
        },
      },
      delete: {
        tags: ["유리병"],
        summary: "삭제하기 🔒 — 본인만. id는 서재 목록 응답에서 받은 값",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, example: JAR.id },
        ],
        responses: {
          "200": ok("삭제 완료", { ok: true }),
          "403": err("본인 아님", "FORBIDDEN", "내 유리병만 삭제할 수 있어요."),
          "404": err("없는 유리병", "JAR_NOT_FOUND", "존재하지 않는 유리병이에요."),
        },
      },
    },

    "/api/friends": {
      post: {
        tags: ["친구"],
        summary: "친구 추가 🔒 (분당 10회) — 정확한 아이디 입력, 쌍방 즉시 성립",
        requestBody: { content: { "application/json": { example: { friendLoginId: "데모친구" } } } },
        responses: {
          "201": ok("성립", { loginId: "데모친구" }),
          "400": err("자기 자신", "SELF_FRIEND", "자기 자신은 추가할 수 없어요."),
          "404": err("없는 아이디", "USER_NOT_FOUND", "존재하지 않는 아이디예요."),
          "409": err("이미 친구 / 내 한도(FRIEND_LIMIT_ME) / 상대 한도(FRIEND_LIMIT_TARGET) — 최대 10명", "ALREADY_FRIEND", "이미 친구예요."),
        },
      },
      get: {
        tags: ["친구"],
        summary: "친구 목록 🔒 — total은 설정 '9/10' 카운터용 (최대 10명, 페이지네이션 없음)",
        responses: {
          "200": ok("목록", {
            total: 1,
            friends: [{ loginId: "데모친구", createdAt: "2026-07-24T09:06:24.070Z" }],
          }),
        },
      },
      delete: {
        tags: ["친구"],
        summary: "친구 다중 삭제 🔒 — 전체 성공/전체 실패, 쌍방 해제 ('OO님 외 2명 삭제' 모달)",
        requestBody: {
          content: { "application/json": { example: { friendLoginIds: ["데모친구", "허수현"] } } },
        },
        responses: {
          "200": ok("삭제 완료", { deleted: 2 }),
          "404": err("친구 아닌 아이디 포함 — 아무것도 삭제되지 않음", "FRIEND_NOT_FOUND", "친구 목록에 없는 아이디가 포함돼 있어요."),
        },
      },
    },
    "/api/friends/jars": {
      get: {
        tags: ["친구"],
        summary: "친구 탭 선반 🔒 (분당 30회) — 친구마다 '최신' 유리병 1개씩. 클릭 시 GET /jars/:id로 캐릭터 보기",
        responses: {
          "200": ok("친구별 최신 유리병 — 유리병 없는 친구는 jar: null (비활성 슬롯으로 렌더)", {
            friends: [
              { loginId: "데모친구", jar: FRIEND_JAR },
              { loginId: "허수현", jar: null },
            ],
          }),
        },
      },
    },

    "/api/health": {
      get: {
        tags: ["기타"],
        summary: "헬스체크 — DB SELECT 1 포함 (배포 모니터링용)",
        responses: { "200": ok("정상", { ok: true, db: "up" }) },
      },
    },
  },
} as const;
