import { test, expect } from "@playwright/test";

test.describe("/projects canonical tag", () => {
  test("has exactly one canonical link pointing to the projects page", async ({ page }) => {
    await page.goto("/projects");

    // Wait for react-helmet-async to inject the canonical into <head>.
    await expect
      .poll(
        async () =>
          await page.locator('head > link[rel="canonical"]').count(),
        { timeout: 5000 }
      )
      .toBe(1);

    const canonical = page.locator('head > link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      "href",
      "https://sade-il.com/projects"
    );
  });
});
