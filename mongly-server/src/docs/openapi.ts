// 프런트 연동 API 계약. docs/API.md와 함께 갱신하고 npm run docs:generate로 JSON을 내보낸다.
// Examples are illustrative; recordDate/canEdit depend on the server's current KST day.
type Schema = Record<string, unknown>;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const object = (properties: Record<string, Schema>, required = Object.keys(properties)) => ({
  type: "object", properties, ...(required.length > 0 ? { required } : {}),
});
const array = (items: Schema) => ({ type: "array", items });
const string = { type: "string" };
const id = { type: "string", minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9_-]+$", description: "불투명 ID" };
const date = { type: "string", format: "date", description: "서버 KST 날짜 YYYY-MM-DD" };
const dateTime = { type: "string", format: "date-time", description: "UTC ISO 8601" };
const count = { type: "integer", minimum: 0 };
const bool = { type: "boolean" };
const loginId = { type: "string", pattern: "^[가-힣a-zA-Z0-9]{2,16}$", minLength: 2, maxLength: 16 };
const nullableCursor = { type: "string", nullable: true, description: "다음 페이지가 없으면 null. 재사용 시 URL 인코딩하고 내용을 해석하지 않는다." };

const ok = (description: string, schema: string, example: unknown) => ({
  description, content: { "application/json": { schema: ref(schema), example } },
});
const err = (description: string, code: string, message: string, details?: unknown) => ({
  description,
  content: {
    "application/json": {
      schema: ref("ErrorResponse"),
      example: { error: { code, message, ...(details === undefined ? {} : { details }) } },
    },
  },
});
const body = (schema: string, example: unknown, required = true) => ({
  required, content: { "application/json": { schema: ref(schema), example } },
});
const idParameter = (description: string, example: string) => ({
  name: "id", in: "path", required: true, schema: id, description, example,
});
const pageParameters = (defaultLimit: number, cursorDescription: string) => [
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: defaultLimit }, description: "정수 1~50. 저장 총량 한도가 아님" },
  { name: "cursor", in: "query", schema: { type: "string", minLength: 1, maxLength: 512 }, description: cursorDescription },
];
const unauthenticated = { "401": err("비로그인·만료·탈퇴 세션", "UNAUTHORIZED", "로그인이 필요해요.") };
const validation = { "400": err("본문·쿼리 형식 오류 (VALIDATION)", "VALIDATION", "요청 형식이 올바르지 않아요.") };
const rateLimited = { "429": err("요청 한도 초과", "RATE_LIMITED", "잠시 후 다시 시도해주세요.") };
const jarMissing = { "404": err("병 없음·삭제됨", "JAR_NOT_FOUND", "존재하지 않는 유리병이에요.") };
const noBody = "요청 본문 없음. Content-Type도 생략 가능.";

