import { test, expect, Page } from "@playwright/test";

/**
 * E2E: After closing the mobile menu with Escape, the focus trap is fully
 * released. Shift+Tab from the toggle button must consistently move focus
 * to the previous focusable element OUTSIDE the menu (e.g. the site logo
 * link), and never stay stuck on the toggle or jump back into menu links.
 */

const menuButton = (page: Page) => page.getByRole("button", { name: "תפריט" });
const mobileNav = (page: Page) => page.locator("#mobile-nav");

const focusedInfo = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const inMobileNav = !!el.closest("#mobile-nav");
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id,
      href: el.getAttribute("href"),
      ariaLabel: el.getAttribute("aria-label"),
      inMobileNav,
      isBody: el === document.body,
    };
  });

const openMenu = async (page: Page) => {
  await menuButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(mobileNav(page)).toBeVisible();
};

const closeWithEscape = async (page: Page) => {
  await page.keyboard.press("Escape");
  await expect(mobileNav(page)).toHaveCount(0);
  await expect(menuButton(page)).toBeFocused();
};

test.describe("Mobile menu — Escape releases trap, Shift+Tab leaves toggle consistently", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("After Escape, Shift+Tab from toggle leaves the toggle button", async ({ page }) => {
    await openMenu(page);
    await closeWithEscape(page);

    await page.keyboard.press("Shift+Tab");
    await expect(menuButton(page)).not.toBeFocused();

    const f = await focusedInfo(page);
    expect(f?.isBody).toBe(false);
    expect(f?.inMobileNav).toBe(false);
    expect(f?.ariaLabel).not.toBe("תפריט");
  });

  test("After Escape, Shift+Tab does NOT focus any mobile-nav link", async ({ page }) => {
    await openMenu(page);
    await closeWithEscape(page);

    // Press Shift+Tab a few times — none of the focused elements should be
    // inside #mobile-nav (the menu is closed and unmounted).
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Shift+Tab");
      const f = await focusedInfo(page);
      expect(f?.inMobileNav).toBe(false);
    }
  });

  test("Shift+Tab destination after Escape is consistent across repeated open/close cycles", async ({ page }) => {
    const targets: Array<{ tag?: string; href?: string | null; ariaLabel?: string | null }> = [];

    for (let i = 0; i < 3; i++) {
      await openMenu(page);
      await closeWithEscape(page);
      await page.keyboard.press("Shift+Tab");
      const f = await focusedInfo(page);
      targets.push({ tag: f?.tag, href: f?.href, ariaLabel: f?.ariaLabel });
    }

    // All three runs must land on the same element (consistent destination)
    expect(targets[1]).toEqual(targets[0]);
    expect(targets[2]).toEqual(targets[0]);
  });

  test("After Escape, Tab forward from toggle also leaves to outside (not into a stale menu)", async ({ page }) => {
    await openMenu(page);
    await closeWithEscape(page);

    await page.keyboard.press("Tab");
    const f = await focusedInfo(page);
    expect(f?.isBody).toBe(false);
    expect(f?.inMobileNav).toBe(false);
    expect(f?.ariaLabel).not.toBe("תפריט");
  });

  test("Escape after focusing a menu link still releases trap and Shift+Tab leaves toggle", async ({ page }) => {
    await openMenu(page);
    // Move focus into the menu first
    await mobileNav(page).getByRole("link").first().focus();
    await page.keyboard.press("Escape");
    await expect(mobileNav(page)).toHaveCount(0);
    await expect(menuButton(page)).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    const f = await focusedInfo(page);
    expect(f?.ariaLabel).not.toBe("תפריט");
    expect(f?.inMobileNav).toBe(false);
    expect(f?.isBody).toBe(false);
  });
});
