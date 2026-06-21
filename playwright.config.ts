import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // The heavier specs (gradual viewport-resize loops, large multi-file uploads)
  // run well under the 30s default in isolation, but 4 workers share a single
  // Vite dev server, so under contention they can briefly exceed 30s. A 60s
  // budget absorbs that without masking real hangs.
  timeout: 60_000,
  // Run several workers on CI so the 334-test suite finishes within the job
  // budget. The specs are client-side (form validation, focus, tab order,
  // toasts, hash nav) and share no server state, so parallelism is safe.
  workers: process.env.CI ? 4 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
