// Loop 5 (.loop/dsl-v2-ts-twin) — scratch config to run the DSL v2 twin user-scenario script,
// which intentionally lives outside vitest.config.ts's default include (test/unit/**/*.test.ts)
// so it never runs as part of `npm run verify:fast`. Delete after Loop 5/6 unless kept for reuse.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/e2e/dsl-v2-twin-scenario.test.ts"],
    environment: "node",
    setupFiles: ["test/unit/setup.ts"],
  },
});
