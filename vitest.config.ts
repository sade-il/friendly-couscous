import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "lcov", "html"],
      reportsDirectory: "./coverage",
      // Gate only the shared redirect-canonical module. The two redirect
      // test files that import it (decoding-order and malformed-percent)
      // are the highest-signal callers and together exercise every branch.
      include: ["src/lib/redirect-canonical.ts"],
      thresholds: {
        perFile: true,
        lines: 100,
        functions: 100,
        // 94% leaves room for the root-path branch of `trailingVariant`,
        // which is unreachable from `checkRedirect` (guarded by toPath !== "/")
        // and therefore can't be exercised through the gated test files.
        branches: 94,
        statements: 100,

      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
