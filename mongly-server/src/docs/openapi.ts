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

// 실제 서버 응답 형태 기준 예시 데이터 (감정 10종은 2026-08-17 합의 목록)
const JAR = {
  id: "cms5vyadq0002okckkilawdcs",
  recordDate: "2026-08-17",
  dominantEmotionId: 3,
  emotions: [
    { emotionId: 2, name: "슬픔", colorHex: "#4966B6", count: 1 },
    { emotionId: 3, name: "분노", colorHex: "#F05B5B", count: 2 },
  ],
  imageUrl: "/api/jars/cms5vyadq0002okckkilawdcs/image",
};

// 담는 중 드래프트 — 유리병과 형태 동일(단 id·recordDate·imageUrl 없고 total 있음). 빈 병이면 total 0
const DRAFT = {
  total: 2,
  dominantEmotionId: 3,
  emotions: [{ emotionId: 3, name: "분노", colorHex: "#F05B5B", count: 2 }],
};

const FRIEND_JAR = {
  id: "cms5vyenk0005okckvt3h5c5q",
  recordDate: "2026-08-17",
  dominantEmotionId: null,
  emotions: [
    { emotionId: 1, name: "기쁨", colorHex: "#FFD54A", count: 1 },
    { emotionId: 4, name: "놀람", colorHex: "#7ED9F8", count: 1 },
  ],
  imageUrl: "/api/jars/cms5vyenk0005okckvt3h5c5q/image",
};

