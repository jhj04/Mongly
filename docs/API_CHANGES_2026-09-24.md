# 2026-09-24 백엔드 API 변경·프런트 연동 안내

계약 버전 **0.6.0**. 최종 계약은 [API.md](API.md)와 [openapi.json](openapi.json)이다. 이전 개발계획의 일기 상세 전용·좋아요 전용 알림·친구 요청 backfill 없음 서술은 아래 **최종 승인 계약**으로 대체한다.

## 1. 기존 → 변경

| 영역 | 기존 | 변경 / 프런트 작업 |
| --- | --- | --- |
| 병 완료 | body 없는 POST | `{note}` 선택 입력 추가. body 생략·{}·null도 호환 |
| 일기 공개 | 일기 없음 | 최대 50 grapheme. 본인/현재 친구에게 **목록·상세 모두** 공개. 공개 설정 없음 |
| Jar 응답 | id, recordDate, dominantEmotionId, emotions | 기존 필드 유지 + note, createdAt, updatedAt, version, canEdit, canLike, likeCount, likedByMe |
| 완성본 편집 | 불가 | `PATCH /jars/:id`, 본인의 KST 오늘 병만. note·감정 전체 구성 수정 |
| 보관 | 8번째 완료 시 가장 오래된 병 삭제 | 저장 총량 한도 제거. **기존 병 자동 삭제 없음** |
| 내 병 목록 | `{jars}` 전체(최대7) | `{jars,nextCursor,hasMore}`. 기본7·최대50의 페이지 크기 |
| 친구 병 | 친구마다 최신1 | 유지. 공통 Jar 확장 필드 포함. 최신은 recordDate 기준 |
| 좋아요 | 없음 | `PUT/DELETE /jars/:id/like` 설정/취소, 서버 확정 상태 응답 |
| 종 목록 | 친구 요청만 조회 | `GET /notifications`로 FRIEND_REQUEST/JAR_LIKED 통합. type 필터 가능 |
| 종 배지 | `/friend-requests`의 total | `/notifications/summary`의 badgeCount |
| 개별 읽음 | 없음 | `PATCH /notifications/:id/read`, 두 타입 모두 가능 |
| 요청 수락·거절 | 기존 요청 API | 유지. 통합 알림의 **target.id**를 요청 ID로 사용 |
| 알림 폴링 | 이전 문서 60초 권고 | 화면 표시 중 **30초**, 재진입·종 열기 즉시. 프런트 구현 |
| 친구 해제 | 관계만 삭제 | 양방향 좋아요 이력과 알림도 실제 삭제 |

한 병의 구슬 합계1~7, KST 날짜당1병, 친구10명은 유지한다. 보관 페이지가7개라는 이유로 `7/7` 저장 한도 UI를 표시하지 않는다.

## 2. 그대로 호환되는 부분과 주의할 부분

- 기존 body 없는 `POST /jars`는 계속 성공할 수 있다. 일기는 null로 저장된다.
- 기존 Jar 필드는 유지된다. 단 `GET /jars`의 첫 응답만 사용하면 오래된 기록을 전부 보여주지 못하므로 다음 페이지 연결이 필요하다.
- 기존 친구 요청 조회·수락·거절 API는 유지된다. 친구 요청 total을 전체 종 배지로 계속 사용하면 좋아요 알림이 누락된다.
- 현재 일기는 선택이며 **자동으로 친구에게 공개**된다. 프런트 입력 안내와 상세 표시를 같은 정책으로 맞춘다.
- 이전 문서의 PNG 업로드·imageUrl 설명은 현재 서버 계약과 맞지 않아 제거했다. 병·캐릭터는 emotions 데이터로 렌더링한다.
- 과거 자동 삭제로 이미 사라진 병은 이번 변경만으로 복구되지 않는다.

## 3. 권장 프런트 연결 순서

### 1 — 타입·클라이언트

1. JSON 명세로 Jar, JarPage, TodayState, LikeState, Notification의 discriminated union 타입 확인.
2. 인증 fetch는 same-origin 쿠키 사용. 본문이 있으면 application/json, 인증 응답은 no-store.
3. 공통 오류 봉투와 nullable 필드 처리. 특히 note·dominantEmotionId·readAt·nextCursor·친구 jar가 null일 수 있다.

명세 확인 방법:

- Swagger UI: 서버 `/api/docs`
- 서버 JSON: `/api/openapi.json`
- 저장소 JSON: `docs/openapi.json`
- 원본 수정 후 `mongly-server`에서 `npm run docs:generate`
- JSON 파일은 직접 편집하지 않는다. 정본 TS와 출력 JSON의 동기화 검사가 테스트에 포함된다.

### 2 — 완료 화면

