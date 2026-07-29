# Mongly API 명세서

> 백엔드(mongly-server) ↔ 마지막 수정: 2026-07-29
> 인터랙티브 문서: 서버 실행 후 `/api/docs` (Swagger)
> 로그인은 **이메일+비밀번호**. `loginId`는 닉네임(친구 추가 키·표시명) 역할. 감정 담기는 **드래그마다 즉시 저장** + 되돌리기 지원.

## 1. 기본 정보

| 항목 | 내용 |
|------|------|
| Base URL | 프론트에서는 항상 **같은 출처의 `/api/*`** 로 호출 (Next rewrites가 백엔드로 프록시) |
| 로컬 백엔드 | `http://localhost:4000` (프론트 dev 서버 경유 시 `http://localhost:3000/api/*`) |
| 형식 | 요청/응답 모두 JSON. **상태 변경 요청(POST/PATCH/DELETE)에 JSON이 아닌 `Content-Type`을 붙이면 `415`** (바디 없는 요청은 Content-Type 생략 가능 — 예: 로그아웃) |
| 인증 | httpOnly 쿠키 `mongly_token` (7일). 프록시 경유 same-origin이라 **fetch에 아무 설정 없이 자동 전송**. localStorage 사용 금지 |
| 날짜 | `recordDate`는 **KST 기준** `"YYYY-MM-DD"` 문자열. "오늘" 판정은 서버가 함 (`GET /api/jars/today`) — 프론트 로컬 시계로 판정하지 말 것 |
| 캐싱 | 인증 데이터 fetch에는 `cache: "no-store"` 권장 (Next 캐싱 주의) |

### 응답 래핑 규칙

- **확정 단건** (완성 결과, 상세, 드래프트): 객체 그대로 — `POST /jars`, `GET /jars/:id`, 드래프트 응답
- **목록·복합·nullable**: 래핑 — `{ jars: [...] }`, `{ jar, draft }`, `{ friends, total }`

### 공통 에러 형식

```json
{ "error": { "code": "JAR_LIMIT", "message": "서재가 가득 찼어요. 유리병을 비우고 다시 담아주세요.", "details": { } } }
```

`details`는 일부 에러에만 존재. `message`는 그대로 노출해도 되는 한국어 문장이지만, 모달 분기는 반드시 `code`로 할 것.

### 에러 코드 카탈로그

| code | status | 의미 |
|------|--------|------|
| `VALIDATION` | 400 | 요청 형식 오류 (`details`에 zod 필드별 메시지) |
| `INVALID_BODY` | 400/413 | 깨진 JSON / 본문 과대 |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | JSON이 아닌 Content-Type |
| `UNAUTHORIZED` | 401 | 비로그인·만료·탈퇴 토큰 → **로그인 화면으로** |
| `RATE_LIMITED` | 429 | 요청 과다 — 잠시 후 재시도 안내 |
| `NOT_FOUND` | 404 | 없는 경로 |
| `INTERNAL` | 500 | 서버 오류 |
| `EMAIL_TAKEN` | 409 | 이메일 중복 (회원가입) |
| `LOGIN_ID_TAKEN` | 409 | 닉네임 중복 ("이미 사용 중인 닉네임이에요.") |
| `SIGNUP_CONFLICT` | 409 | 이메일·닉네임 중 어느 쪽 중복인지 판별 불가 시 포괄 폴백 |
| `INVALID_CREDENTIALS` | 401 | 로그인 실패 (이메일 존재 여부 미노출) |
| `WRONG_PASSWORD` | 400 | 현재 비밀번호 불일치 (401 아님 — 로그인 상태 유지) |
| `INVALID_EMOTION` | 400 | 존재하지 않는 감정 id (드래그 시) |
| `DRAFT_FULL` | 409 | 감정 7개 다 담음 (담기·완성) |
| `DRAFT_EMPTY` | 409(되돌리기)·400(완성) | 되돌릴/완성할 감정이 없음 |
| `JAR_ALREADY_TODAY` | 409 | 오늘 유리병 이미 완성 (담기·완성) |
| `JAR_LIMIT` | 409 | 서재 7개 초과 — `details.jars`에 현재 목록 (드래프트는 보존) |
| `JAR_NOT_FOUND` | 404 | 없는 유리병 |
| `FORBIDDEN` | 403 | 남의 것 접근 (친구 아님 / 본인 아님) |
| `USER_NOT_FOUND` | 404 | 없는 닉네임 |
| `SELF_FRIEND` | 400 | 자기 자신 친구 추가 |
| `ALREADY_FRIEND` | 409 | 이미 친구 |
| `FRIEND_LIMIT_ME` | 409 | 내 친구 10명 가득 |
| `FRIEND_LIMIT_TARGET` | 409 | 상대 친구 10명 가득 |
| `FRIEND_NOT_FOUND` | 404 | 삭제 목록에 친구 아닌 아이디 포함 (아무것도 삭제 안 됨) |

