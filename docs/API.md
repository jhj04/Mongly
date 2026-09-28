# Mongly API 명세서

> 마지막 수정: **2026-09-24** · 계약 버전 **0.6.0**
> 인터랙티브 명세: 서버의 `/api/docs` · JSON: `/api/openapi.json` 또는 [openapi.json](openapi.json)
> 코드 원본: `mongly-server/src/docs/openapi.ts` · 내보내기: `mongly-server`에서 `npm run docs:generate`
> 프런트 변경 요약과 연결 순서: [2026-09-24 API 변경 안내](API_CHANGES_2026-09-24.md)

## 1. 기본 계약

| 항목 | 계약 |
| --- | --- |
| Base URL | 프런트는 같은 출처의 `/api/*` 호출. 로컬 백엔드 `http://localhost:4000`, Next 프록시 경유 `http://localhost:3000/api/*` |
| 인증 | httpOnly 쿠키 `mongly_token`(7일). 같은 출처 fetch는 쿠키 자동 전송. 토큰을 localStorage에 저장하지 않음 |
| 요청 | JSON. 본문이 있으면 `Content-Type: application/json`. POST/PATCH/PUT/DELETE에 JSON이 아닌 Content-Type을 붙이면 415. 바디 없는 요청은 헤더 생략 가능 |
| 응답 | JSON. 단건은 객체, 목록·nullable 상태는 아래 명세대로 래핑 |
| 날짜 | `recordDate`는 서버 **KST 날짜** `YYYY-MM-DD`. `createdAt`, `updatedAt`, `readAt`은 UTC ISO 8601 문자열 |
| ID | 불투명 문자열. 병·좋아요·알림 경로 ID는 영문/숫자/밑줄/하이픈 1~128자. ID나 cursor를 파싱해 사용자·날짜·권한을 추측하지 않음 |
| 캐시 | 인증 데이터는 `cache: "no-store"` 권장 |
| 렌더링 | 서버 감정 데이터로 프런트가 병·캐릭터를 렌더링. 이미지 업로드와 `imageUrl` 응답은 현재 계약에 없음 |

### 유지·변경 정책

- **전체 보관 병 수에 서비스 한도 없음.** 새 병을 완성해도 기존 병을 자동 삭제하지 않음.
- **한 병의 구슬 합계 1~7개**, KST 날짜당 병 1개, 친구 최대 10명 유지.
- 한 줄 일기는 **선택 입력**, 작성자와 현재 친구에게 감정 구성과 함께 공개. 공개/비공개 설정은 없음.
- 내 목록·오늘 상태·상세·친구 최신 병에 같은 Jar 필드가 포함됨. 목록에서도 `note`를 제공.
- 완성본 편집은 작성자의 **KST 오늘 병만** 가능. 친구 목록은 친구별 최신 병 1개이며, `updatedAt`이 아닌 `recordDate`로 최신 판단.
- 친구의 과거 병도 ID로 상세 열람·좋아요 가능. 친구 과거 보관함을 나열하는 별도 API는 없음.
- 일기 서버 임시저장, 과거 병 편집, 모두 읽음, 사용자의 알림 직접 삭제, 푸시·이메일 알림은 제공하지 않음.

### 공통 오류

```json
{
  "error": {
    "code": "JAR_VERSION_CONFLICT",
    "message": "다른 곳에서 기록이 수정됐어요. 최신 기록을 다시 확인해주세요.",
    "details": { "currentVersion": 2 }
  }
}
```

`message`는 안내 문구이며 분기는 `code`로 한다. `details`는 선택 필드다. `VALIDATION`은 Zod의 `formErrors`·`fieldErrors` 등을 포함할 수 있다.

