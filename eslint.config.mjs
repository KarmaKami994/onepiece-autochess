import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".vinext/**",
    "out/**",
    "build/**",
    "coverage/**",
    "dist/**",
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    "outputs/**",
    "work/**",
    "tmp/**",
    ".codex-local/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