> `DRAFT_EMPTY`가 두 status인 이유: 되돌리기는 "지울 게 없는 상태 충돌"이라 409, 완성은 "빈 병으론 완성 불가한 잘못된 요청"이라 400. 엔드포인트가 다르므로 프론트 분기에 혼선 없음.

### Rate Limit (분당, IP 기준)

로그인 10 · 회원가입 5 · 닉네임 중복확인 30 · 친구 추가 10 · 친구 서재 조회 30 — 초과 시 `429 RATE_LIMITED`
(드래그·되돌리기·완성은 유저·일당 최대 7행이라 제한 없음)

### 입력 규칙

- 이메일: 표준 형식, **소문자·공백 정규화 후 저장·비교** (대문자로 로그인해도 동일 계정)
- 닉네임(loginId): **2~16자, 한글/영문/숫자** (공백·특수문자 불가)
- 비밀번호: **8자 이상**, 72바이트 이하(한글 24자 상당)
- 감정: 유리병당 **합계 1~7개**, 같은 감정은 여러 번 드래그하면 `count`로 집계

### 유리병(Jar) 객체 — 공통 형태

```json
{
  "id": "clx8f2k...",
  "recordDate": "2026-09-14",
  "dominantEmotionId": 1,
  "emotions": [
    { "emotionId": 1, "name": "분노", "colorHex": "#F05B5B", "count": 2 },
    { "emotionId": 6, "name": "슬픔", "colorHex": "#4966B6", "count": 1 }
  ]
}
```

- `dominantEmotionId`: 최다 감정. **동률이면 `null`** → "여러 감정이 고르게 섞였어요"
- 색 조합은 프론트 담당 — `emotions[].colorHex`(기준색)를 재료로 몽글리에 칠한다
- **드래프트(담는 중) 객체**도 같은 형태지만 `id`·`recordDate`가 없고 `total`이 있음: `{ "total": 3, "dominantEmotionId": 1, "emotions": [...] }` (빈 병이면 `total: 0`, `emotions: []`)

---

## 2. 인증

### POST /api/auth/signup — 회원가입

```json
// 요청 (이메일 + 닉네임 + 비밀번호 + 약관)
{ "email": "demo@mongly.app", "loginId": "데모몽글리", "password": "demo12345", "termsAgreed": true }
// 201 — 자동 로그인(쿠키 발급됨). 가입 후 재로그인 불필요
{ "email": "demo@mongly.app", "loginId": "데모몽글리" }
```
에러: `400 VALIDATION`(형식/약관 미동의) · `409 EMAIL_TAKEN`(이메일 중복) · `409 LOGIN_ID_TAKEN`(닉네임 중복) · `429`
> 이메일 중복확인 버튼은 없음 — 가입 제출 시 `409 EMAIL_TAKEN`을 이메일 필드에 인라인 표시. 닉네임만 사전 중복확인 API가 있음.

### POST /api/auth/login — 로그인 (이메일)

```json
// 요청 — 이메일은 대소문자·공백 무시
{ "email": "demo@mongly.app", "password": "demo12345" }
// 200 — 쿠키 발급
{ "email": "demo@mongly.app", "loginId": "데모몽글리" }
```
에러: `401 INVALID_CREDENTIALS`(이메일/비밀번호 불일치, 존재 여부 미노출) · `429`

### POST /api/auth/logout — 로그아웃

인증 불필요(만료된 세션에서도 항상 성공). 요청 바디 없음 → `200 { "ok": true }` + 쿠키 삭제

### GET /api/auth/me 🔒 — 세션 확인

앱 부팅 시 호출. `200 { "email": "demo@mongly.app", "loginId": "데모몽글리" }` / 비로그인 `401`

---

## 3. 계정 (설정 탭)

### GET /api/users/check-login-id?loginId=데모몽글리 — 닉네임 중복 확인

회원가입·닉네임 수정 공용. 인증 불필요. `200 { "available": true }` / 형식 오류 `400`

### PATCH /api/users/me/login-id 🔒 — 닉네임 수정

