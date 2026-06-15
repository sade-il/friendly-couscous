import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Mobile menu focus trap — focus cannot escape the menu (toggle + links)
 * via Tab or Shift+Tab while the menu is open. Once the menu is closed
 * (Escape), Shift+Tab is free to leave the toggle button.
 */

const menuButton = (page: Page) => page.getByRole("button", { name: "תפריט" });
const mobileNav = (page: Page) => page.locator("#mobile-nav");

const focusedKey = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel === "תפריט") return "toggle";
    if (el.tagName.toLowerCase() === "a") return el.getAttribute("href");
    return `${el.tagName.toLowerCase()}#${el.id || "?"}`;
  });

const isInsideTrap = async (page: Page) => {
  const key = await focusedKey(page);
  if (key === "toggle") return true;
  // any href that matches a link in #mobile-nav counts as inside the trap
  const hrefs = await mobileNav(page).getByRole("link").evaluateAll((els) =>
    els.map((e) => (e as HTMLAnchorElement).getAttribute("href"))
  );
  return typeof key === "string" && hrefs.includes(key);
};

const openMenu = async (page: Page) => {
  await menuButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(mobileNav(page)).toBeVisible();
};

test.describe("Mobile menu — focus cannot escape the trap while open", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("Repeated Tab presses never leave the trap", async ({ page }) => {
    await openMenu(page);
    const linkCount = await mobileNav(page).getByRole("link").count();
    expect(linkCount).toBeGreaterThan(0);

    await menuButton(page).focus();
    // Walk well past one full cycle to make sure focus never escapes
    const steps = (linkCount + 1) * 3;
    for (let i = 0; i < steps; i++) {
      await page.keyboard.press("Tab");
      expect(await isInsideTrap(page)).toBe(true);
    }
    // Menu is still open
    await expect(mobileNav(page)).toBeVisible();
  });

  test("Repeated Shift+Tab presses never leave the trap", async ({ page }) => {
    await openMenu(page);
    const linkCount = await mobileNav(page).getByRole("link").count();
    await menuButton(page).focus();

    const steps = (linkCount + 1) * 3;
    for (let i = 0; i < steps; i++) {
      await page.keyboard.press("Shift+Tab");
      expect(await isInsideTrap(page)).toBe(true);
    }
    await expect(mobileNav(page)).toBeVisible();
  });

  test("Shift+Tab from the toggle stays inside the trap (does not reach page elements above)", async ({ page }) => {
    await openMenu(page);
    await menuButton(page).focus();
    await page.keyboard.press("Shift+Tab");

    expect(await isInsideTrap(page)).toBe(true);
    // Specifically, focus is NOT on the site logo / "skip to content" links.
    const isLogo = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return !!el?.closest('a[href="#home"]') && !el?.closest("#mobile-nav");
    });
    expect(isLogo).toBe(false);
  });

  test("Tab from the last link stays inside the trap (cannot reach the form below)", async ({ page }) => {
    await openMenu(page);
    const last = mobileNav(page).getByRole("link").last();
    await last.focus();
    await page.keyboard.press("Tab");

    expect(await isInsideTrap(page)).toBe(true);
    // Confirm focus is NOT on any contact-form input
    const onForm = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return !!el?.closest("#contact form, form");
    });
    expect(onForm).toBe(false);
  });

  test("Only after closing the menu can Shift+Tab leave the toggle", async ({ page }) => {
    await openMenu(page);
    await menuButton(page).focus();

    // Trap active: Shift+Tab keeps us inside
    await page.keyboard.press("Shift+Tab");
    expect(await isInsideTrap(page)).toBe(true);

    // Close the menu
    await page.keyboard.press("Escape");
    await expect(mobileNav(page)).toHaveCount(0);
    await expect(menuButton(page)).toBeFocused();

    // Trap released: Shift+Tab can now leave the toggle
    await page.keyboard.press("Shift+Tab");
    await expect(menuButton(page)).not.toBeFocused();
  });
});