const EMOTIONS = [
  { id: 1, name: "기쁨", colorHex: "#FFD54A", sortOrder: 1 },
  { id: 2, name: "슬픔", colorHex: "#4966B6", sortOrder: 2 },
  { id: 3, name: "분노", colorHex: "#F05B5B", sortOrder: 3 },
  { id: 4, name: "놀람", colorHex: "#7ED9F8", sortOrder: 4 },
  { id: 5, name: "불안", colorHex: "#9B7AE5", sortOrder: 5 },
  { id: 6, name: "사랑", colorHex: "#FF78AE", sortOrder: 6 },
  { id: 7, name: "짜증", colorHex: "#FF9D4D", sortOrder: 7 },
  { id: 8, name: "설렘", colorHex: "#FFD5E8", sortOrder: 8 },
  { id: 9, name: "후회", colorHex: "#A9B0B8", sortOrder: 9 },
  { id: 10, name: "희망", colorHex: "#B7E66B", sortOrder: 10 },
];

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Mongly API",
    version: "0.5.0",
    description:
      "몽글리 백엔드. 에러 포맷: { error: { code, message, details? } } — 모달 분기는 message가 아닌 code로. " +
      "로그인은 이메일+비밀번호(닉네임=loginId는 친구 추가 키·표시명). " +
      "인증: httpOnly 쿠키(mongly_token) — 로그인/회원가입을 Try it out으로 실행하면 쿠키가 저장되어 이후 🔒 API가 동작. " +
      "감정 담기는 드래그 1회 = POST /jars/draft/emotions(즉시 저장), 되돌리기 = DELETE, " +
      "완성 = POST /jars에 프론트가 렌더한 유리병 PNG(base64)를 담아 확정 — 이미지는 GET /jars/:id/image로 서빙. " +
      "친구는 요청 → 수락으로 성립(종 아이콘 알림). 상세: docs/API.md",
  },
  tags: [
    { name: "인증", description: "이메일 회원가입·로그인·세션" },
    { name: "계정", description: "설정 탭 — 닉네임/비밀번호/탈퇴" },
    { name: "유리병", description: "몽글리 탭 — 드래그로 담기/되돌리기/완성(PNG 포함), 서재" },
    { name: "친구", description: "친구 탭·설정 탭·종 아이콘 — 친구 요청/수락과 친구 서재" },
    { name: "기타", description: "헬스체크" },
  ],
  paths: {
    "/api/auth/signup": {
      post: {
        tags: ["인증"],
        summary: "회원가입 (이메일+닉네임+비밀번호+약관) — 성공 시 자동 로그인(쿠키 발급)",
        requestBody: {
          content: {
            "application/json": {
              example: { email: "demo@mongly.app", loginId: "데모몽글리", password: "demo12345", termsAgreed: true },
            },
          },
        },
        responses: {
          "201": ok("가입 완료 + 쿠키 발급", { email: "demo@mongly.app", loginId: "데모몽글리" }),
          "400": err("형식 오류/약관 미동의", "VALIDATION", "요청 형식이 올바르지 않아요."),
          "409": err("이메일 중복(EMAIL_TAKEN) / 닉네임 중복(LOGIN_ID_TAKEN)", "EMAIL_TAKEN", "이미 가입된 이메일이에요."),
          "429": err("분당 5회 초과", "RATE_LIMITED", "잠시 후 다시 시도해주세요."),
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["인증"],
        summary: "로그인 (이메일+비밀번호, 분당 10회). 이메일은 대소문자·공백 무시",
        requestBody: {
          content: { "application/json": { example: { email: "demo@mongly.app", password: "demo12345" } } },
        },
        responses: {
          "200": ok("성공 + 쿠키 발급", { email: "demo@mongly.app", loginId: "데모몽글리" }),
          "401": err("이메일/비밀번호 불일치 (존재 여부 미노출)", "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않아요."),
          "429": err("분당 10회 초과", "RATE_LIMITED", "잠시 후 다시 시도해주세요."),
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["인증"],
        summary: "로그아웃 (쿠키 삭제) — 인증 불필요: 만료된 세션에서도 항상 성공",
        responses: { "200": ok("쿠키 삭제", { ok: true }) },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["인증"],
        summary: "현재 로그인 사용자 🔒 — 앱 부팅 시 세션 확인",
        responses: {
          "200": ok("로그인 상태", { email: "demo@mongly.app", loginId: "데모몽글리" }),
          "401": err("비로그인/만료/탈퇴 → 로그인 화면으로", "UNAUTHORIZED", "로그인이 필요해요."),
        },
      },
    },

    "/api/users/check-login-id": {
      get: {
        tags: ["계정"],
        summary: "닉네임 중복 확인 (분당 30회) — 회원가입·닉네임 수정 공용 (이메일 중복확인은 없음)",
        parameters: [
          { name: "loginId", in: "query", required: true, schema: { type: "string" }, example: "데모몽글리" },
        ],
        responses: {
          "200": ok("사용 가능 여부", { available: false }),
          "400": err("닉네임 형식 오류(2~16자 한글/영문/숫자)", "VALIDATION", "요청 형식이 올바르지 않아요."),
        },
      },
    },
    "/api/users/me/login-id": {
      patch: {
        tags: ["계정"],
        summary: "닉네임 수정 🔒 — 서버가 유니크 최종 재검증",
        requestBody: { content: { "application/json": { example: { loginId: "새몽글리" } } } },
        responses: {
          "200": ok("변경 완료", { loginId: "새몽글리" }),
          "409": err("중복", "LOGIN_ID_TAKEN", "이미 사용 중인 닉네임이에요."),
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
        summary: "오늘(KST) 상태 🔒 — 몽글리 탭 진입 1회 호출. 완성본 or 담는 중 드래프트",
        responses: {
          "200": ok(
            "완성 전이면 { jar:null, draft:{...} }, 완성 후면 { jar:{...}, draft:null }. 빈 병이면 draft.total=0",
            { jar: null, draft: DRAFT },
          ),
        },
      },
    },
    "/api/jars/draft/emotions": {
      post: {
        tags: ["유리병"],
        summary: "드래그 1회 = 감정 담기 🔒 (즉시 DB 저장). 응답 = 갱신된 드래프트 전체",
        requestBody: { content: { "application/json": { example: { emotionId: 1 } } } },
        responses: {
          "201": ok("갱신된 드래프트", DRAFT),
          "400": err("없는 감정", "INVALID_EMOTION", "존재하지 않는 감정이에요."),
          "409": err("7개 다 담음(DRAFT_FULL) / 오늘 이미 완성(JAR_ALREADY_TODAY)", "DRAFT_FULL", "감정은 최대 7개까지 담을 수 있어요."),
        },
      },
      delete: {
        tags: ["유리병"],
        summary: "되돌리기 🔒 — 마지막 담은 감정 1개 제거. 응답 = 갱신된 드래프트",
        responses: {
          "200": ok("갱신된 드래프트 (빈 병이면 total 0)", { total: 1, dominantEmotionId: 3, emotions: [{ emotionId: 3, name: "분노", colorHex: "#F05B5B", count: 1 }] }),
          "409": err("되돌릴 감정이 없음", "DRAFT_EMPTY", "되돌릴 감정이 없어요."),
        },
      },
    },
    "/api/jars": {
      post: {
        tags: ["유리병"],
        summary:
          "완성하기 🔒 — 서버 드래프트를 확정 + 프론트가 렌더한 유리병 PNG 저장. image는 canvas.toDataURL('image/png') 값(순수 base64도 허용), 원본 1MB 이하",
        requestBody: {
          content: {
            "application/json": {
              example: { image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...(생략)" },
            },
          },
        },
        responses: {
          "201": ok("생성된 유리병 — 이 id를 상세/삭제/이미지에 사용. 드래프트는 비워짐", JAR),
          "400": err(
            "담은 감정이 없음(DRAFT_EMPTY) / image 누락(VALIDATION) / PNG가 아니거나 base64 오류(IMAGE_INVALID)",
            "IMAGE_INVALID",
            "이미지는 PNG(base64)만 업로드할 수 있어요.",
          ),
          "409": err(
            "오늘 이미 완성(JAR_ALREADY_TODAY) / 서재 가득(JAR_LIMIT — details.jars에 현재 7개, 드래프트는 보존)",
            "JAR_LIMIT",
            "서재가 가득 찼어요. 유리병을 비우고 다시 담아주세요.",
            { jars: [JAR] },
          ),
          "413": err("원본 1MB 초과", "IMAGE_TOO_LARGE", "이미지는 1MB 이하여야 해요."),
        },
      },
      get: {
        tags: ["유리병"],
        summary: "서재 🔒 — 내 유리병 목록 (최대 7개, 날짜 내림차순). 각 항목의 id로 상세/삭제",
        responses: { "200": ok("유리병 목록", { jars: [JAR] }) },
      },
    },
    "/api/jars/{id}/image": {
      get: {
        tags: ["유리병"],
        summary:
          "유리병 PNG 🔒 — 서재·친구 탭 렌더용. 본인 또는 친구만. 응답은 image/png 바이너리 (1시간 캐시 + ETag 재검증 — 재검증 시 접근 제어 재실행)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, example: JAR.id }],
        responses: {
          "200": {
            description: "PNG 바이너리 (Cache-Control: private, max-age=3600)",
            content: { "image/png": { schema: { type: "string", format: "binary" } } },
          },
          "403": err("친구 아님", "FORBIDDEN", "친구의 유리병만 볼 수 있어요."),
          "404": err("없는 유리병(JAR_NOT_FOUND) / 이미지 없음(IMAGE_NOT_FOUND — 정상 경로에선 발생 안 함)", "JAR_NOT_FOUND", "존재하지 않는 유리병이에요."),
        },
      },
    },
    "/api/jars/{id}": {
      get: {
        tags: ["유리병"],
        summary: "유리병 상세 🔒 — 캐릭터 보기/감정 구성 보기. 본인 또는 친구만",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, example: JAR.id }],
        responses: {
          "200": ok("유리병", JAR),
          "403": err("친구 아님", "FORBIDDEN", "친구의 유리병만 볼 수 있어요."),
          "404": err("없는 유리병", "JAR_NOT_FOUND", "존재하지 않는 유리병이에요."),
        },
      },
      delete: {
        tags: ["유리병"],
        summary: "삭제하기 🔒 — 본인만",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, example: JAR.id }],
        responses: {
          "200": ok("삭제 완료", { ok: true }),
          "403": err("본인 아님", "FORBIDDEN", "내 유리병만 삭제할 수 있어요."),
          "404": err("없는 유리병", "JAR_NOT_FOUND", "존재하지 않는 유리병이에요."),
        },
      },
    },

    "/api/friend-requests": {
      post: {
        tags: ["친구"],
        summary:
          "친구 요청 보내기 🔒 (분당 10회) — 설정 모달. 정확한 닉네임 입력. 상대가 이미 나에게 요청해 뒀으면 즉시 성립(status: accepted)",
        requestBody: { content: { "application/json": { example: { toLoginId: "데모친구" } } } },
        responses: {
          "201": ok("요청 생성(pending) 또는 맞요청 즉시 성립(accepted)", { loginId: "데모친구", status: "pending" }),
          "400": err("자기 자신", "SELF_FRIEND", "자기 자신에게는 친구 요청을 보낼 수 없어요."),
          "404": err("없는 닉네임", "USER_NOT_FOUND", "존재하지 않는 아이디예요."),
          "409": err(
            "이미 친구(ALREADY_FRIEND) / 이미 요청 보냄(REQUEST_ALREADY_SENT) / 상대 알림함 20건 가득(REQUEST_INBOX_FULL) / 내 한도(FRIEND_LIMIT_ME) / 맞요청 즉시 성립 경로에서 상대 한도(FRIEND_LIMIT_TARGET)",
            "REQUEST_ALREADY_SENT",
            "이미 친구 요청을 보냈어요.",
          ),
        },
      },
      get: {
        tags: ["친구"],
        summary: "받은 친구 요청 목록 🔒 — 종 아이콘 팝업. total이 빨간 점 배지 값 (0이면 점 없음)",
        responses: {
          "200": ok("대기 중인 받은 요청 (최신순)", {
            total: 1,
            requests: [
              { id: "cmsreq0001okck", fromLoginId: "데모친구", createdAt: "2026-08-17T09:00:00.000Z" },
            ],
          }),
        },
      },
    },
    "/api/friend-requests/{id}/accept": {
      post: {
        tags: ["친구"],
        summary: "친구 요청 수락 🔒 — 받은 사람만. 쌍방 친구 성립, 요청은 사라짐",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, example: "cmsreq0001okck" }],
        responses: {
          "200": ok("성립 — 새 친구 닉네임", { loginId: "데모친구" }),
          "403": err("내가 받은 요청이 아님", "FORBIDDEN", "내가 받은 요청만 처리할 수 있어요."),
          "404": err("이미 처리됐거나 없는 요청", "REQUEST_NOT_FOUND", "이미 처리됐거나 없는 요청이에요."),
          "409": err(
            "내 한도(FRIEND_LIMIT_ME) / 상대 한도(FRIEND_LIMIT_TARGET) — 요청은 보존되므로 친구를 비운 뒤 다시 수락 가능 / 이미 친구(ALREADY_FRIEND)",
            "FRIEND_LIMIT_ME",
            "내 친구가 가득 찼어요. (최대 10명)",
          ),
        },
      },
    },
    "/api/friend-requests/{id}/reject": {
      post: {
        tags: ["친구"],
        summary: "친구 요청 거절 🔒 — 받은 사람만. 요청 삭제 (상대에게 알리지 않음, 재신청 가능)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, example: "cmsreq0001okck" }],
        responses: {
          "200": ok("거절 완료", { ok: true }),
          "403": err("내가 받은 요청이 아님", "FORBIDDEN", "내가 받은 요청만 처리할 수 있어요."),
          "404": err("이미 처리됐거나 없는 요청", "REQUEST_NOT_FOUND", "이미 처리됐거나 없는 요청이에요."),
        },
      },
    },
    "/api/friends": {
      get: {
        tags: ["친구"],
        summary: "친구 목록 🔒 — total은 설정 '9/10' 카운터용 (최대 10명, 페이지네이션 없음)",
        responses: {
          "200": ok("목록", {
            total: 1,
            friends: [{ loginId: "데모친구", createdAt: "2026-07-29T09:06:24.070Z" }],
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
          "404": err("친구 아닌 닉네임 포함 — 아무것도 삭제되지 않음", "FRIEND_NOT_FOUND", "친구 목록에 없는 아이디가 포함돼 있어요."),
        },
      },
    },
    "/api/friends/jars": {
      get: {
        tags: ["친구"],
        summary: "친구 탭 선반 🔒 (분당 30회) — 친구마다 '최신' 유리병 1개씩. 클릭 시 GET /jars/:id",
        responses: {
          "200": ok("친구별 최신 유리병 — 유리병 없는 친구는 jar: null (비활성 슬롯)", {
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