| HTTP | code | 의미 |
| --- | --- | --- |
| 400 | `VALIDATION` | 일기·감정 구성·버전·페이지 쿼리 등 형식 오류 |
| 400 / 413 | `INVALID_BODY` | 잘못된 JSON / 요청 본문 과대 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | JSON이 아닌 Content-Type |
| 401 | `UNAUTHORIZED` | 비로그인·만료·탈퇴 세션. 로그인 화면으로 이동 |
| 401 | `INVALID_CREDENTIALS` | 로그인 자격증명 실패. 이메일 존재 여부 미노출 |
| 400 | `WRONG_PASSWORD` | 비밀번호 변경·탈퇴의 현재 비밀번호 불일치. 로그아웃하지 않음 |
| 403 | `FORBIDDEN` | 비친구 병 접근, 다른 사람의 병 수정·삭제, 타인의 친구 요청 처리 |
| 404 | `NOT_FOUND` | 존재하지 않는 경로 |
| 429 | `RATE_LIMITED` | 요청 과다. 잠시 후 재시도 |
| 500 | `INTERNAL` | 서버 오류 |
| 409 | `EMAIL_TAKEN`, `LOGIN_ID_TAKEN`, `SIGNUP_CONFLICT` | 이메일·닉네임 가입 충돌 |
| 400 | `INVALID_EMOTION` | 존재하지 않거나 허용되지 않는 감정 |
| 409 | `DRAFT_FULL` | 드래프트 구슬 7개 한도 |
| 400 / 409 | `DRAFT_EMPTY` | 완료는 400, 되돌리기는 409 |
| 409 | `JAR_ALREADY_TODAY` | 오늘 이미 병 완성 |
| 404 | `JAR_NOT_FOUND` | 병 없음·삭제됨 |
| 409 | `JAR_EDIT_WINDOW_CLOSED` | 편집 시점의 KST 오늘 병이 아님 |
| 409 | `JAR_VERSION_CONFLICT` | `expectedVersion`과 현재 버전 불일치. `details.currentVersion` 제공 |
| 400 | `SELF_LIKE_NOT_ALLOWED` | 자기 병에 좋아요 설정·취소 요청 |
| 404 | `NOTIFICATION_NOT_FOUND` | 내 알림이 없거나 삭제됨. 타인의 알림도 같은 오류 |
| 404 | `USER_NOT_FOUND` | 친구 요청 대상 닉네임 없음 |
| 400 | `SELF_FRIEND` | 자기 자신에게 친구 요청 |
| 409 | `ALREADY_FRIEND`, `REQUEST_ALREADY_SENT` | 이미 친구 / 같은 상대에게 대기 요청 존재 |
| 404 | `REQUEST_NOT_FOUND` | 처리·삭제된 친구 요청 |
| 409 | `REQUEST_INBOX_FULL` | 상대 대기 친구 요청 20개 한도 |
| 409 | `FRIEND_LIMIT_ME`, `FRIEND_LIMIT_TARGET` | 내/상대 친구 10명 한도 |
| 404 | `FRIEND_NOT_FOUND` | 다중 삭제에 친구 아닌 닉네임 포함. 전체 실패 |

`JAR_LIMIT` 저장 한도 오류와 `IMAGE_*` 오류는 현재 API 계약에서 사용하지 않는다.

## 2. 공통 데이터 모델

### Jar — 목록·상세 공통

```json
{
  "id": "cmjar0001",
  "recordDate": "2026-09-24",
  "note": "발표가 끝나서 후련했고 친구의 응원이 고마웠다.",
  "createdAt": "2026-09-24T10:00:00.000Z",
  "updatedAt": "2026-09-24T10:15:00.000Z",
  "version": 2,
  "canEdit": true,
  "canLike": false,
  "likeCount": 1,
  "likedByMe": false,
  "dominantEmotionId": 1,
  "emotions": [
    { "emotionId": 1, "name": "기쁨", "colorHex": "#FFD54A", "count": 2 },
    { "emotionId": 6, "name": "사랑", "colorHex": "#FF78AE", "count": 1 }
  ]
}
```