const JAR = {
  id: "cmjar0001", recordDate: "2026-09-24", note: "발표를 무사히 마쳐서 후련했다.",
  createdAt: "2026-09-24T10:00:00.000Z", updatedAt: "2026-09-24T10:00:00.000Z", version: 1,
  canEdit: true, canLike: false, likeCount: 0, likedByMe: false, dominantEmotionId: 1,
  emotions: [
    { emotionId: 1, name: "기쁨", colorHex: "#FFD54A", count: 2 },
    { emotionId: 6, name: "사랑", colorHex: "#FF78AE", count: 1 },
  ],
};
const FRIEND_JAR = { ...JAR, id: "cmjar0002", note: null, canEdit: false, canLike: true, likeCount: 1, likedByMe: true };
const DRAFT = { total: 2, dominantEmotionId: 1, emotions: [{ emotionId: 1, name: "기쁨", colorHex: "#FFD54A", count: 2 }] };
const EMPTY_DRAFT = { total: 0, dominantEmotionId: null, emotions: [] };
const LIKE_NOTIFICATION = {
  id: "cmnotification0002", type: "JAR_LIKED", actor: { loginId: "데모친구" },
  target: { type: "JAR", id: JAR.id, recordDate: JAR.recordDate },
  createdAt: "2026-09-24T10:20:00.000Z", readAt: null,
};
const REQUEST_NOTIFICATION = {
  id: "cmnotification0001", type: "FRIEND_REQUEST", actor: { loginId: "새친구" },
  target: { type: "FRIEND_REQUEST", id: "cmrequest0001" },
  createdAt: "2026-09-24T09:00:00.000Z", readAt: "2026-09-24T09:05:00.000Z",
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
const jarSchema = object({
  id, recordDate: date, note: ref("Note"), createdAt: dateTime, updatedAt: dateTime,
  version: { type: "integer", minimum: 1, description: "실제 note/감정 변경마다 증가. 좋아요/읽음/no-op으로 변하지 않음" },
  canEdit: { ...bool, description: "조회 시 본인이면서 KST 오늘 기록. 저장 시 날짜·권한 재검사" },
  canLike: { ...bool, description: "현재 친구의 병이면 true, 본인 병은 false" },
  likeCount: count, likedByMe: bool,
  dominantEmotionId: { type: "integer", minimum: 1, nullable: true, description: "최다 감정. 동률이면 null" },
  emotions: { ...array(ref("JarEmotion")), minItems: 1, maxItems: 7, description: "emotionId 고유, count 합계 1~7" },
});
const draftSchema = object({
  total: { type: "integer", minimum: 0, maximum: 7 },
  dominantEmotionId: { type: "integer", minimum: 1, nullable: true },
  emotions: { ...array(ref("JarEmotion")), maxItems: 7 },
});
const notificationFields = {
  id, actor: object({ loginId }), createdAt: dateTime,
  readAt: { ...dateTime, nullable: true, description: "미읽음은 null. 최초 읽음 시각을 계속 유지" },
};

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Mongly API", version: "0.6.0",
    description:
      "2026-09-24 계약. 선택 50 grapheme 일기(본인·현재 친구 공개), KST 오늘 병 편집, 무제한 보관/페이지 조회, " +
      "친구 좋아요, FRIEND_REQUEST/JAR_LIKED 통합 알림. 오류는 {error:{code,message,details?}}. " +
      "httpOnly mongly_token 쿠키 인증. 같은 출처 /api/*로 호출. 상태 변경 본문은 application/json. " +
      "기록당 구슬 1~7개·KST 날짜당 병 1개·친구 10명은 유지. 최신 상세 및 변경 안내는 docs/API.md, docs/API_CHANGES_2026-09-24.md.",
  },
  security: [{ cookieAuth: [] }],
  tags: [
    { name: "인증", description: "이메일 가입·로그인·쿠키 세션" },
    { name: "계정", description: "닉네임·비밀번호·탈퇴" },
    { name: "유리병", description: "드래프트·완성·KST 오늘 편집·보관함" },
    { name: "좋아요", description: "친구 병 반응: 멱등 PUT/DELETE, 최초 좋아요만 알림" },
    { name: "친구", description: "요청·수락·거절·관계 해제·친구별 최신 병" },
    { name: "알림", description: "실제 Notification 행을 통한 통합 목록·개별 읽음·배지. 친구 요청 읽음은 수락이 아님" },
    { name: "기타", description: "헬스체크" },
  ],
  components: {
    securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: "mongly_token", description: "로그인/가입으로 발급되는 httpOnly 쿠키" } },
    schemas: {
      ErrorResponse: object({ error: object({ code: string, message: string, details: {} }, ["code", "message"]) }),
      Ok: object({ ok: { type: "boolean", enum: [true] } }),
      SessionUser: object({ email: { type: "string", format: "email" }, loginId }),
      LoginIdResponse: object({ loginId }),
      AvailableResponse: object({ available: bool }),
      SignupInput: object({ email: { type: "string", format: "email", maxLength: 254 }, loginId,
        password: { type: "string", minLength: 8, description: "UTF-8 72바이트 이하" }, termsAgreed: { type: "boolean", enum: [true] } }),
      LoginInput: object({ email: { type: "string", minLength: 1 }, password: { type: "string", minLength: 1 } }),
      LoginIdInput: object({ loginId }),
      PasswordInput: object({ currentPassword: { type: "string", minLength: 1 }, newPassword: { type: "string", minLength: 8, description: "UTF-8 72바이트 이하" } }),
      DeleteAccountInput: object({ password: { type: "string", minLength: 1 } }),
      Note: {
        type: "string", nullable: true, "x-grapheme-max-length": 50, "x-utf8-max-bytes": 2048,
        description: "선택 한 줄 일반 텍스트. 제어문자/개행을 trim 전에 거부, NFC 정규화 후 trim, 빈 값은 null. 최대 50 grapheme(중간 공백 포함), 정규화 전후 UTF-8 2048바이트 이하. 문자열 maxLength와 다른 기준. 본인과 현재 친구에게 공개하며 공개 설정 없음.",
        example: "오늘은 생각보다 잘 해냈다.",
      },
      Emotion: object({ id: { type: "integer", minimum: 1 }, name: string, colorHex: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" }, sortOrder: { type: "integer" } }),
      EmotionList: object({ emotions: array(ref("Emotion")) }),
      JarEmotion: object({ emotionId: { type: "integer", minimum: 1 }, name: string, colorHex: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" }, count: { type: "integer", minimum: 1, maximum: 7 } }),
      Jar: { ...jarSchema, description: "본인/친구 목록·상세·완료·수정 공통 응답. viewer에 따라 권한·likedByMe만 달라진다." },
      Draft: draftSchema,
      TodayState: {
        oneOf: [
          object({ jar: { type: "object", nullable: true, enum: [null] }, draft: ref("Draft") }),
          object({ jar: ref("Jar"), draft: { type: "object", nullable: true, enum: [null] } }),
        ],
        description: "완료 전 jar=null/draft=Draft, 완료 후 jar=Jar/draft=null",
      },
      DraftEmotionInput: object({ emotionId: { type: "integer", minimum: 1 } }),
      CompleteJarInput: { ...object({ note: ref("Note") }, []), additionalProperties: false, description: "본문 생략과 {}도 허용. 감정은 서버 드래프트 사용" },
      EditEmotionInput: { ...object({ emotionId: { type: "integer", minimum: 1, maximum: 2147483647 }, count: { type: "integer", minimum: 1, maximum: 7 } }), additionalProperties: false },
      EditJarInput: {
        ...object({
          expectedVersion: { type: "integer", minimum: 1, maximum: 2147483647 }, note: ref("Note"),
          emotions: { ...array(ref("EditEmotionInput")), minItems: 1, maxItems: 7, description: "전체 대체. emotionId 고유, count 합계 1~7. 기존 비활성 감정은 기존 count 이하만 허용" },
        }, ["expectedVersion"]),
        additionalProperties: false,
        anyOf: [{ required: ["note"] }, { required: ["emotions"] }],
        description: "note 또는 emotions 하나 이상 필수. note 생략=유지, null=지우기. 버전 일치 확인 후 내용이 같으면 no-op",
      },
      JarPage: object({ jars: array(ref("Jar")), nextCursor: nullableCursor, hasMore: bool }),
      LikeState: object({ jarId: id, likeCount: count, likedByMe: bool }),
      FriendRequestInput: object({ toLoginId: loginId }),
      FriendRequestResult: object({ loginId, status: { type: "string", enum: ["pending", "accepted"] } }),
      ReceivedFriendRequest: object({ id, fromLoginId: loginId, createdAt: dateTime }),
      ReceivedFriendRequests: object({ total: count, requests: array(ref("ReceivedFriendRequest")) }),
      Friend: object({ loginId, createdAt: dateTime }),
      FriendList: object({ total: count, friends: { ...array(ref("Friend")), maxItems: 10 } }),
      RemoveFriendsInput: object({ friendLoginIds: { ...array(loginId), minItems: 1, maxItems: 10, uniqueItems: true } }),
      RemovedFriends: object({ deleted: count }),
      FriendJar: object({ loginId, jar: { ...jarSchema, nullable: true } }),
      FriendJars: object({ friends: { ...array(ref("FriendJar")), maxItems: 10 } }),
      JarLikedNotification: object({
        ...notificationFields, type: { type: "string", enum: ["JAR_LIKED"] },
        target: object({ type: { type: "string", enum: ["JAR"] }, id, recordDate: date }),
      }),
      FriendRequestNotification: object({
        ...notificationFields, type: { type: "string", enum: ["FRIEND_REQUEST"] },
        target: object({ type: { type: "string", enum: ["FRIEND_REQUEST"] }, id }),
      }),
      Notification: {
        oneOf: [ref("JarLikedNotification"), ref("FriendRequestNotification")],
        discriminator: { propertyName: "type", mapping: { JAR_LIKED: "#/components/schemas/JarLikedNotification", FRIEND_REQUEST: "#/components/schemas/FriendRequestNotification" } },
      },
      NotificationPage: object({ notifications: array(ref("Notification")), nextCursor: nullableCursor, hasMore: bool }),
      ReadNotification: object({ id, readAt: dateTime }),
      NotificationSummary: object({
        unreadLikeCount: { ...count, description: "readAt=null인 JAR_LIKED 알림 수" },
        pendingFriendRequestCount: { ...count, description: "읽음 여부와 관계없는 미처리 받은 친구 요청 수" },
        badgeCount: { ...count, description: "unreadLikeCount + pendingFriendRequestCount" },
      }),
      Health: object({ ok: { type: "boolean", enum: [true] }, db: { type: "string", enum: ["up"] } }),
    },
  },
  paths: {
    "/api/auth/signup": { post: {
      tags: ["인증"], security: [], summary: "회원가입·자동 로그인",
      requestBody: body("SignupInput", { email: "demo@mongly.app", loginId: "데모몽글리", password: "demo12345", termsAgreed: true }),
      responses: { "201": ok("가입 완료 + 쿠키 발급", "SessionUser", { email: "demo@mongly.app", loginId: "데모몽글리" }), ...validation,
        "409": err("EMAIL_TAKEN / LOGIN_ID_TAKEN / SIGNUP_CONFLICT", "EMAIL_TAKEN", "이미 가입된 이메일이에요."), ...rateLimited },
    } },
    "/api/auth/login": { post: {
      tags: ["인증"], security: [], summary: "이메일 로그인 (IP당 분당 10회)",
      description: "이메일 trim·소문자 정규화. 계정 존재 여부를 노출하지 않는다.",
      requestBody: body("LoginInput", { email: "demo@mongly.app", password: "demo12345" }),
      responses: { "200": ok("로그인 + 쿠키 발급", "SessionUser", { email: "demo@mongly.app", loginId: "데모몽글리" }), ...validation,
        "401": err("자격증명 실패", "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않아요."), ...rateLimited },
    } },
    "/api/auth/logout": { post: {
      tags: ["인증"], security: [], summary: "로그아웃", description: `${noBody} 만료 세션에서도 성공.`,
      responses: { "200": ok("쿠키 삭제", "Ok", { ok: true }) },
    } },
    "/api/auth/me": { get: {
      tags: ["인증"], summary: "현재 로그인 사용자",
      responses: { "200": ok("세션", "SessionUser", { email: "demo@mongly.app", loginId: "데모몽글리" }), ...unauthenticated },
    } },
    "/api/users/check-login-id": { get: {
      tags: ["계정"], security: [], summary: "닉네임 사용 가능 여부 (IP당 분당 30회)",
      parameters: [{ name: "loginId", in: "query", required: true, schema: loginId, example: "데모몽글리" }],
      responses: { "200": ok("확인 결과", "AvailableResponse", { available: true }), ...validation, ...rateLimited },
    } },
    "/api/users/me/login-id": { patch: {
      tags: ["계정"], summary: "닉네임 변경", requestBody: body("LoginIdInput", { loginId: "새몽글리" }),
      responses: { "200": ok("변경 결과", "LoginIdResponse", { loginId: "새몽글리" }), ...validation, ...unauthenticated,
        "409": err("닉네임 중복", "LOGIN_ID_TAKEN", "이미 사용 중인 닉네임이에요.") },
    } },
    "/api/users/me/password": { patch: {
      tags: ["계정"], summary: "현재 비밀번호로 비밀번호 변경",
      requestBody: body("PasswordInput", { currentPassword: "demo12345", newPassword: "newpass123" }),
      responses: { "200": ok("변경 완료", "Ok", { ok: true }), ...unauthenticated,
        "400": err("VALIDATION / WRONG_PASSWORD. WRONG_PASSWORD는 로그아웃 사유가 아님", "WRONG_PASSWORD", "비밀번호가 올바르지 않아요.") },
    } },
    "/api/users/me": { delete: {
      tags: ["계정"], summary: "계정 삭제", description: "병·요청·관계·좋아요·알림 정리 및 쿠키 삭제.",
      requestBody: body("DeleteAccountInput", { password: "demo12345" }),
      responses: { "200": ok("탈퇴 완료", "Ok", { ok: true }), ...unauthenticated,
        "400": err("VALIDATION / WRONG_PASSWORD", "WRONG_PASSWORD", "비밀번호가 올바르지 않아요.") },
    } },
    "/api/emotions": { get: {
      tags: ["유리병"], security: [], summary: "활성 감정 팔레트",
      responses: { "200": ok("렌더링 원천 감정 목록", "EmotionList", { emotions: EMOTIONS }) },
    } },
    "/api/jars/today": { get: {
      tags: ["유리병"], summary: "서버 KST 오늘 상태",
      responses: { "200": {
        description: "완료 전 Draft 또는 완료 후 Jar. jar/draft 중 정확히 하나가 null.",
        content: { "application/json": { schema: ref("TodayState"), examples: {
          empty: { value: { jar: null, draft: EMPTY_DRAFT } },
          draft: { value: { jar: null, draft: DRAFT } },
          completed: { value: { jar: JAR, draft: null } },
        } } },
      }, ...unauthenticated },
    } },
    "/api/jars/draft/emotions": {
      post: {
        tags: ["유리병"], summary: "감정 구슬 1개 즉시 저장", description: "프런트는 담기·되돌리기 요청을 직렬화한다.",
        requestBody: body("DraftEmotionInput", { emotionId: 1 }),
        responses: { "201": ok("갱신된 전체 드래프트", "Draft", DRAFT), ...unauthenticated,
          "400": err("VALIDATION / INVALID_EMOTION", "INVALID_EMOTION", "존재하지 않는 감정이에요."),
          "409": err("DRAFT_FULL / JAR_ALREADY_TODAY", "DRAFT_FULL", "감정은 최대 7개까지 담을 수 있어요.") },
      },
      delete: {
        tags: ["유리병"], summary: "마지막 구슬 1개 되돌리기", description: noBody,
        responses: { "200": ok("갱신된 전체 드래프트", "Draft", EMPTY_DRAFT), ...unauthenticated,
          "409": err("되돌릴 구슬 없음", "DRAFT_EMPTY", "되돌릴 감정이 없어요.") },
      },
    },
    "/api/jars": {
      post: {
        tags: ["유리병"], summary: "드래프트와 선택 일기로 오늘 병 완성",
        description: "본문 생략/{} /note:null 허용. 감정은 서버 드래프트에서 읽는다. 기존 병은 개수와 무관하게 보존. 응답 유실 시 GET /jars/today로 확인하며 재호출은 기존 내용을 덮어쓰지 않는다.",
        requestBody: body("CompleteJarInput", { note: "발표를 무사히 마쳐서 후련했다." }, false),
        responses: { "201": ok("병·일기 저장, 드래프트 정리", "Jar", JAR), ...unauthenticated,
          "400": err("VALIDATION / DRAFT_EMPTY. 검증 실패 시 드래프트 보존", "DRAFT_EMPTY", "담은 감정이 없어요."),
          "409": err("JAR_ALREADY_TODAY / 비정상 드래프트의 DRAFT_FULL", "JAR_ALREADY_TODAY", "오늘의 유리병은 이미 완성했어요.") },
      },
      get: {
        tags: ["유리병"], summary: "내 보관함 페이지 (저장 총량 무제한)",
        description: "recordDate 내림차순. 기본 limit=7, 최대50. total은 제공하지 않는다. nextCursor=null이면 마지막. 커서 병이 삭제되어도 날짜 경계로 이동 가능. 최신 기록은 첫 페이지 재조회.",
        parameters: pageParameters(7, "응답 nextCursor를 그대로 재전송. 버전·recordDate를 인코딩한 불투명 문자열"),
        responses: { "200": ok("내 병 페이지", "JarPage", { jars: [JAR], nextCursor: null, hasMore: false }), ...validation, ...unauthenticated },
      },
    },
    "/api/jars/{id}": {
      parameters: [idParameter("병 ID", JAR.id)],
      get: {
        tags: ["유리병"], summary: "병 상세 (본인 또는 현재 친구)", description: "친구의 과거 병도 ID로 열람 가능. note를 포함한 공통 Jar.",
        responses: { "200": ok("병 상세", "Jar", JAR), ...validation, ...unauthenticated, ...jarMissing,
          "403": err("본인·친구 아님", "FORBIDDEN", "친구의 유리병만 볼 수 있어요.") },
      },
      patch: {
        tags: ["유리병"], summary: "작성자의 KST 오늘 병 감정·일기 편집",
        description: "expectedVersion 필수, note/emotions 중 하나 이상. emotions는 전체 대체(고유 emotionId, count 합1~7). 잠금 후 서버 날짜·권한 재검사. 버전 불일치는 내용이 같아도409. 일치하고 정규화된 내용이 같으면 no-op으로 version/updatedAt 유지. 실제 수정 시 둘만 갱신하며 ID/recordDate/createdAt/좋아요/알림 보존. 기존 비활성 감정은 기존 수량 이하만 허용.",
        requestBody: body("EditJarInput", { expectedVersion: 1, note: "저녁에는 친구들과 함께 쉬었다.", emotions: [{ emotionId: 1, count: 2 }, { emotionId: 6, count: 1 }] }),
        responses: { "200": ok("수정본 또는 동일 내용 원본", "Jar", { ...JAR, note: "저녁에는 친구들과 함께 쉬었다.", version: 2, updatedAt: "2026-09-24T10:15:00.000Z" }), ...unauthenticated, ...jarMissing,
          "400": err("VALIDATION / INVALID_EMOTION", "VALIDATION", "요청 형식이 올바르지 않아요."),
          "403": err("작성자 아님", "FORBIDDEN", "내 유리병만 수정할 수 있어요."),
          "409": {
            description: "JAR_VERSION_CONFLICT(최신 상세 재조회) / JAR_EDIT_WINDOW_CLOSED(KST 자정 경과 포함)",
            content: { "application/json": { schema: ref("ErrorResponse"), examples: {
              conflict: { value: { error: { code: "JAR_VERSION_CONFLICT", message: "다른 곳에서 기록이 수정됐어요. 최신 기록을 다시 확인해주세요.", details: { currentVersion: 2 } } } },
              closed: { value: { error: { code: "JAR_EDIT_WINDOW_CLOSED", message: "오늘의 유리병만 수정할 수 있어요." } } },
            } } },
          },
        },
      },
      delete: {
        tags: ["유리병"], summary: "본인 병 삭제", description: `${noBody} 병의 좋아요·연결 알림도 삭제.`,
        responses: { "200": ok("삭제 완료", "Ok", { ok: true }), ...validation, ...unauthenticated, ...jarMissing,
          "403": err("작성자 아님", "FORBIDDEN", "내 유리병만 삭제할 수 있어요.") },
      },
    },
    "/api/jars/{id}/like": {
      parameters: [idParameter("현재 친구의 병 ID (과거 병도 가능)", FRIEND_JAR.id)],
      put: {
        tags: ["좋아요"], summary: "좋아요 설정 (멱등)",
        description: `${noBody} 설정+취소 합산 사용자ID당 분당60회. 최초 사용자/병 상태 생성 때만 알림1개. 반복PUT은 중복 없음. 취소 후 재좋아요는 활성 수만 증가하고 알림 재생성 안 함. 친구 해제로 이력이 삭제된 뒤 재친구가 되면 새 첫 좋아요.`,
        responses: { "200": ok("서버 확정 좋아요 상태", "LikeState", { jarId: FRIEND_JAR.id, likeCount: 1, likedByMe: true }), ...unauthenticated, ...jarMissing, ...rateLimited,
          "400": err("잘못된 ID의 VALIDATION / 본인 병의 SELF_LIKE_NOT_ALLOWED", "SELF_LIKE_NOT_ALLOWED", "내 유리병에는 좋아요를 누를 수 없어요."),
          "403": err("현재 친구 아님", "FORBIDDEN", "친구의 유리병에만 좋아요를 누를 수 있어요.") },
      },
      delete: {
        tags: ["좋아요"], summary: "좋아요 취소 (멱등)",
        description: `${noBody} 설정+취소 합산 사용자ID당 분당60회. 알림도 삭제. 최초 알림 이력은 유지하므로 재좋아요 알림 없음. 이미 취소/이력 없는 경우도200.`,
        responses: { "200": ok("서버 확정 좋아요 상태", "LikeState", { jarId: FRIEND_JAR.id, likeCount: 0, likedByMe: false }), ...unauthenticated, ...jarMissing, ...rateLimited,
          "400": err("잘못된 ID의 VALIDATION / 본인 병의 SELF_LIKE_NOT_ALLOWED", "SELF_LIKE_NOT_ALLOWED", "내 유리병에는 좋아요를 누를 수 없어요."),
          "403": err("현재 친구 아님", "FORBIDDEN", "친구의 유리병에만 좋아요를 누를 수 있어요.") },
      },
    },
    "/api/friend-requests": {
      post: {
        tags: ["친구"], summary: "친구 요청 보내기 (IP당 분당10회)",
        description: "pending 요청과 FRIEND_REQUEST 알림을 생성. 상대가 이미 요청했다면 맞요청 즉시 성립(status:accepted)하며 대기 요청·연결 알림 정리.",
        requestBody: body("FriendRequestInput", { toLoginId: "데모친구" }),
        responses: { "201": ok("요청 또는 맞요청 성립", "FriendRequestResult", { loginId: "데모친구", status: "pending" }), ...unauthenticated, ...rateLimited,
          "400": err("VALIDATION / SELF_FRIEND", "SELF_FRIEND", "자기 자신에게는 친구 요청을 보낼 수 없어요."),
          "404": err("닉네임 없음", "USER_NOT_FOUND", "존재하지 않는 아이디예요."),
          "409": err("ALREADY_FRIEND / REQUEST_ALREADY_SENT / REQUEST_INBOX_FULL / FRIEND_LIMIT_ME / 맞요청의 FRIEND_LIMIT_TARGET", "REQUEST_ALREADY_SENT", "이미 친구 요청을 보냈어요.") },
      },
      get: {
        tags: ["친구"], summary: "받은 대기 요청 (기존 호환 API)",
        description: "total은 pending 요청 수만 의미. 통합 종 배지는 GET /notifications/summary의 badgeCount 사용.",
        responses: { "200": ok("대기 요청 최신순", "ReceivedFriendRequests", { total: 1, requests: [{ id: "cmrequest0001", fromLoginId: "데모친구", createdAt: "2026-09-24T09:00:00.000Z" }] }), ...unauthenticated },
      },
    },
    "/api/friend-requests/{id}/accept": {
      parameters: [idParameter("FriendRequest ID. 통합 알림의 target.id를 사용 (알림 id가 아님)", "cmrequest0001")],
      post: {
        tags: ["친구"], summary: "받은 친구 요청 수락", description: `${noBody} 양방향 친구 성립 후 요청·연결 알림 삭제. 한도 오류 시 요청·알림 보존.`,
        responses: { "200": ok("친구 성립", "LoginIdResponse", { loginId: "데모친구" }), ...unauthenticated,
          "403": err("내가 받은 요청 아님", "FORBIDDEN", "내가 받은 요청만 처리할 수 있어요."),
          "404": err("이미 처리·삭제된 요청", "REQUEST_NOT_FOUND", "이미 처리됐거나 없는 요청이에요."),
          "409": err("FRIEND_LIMIT_ME / FRIEND_LIMIT_TARGET / ALREADY_FRIEND", "FRIEND_LIMIT_ME", "내 친구가 가득 찼어요. (최대 10명)") },
      },
    },
    "/api/friend-requests/{id}/reject": {
      parameters: [idParameter("FriendRequest ID. 통합 알림의 target.id", "cmrequest0001")],
      post: {
        tags: ["친구"], summary: "받은 친구 요청 거절", description: `${noBody} 요청·연결 알림 삭제. 상대에게 거절 알림 없음.`,
        responses: { "200": ok("거절 완료", "Ok", { ok: true }), ...unauthenticated,
          "403": err("내가 받은 요청 아님", "FORBIDDEN", "내가 받은 요청만 처리할 수 있어요."),
          "404": err("이미 처리·삭제된 요청", "REQUEST_NOT_FOUND", "이미 처리됐거나 없는 요청이에요.") },
      },
    },
    "/api/friends": {
      get: {
        tags: ["친구"], summary: "친구 목록 (최대10명)", description: "페이지네이션 없음. total은 친구 수.",
        responses: { "200": ok("친구 목록", "FriendList", { total: 1, friends: [{ loginId: "데모친구", createdAt: "2026-09-24T09:00:00.000Z" }] }), ...unauthenticated },
      },
      delete: {
        tags: ["친구"], summary: "친구 다중 삭제와 양방향 반응 정리",
        description: "전체 성공/전체 실패. 쌍방 관계와 서로에게 남긴 좋아요 이력·연결 알림까지 실제 삭제. 해제 이후 상세/좋아요 권한 즉시 회수. 재친구 후 첫 좋아요는 새 알림 가능.",
        requestBody: body("RemoveFriendsInput", { friendLoginIds: ["데모친구"] }),
        responses: { "200": ok("삭제 완료", "RemovedFriends", { deleted: 1 }), ...validation, ...unauthenticated,
          "404": err("친구 아닌 닉네임 포함 — 전체 실패", "FRIEND_NOT_FOUND", "친구 목록에 없는 아이디가 포함돼 있어요.") },
      },
    },
    "/api/friends/jars": { get: {
      tags: ["친구"], summary: "친구별 최신 병 1개 (IP당 분당30회)",
      description: "recordDate로 최신 판단. note/좋아요/권한 포함 공통Jar. 기록 없으면 jar:null. 과거 목록 API는 없지만 ID로 과거 상세 접근은 허용.",
      responses: { "200": ok("친구 최신 병", "FriendJars", { friends: [{ loginId: "데모친구", jar: FRIEND_JAR }, { loginId: "새친구", jar: null }] }), ...unauthenticated, ...rateLimited },
    } },
    "/api/notifications": { get: {
      tags: ["알림"], summary: "내 통합 알림 페이지",
      description: "실제 FRIEND_REQUEST/JAR_LIKED 알림을 (createdAt DESC,id DESC)로 조회. GET은 읽음 변경 없음. 기준 알림 삭제에도 커서 경계 유지. 최신 알림은 첫 페이지 재조회. type 변경 시 cursor 리셋(다른 필터의 cursor 재사용은400). 일기 원문은 포함하지 않음.",
      parameters: [
        { name: "type", in: "query", schema: { type: "string", enum: ["FRIEND_REQUEST", "JAR_LIKED"] }, description: "생략하면 전체" },
        ...pageParameters(20, "시간+ID를 포함한 불투명 nextCursor. 다음 페이지에 그대로 재전송"),
      ],
      responses: { "200": ok("통합 목록 (예시는 type 생략)", "NotificationPage", { notifications: [LIKE_NOTIFICATION, REQUEST_NOTIFICATION], nextCursor: null, hasMore: false }), ...validation, ...unauthenticated },
    } },
    "/api/notifications/summary": { get: {
      tags: ["알림"], summary: "종 배지 집계",
      description: "badgeCount=unreadLikeCount+pendingFriendRequestCount. 친구 요청을 읽어도 처리 전에는 pending수에 포함. 보이는 화면에서30초 간격, 재진입·종 열기 시 즉시 재조회(타이머는 프런트 구현).",
      responses: { "200": ok("배지", "NotificationSummary", { unreadLikeCount: 2, pendingFriendRequestCount: 1, badgeCount: 3 }), ...unauthenticated },
    } },
    "/api/notifications/{id}/read": {
      parameters: [{ ...idParameter("Notification ID. target.id와 다름", LIKE_NOTIFICATION.id), schema: { type: "string", minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9_-]+$" } }],
      patch: {
        tags: ["알림"], summary: "내 알림 하나 읽음 처리 (두 타입 모두)",
        description: `${noBody} 최초 readAt 유지. 반복호출도 같은 시각. 친구 요청 읽음은 수락/거절이 아니므로 pending 배지는 그대로. 이미 처리/취소로 삭제됐거나 타인의 알림은404.`,
        responses: { "200": ok("읽음 확정", "ReadNotification", { id: LIKE_NOTIFICATION.id, readAt: "2026-09-24T10:21:00.000Z" }), ...validation, ...unauthenticated,
          "404": err("내 알림이 없거나 타인의 알림", "NOTIFICATION_NOT_FOUND", "존재하지 않는 알림이에요.") },
      },
    },
    "/api/health/live": { get: {
      tags: ["기타"], security: [], summary: "DB를 사용하지 않는 생존 확인",
      responses: { "200": ok("서버 응답", "Ok", { ok: true }) },
    } },
    "/api/health": { get: {
      tags: ["기타"], security: [], summary: "DB를 포함하는 준비 상태 확인",
      responses: { "200": ok("DB 연결 정상", "Health", { ok: true, db: "up" }) },
    } },
  },
} as const;
