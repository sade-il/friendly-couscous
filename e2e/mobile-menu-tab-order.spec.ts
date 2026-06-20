import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: Toggling the mobile menu does not change the form's Tab order, and
 * Shift+Tab consistently returns to the correct previous element after
 * multiple consecutive live error fixes (without resubmitting).
 *
 * DOM order in the form:
 *   name → phone → email → address → type → desc → files → submit
 */

const PDF_FIXTURE = path.join(__dirname, "fixtures", "sample.pdf");
const TXT_FIXTURE = path.join(__dirname, "fixtures", "sample.txt");

const submitForm = (page: Page) =>
  page.getByRole("button", { name: /שליחת פנייה/ }).click();

const summary = (page: Page) =>
  page.locator('[aria-labelledby="error-summary-title"]');

const menuButton = (page: Page) =>
  page.getByRole("button", { name: "תפריט", exact: true });

const mobileNav = (page: Page) => page.locator("#mobile-nav");

const focusedInfo = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    return { id: el.id, name: el.getAttribute("name"), tag: el.tagName.toLowerCase() };
  });

const collectShiftTabBack = async (page: Page, startSelector: string, steps: number) => {
  await page.locator(startSelector).focus();
  const order: Array<string | null> = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press("Shift+Tab");
    const f = await focusedInfo(page);
    order.push(f?.id || f?.name || null);
  }
  return order;
};

const toggleMobileMenu = async (page: Page) => {
  await menuButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(mobileNav(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(mobileNav(page)).toHaveCount(0);
  await expect(menuButton(page)).toBeFocused();
};

test.describe("Mobile menu toggle preserves Tab order; Shift+Tab consistent across fixes", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Form Shift+Tab order is identical before and after toggling the mobile menu", async ({ page }) => {
    // Baseline (menu closed)
    const before = await collectShiftTabBack(page, "#files", 3);
    expect(before).toEqual(["desc", "type", "address"]);

    // Toggle menu open then closed
    await toggleMobileMenu(page);

    // Same order after (menu closed)
    const after = await collectShiftTabBack(page, "#files", 3);
    expect(after).toEqual(before);
  });

  test("Shift+Tab order is identical before, after open-only, and after open+close", async ({ page }) => {
    const baseline = await collectShiftTabBack(page, "#files", 4);

    // Open the menu and leave it open
    await menuButton(page).focus();
    await page.keyboard.press("Enter");
    await expect(mobileNav(page)).toBeVisible();

    // While the menu is open, the contact form's internal Shift+Tab order
    // for non-menu elements must remain the same.
    const whileOpen = await collectShiftTabBack(page, "#files", 4);
    expect(whileOpen).toEqual(baseline);

    // Close the menu
    await page.keyboard.press("Escape");
    await expect(mobileNav(page)).toHaveCount(0);

    const afterClose = await collectShiftTabBack(page, "#files", 4);
    expect(afterClose).toEqual(baseline);
  });

  test("Shift+Tab returns to the correct previous element after consecutive live fixes", async ({ page }) => {
    // Make 3 fields invalid: name (empty), desc (empty), files (bad)
    await page.locator('input[name="phone"]').fill("0501234567");
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="address"]').fill("תל אביב 1");
    await page.locator("#type").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).toContainText("תיאור");
    await expect(summary(page)).toContainText("צירוף קבצים");

    // After each consecutive fix, Shift+Tab from #files must always reach #desc
    // and from #desc must reach #type (DOM order — never re-routed to a fixed field).

    // Fix #1: file
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    let order = await collectShiftTabBack(page, "#files", 2);
    expect(order).toEqual(["desc", "type"]);

    // Fix #2: name
    await page.locator('input[name="name"]').fill("ישראל ישראלי");
    order = await collectShiftTabBack(page, "#files", 2);
    expect(order).toEqual(["desc", "type"]);

    // Fix #3: desc
    await page.locator('textarea[name="desc"]').fill("תיאור מספיק לטופס.");
    await expect(summary(page)).toHaveCount(0);
    order = await collectShiftTabBack(page, "#files", 2);
    expect(order).toEqual(["desc", "type"]);
  });

  test("Mobile menu toggle between fixes does not perturb Shift+Tab targets", async ({ page }) => {
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    // Toggle menu, fix file, toggle menu again — Shift+Tab from #files
    // should still reach desc → type → address in DOM order.
    await toggleMobileMenu(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await toggleMobileMenu(page);

    const order = await collectShiftTabBack(page, "#files", 3);
    expect(order).toEqual(["desc", "type", "address"]);
  });

  test("Shift+Tab from #files lands on #desc regardless of file validity state", async ({ page }) => {
    // No file
    expect((await collectShiftTabBack(page, "#files", 1))[0]).toBe("desc");

    // Bad file (after submit, aria-invalid=true)
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);
    expect((await collectShiftTabBack(page, "#files", 1))[0]).toBe("desc");

    // Fixed live → aria-invalid=false
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    expect((await collectShiftTabBack(page, "#files", 1))[0]).toBe("desc");

    // After a menu toggle on top of all that
    await toggleMobileMenu(page);
    expect((await collectShiftTabBack(page, "#files", 1))[0]).toBe("desc");
  });
});