| 필드 | 타입 | 의미 |
| --- | --- | --- |
| `id` | string | 병 ID. 편집해도 유지 |
| `recordDate` | string(date) | KST 기록 날짜. 편집해도 유지 |
| `note` | string \| null | 정규화된 최대 50 grapheme 일기. 미작성·기존 기록은 null |
| `createdAt` | string(date-time) | 최초 완성 시각. 편집해도 유지 |
| `updatedAt` | string(date-time) | 감정 또는 일기 실제 변경 시각. 생성 시 createdAt과 동일 |
| `version` | integer ≥ 1 | 실제 내용 변경 때 1 증가. 좋아요·읽음으로 변하지 않음 |
| `canEdit` | boolean | 조회 시점 기준 내가 작성한 KST 오늘 병인지. 저장 시 서버가 재검사 |
| `canLike` | boolean | 내가 작성하지 않은 현재 친구의 병인지 |
| `likeCount` | integer ≥ 0 | 활성 좋아요 수 |
| `likedByMe` | boolean | 현재 요청 사용자의 활성 좋아요 여부 |
| `dominantEmotionId` | integer \| null | 최다 감정. 동률이면 null |
| `emotions` | array | 감정별 집계. emotionId 고유, count 합계 1~7 |

`version > 1`일 때 `updatedAt`으로 수정 표시를 할 수 있다. 같은 병도 본인 조회와 친구 조회의 `canEdit`·`canLike`·`likedByMe`는 다를 수 있다. 미작성 문자열 `""` 대신 `null`을 받는다.

### Draft

```json
{
  "total": 2,
  "dominantEmotionId": 1,
  "emotions": [{ "emotionId": 1, "name": "기쁨", "colorHex": "#FFD54A", "count": 2 }]
}
```

`total`은 0~7. 비어 있으면 `{ "total": 0, "dominantEmotionId": null, "emotions": [] }`. 드래프트에는 note·병 ID·편집 버전이 없다.

### 일기 입력 규칙

1. 문자열 또는 null. 생성에서 생략 가능, 수정에서 생략은 **기존 값 유지**.
2. Unicode NFC 정규화와 앞뒤 공백 제거. 빈 결과는 null. 명시적 null은 일기 지우기.
3. **사용자가 보는 글자(grapheme cluster) 최대 50개.** 중간 공백 포함. 가족·피부색 이모지 등을 UTF-16 길이로 세지 않는다.
4. 한 줄 일반 텍스트. **trim 전에** 개행(CR/LF/U+2028/U+2029), 탭·NUL 등 제어문자를 거부하므로 앞뒤 개행도 오류다. 올바르지 않은 단독 Unicode surrogate도 거부한다.
5. 정규화 전후 UTF-8 2,048바이트 상한도 적용. 초과 입력을 조용히 잘라 저장하지 않음.
6. HTML/Markdown 해석 없이 텍스트로 렌더링. 화면 폭에 따른 자동 줄바꿈은 가능.

프런트 카운터는 같은 NFC·trim·grapheme 규칙을 적용한다. `String.length`나 HTML `maxlength=50`만으로 제한하지 말고 한글 조합 중 강제로 절단하지 않는다. 검증·네트워크 실패 시 사용자가 작성한 문장을 유지한다.

## 3. 인증·계정

🔒 표시는 인증 필수. 아래 인증·계정 계약은 기존과 동일하다.

| 메서드·경로 | 요청 | 성공 응답 |
| --- | --- | --- |
| `POST /api/auth/signup` | `{email, loginId, password, termsAgreed:true}` | 201 `{email, loginId}` + 로그인 쿠키 |
| `POST /api/auth/login` | `{email, password}` | 200 `{email, loginId}` + 로그인 쿠키 |
| `POST /api/auth/logout` | 본문 없음, 인증 불필요 | 200 `{ok:true}` + 쿠키 삭제 |
| `GET /api/auth/me` 🔒 | 없음 | 200 `{email, loginId}` |
| `GET /api/users/check-login-id?loginId=데모몽글리` | 없음, 인증 불필요 | 200 `{available:true}` |
| `PATCH /api/users/me/login-id` 🔒 | `{loginId:"새몽글리"}` | 200 `{loginId:"새몽글리"}` |
| `PATCH /api/users/me/password` 🔒 | `{currentPassword, newPassword}` | 200 `{ok:true}` |
| `DELETE /api/users/me` 🔒 | `{password}` | 200 `{ok:true}` + 쿠키 삭제 |

