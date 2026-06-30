// ESLint flat config — TypeScript rules for isoroll-module; extends workspace shared rules (R1-R6).
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import { localPlugin, sharedRules } from "../eslint.shared.js";

export default [
  { ignores: ["src/**/*.d.ts"] },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },
    plugins: { "@typescript-eslint": tseslint, local: localPlugin },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...sharedRules,
      "@typescript-eslint/explicit-function-return-type": "warn",
    },
  },
];
