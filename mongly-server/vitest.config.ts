import { configDefaults, defineConfig } from "vitest/config";

// *.int.test.ts는 실제 DB가 필요한 통합 테스트 — `npm run test:int`로만 실행 (README 참조)
const isInt = !!process.env.INT;

export default defineConfig({
  test: {
    exclude: isInt ? [...configDefaults.exclude] : [...configDefaults.exclude, "**/*.int.test.ts"],
    // Neon을 네트워크로 여러 번 왕복하므로 통합 테스트는 넉넉한 타임아웃이 필요하다
    testTimeout: isInt ? 30000 : 5000,
    hookTimeout: isInt ? 30000 : 10000,
    // 무료 티어 커넥션 풀 압박을 줄이려 통합 테스트 파일을 직렬 실행 (동시 커넥션 리셋 방지)
    fileParallelism: !isInt,
  },
});