- 이메일은 trim·소문자 정규화. 회원가입은 이메일 형식 및 최대 254자 검사.
- 닉네임은 2~16자 한글/영문/숫자. 표시명과 친구 추가 키가 모두 `loginId`다.
- 가입·새 비밀번호는 8자 이상, UTF-8 72바이트 이하. 현재 비밀번호는 변경·탈퇴에 필수다.
- 계정 삭제 시 병·드래프트·친구 관계·요청·좋아요·관련 알림도 정리된다.
- 회원가입 실패: `VALIDATION`, `EMAIL_TAKEN`, `LOGIN_ID_TAKEN`, `SIGNUP_CONFLICT`. 로그인 실패: `INVALID_CREDENTIALS`. 비밀번호 검증 실패: `WRONG_PASSWORD`.

## 4. 감정·드래프트·완성본

### GET /api/emotions — 인증 불필요

```json
{
  "emotions": [
    { "id": 1, "name": "기쁨", "colorHex": "#FFD54A", "sortOrder": 1 },
    { "id": 2, "name": "슬픔", "colorHex": "#4966B6", "sortOrder": 2 }
  ]
}
```

실제 팔레트 API가 렌더링 원천이다. 현재 시드: 기쁨·슬픔·분노·놀람·불안·사랑·짜증·설렘·후회·희망. 앱은 이름·색을 별도 하드코딩하지 않는다.

### GET /api/jars/today 🔒

- 완료 전: `200 { "jar": null, "draft": <Draft> }`
- 완료 후: `200 { "jar": <Jar>, "draft": null }`

서버 KST 기준 오늘 상태다. 이전 날짜의 미완성 드래프트 처리 정책은 유지된다.

### POST /api/jars/draft/emotions 🔒

요청 `{ "emotionId": 1 }` → **201 Draft**. 드래그 1회당 감정 1개 즉시 저장.

오류: `400 VALIDATION / INVALID_EMOTION`, `409 DRAFT_FULL / JAR_ALREADY_TODAY`.

### DELETE /api/jars/draft/emotions 🔒

본문 없음 → **200 Draft**. 마지막 구슬 1개 되돌리기. 빈 드래프트는 `409 DRAFT_EMPTY`.

담기·되돌리기 요청은 프런트에서 직렬화한다. 응답의 전체 Draft가 서버 확정값이며, 병렬 요청의 도착 순서가 최신 상태를 뜻하지 않는다.

### POST /api/jars 🔒 — 완료

```json
{ "note": "오늘 발표를 무사히 마쳤다." }
```

- 본문 생략, `{}`, `{ "note": null }`도 허용. **201 Jar**.
- 감정은 서버의 오늘 드래프트를 사용. 감정 배열·recordDate·소유자·좋아요 수를 지정하지 않는다.
- 병·일기 저장과 드래프트 정리를 원자적으로 처리. 입력 실패로 드래프트가 소실되지 않음.
- 보관 병 개수에 관계없이 기존 병을 보존.
- 오류: `400 VALIDATION / DRAFT_EMPTY`, `409 JAR_ALREADY_TODAY / DRAFT_FULL`(구슬 수 이상 상태에 대한 방어).
- 응답 유실 시 `GET /jars/today`로 완료 여부 확인. POST 재호출은 기존 병을 덮어쓰지 않고 `JAR_ALREADY_TODAY`를 반환할 수 있음.

### GET /api/jars?limit=7&cursor=... 🔒 — 내 보관함

```json
{
  "jars": [],
  "nextCursor": null,
  "hasMore": false
}
```