- 최대50자 카운터를 grapheme 기준으로 구현. `String.length`/HTML maxlength만 사용하지 않음.
- 서버와 같은 NFC·trim 및 개행/제어문자 거부 규칙 적용. 앞뒤 개행도 오류이며, 공백만 있으면 null.
- `{note}`와 POST /jars를 연결. 실패 시 문장·감정 UI를 유지.
- 응답 유실 시 GET /jars/today. 이미 저장됐을 수 있으므로 POST를 무조건 반복해 덮어쓰지 않음.

### 3 — 상세·편집

- canEdit이 true일 때 편집 제공. 수정 시각은 version>1일 때 updatedAt으로 표시.
- 최신 version을 expectedVersion으로 전송. note 또는 emotions 중 최소 하나 전송.
- emotions는 전체 교체이며 count 합계1~7. 완료본 편집에 draft API를 사용하지 않음.
- 409 JAR_VERSION_CONFLICT는 새 상세를 읽고 로컬 입력과 비교. 자동 덮어쓰기 금지.
- 409 JAR_EDIT_WINDOW_CLOSED는 KST 자정 경과. 저장 실패한 입력은 화면에 보존하며 편집 종료 안내.
- no-op은 version·updatedAt이 바뀌지 않는 정상200. 좋아요와 알림도 편집 때문에 변경되지 않음.

### 4 — 보관함

- 첫 페이지 limit=7. hasMore=true이면 nextCursor로 다음 요청.
- 커서는 내용 해석·직접 생성 없이 URL 인코딩해 사용.
- 추가 로딩은 ID 기준 병합. 최신 기록 새로고침은 첫 페이지부터 다시 조회.
- 전체 보관 수와 페이지 개수를 혼동하지 않음. API는 전체 total을 제공하지 않음.

### 5 — 친구 하트

- canLike·likedByMe·likeCount로 상태 표시. 본인 병에는 하트 조작 불가.
- 같은 병의 변경은 직렬화하고 반환 `{jarId,likedByMe,likeCount}`로 보정.
- 취소하면 알림 삭제. 재좋아요는 알림 재생성 없음. 관계 해제 후 재친구는 새 최초 좋아요 취급.
- PUT+DELETE는 사용자ID 기준 합산 분당60회. 429일 때 반복 전송하지 않음.

### 6 — 통합 종

- summary로 배지, notifications로 목록을 조회. type을 바꾸면 cursor를 버리고 첫 페이지부터 조회.
- 알림 `id`는 읽음용, `target.id`는 병 열기 또는 요청 수락·거절용.
- 요청 알림을 읽어도 pendingFriendRequestCount는 유지. 처리한 뒤 감소.
- 개별 읽음 최초 readAt 유지. 종을 열기만 해도 모두 읽음 처리하는 API는 없음.
- 조회했던 알림이 취소·거절·관계 해제로 사라져404이면 목록·summary 재조회.
- 화면 표시 중30초 갱신, 숨김 시 중지, 재진입·종 열기 시 즉시 갱신. 백엔드는 타이머·푸시를 실행하지 않음.

## 4. API별 빠른 예시

모든 예시는 `/api` 아래 경로이며 로그인 쿠키가 필요하다.

```http
POST /api/jars
Content-Type: application/json

{"note":"오늘 발표를 끝냈다."}
```

```http
PATCH /api/jars/cmjar0001
Content-Type: application/json

{"expectedVersion":1,"note":null,"emotions":[{"emotionId":1,"count":2}]}
```

```http
GET /api/jars?limit=7
PUT /api/jars/cmjar0002/like
DELETE /api/jars/cmjar0002/like
GET /api/notifications?limit=20
GET /api/notifications?type=FRIEND_REQUEST&limit=20
GET /api/notifications/summary
PATCH /api/notifications/cmnotification0001/read
POST /api/friend-requests/cmrequest0001/accept
```

수락·읽음·좋아요 PUT/DELETE는 본문 없이 호출한다. 상세 응답 schema와 오류별 예시는 [API.md](API.md) 및 Swagger 참고.

## 5. 데이터·동시성 정책

