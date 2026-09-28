# Mongly

## 백엔드 API

- [전체 API 명세](docs/API.md)
- [2026-09-24 변경사항·프런트 연결 순서·로컬 테스트·배포 절차](docs/API_CHANGES_2026-09-24.md)
- [OpenAPI JSON](docs/openapi.json)
- [백엔드 검증 결과 — 231개 테스트](docs/VALIDATION_2026-09-24.md)
- 실행 중인 서버: Swagger UI `/api/docs`, JSON `/api/openapi.json`

OpenAPI 정본은 `mongly-server/src/docs/openapi.ts`입니다. 변경 후 `mongly-server`에서 `npm run docs:generate`로 JSON을 갱신합니다. `npm run typecheck`, `npm test`로 기본 검증하고, DB 통합 테스트는 위 안내의 격리된 `TEST_DATABASE_URL`을 사용합니다.
