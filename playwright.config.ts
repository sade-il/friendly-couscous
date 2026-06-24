import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // The heavier specs (gradual viewport-resize loops, large multi-file uploads)
  // run well under the 30s default in isolation, but 4 workers share a single
  // Vite dev server, so under contention they can briefly exceed 30s. A 60s
  // budget absorbs that without masking real hangs.
  timeout: 60_000,
  // Keep CI parallelism moderate: 4 workers on shared runners caused frequent
  // 5s wait/assertion timeouts (scroll settle + toast visibility) under load.
  // 2 workers trades a small runtime increase for much better stability.
  workers: process.env.CI ? 2 : undefined,
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
    command: "npx vite --port 8080 --strictPort",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
