import { test, expect, Page } from "@playwright/test";

/**
 * E2E: When the mobile menu is open, focus is trapped between the toggle
 * button and the menu links. Tab cycles forward (toggle → first → ... →
 * last → toggle), Shift+Tab cycles backward, and Shift+Tab from the first
 * link returns to the toggle as expected.
 */

const menuButton = (page: Page) => page.getByRole("button", { name: "תפריט", exact: true });
const mobileNav = (page: Page) => page.locator("#mobile-nav");

const focusedHref = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      href: el.getAttribute("href"),
      ariaLabel: el.getAttribute("aria-label"),
    };
  });

const openMenu = async (page: Page) => {
  await menuButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(mobileNav(page)).toBeVisible();
};

test.describe("Mobile menu — focus trap when open", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("Tab from toggle moves to the first menu link", async ({ page }) => {
    await openMenu(page);
    await menuButton(page).focus();
    await page.keyboard.press("Tab");

    const f = await focusedHref(page);
    expect(f?.tag).toBe("a");
    expect(f?.href).toBe("#home");
  });

  test("Shift+Tab from the toggle moves to the LAST menu link (wraps within trap)", async ({ page }) => {
    await openMenu(page);
    await menuButton(page).focus();
    await page.keyboard.press("Shift+Tab");

    const f = await focusedHref(page);
    expect(f?.tag).toBe("a");
    // The mobile nav ends with the LanguageSwitcher links (HE/RU/EN/FR), so the
    // true last focusable in the trap is the FR language link, not #contact.
    expect(f?.href).toBe("/fr");
  });

  test("Shift+Tab from the first link returns focus to the toggle button", async ({ page }) => {
    await openMenu(page);
    const firstLink = mobileNav(page).getByRole("link").first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(menuButton(page)).toBeFocused();
  });

  test("Tab from the last link wraps to the toggle button", async ({ page }) => {
    await openMenu(page);
    const links = mobileNav(page).getByRole("link");
    const last = links.last();
    await last.focus();
    await expect(last).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(menuButton(page)).toBeFocused();
  });

  test("Tab cycle stays within the trap (toggle + links)", async ({ page }) => {
    await openMenu(page);
    const linkCount = await mobileNav(page).getByRole("link").count();
    expect(linkCount).toBeGreaterThan(0);
    const total = linkCount + 1; // +1 for the toggle button

    await menuButton(page).focus();
    const visited = new Set<string>();
    visited.add("toggle");

    for (let i = 0; i < total; i++) {
      await page.keyboard.press("Tab");
      const f = await focusedHref(page);
      const key = f?.ariaLabel === "תפריט" ? "toggle" : (f?.href ?? "?");
      visited.add(key);
    }

    // After total Tabs starting from toggle, we should be back on toggle
    await expect(menuButton(page)).toBeFocused();
    // And we should have visited the toggle + every link
    expect(visited.size).toBe(total);
    expect(visited.has("toggle")).toBe(true);
    expect(visited.has("#home")).toBe(true);
    expect(visited.has("#contact")).toBe(true);
  });

  test("Shift+Tab cycle (reverse) also stays within the trap", async ({ page }) => {
    await openMenu(page);
    const linkCount = await mobileNav(page).getByRole("link").count();
    const total = linkCount + 1;

    await menuButton(page).focus();
    for (let i = 0; i < total; i++) {
      await page.keyboard.press("Shift+Tab");
    }
    await expect(menuButton(page)).toBeFocused();
  });

  test("After closing with Escape, the trap releases and focus returns to toggle", async ({ page }) => {
    await openMenu(page);
    const firstLink = mobileNav(page).getByRole("link").first();
    await firstLink.focus();

    await page.keyboard.press("Escape");
    await expect(mobileNav(page)).toHaveCount(0);
    await expect(menuButton(page)).toBeFocused();

    // With the menu closed, Shift+Tab leaves the toggle (no trap anymore)
    await page.keyboard.press("Shift+Tab");
    await expect(menuButton(page)).not.toBeFocused();
  });
});
