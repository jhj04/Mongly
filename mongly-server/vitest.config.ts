import { configDefaults, defineConfig } from "vitest/config";

// *.int.test.ts는 실제 DB가 필요한 통합 테스트 — `npm run test:int`로만 실행 (README 참조)
export default defineConfig({
  test: {
    exclude: process.env.INT
      ? [...configDefaults.exclude]
      : [...configDefaults.exclude, "**/*.int.test.ts"],
  },
});
