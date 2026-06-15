import { test, expect, Page } from "@playwright/test";

/**
 * E2E: In RTL, the scroll offset applied when navigating to a section must match
 * the sticky header height across a gradient of viewport widths (360–1024px).
 *
 * For each width we:
 *  - Navigate to a section via the in-page hash anchor (mobile menu when present,
 *    otherwise the desktop nav)
 *  - Verify the section heading's top sits just below the sticky header bottom,
 *    within a small tolerance (no occlusion, no excessive gap)
 */

const WIDTHS = [360, 390, 414, 480, 640, 768, 900, 1024] as const;
const HEIGHT = 800;

const SECTIONS = [
  { label: "שירותים", id: "services" },
  { label: "אודות", id: "about" },
  { label: "צור קשר", id: "contact" },
] as const;

const headerBottom = (page: Page) =>
  page.evaluate(() => {
    const h = document.querySelector("header");
    return h ? h.getBoundingClientRect().bottom : 0;
  });

const sectionHeadingTop = (page: Page, id: string) =>
  page.evaluate((sid) => {
    const el = document.getElementById(sid);
    if (!el) return null;
    const heading = el.querySelector("h1, h2, h3");
    return (heading ?? el).getBoundingClientRect().top;
  }, id);

const htmlDir = (page: Page) =>
  page.evaluate(() => document.documentElement.getAttribute("dir") || "");

const waitForScrollSettled = async (page: Page) => {
  await page.waitForFunction(
    () => {
      const w = window as Window & { __lastY?: number };
      if (typeof w.__lastY === "undefined") w.__lastY = -1;
      const same = w.__lastY === window.scrollY;
      w.__lastY = window.scrollY;
      return same;
    },
    undefined,
    { timeout: 3000, polling: 150 }
  );
};

const navigateToSection = async (page: Page, label: string, width: number) => {
  // xl breakpoint is 1280 in tailwind defaults; in this project the mobile
  // menu toggle is shown below xl. For 360–1024 the mobile menu is always used.
  if (width < 1280) {
    const toggle = page.getByRole("button", { name: "תפריט" });
    await toggle.click();
    const nav = page.locator("#mobile-nav");
    await expect(nav).toBeVisible({ timeout: 3000 });
    await nav.getByRole("link", { name: label }).click();
  } else {
    await page.getByRole("link", { name: new RegExp(label) }).first().click();
  }
  await waitForScrollSettled(page);
};

for (const width of WIDTHS) {
  test.describe(`RTL scroll offset matches sticky header — ${width}px`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

    test(`${width}px: document direction is RTL`, async ({ page }) => {
      expect(await htmlDir(page)).toBe("rtl");
    });

    for (const s of SECTIONS) {
      test(`${width}px: "${s.label}" lands flush below the sticky header`, async ({ page }) => {
        await navigateToSection(page, s.label, width);

        const top = await sectionHeadingTop(page, s.id);
        const hb = await headerBottom(page);

        expect(top, `#${s.id} heading should exist`).not.toBeNull();
        // Not occluded: heading top is at or below the sticky header bottom
        expect(top!).toBeGreaterThanOrEqual(hb - 1);
        // Offset is "tight": no excessive empty band between header and heading
        expect(top! - hb).toBeLessThan(200);
      });
    }
  });
}

/**
 * Single test that simulates a gradual resize within the same browser context,
 * to catch regressions where scroll offset is computed once and not refreshed
 * when the header height changes (e.g. wrapping → unwrapping).
 */
test.describe("Gradual resize keeps scroll offset in sync with header", () => {
  test.use({ viewport: { width: 360, height: HEIGHT } });

  test("offset stays correct as the viewport grows from 360 → 1024", async ({ page }) => {
    await page.goto("/");
    expect(await htmlDir(page)).toBe("rtl");

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: HEIGHT });
      // Allow header to re-measure
      await page.waitForTimeout(150);

      await navigateToSection(page, "אודות", width);

      const top = await sectionHeadingTop(page, "about");
      const hb = await headerBottom(page);

      expect(top, `[${width}px] heading should exist`).not.toBeNull();
      expect(top!, `[${width}px] not occluded by header`).toBeGreaterThanOrEqual(hb - 1);
      expect(top! - hb, `[${width}px] tight offset`).toBeLessThan(200);

      // Scroll back to top before next iteration to avoid resize-induced jitter
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
      await waitForScrollSettled(page);
    }
  });
});
