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

const headerBottom = (page: Page) =>
  page.evaluate(() => {
    const h = document.querySelector("header");
    return h ? h.getBoundingClientRect().bottom : 0;
  });

const sectionTop = (page: Page, id: string) =>
  page.evaluate((sid) => {
    const el = document.getElementById(sid);
    if (!el) return null;
    // Prefer the section's heading if present (h1/h2/h3) — that's the visible header.
    const heading = el.querySelector("h1, h2, h3");
    const target = heading ?? el;
    return target.getBoundingClientRect().top;
  }, id);

const waitForScrollSettled = async (page: Page) => {
  await page.waitForFunction(() => {
    const w = window as Window & { __lastY?: number };
    if (typeof w.__lastY === "undefined") w.__lastY = -1;
    const same = w.__lastY === window.scrollY;
    w.__lastY = window.scrollY;
    return same;
  }, undefined, { timeout: 3000, polling: 150 });
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
        await mobileNav(page).getByRole("link", { name: s.label }).click();
        await waitForScrollSettled(page);

        const top = await sectionTop(page, s.id);
        const hb = await headerBottom(page);

        expect(top, `#${s.id} should be in the DOM`).not.toBeNull();
        // Heading must not be occluded by the sticky header
        expect(top!).toBeGreaterThanOrEqual(hb - 1);
        // And should not be pushed too far down (reasonable breathing room)
        expect(top! - hb).toBeLessThan(200);
      });
    }

    test(`${o.name}: sticky header remains pinned at the viewport top after navigation`, async ({ page }) => {
      await openMenu(page);
      await mobileNav(page).getByRole("link", { name: "צור קשר" }).click();
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