```json
{ "loginId": "새몽글리" }  →  200 { "loginId": "새몽글리" }
```
중복확인 버튼과 별개로 서버가 최종 재검증 → `409 LOGIN_ID_TAKEN` 시 "이미 사용 중인 닉네임이에요." 표시

### PATCH /api/users/me/password 🔒 — 비밀번호 변경

```json
{ "currentPassword": "password123", "newPassword": "newpass123" }  →  200 { "ok": true }
```
`400 WRONG_PASSWORD` 시 현재 비밀번호 오류 표시. ⚠️ `currentPassword` 필드는 시안에 없음 — 열린 문제 ①(보안상 필수 권장, 프론트에 입력 필드 추가 요청 상태)

### DELETE /api/users/me 🔒 — 계정 삭제

```json
{ "password": "password123" }  →  200 { "ok": true }
```
유리병·친구 관계 전부 삭제 + 쿠키 삭제. `400 WRONG_PASSWORD`

---

## 4. 감정 / 유리병 (몽글리 탭)

> **감정 담기 흐름:** 사용자가 감정 아이콘을 유리병으로 드래그할 때마다 `POST /jars/draft/emotions`로 **즉시 서버에 저장**된다. 되돌리기는 `DELETE`. 하루 중 여러 번 접속해도 담던 드래프트가 유지되고, "완성하기"를 누르면 바디 없는 `POST /jars`로 확정된다. **서버 드래프트가 유일한 진실** — 프론트는 응답으로 재렌더한다.
>
> ⚠️ **드래그 뮤테이션은 직렬 전송** (한 번에 하나씩). 연타로 병렬 전송하면 응답 도착 순서가 뒤바뀌어 UI가 과거 상태로 튈 수 있다. 각 요청을 이전 응답 수신 후 보내거나 클라이언트 큐로 직렬화할 것.

### GET /api/emotions — 감정 팔레트 (인증 불필요)

```json
// 200
{ "emotions": [ { "id": 1, "name": "분노", "colorHex": "#F05B5B", "sortOrder": 1 }, ... 10종 ] }
```
팔레트 렌더링·색 조합의 원천 데이터. 앱 시작 시 1회 로드하면 충분.

### GET /api/jars/today 🔒 — 오늘 상태

몽글리 탭 진입 시 1회 호출. 완성 여부에 따라 둘 중 하나:

```json
// 아직 담는 중 (또는 아무것도 안 담음)
{ "jar": null, "draft": { "total": 2, "dominantEmotionId": 1, "emotions": [ ... ] } }
// 오늘 이미 완성함
{ "jar": { "id": "...", "recordDate": "2026-07-29", ... }, "draft": null }
```
- `jar`가 있으면 완성 상태 → 완성 화면. `draft`가 있으면 담는 중 → 만들기 화면(담던 감정 복원)
- 빈 병이면 `draft.total: 0`, `draft.emotions: []`

### POST /api/jars/draft/emotions 🔒 — 드래그 1회 (감정 담기)

```json
// 요청 — 감정 1개
{ "emotionId": 1 }
// 201 — 갱신된 드래프트 전체 (같은 감정 또 담으면 count 증가)
{ "total": 2, "dominantEmotionId": 1, "emotions": [ { "emotionId": 1, "name": "분노", "colorHex": "#F05B5B", "count": 2 } ] }
```
에러: `400 INVALID_EMOTION`(없는 감정) · `409 DRAFT_FULL`(7개 다 담음) · `409 JAR_ALREADY_TODAY`(오늘 이미 완성 → 담기 불가)

### DELETE /api/jars/draft/emotions 🔒 — 되돌리기

바디 없음. 마지막으로 담은 감정 1개를 제거하고 갱신된 드래프트 반환.

```json
// 200
{ "total": 1, "dominantEmotionId": 1, "emotions": [ ... ] }
```
에러: `409 DRAFT_EMPTY`(되돌릴 감정이 없음)

### POST /api/jars 🔒 — 완성하기

**바디 없음.** 서버에 저장된 오늘 드래프트를 유리병으로 확정한다.

```json
// 요청: 바디 없음
// 201 — 유리병 객체 그대로 (드래프트는 비워짐)
{ "id": "...", "recordDate": "2026-07-29", "dominantEmotionId": 1, "emotions": [ ... ] }
```
에러:
- `400 DRAFT_EMPTY` — 담은 감정이 없음
- `409 JAR_ALREADY_TODAY` — "오늘의 유리병은 이미 완성했어요"
- `409 JAR_LIMIT` — `details.jars`에 현재 7개 목록 포함 → "서재에서 비우고 다시 담아주세요". **드래프트는 보존**되므로 서재를 비운 뒤 다시 완성하면 됨

