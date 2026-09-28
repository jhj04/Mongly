import { configDefaults, defineConfig } from "vitest/config";

// *.int.test.ts는 실제 DB가 필요한 통합 테스트 — `npm run test:int`로만 실행 (README 참조)
const isInt = process.env.INT === "1";

// Never inherit an application's DATABASE_URL for destructive integration fixtures.
// Only a separately named, local test database is accepted, before Prisma is imported.
if (isInt) {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("test:int requires TEST_DATABASE_URL pointing to a local mongly_test database.");
  const url = new URL(testUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^\/mongly_test(?:_[a-z0-9_]+)?$/.test(url.pathname) ||
    url.searchParams.has("host")
  ) {
    throw new Error("Integration tests require a localhost database named mongly_test or mongly_test_*. External databases are refused.");
  }
  process.env.DATABASE_URL = testUrl;
  process.env.DIRECT_URL = testUrl;
}

export default defineConfig({
  test: {
    exclude: isInt ? [...configDefaults.exclude] : [...configDefaults.exclude, "**/*.int.test.ts"],
    // 실제 PostgreSQL에서 경합을 검증하므로 통합 테스트는 넉넉한 타임아웃이 필요하다
    testTimeout: isInt ? 30000 : 5000,
    hookTimeout: isInt ? 30000 : 10000,
    // 무료 티어 커넥션 풀 압박을 줄이려 통합 테스트 파일을 직렬 실행 (동시 커넥션 리셋 방지)
    fileParallelism: !isInt,
  },
});