- 기존 Jar는 note=null, version=1, updatedAt=기존 createdAt으로 이전한다.
- 기존 대기 FriendRequest를 **FRIEND_REQUEST Notification으로 backfill**한다. readAt=null로 시작하되 요청은 그대로 유지한다.
- Notification의 type과 연결 대상은 일치해야 한다. 요청 알림은 FriendRequest, 좋아요 알림은 JarLike를 참조.
- 좋아요 취소는 상태 행을 비활성으로 남겨 재알림을 방지하고, 알림만 지운다.
- 친구 해제는 양방향 비활성 이력까지 물리 삭제. 재친구가 되더라도 옛 반응을 복원하지 않는다.
- 병·사용자·요청 삭제는 관련 FK cascade로 알림까지 정리한다.
- 오늘 수정은 사용자 잠금 후 날짜·버전을 재검사하고 조건부 갱신한다. 관계 변경·좋아요는 관련 사용자 잠금을 같은 순서로 사용해 해제 후 반응이 남는 경합을 막는다.
- 한 페이지 조회와 배지 집계는 일관된 DB 읽기를 사용하지만 여러 페이지 전체가 고정 스냅샷은 아니다. 새로운 알림은 첫 페이지 재조회로 확인한다.

## 6. 검증 절차 — 로컬 전용 테스트 DB

Node20 이상 및 백엔드 의존성 설치가 전제다. 아래 명령은 **Mongly/mongly-server**에서 실행한다.

### DB 없이 실행

```sh
npm run docs:generate
npm run typecheck
npm test
```

### 격리 PostgreSQL 통합 테스트

테스트는 fixture 데이터를 삭제한다. 앱의 DATABASE_URL을 재사용하지 않도록 `TEST_DATABASE_URL`을 명시한다. 예시는 Docker의 별도 test 프로필·55432 포트를 사용한다.

```sh
docker compose --profile test up -d db-test
export TEST_DATABASE_URL='postgresql://mongly:mongly@127.0.0.1:55432/mongly_test?schema=public'
DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="$TEST_DATABASE_URL" npx prisma generate
DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="$TEST_DATABASE_URL" npx prisma db seed
npm run test:int
```

- `npm run test:int`만 `INT=1`을 설정한다. INT가 정확히1이 아니면 통합 테스트 모드가 아니다.
- 테스트 설정은 TEST_DATABASE_URL을 필수로 받고, host는 localhost/127.0.0.1/[::1], DB명은 mongly_test 또는 mongly_test_*만 허용한다. DB명 접미사는 소문자·숫자·밑줄이며 최소1자다.
- host 우회 query와 외부 주소를 거부하며 Prisma import 전에 DATABASE_URL·DIRECT_URL을 테스트 주소로 덮어쓴다.
- 감정 마스터가 필요하므로 migration·Prisma client 생성 후 위 seed를 테스트 DB에 실행한다.
- Docker DB가 준비된 다음 migration을 실행한다. 이 절차에 운영 주소나 DB reset은 사용하지 않는다.
- `db-test`는 tmpfs를 사용해 폐기 가능한 DB다. 검수 뒤 `docker compose --profile test stop db-test`로 종료할 수 있다.

주요 검수: 50/51grapheme·emoji·개행, 기존 note=null 호환, 8개 이상 보존·페이지, 오늘/자정·stale version·no-op, 동시 좋아요1개·첫 알림1개, 취소/재좋아요, 두 알림 타입 읽음·필터 커서·배지, 친구 해제·병 삭제·탈퇴와의 경합.

## 7. 배포와 롤백

이 문서는 절차이며 운영 DB 변경·배포를 실행했다는 의미가 아니다.

1. 운영 백업·복구 가능 여부 및 현재 schema/migration 상태 확인.
2. **모든 상태 변경 요청을 일시 중지**하고 진행 중 요청을 끝낸다. 완료뿐 아니라 친구 요청 생성/처리도 포함한다.
3. 새 추가형 migration 적용. 기존 병 note/time/version 보강, 좋아요/통합 알림 테이블·제약·인덱스, 기존 대기 요청 backfill을 원자적으로 적용한다.
4. 새 Prisma client로 빌드한 서버로 모두 전환한다. 구 인스턴스와 진행 중 구 요청이 없음을 확인한다.
5. 변경 요청을 재개하고 smoke 검증: body 없는 완료, note완료, 8개 이상보존, 오늘편집, 기존요청 알림, 첫좋아요, summary.
6. 프런트 연동·배포 후 오류율·페이지·배지·중복 반응·편집 충돌 확인.

**쓰기 중단이 필요한 두 이유:** 구 서버의 FIFO가 누적 병을 삭제할 수 있고, backfill 뒤 구 서버가 친구 요청을 생성하면 연결 Notification 없이 요청만 남을 수 있다.

롤백에도 FIFO 제거와 통합 친구 요청 알림 생성·정리 호환성을 유지해야 한다. 기능을 끄더라도 오래된 FIFO 서버로 통째로 복귀하지 않으며, 신규 컬럼·테이블을 즉시 DROP하지 않는다. 배포 전에 쓴 안전한 rollback 버전을 준비한다. 이번 변경과 무관한 기존 JarImage 테이블을 migration에 섞어 삭제하지 않는다.
