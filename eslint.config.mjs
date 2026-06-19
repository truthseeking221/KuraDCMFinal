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
    "**/.next/**",
    "**/node_modules/**",
    "out/**",
    "**/out/**",
    "build/**",
    "**/build/**",
    "**/next-env.d.ts",
    // Claude Code worktree copies — tool artifacts, not project sources.
    ".claude/**",
    // Local scratch exports — tool artifacts, not project sources.
    "tmp/**",
  ]),
]);

export default eslintConfig;