- `limit`: 생략 시 **7**, 정수 1~50. 잘못된 값은 `400 VALIDATION`.
- `cursor`: 첫 요청은 생략. 다음 요청에 응답의 `nextCursor`를 그대로 URL 인코딩해 전달.
- `recordDate` 내림차순. 다음 페이지는 커서 기준보다 오래된 내 기록만 반환.
- `hasMore=true`이면 다음 cursor가 있고, 마지막 페이지는 `nextCursor=null`.
- **7은 페이지 기본 크기이지 저장 한도가 아니다.** 전체 보관 수 `total`은 제공하지 않음.
- 커서가 가리키던 병이 삭제되어도 날짜 경계로 계속 조회 가능. 페이지 사이 생성된 최신 병은 첫 페이지를 새로 조회해 확인.
- 잘못된 날짜/커서·배열형 쿼리 등은 `400 VALIDATION`. 다른 사용자 기록은 조회되지 않음.

### GET /api/jars/:id 🔒 — 상세

**200 Jar**. 본인 또는 현재 친구만. 친구의 과거 병도 접근 가능.

오류: `400 VALIDATION`(ID 형식), `403 FORBIDDEN`, `404 JAR_NOT_FOUND`.

### PATCH /api/jars/:id 🔒 — KST 오늘 완성본 편집

```json
{
  "expectedVersion": 1,
  "note": "발표 후 친구들과 맛있는 저녁을 먹었다.",
  "emotions": [{ "emotionId": 1, "count": 2 }, { "emotionId": 6, "count": 1 }]
}
```

**200 Jar**. 규칙:

- `expectedVersion`: 현재 상세에서 받은 양의 정수, 필수.
- `note` 또는 `emotions` 중 하나 이상 필수. `expectedVersion`만 보내면 400.
- note 생략은 유지, null/빈 문자열은 지우기.
- `emotions`는 변경분이 아닌 **완전한 대체 구성**. emotionId 중복 금지, 각 count 양의 정수, 합계 1~7.
- 작성자만 가능. 저장 트랜잭션 안에서 현재 KST 날짜를 다시 검사하므로 화면을 연 뒤 자정을 넘기면 실패할 수 있음.
- 감정·note·version·updatedAt을 원자적으로 갱신. 병 ID·recordDate·createdAt·좋아요·알림은 유지.
- 정규화된 note와 감정 구성이 같으면 **no-op**: version·updatedAt 유지. 배열 순서만 바뀐 경우도 동일 구성.
- **오래된 expectedVersion은 내용이 같아도 409**. 충돌 후 자동 덮어쓰기하지 말고 새 상세를 읽어 사용자에게 비교·재저장 안내.
- 비활성 감정의 기존 수량은 유지·감소·제거 가능하나 새 추가·증가는 불가. 존재하지 않는 ID도 거부.

오류: `400 VALIDATION / INVALID_EMOTION`, `403 FORBIDDEN`, `404 JAR_NOT_FOUND`, `409 JAR_VERSION_CONFLICT / JAR_EDIT_WINDOW_CLOSED`.

### DELETE /api/jars/:id 🔒

본인만. **200 `{ "ok": true }`**. 병에 달린 좋아요·관련 알림도 삭제.

오류: `400 VALIDATION`(ID 형식), `403 FORBIDDEN`, `404 JAR_NOT_FOUND`.

## 5. 좋아요

### PUT /api/jars/:id/like 🔒 / DELETE /api/jars/:id/like 🔒

본문 없음. PUT은 좋아요 설정, DELETE는 취소. 반복 요청도 같은 상태가 되는 **멱등 연산**이며 토글 API가 아니다.

```json
{ "jarId": "cmjar0001", "likeCount": 2, "likedByMe": true }
```

두 메서드 모두 **200**. DELETE의 `likedByMe`는 false. 프런트는 응답의 count/state로 보정하고 같은 병의 변경 요청을 직렬화한다.

