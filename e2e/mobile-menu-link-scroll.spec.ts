import { test, expect, Page } from "@playwright/test";

/**
 * E2E: After clicking a link in the mobile menu, the page scrolls to the
 * target section and the section's top is NOT hidden underneath the
 * sticky site header. The header reserves ~96px (see scrollToHash), so the
 * section's top should sit below the header bottom and within a reasonable
 * offset of it.
 */

const menuButton = (page: Page) => page.getByRole("button", { name: "תפריט", exact: true });
const mobileNav = (page: Page) => page.locator("#mobile-nav");

const openMenu = async (page: Page) => {
  await menuButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(mobileNav(page)).toBeVisible();
};

const headerBottom = (page: Page) =>
  page.evaluate(() => {
    const h = document.querySelector("header");
    return h ? h.getBoundingClientRect().bottom : 0;
  });

const sectionTop = (page: Page, id: string) =>
  page.evaluate((sid) => {
    const el = document.getElementById(sid);
    return el ? el.getBoundingClientRect().top : null;
  }, id);

const waitForScrollSettled = async (page: Page) => {
  await page.waitForFunction(() => {
    const w = window as Window & { __lastY?: number };
    if (typeof w.__lastY === "undefined") w.__lastY = -1;
    const y = window.scrollY;
    const same = w.__lastY === y;
    w.__lastY = y;
    return same && y > 0;
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(150);
};

const cases: Array<{ label: string; id: string }> = [
  { label: "שירותים", id: "services" },
  { label: "אודות", id: "about" },
  { label: "צור קשר", id: "contact" },
];

test.describe("Mobile menu — link click scrolls to section without hiding header", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  for (const c of cases) {
    test(`Clicking "${c.label}" scrolls to #${c.id} and section is not hidden under header`, async ({ page }) => {
      const startY = await page.evaluate(() => window.scrollY);

      await openMenu(page);
      await mobileNav(page).getByRole("link", { name: c.label }).click();
      await expect(mobileNav(page)).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`#${c.id}$`));

      await waitForScrollSettled(page);

      const endY = await page.evaluate(() => window.scrollY);
      expect(endY).toBeGreaterThan(startY);

      const top = await sectionTop(page, c.id);
      const hBottom = await headerBottom(page);
      expect(top).not.toBeNull();

      // Section top must be at or below the bottom of the sticky header
      // (not occluded). Allow a small negative slack for sub-pixel rounding.
      expect(top!).toBeGreaterThanOrEqual(hBottom - 2);

      // And it must be reasonably close to the header (within the reserved
      // 96px offset + some breathing room) — not scrolled way past it.
      expect(top!).toBeLessThanOrEqual(hBottom + 160);
    });
  }

  test("Sticky header remains visible at the top of the viewport after scroll", async ({ page }) => {
    await openMenu(page);
    await mobileNav(page).getByRole("link", { name: "צור קשר" }).click();
    await waitForScrollSettled(page);

    const rect = await page.evaluate(() => {
      const h = document.querySelector("header");
      const r = h?.getBoundingClientRect();
      return r ? { top: r.top, bottom: r.bottom, height: r.height } : null;
    });
    expect(rect).not.toBeNull();
    expect(rect!.top).toBeLessThanOrEqual(1);
    expect(rect!.bottom).toBeGreaterThan(0);
    expect(rect!.height).toBeGreaterThan(40);
  });
});
