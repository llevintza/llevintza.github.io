import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Turn off stylistic rules that Prettier owns.
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright output (see e2e/README.md): a failed run's report holds
    // trace-viewer bundles that would otherwise fail `pnpm lint`.
    "playwright-report/**",
    "test-results/**",
    "ux-screenshots/**",
  ]),
]);

export default eslintConfig;
