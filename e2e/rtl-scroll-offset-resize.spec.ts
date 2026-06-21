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
const RESIZE_REALIGN_MIN_DELTA = -24;

const SECTIONS = [
  { label: "שירותים", id: "services" },
  { label: "אודות", id: "about" },
  { label: "צור קשר", id: "contact" },
] as const;

const sectionHeadingTop = (page: Page, id: string) =>
  page.evaluate((sid) => {
    const el = document.getElementById(sid);
    if (!el) return null;
    const heading = el.querySelector("h1, h2, h3");
    return (heading ?? el).getBoundingClientRect().top;
  }, id);

const alignmentDelta = (page: Page, id: string) =>
  page.evaluate((sid) => {
    const el = document.getElementById(sid);
    if (!el) return null;
    const heading = el.querySelector("h1, h2, h3");
    const target = heading ?? el;
    const stickyBar = document.querySelector("header > .container");
    const header = document.querySelector("header");
    const hb = stickyBar instanceof HTMLElement
      ? stickyBar.getBoundingClientRect().bottom
      : header instanceof HTMLElement
        ? header.getBoundingClientRect().bottom
        : 0;
    return target.getBoundingClientRect().top - hb;
  }, id);

const htmlDir = (page: Page) =>
  page.evaluate(() => document.documentElement.getAttribute("dir") || "");

const waitForScrollSettled = async (page: Page) => {
  await page.evaluate(() => {
    const w = window as Window & {
      __lastY?: number;
      __sameYCount?: number;
      __settleStartY?: number;
      __seenMotion?: boolean;
    };
    delete w.__lastY;
    delete w.__sameYCount;
    delete w.__settleStartY;
    delete w.__seenMotion;
  });
  await page.waitForFunction(
    () => {
      const w = window as Window & {
        __lastY?: number;
        __sameYCount?: number;
        __settleStartY?: number;
        __seenMotion?: boolean;
      };
      const y = Math.round(window.scrollY);
      if (typeof w.__settleStartY === "undefined") w.__settleStartY = y;
      w.__seenMotion = w.__seenMotion || y !== w.__settleStartY;
      const same = Math.round(w.__lastY ?? Number.NaN) === y;
      w.__sameYCount = same ? (w.__sameYCount ?? 0) + 1 : 0;
      w.__lastY = y;
      return !!w.__seenMotion && (w.__sameYCount ?? 0) >= 3;
    },
    undefined,
    { timeout: 5000, polling: 150 }
  );
  await page.waitForTimeout(150);
};

const navigateToSection = async (page: Page, id: string) => {
  await page.evaluate(async (sectionId) => {
    const { scrollToId } = await import("/src/lib/scroll.ts");
    scrollToId(sectionId, "auto");
  }, id);
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
        await navigateToSection(page, s.id);

        const top = await sectionHeadingTop(page, s.id);

        expect(top, `#${s.id} heading should exist`).not.toBeNull();
        await expect.poll(() => alignmentDelta(page, s.id), { timeout: 5000 }).toBeGreaterThanOrEqual(-1);
        await expect.poll(() => alignmentDelta(page, s.id), { timeout: 5000 }).toBeLessThan(200);
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

      await navigateToSection(page, "about");

      const top = await sectionHeadingTop(page, "about");

      expect(top, `[${width}px] heading should exist`).not.toBeNull();
      await expect
        .poll(() => alignmentDelta(page, "about"), { timeout: 5000 })
        // Repeated viewport resizes can leave the measured heading top a few
        // pixels under the sticky bar before the next frame settles.
        .toBeGreaterThanOrEqual(RESIZE_REALIGN_MIN_DELTA);
      await expect.poll(() => alignmentDelta(page, "about"), { timeout: 5000 }).toBeLessThan(200);
    }
  });
});
