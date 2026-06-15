import { test, expect } from "@playwright/test";

test.describe("home og:url tag", () => {
  test("has exactly one og:url meta with the home URL", async ({ page }) => {
    await page.goto("/");

    // Wait for react-helmet-async to dedupe og:url in <head>.
    await expect
      .poll(
        async () =>
          await page.locator('head > meta[property="og:url"]').count(),
        { timeout: 5000 }
      )
      .toBe(1);

    const ogUrl = page.locator('head > meta[property="og:url"]');
    await expect(ogUrl).toHaveAttribute("content", "https://sade-il.com/");
  });
});