| 이전 상태 | 요청 | 최종 상태 | 알림 |
| --- | --- | --- | --- |
| 좋아요 이력 없음 | PUT | 활성 | 병 주인에게 최초 알림 1개 생성 |
| 활성 | PUT | 활성 | 기존 알림만 유지 |
| 활성 | DELETE | 비활성 | 해당 알림 삭제 |
| 이력 없음/비활성 | DELETE | 비활성 | 없음 |
| 취소 이력 있음 | PUT | 활성 | **재생성하지 않음** |

- 본인은 설정·취소 불가. 현재 친구이며 대상 병 열람 권한이 있어야 함.
- 서버가 수신자·행위자·수를 결정. 클라이언트가 이를 지정하지 않음.
- 취소 이력은 중복 알림 방지를 위해 서버에 유지. 좋아요 수에는 활성 행만 포함.
- 친구 해제 시 양방향 좋아요 **이력까지 실제 삭제**하고 관련 알림도 제거. 다시 친구가 되어 누르면 새로운 최초 좋아요가 됨.
- 감정·일기 편집은 좋아요·기존 알림의 시간·읽음 상태를 바꾸지 않음.
- 오류: `400 VALIDATION / SELF_LIKE_NOT_ALLOWED`, `403 FORBIDDEN`, `404 JAR_NOT_FOUND`, `429 RATE_LIMITED`.

## 6. 친구·친구 요청

### 친구 요청

| 메서드·경로 | 요청 | 성공 응답 |
| --- | --- | --- |
| `POST /api/friend-requests` 🔒 | `{ "toLoginId": "데모친구" }` | 201 `{ "loginId": "데모친구", "status": "pending" }` |
| `GET /api/friend-requests` 🔒 | 없음 | 200 `{ "total": 1, "requests": [{"id":"cmrequest0001","fromLoginId":"데모친구","createdAt":"2026-09-24T09:00:00.000Z"}] }` |
| `POST /api/friend-requests/:id/accept` 🔒 | 본문 없음 | 200 `{ "loginId": "데모친구" }` |
| `POST /api/friend-requests/:id/reject` 🔒 | 본문 없음 | 200 `{ "ok": true }` |

- pending 요청 생성 시 수신자에게 `FRIEND_REQUEST` Notification도 생성.
- 상대가 이미 나에게 요청했다면 맞요청으로 즉시 성립하며 POST 응답은 `status:"accepted"`.
- 받은 요청 목록은 기존 호환 API. `total`은 **대기 친구 요청 수**이고 새 종의 전체 배지 수가 아님.
- 수락·거절은 받은 사람만 가능. 통합 알림에서 호출할 때 **`target.id`**를 요청 ID로 사용.
- 수락·거절·맞요청 성립으로 요청이 처리되면 연결 알림도 제거.
- 수락 시 친구 한도 오류면 요청·알림은 보존. 거절 사실을 상대에게 별도 알리지 않으며 재요청 가능.
- 보내기 오류: `SELF_FRIEND`, `USER_NOT_FOUND`, `ALREADY_FRIEND`, `REQUEST_ALREADY_SENT`, `REQUEST_INBOX_FULL`, `FRIEND_LIMIT_ME`; 맞요청은 `FRIEND_LIMIT_TARGET`도 가능.
- 처리 오류: `REQUEST_NOT_FOUND`, `FORBIDDEN`; 수락은 `FRIEND_LIMIT_ME/TARGET`, `ALREADY_FRIEND`도 가능.

### GET /api/friends 🔒

`200 { "total": 1, "friends": [{ "loginId": "데모친구", "createdAt": "2026-09-24T09:00:00.000Z" }] }`.

친구 최대 10명. 페이지네이션 없음. total은 설정 화면의 친구 수다.

### DELETE /api/friends 🔒

`{ "friendLoginIds": ["데모친구", "다른친구"] }` → `200 { "deleted": 2 }`.

