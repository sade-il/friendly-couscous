import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Deep-linking directly to a section via the URL hash (e.g. /#projects)
 * must land the section heading flush below the sticky header — not occluded —
 * including under prefers-reduced-motion: reduce. Verified for several
 * sections, on mobile and desktop viewports.
 */

const SECTIONS = [
  { hash: "services", label: "שירותים" },
  { hash: "about", label: "אודות" },
  { hash: "contact", label: "צור קשר" },
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

const waitForScrollSettled = async (page: Page) => {
  await page
    .waitForFunction(
      () => {
        // @ts-expect-error scratch state
        const last = window.__lastY;
        // @ts-expect-error scratch state
        window.__lastY = window.scrollY;
        return last === window.scrollY && window.scrollY > 0;
      },
      undefined,
      { timeout: 5000, polling: 100 }
    )
    .catch(() => {});
  await page.waitForTimeout(150);
};

const expectFlushBelowHeader = async (page: Page, id: string) => {
  const top = await sectionHeadingTop(page, id);
  const hb = await headerBottom(page);
  expect(top, `#${id} heading should exist`).not.toBeNull();
  expect(top!).toBeGreaterThanOrEqual(hb - 1);
  expect(top! - hb).toBeLessThan(160);
};

const expectStable = async (page: Page) => {
  const y1 = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(500);
  const y2 = await page.evaluate(() => window.scrollY);
  expect(Math.abs(y2 - y1)).toBeLessThanOrEqual(1);
};

test.describe("Deep link with reduce-motion — mobile", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("Reduced motion is reported", async ({ page }) => {
    await page.goto("/");
    expect(
      await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ).toBe(true);
  });

  for (const s of SECTIONS) {
    test(`Mobile reduce: deep link /#${s.hash} lands flush below header`, async ({ page }) => {
      await page.goto(`/#${s.hash}`);
      await expect(page.locator(`#${s.hash}`)).toBeVisible();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(new RegExp(`#${s.hash}$`));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expectFlushBelowHeader(page, s.hash);
      await expectStable(page);
    });
  }
});

test.describe("Deep link with reduce-motion — desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  for (const s of SECTIONS) {
    test(`Desktop reduce: deep link /#${s.hash} lands flush below header`, async ({ page }) => {
      await page.goto(`/#${s.hash}`);
      await expect(page.locator(`#${s.hash}`)).toBeVisible();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(new RegExp(`#${s.hash}$`));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expectFlushBelowHeader(page, s.hash);
      await expectStable(page);
    });
  }

  test.skip("Desktop reduce: page reload at /#projects re-aligns flush below header", async ({ page }) => {
    await page.goto("/#projects");
    await waitForScrollSettled(page);
    await page.reload();
    await expect(page.locator("#projects")).toBeVisible();
    await waitForScrollSettled(page);

    await expectFlushBelowHeader(page, "projects");
    await expectStable(page);
  });
});
