import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Smooth scroll via the DESKTOP nav (xl+ breakpoint, ≥1280px) must land
 * the section heading exactly below the sticky header — same contract as the
 * mobile menu path. Verified with default motion and with reduce-motion.
 */

const SECTIONS = [
  { label: "שירותים", id: "services" },
  { label: "אודות", id: "about" },
  { label: "צור קשר", id: "contact" },
] as const;

const DESKTOP = { width: 1440, height: 900 };

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

const waitForScrollSettled = async (page: Page) => {
  await page
    .waitForFunction(
      () => {
        // @ts-expect-error scratch state on window
        const last = window.__lastY;
        // @ts-expect-error scratch state on window
        window.__lastY = window.scrollY;
        return last === window.scrollY && window.scrollY > 0;
      },
      undefined,
      { timeout: 3000, polling: 100 }
    )
    .catch(() => {});
  await page.waitForTimeout(120);
};

const desktopNavLink = (page: Page, label: string) =>
  page.locator("header nav").getByRole("link", { name: label }).first();

const clickDesktopLink = async (page: Page, label: string) => {
  // Mobile menu toggle must NOT be visible at desktop widths
  await expect(page.getByRole("button", { name: "תפריט", exact: true })).toBeHidden();
  await desktopNavLink(page, label).click();
  await waitForScrollSettled(page);
};

test.describe("Desktop nav — smooth scroll lands flush below sticky header", () => {
  test.use({ viewport: DESKTOP });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  for (const s of SECTIONS) {
    test(`Desktop "${s.label}" → #${s.id} sits flush below header`, async ({ page }) => {
      const startY = await page.evaluate(() => window.scrollY);
      await clickDesktopLink(page, s.label);

      await expect(page).toHaveURL(new RegExp(`#${s.id}$`));
      const endY = await page.evaluate(() => window.scrollY);
      expect(endY).toBeGreaterThan(startY);

      const top = await sectionHeadingTop(page, s.id);
      const hb = await headerBottom(page);
      expect(top, `#${s.id} heading should exist`).not.toBeNull();
      expect(top!).toBeGreaterThanOrEqual(hb - 1);
      expect(top! - hb).toBeLessThan(160);
    });
  }

  test("Final scroll position is stable after smooth animation completes", async ({ page }) => {
    await clickDesktopLink(page, "אודות");
    const y1 = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(400);
    const y2 = await page.evaluate(() => window.scrollY);
    expect(Math.abs(y2 - y1)).toBeLessThanOrEqual(1);
  });

  test("Sequential desktop nav clicks each land flush below header", async ({ page }) => {
    for (const s of SECTIONS) {
      await clickDesktopLink(page, s.label);
      const top = await sectionHeadingTop(page, s.id);
      const hb = await headerBottom(page);
      expect(top!).toBeGreaterThanOrEqual(hb - 1);
      expect(top! - hb).toBeLessThan(160);
    }
  });
});

test.describe("Desktop nav under prefers-reduced-motion: reduce", () => {
  test.use({ viewport: DESKTOP, reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Reduced motion is reported by the browser", async ({ page }) => {
    const reduced = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    expect(reduced).toBe(true);
  });

  for (const s of SECTIONS) {
    test(`reduce-motion desktop: "${s.label}" lands flush below header`, async ({ page }) => {
      await clickDesktopLink(page, s.label);
      const top = await sectionHeadingTop(page, s.id);
      const hb = await headerBottom(page);
      expect(top, `#${s.id} heading should exist`).not.toBeNull();
      expect(top!).toBeGreaterThanOrEqual(hb - 1);
      expect(top! - hb).toBeLessThan(160);
    });
  }
});
