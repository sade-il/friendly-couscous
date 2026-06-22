import { test, expect, Page } from "@playwright/test";

/**
 * E2E: After clicking a mobile menu link, the target section's header must NOT be
 * hidden under the sticky site header — verified in both portrait and landscape.
 */

const SECTIONS = [
  { label: "שירותים", id: "services" },
  { label: "אודות", id: "about" },
  { label: "צור קשר", id: "contact" },
] as const;

const ORIENTATIONS = [
  { name: "portrait", width: 390, height: 844 },
  { name: "landscape", width: 844, height: 390 },
] as const;

const menuButton = (page: Page) => page.getByRole("button", { name: "תפריט", exact: true });
const mobileNav = (page: Page) => page.locator("#mobile-nav");

const openMenu = async (page: Page) => {
  const btn = menuButton(page);
  await btn.click();
  await expect(mobileNav(page)).toBeVisible({ timeout: 3000 });
};

const sectionTop = (page: Page, id: string) =>
  page.evaluate((sid) => {
    const el = document.getElementById(sid);
    if (!el) return null;
    // Prefer the section's heading if present (h1/h2/h3) — that's the visible header.
    const heading = el.querySelector("h1, h2, h3");
    const target = heading ?? el;
    return target.getBoundingClientRect().top;
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
  await page.waitForFunction(() => {
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
  }, undefined, { timeout: 5000, polling: 150 }).catch(() => {});
  await page.waitForTimeout(150);
};

for (const o of ORIENTATIONS) {
  test.describe(`Section header not hidden under sticky header — ${o.name}`, () => {
    test.use({ viewport: { width: o.width, height: o.height } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

    for (const s of SECTIONS) {
      test(`${o.name}: clicking "${s.label}" places #${s.id} below the sticky header`, async ({ page }) => {
        await openMenu(page);
        const link = mobileNav(page).getByRole("link", { name: s.label });
        await link.scrollIntoViewIfNeeded();
        await link.click();
        await waitForScrollSettled(page);

        const top = await sectionTop(page, s.id);

        expect(top, `#${s.id} should be in the DOM`).not.toBeNull();
        await expect.poll(() => alignmentDelta(page, s.id), { timeout: 5000 }).toBeGreaterThanOrEqual(-1);
        await expect.poll(() => alignmentDelta(page, s.id), { timeout: 5000 }).toBeLessThan(200);
      });
    }

    test(`${o.name}: sticky header remains pinned at the viewport top after navigation`, async ({ page }) => {
      await openMenu(page);
      const link = mobileNav(page).getByRole("link", { name: "צור קשר" });
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await waitForScrollSettled(page);

      const rect = await page.evaluate(() => {
        const h = document.querySelector("header");
        if (!h) return null;
        const r = h.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height };
      });

      expect(rect).not.toBeNull();
      expect(rect!.top).toBeLessThanOrEqual(1);
      expect(rect!.bottom).toBeGreaterThan(0);
      expect(rect!.height).toBeGreaterThan(40);
    });
  });
}