1~10개 고유 닉네임. 전체 성공 또는 전체 실패. 친구 아닌 닉네임 포함 시 `404 FRIEND_NOT_FOUND`로 아무것도 삭제하지 않는다. 쌍방 관계와 서로의 병에 남긴 좋아요 상태·이력·관련 알림을 같은 트랜잭션에서 삭제한다. 해제 후 직접 상세·좋아요 URL로 접근해도 권한이 없다.

### GET /api/friends/jars 🔒

`200 { "friends": [{ "loginId": "데모친구", "jar": <Jar> }, { "loginId": "새친구", "jar": null }] }`.

친구별 `recordDate` 기준 최신 병 **1개**. 기록 없는 친구는 null. note·좋아요 수·내 좋아요 상태를 포함한 공통 Jar 모델을 사용한다. 친구 병의 `canEdit=false`, `canLike=true`.

## 7. 통합 알림

친구 요청과 좋아요가 모두 실제 Notification 행이며 목록·읽음 API를 공유한다. 기존 대기 친구 요청도 마이그레이션에서 알림으로 채운다.

### GET /api/notifications?type=JAR_LIKED&limit=20&cursor=... 🔒

```json
{
  "notifications": [
    {
      "id": "cmnotification0002",
      "type": "JAR_LIKED",
      "actor": { "loginId": "데모친구" },
      "target": { "type": "JAR", "id": "cmjar0001", "recordDate": "2026-09-24" },
      "createdAt": "2026-09-24T10:20:00.000Z",
      "readAt": null
    },
    {
      "id": "cmnotification0001",
      "type": "FRIEND_REQUEST",
      "actor": { "loginId": "새친구" },
      "target": { "type": "FRIEND_REQUEST", "id": "cmrequest0001" },
      "createdAt": "2026-09-24T09:00:00.000Z",
      "readAt": "2026-09-24T09:05:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

위 예시는 **type을 생략한 전체 목록**이다. 필터가 있으면 해당 타입만 반환한다.

| 필드 | 계약 |
| --- | --- |
| `type` query | 생략 시 전체. `FRIEND_REQUEST` 또는 `JAR_LIKED`만 허용 |
| `limit` query | 기본 20, 정수 1~50 |
| `cursor` query | 응답 nextCursor를 그대로 URL 인코딩해 전달. 탭/필터 변경 시 첫 페이지부터 다시 조회. 다른 type의 cursor 재사용은 400 |
| `id` | Notification ID. 읽음 API에 사용 |
| `actor.loginId` | 현재 닉네임. 닉네임 변경을 반영 |
| `target` | JAR_LIKED는 JAR ID와 recordDate, FRIEND_REQUEST는 요청 ID |
| `createdAt` | 알림 생성 시각. 읽음 처리로 변경되지 않음 |
| `readAt` | 미읽음 null, 읽었으면 UTC 시각 |

- 정렬은 `(createdAt DESC, id DESC)`. 시간+ID를 담은 커서로 페이지 이동. 기준 알림이 삭제되어도 경계가 유지됨.
- 마지막 페이지는 `nextCursor=null`, `hasMore=false`. 빈 목록은 notifications 빈 배열.
- 목록 조회 자체는 읽음 처리하지 않음. 일기 원문·감정 구성은 알림 payload에 포함하지 않음.
- 페이지는 실시간 데이터이며 전체 스냅샷이 아님. 목록 조회 중 새로 온 알림은 첫 페이지 재조회로 확인. 프런트에서 ID 기준으로 병합.
- 오류: `400 VALIDATION`, `401 UNAUTHORIZED`.

### PATCH /api/notifications/:id/read 🔒

본문 없음. 두 알림 타입 모두 가능.

```json
{ "id": "cmnotification0002", "readAt": "2026-09-24T10:21:00.000Z" }
```

**200**, 최초 readAt 유지. 반복·동시 호출로 읽음 시각이 갱신되지 않음. ID 형식 오류는 `400 VALIDATION`. 본인 알림만 가능하며 없거나 타인의 알림이면 `404 NOTIFICATION_NOT_FOUND`.

읽기와 수락은 별개다. 친구 요청을 읽었어도 수락·거절 전까지 pending이며 배지에 계속 포함된다. 처리·좋아요 취소로 이미 사라진 알림의 404는 목록·summary 재조회로 정리한다.

### GET /api/notifications/summary 🔒

```json
{ "unreadLikeCount": 2, "pendingFriendRequestCount": 1, "badgeCount": 3 }
```

`badgeCount = unreadLikeCount + pendingFriendRequestCount`.

- `unreadLikeCount`: 존재하는 JAR_LIKED 알림 중 readAt=null 개수.
- `pendingFriendRequestCount`: 아직 처리하지 않은 받은 친구 요청 수. readAt 여부와 무관.
- 친구 요청의 읽음 처리만으로 badgeCount는 줄지 않는다. 수락·거절로 줄어든다.
- 좋아요 읽음·취소, 병 삭제, 친구 해제, 계정 삭제 후 summary를 다시 조회한다.

### 종 UI 연결 순서

1. 앱 진입·화면 재진입·종 열기 시 summary 즉시 조회.
2. **화면이 보이는 동안 30초 간격**으로 summary 갱신. 숨김 탭은 중지. 프런트가 타이머 구현.
3. 종 목록은 notifications 조회. 전체/요청/좋아요 탭은 type 필터 사용.
4. 좋아요 항목 클릭: `target.id`로 병 상세 열기 + 알림 `id`로 읽음 처리. 종 열기만으로 모두 읽지 않음.
5. 친구 요청: 알림 id로 읽음 처리 가능. 수락·거절은 `target.id`로 기존 요청 API 호출.
6. 읽음·수락·거절 후 필요한 목록·summary·친구 화면 재조회. 낙관적 배지 감소만으로 끝내지 않음.

## 8. 원자성·경합·삭제 계약

- 완료·편집·좋아요·친구 해제·계정 삭제는 관련 사용자 잠금을 일관된 순서로 획득하고 DB 트랜잭션에서 상태를 다시 검사한다.
- 편집은 expectedVersion 조건부 갱신과 감정 전체 교체가 하나의 트랜잭션. 충돌·중간 실패 시 이전 내용 보존.
- 동일 사용자/병 좋아요는 unique 상태 행으로 관리. 최초 상태 생성과 최초 알림 생성이 함께 성공/실패한다.
- 친구 해제와 좋아요가 경합하면 먼저 완료된 결과에 따라 해제가 좋아요를 정리하거나 좋아요가 권한 오류로 거부됨. 해제 후 반응이 남지 않음.
- 병 삭제 시 해당 좋아요·알림, 사용자 삭제 시 해당 사용자의 관련 상태·알림 정리. 친구 요청 삭제 시 연결 알림 정리.
- 동시 요청 응답의 도착 순서는 서버 확정 순서와 다를 수 있으므로 프런트는 같은 대상 변경을 직렬화하고 필요 시 최신 상태를 다시 읽는다.

## 9. 요청 제한·헬스체크

기존 IP 기준 분당 제한: 로그인 10, 회원가입 5, 닉네임 확인 30, 친구 요청 보내기 10, 친구 서재 30. 좋아요 설정·취소는 **인증 사용자 ID 기준, 두 메서드 합산 분당 60회** limiter를 적용한다. 초과 시 `429 RATE_LIMITED`와 응답 제한 헤더를 따른다.

- `GET /api/health/live`: `200 { "ok": true }`, DB에 연결하지 않음.
- `GET /api/health`: `200 { "ok": true, "db": "up" }`, DB 연결 포함.

두 경로는 인증 불필요. 단순 생존 확인과 DB 준비 상태 확인을 구분한다. 배포·마이그레이션과 롤백 주의사항은 [변경 안내](API_CHANGES_2026-09-24.md)를 참고한다.
