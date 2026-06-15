import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: Mobile menu keyboard interactions.
 *
 *  - The hamburger toggle is reachable by Tab.
 *  - Pressing Enter on the focused toggle opens the menu.
 *  - aria-expanded toggles in sync with state.
 *  - Pressing Escape (anywhere) closes the menu and returns focus to the
 *    toggle button.
 *  - After closing the menu, Shift+Tab from the contact form does NOT
 *    land on a previously-invalid field that the user already fixed
 *    (no auto-jump into stale invalid fields).
 */

const PDF_FIXTURE = path.join(__dirname, "fixtures", "sample.pdf");
const TXT_FIXTURE = path.join(__dirname, "fixtures", "sample.txt");

const submitForm = (page: Page) =>
  page.getByRole("button", { name: /שליחת פנייה/ }).click();

const summary = (page: Page) =>
  page.locator('[aria-labelledby="error-summary-title"]');

const menuButton = (page: Page) =>
  page.getByRole("button", { name: "תפריט" });

const mobileNav = (page: Page) => page.locator("#mobile-nav");

const focusedInfo = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    return {
      id: el.id,
      name: el.getAttribute("name"),
      ariaLabel: el.getAttribute("aria-label"),
      tag: el.tagName.toLowerCase(),
    };
  });

test.describe("Mobile menu keyboard + stale-invalid focus avoidance", () => {
  test.beforeEach(async ({ page }) => {
    // Mobile viewport — hamburger is visible only below xl breakpoint
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("Mobile menu opens with Enter and exposes correct aria-expanded", async ({ page }) => {
    const btn = menuButton(page);
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await expect(btn).toHaveAttribute("aria-controls", "mobile-nav");
    await expect(mobileNav(page)).toHaveCount(0);

    await btn.focus();
    await expect(btn).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(mobileNav(page)).toBeVisible();
    await expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  test("Escape closes the mobile menu and returns focus to the toggle button", async ({ page }) => {
    const btn = menuButton(page);
    await btn.focus();
    await page.keyboard.press("Enter");
    await expect(mobileNav(page)).toBeVisible();

    // Move focus into the menu first to prove focus return works
    const firstLink = mobileNav(page).getByRole("link").first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(mobileNav(page)).toHaveCount(0);
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await expect(btn).toBeFocused();
  });

  test("Space also toggles the menu (native button behavior)", async ({ page }) => {
    const btn = menuButton(page);
    await btn.focus();
    await page.keyboard.press("Space");
    await expect(mobileNav(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(mobileNav(page)).toHaveCount(0);
  });

  test("Escape on a closed menu is a no-op (does not break focus)", async ({ page }) => {
    await page.locator("body").focus();
    await page.keyboard.press("Escape");
    await expect(mobileNav(page)).toHaveCount(0);
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("Shift+Tab in the form does not jump to an already-fixed invalid field", async ({ page }) => {
    // Open and close the mobile menu first to exercise focus-return path
    await menuButton(page).focus();
    await page.keyboard.press("Enter");
    await expect(mobileNav(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(mobileNav(page)).toHaveCount(0);

    // Submit the form with empty name + bad file → both invalid
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);
    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).toContainText("צירוף קבצים");

    // Fix only the name (live)
    await page.locator('input[name="name"]').fill("ישראל ישראלי");
    await expect(summary(page)).not.toContainText("שם מלא");

    // Shift+Tab from #files should walk DOM-backwards to desc — NOT auto-jump
    // into any previously-invalid (now fixed) field like the name input.
    await page.locator("#files").focus();
    await page.keyboard.press("Shift+Tab");
    const prev = await focusedInfo(page);
    expect(prev?.id).toBe("desc");
    expect(prev?.name).not.toBe("name");
  });

  test("Mobile menu does not interfere with form Shift+Tab order after fixes", async ({ page }) => {
    // Submit with multiple errors
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    // Fix the file live
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");

    // Open + close the mobile menu in between
    await menuButton(page).focus();
    await page.keyboard.press("Enter");
    await expect(mobileNav(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(mobileNav(page)).toHaveCount(0);
    await expect(menuButton(page)).toBeFocused();

    // Now Shift+Tab from #files should still go to desc (DOM order),
    // not to the previously-invalid #files itself or to a stale target.
    await page.locator("#files").focus();
    await page.keyboard.press("Shift+Tab");
    const prev = await focusedInfo(page);
    expect(prev?.id).toBe("desc");
  });
});