### GET /api/jars 🔒 — 서재

`200 { "jars": [ <유리병>... ] }` — 최대 7개, 날짜 내림차순

### GET /api/jars/:id 🔒 — 유리병 상세 (캐릭터 보기 / 감정 구성 보기)

**본인 또는 친구만.** `200 <유리병>` / `403 FORBIDDEN` / `404 JAR_NOT_FOUND`

### DELETE /api/jars/:id 🔒 — 삭제하기

본인만. `200 { "ok": true }` / `403` / `404`

---

## 5. 친구

### POST /api/friends 🔒 — 친구 추가 (설정 모달)

```json
{ "friendLoginId": "허수현" }  →  201 { "loginId": "허수현" }
```
요청/수락 없이 **쌍방 즉시 성립**. 에러 코드별 모달 문구:

| code | status | 안내 문구 예시 |
|------|--------|----------|
| `USER_NOT_FOUND` | 404 | 존재하지 않는 아이디예요 |
| `SELF_FRIEND` | 400 | 자기 자신은 추가할 수 없어요 |
| `ALREADY_FRIEND` | 409 | 이미 친구예요 |
| `FRIEND_LIMIT_ME` | 409 | 내 친구가 가득 찼어요 (최대 10명) |
| `FRIEND_LIMIT_TARGET` | 409 | 상대방의 친구가 가득 찼어요 |

### GET /api/friends 🔒 — 친구 목록

```json
// 200 — total은 설정 화면 "9/10" 카운터용. 최대 10명이라 페이지네이션 없음
{ "total": 2, "friends": [ { "loginId": "허수현", "createdAt": "2026-09-01T09:00:00.000Z" } ] }
```

### DELETE /api/friends 🔒 — 다중 삭제 (설정 모달 "OO님 외 2명을 삭제하시겠습니까?")

```json
{ "friendLoginIds": ["허수현", "7월제철음식"] }  →  200 { "deleted": 2 }
```
**전체 성공 또는 전체 실패** — 친구 아닌 아이디가 섞이면 `404 FRIEND_NOT_FOUND`, 아무것도 삭제되지 않음. 쌍방 관계가 함께 해제됨.

### GET /api/friends/jars 🔒 — 친구 탭 선반 (친구별 최신 유리병 1개)

친구 탭 진입 시 1회 호출. 친구마다 **가장 최근 유리병 하나씩** 내려온다:

```json
// 200
{
  "friends": [
    { "loginId": "허수현", "jar": { "id": "cmr...", "recordDate": "2026-07-24", "dominantEmotionId": 3, "emotions": [ ... ] } },
    { "loginId": "7월제철음식", "jar": null }
  ]
}
```

- `jar: null` = 유리병을 하나도 완성하지 않은 친구 → **비활성 슬롯**으로 렌더
- 유리병 클릭 → 그 `jar.id`로 `GET /api/jars/:id` (캐릭터 보기 — 친구 접근 허용됨)

---

## 6. 기타

### GET /api/health — 헬스체크

`200 { "ok": true, "db": "up" }` — 배포 모니터링(UptimeRobot)용, DB `SELECT 1` 포함

---

## 프론트 구현 참고

1. **401 전역 처리**: `UNAUTHORIZED`(401)를 받으면 로그인 화면으로. 단 `WRONG_PASSWORD`는 400이므로 이 흐름에 걸리지 않음 (의도된 설계)
2. **로그인 가드**: Next 16에서는 `middleware.ts`가 아니라 **`proxy.ts`** — 쿠키 존재만 확인하는 낙관적 체크로 리다이렉트하고, 최종 판정은 API 401에 맡길 것
3. **오늘 판정**: 자정 넘김/시차 문제가 있으므로 반드시 `GET /api/jars/today`로. 프론트에서 `new Date()`로 날짜 비교 금지
4. **색 조합**: 백엔드는 최종 색을 계산하지 않음 — `emotions[].colorHex` × `count` 가중으로 프론트가 조합. 드래프트도 같은 형태라 유리병 렌더 컴포넌트를 그대로 재사용 가능(단 `id`·`recordDate`는 optional 처리)
5. **드래그 뮤테이션 직렬화**: 담기/되돌리기는 한 번에 하나씩 보낸다. 낙관적 업데이트 시엔 각 API 응답(전체 드래프트 스냅샷)으로 최종 보정하되, 병렬 전송으로 응답 순서가 뒤바뀌지 않도록 큐로 직렬화할 것
