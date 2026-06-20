import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Clicking a link inside the open mobile menu must:
 *   - close the menu (#mobile-nav unmounts, aria-expanded="false")
 *   - navigate to the target section (hash updates)
 *   - leave focus in a predictable place — either on the toggle button
 *     or on/inside the target section — never lost on <body>.
 */

const menuButton = (page: Page) => page.getByRole("button", { name: "תפריט", exact: true });
const mobileNav = (page: Page) => page.locator("#mobile-nav");

const openMenu = async (page: Page) => {
  await menuButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(mobileNav(page)).toBeVisible();
};

const focusedInfo = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const section = el.closest("section, header, main, footer");
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id,
      ariaLabel: el.getAttribute("aria-label"),
      sectionId: section?.id ?? null,
      isBody: el === document.body,
    };
  });

test.describe("Mobile menu — link click closes menu predictably", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("Clicking a menu link closes the menu and updates the hash", async ({ page }) => {
    await openMenu(page);
    await mobileNav(page).getByRole("link", { name: "שירותים" }).click();

    await expect(mobileNav(page)).toHaveCount(0);
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/#services$/);
  });

  test("After link click, focus is predictable (toggle or inside target section, never lost)", async ({ page }) => {
    await openMenu(page);
    await mobileNav(page).getByRole("link", { name: "צור קשר" }).click();
    await expect(mobileNav(page)).toHaveCount(0);

    const f = await focusedInfo(page);
    expect(f).not.toBeNull();
    expect(f!.isBody).toBe(false);
    const onToggle = f!.ariaLabel === "תפריט";
    const inTarget = f!.sectionId === "contact" || f!.id === "contact";
    expect(onToggle || inTarget).toBe(true);
  });

  test("Activating a menu link with Enter (keyboard) also closes the menu", async ({ page }) => {
    await openMenu(page);
    const link = mobileNav(page).getByRole("link", { name: "אודות" });
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(mobileNav(page)).toHaveCount(0);
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/#about$/);

    const f = await focusedInfo(page);
    expect(f?.isBody).toBe(false);
  });

  test.skip("Re-opening the menu after a link click works (toggle still wired up)", async ({ page }) => {
    await openMenu(page);
    await mobileNav(page).getByRole("link", { name: "פרויקטים" }).click();
    await expect(mobileNav(page)).toHaveCount(0);

    await menuButton(page).click();
    await expect(mobileNav(page)).toBeVisible();
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "true");
  });

  test("After link click, Tab from toggle behaves like normal page (no trap remains)", async ({ page }) => {
    await openMenu(page);
    await mobileNav(page).getByRole("link", { name: "בית" }).click();
    await expect(mobileNav(page)).toHaveCount(0);

    // Trap should be released — Shift+Tab from toggle leaves the toggle.
    await menuButton(page).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(menuButton(page)).not.toBeFocused();
  });
});
