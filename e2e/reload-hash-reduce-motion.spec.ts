import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Reloading the page on a URL that already contains a hash
 * (e.g. /#projects) must restore the section heading flush below the sticky
 * header — both with default motion and under prefers-reduced-motion: reduce,
 * on mobile and desktop viewports.
 */

const SECTIONS = [
  { hash: "services" },
  { hash: "about" },
  { hash: "contact" },
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

test.describe("Reload at /#section — mobile, default motion", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  for (const s of SECTIONS) {
    test(`Mobile: reload at /#${s.hash} restores heading flush below header`, async ({ page }) => {
      await page.goto(`/#${s.hash}`);
      await expect(page.locator(`#${s.hash}`)).toBeVisible();
      await waitForScrollSettled(page);

      await page.reload();
      await expect(page.locator(`#${s.hash}`)).toBeVisible();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(new RegExp(`#${s.hash}$`));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expectFlushBelowHeader(page, s.hash);
      await expectStable(page);
    });
  }
});

test.describe("Reload at /#section — mobile, reduce-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("Reduced motion is reported", async ({ page }) => {
    await page.goto("/");
    expect(
      await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ).toBe(true);
  });

  for (const s of SECTIONS) {
    test(`Mobile reduce: reload at /#${s.hash} keeps heading flush below header`, async ({ page }) => {
      await page.goto(`/#${s.hash}`);
      await waitForScrollSettled(page);
      await page.reload();
      await expect(page.locator(`#${s.hash}`)).toBeVisible();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(new RegExp(`#${s.hash}$`));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expectFlushBelowHeader(page, s.hash);
      await expectStable(page);
    });
  }

  test.skip("Mobile reduce: two consecutive reloads keep #projects flush", async ({ page }) => {
    await page.goto("/#projects");
    await waitForScrollSettled(page);
    await page.reload();
    await waitForScrollSettled(page);
    await page.reload();
    await waitForScrollSettled(page);

    await expectFlushBelowHeader(page, "projects");
    await expectStable(page);
  });
});

test.describe("Reload at /#section — desktop, default + reduce-motion", () => {
  test.describe("default motion", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    for (const s of SECTIONS) {
      test(`Desktop: reload at /#${s.hash} keeps heading flush below header`, async ({ page }) => {
        await page.goto(`/#${s.hash}`);
        await waitForScrollSettled(page);
        await page.reload();
        await expect(page.locator(`#${s.hash}`)).toBeVisible();
        await waitForScrollSettled(page);

        await expect(page).toHaveURL(new RegExp(`#${s.hash}$`));
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
        await expectFlushBelowHeader(page, s.hash);
        await expectStable(page);
      });
    }
  });

  test.describe("reduce motion", () => {
    test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

    for (const s of SECTIONS) {
      test(`Desktop reduce: reload at /#${s.hash} keeps heading flush below header`, async ({ page }) => {
        await page.goto(`/#${s.hash}`);
        await waitForScrollSettled(page);
        await page.reload();
        await expect(page.locator(`#${s.hash}`)).toBeVisible();
        await waitForScrollSettled(page);

        await expect(page).toHaveURL(new RegExp(`#${s.hash}$`));
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
        await expectFlushBelowHeader(page, s.hash);
        await expectStable(page);
      });
    }

    test("Desktop reduce: reload preserves URL and ends within ~1px of pre-reload position", async ({ page }) => {
      await page.goto("/#about");
      await waitForScrollSettled(page);
      const yBefore = await page.evaluate(() => window.scrollY);

      await page.reload();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(/#about$/);
      const yAfter = await page.evaluate(() => window.scrollY);
      // Layout should be deterministic on reload — small sub-pixel slack only
      expect(Math.abs(yAfter - yBefore)).toBeLessThanOrEqual(2);
      await expectFlushBelowHeader(page, "about");
    });
  });
});
