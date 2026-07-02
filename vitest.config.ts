// Vitest config — T1 unit tests for pure math modules (see workspace VERIFY.md).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts"],
    environment: "node",
    setupFiles: ["test/unit/setup.ts"],
  },
});
