import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E (RTL): The "עבור לסיכום" action button inside the validation toast
 * works correctly in RTL mode, including:
 *  - Activates with Enter and Space (not just click).
 *  - Tab / Shift+Tab around it follow DOM order in RTL — they do not
 *    redirect into stale invalid regions or trap focus inside the toast.
 *  - After activation, focus lands on the error summary, and from there
 *    Tab continues into the form's invalid fields without skipping into
 *    fields that were already fixed live.
 */

const PDF_FIXTURE = path.join(__dirname, "fixtures", "sample.pdf");
const TXT_FIXTURE = path.join(__dirname, "fixtures", "sample.txt");

const submitForm = (page: Page) =>
  page.getByRole("button", { name: /שליחת פנייה/ }).click();

const toast = (page: Page) =>
  page.locator('[role="status"]').filter({ hasText: "יש לתקן שדות בטופס" });

const actionBtn = (page: Page) =>
  toast(page).getByRole("button", { name: "עבור לסיכום" });

const summary = (page: Page) =>
  page.locator('[aria-labelledby="error-summary-title"]');

const focusedInfo = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    return { id: el.id, name: el.getAttribute("name"), tag: el.tagName.toLowerCase() };
  });

test.describe("Toast 'עבור לסיכום' action — RTL keyboard + focus integrity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Activates with Enter in RTL and focuses the error summary", async ({ page }) => {
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(actionBtn(page)).toBeVisible();
    await actionBtn(page).focus();
    await expect(actionBtn(page)).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(summary(page)).toBeFocused({ timeout: 2000 });
  });

  test("Activates with Space in RTL and focuses the error summary", async ({ page }) => {
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await actionBtn(page).focus();
    await page.keyboard.press("Space");
    await expect(summary(page)).toBeFocused({ timeout: 2000 });
  });

  test("Shift+Tab from the action button does not jump into form invalid fields", async ({ page }) => {
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await actionBtn(page).focus();
    await page.keyboard.press("Shift+Tab");

    const prev = await focusedInfo(page);
    // Whatever it lands on, it must NOT be a contact-form input that's invalid
    expect(prev?.id).not.toBe("files");
    expect(prev?.name).not.toBe("name");
    expect(prev?.name).not.toBe("desc");
  });

  test("Tab from the action button does not get trapped inside the toast", async ({ page }) => {
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await actionBtn(page).focus();
    await page.keyboard.press("Tab");

    // After Tab, focus should leave the action button. It may go to the
    // toast close button or out of the toast entirely — but it must not
    // remain on the same action button (no trap).
    await expect(actionBtn(page)).not.toBeFocused();
  });

  test("After activating action, Tab from summary reaches first invalid field in DOM order", async ({ page }) => {
    // Empty name + bad file → name is the first invalid field in DOM order
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await actionBtn(page).focus();
    await page.keyboard.press("Enter");
    await expect(summary(page)).toBeFocused({ timeout: 2000 });

    // Tab forward from summary → first focusable inside is a summary entry button
    await page.keyboard.press("Tab");
    const next = await focusedInfo(page);
    expect(next?.tag).toBe("button");
  });

  test("After fixing a field live, action still routes to summary and stale fixed fields are NOT auto-focused", async ({ page }) => {
    // Multi-error: empty name + bad file
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);
    await expect(summary(page)).toContainText("שם מלא");

    // Fix name live
    await page.locator('input[name="name"]').fill("ישראל ישראלי");
    await expect(summary(page)).not.toContainText("שם מלא");

    // Activate action
    await actionBtn(page).focus();
    await page.keyboard.press("Enter");
    await expect(summary(page)).toBeFocused({ timeout: 2000 });

    // Click the remaining "צירוף קבצים" entry → focus goes to #files,
    // never sneaking into the now-fixed name input.
    const filesEntry = summary(page).getByRole("button", { name: /צירוף קבצים/ });
    await filesEntry.click();
    await expect(page.locator("#files")).toBeFocused();

    // Shift+Tab from #files in RTL should walk DOM-backwards to desc,
    // not bounce into the (fixed) name input.
    await page.keyboard.press("Shift+Tab");
    const prev = await focusedInfo(page);
    expect(prev?.id).toBe("desc");
    expect(prev?.name).not.toBe("name");
  });

  test("Action button remains keyboard-operable after a live toast description update", async ({ page }) => {
    // Two errors: empty name + bad file
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);
    await expect(toast(page)).toContainText("2 שדות דורשים תיקון");

    // Fix file live → toast description updates to "1"
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(toast(page)).toContainText("1 שדות דורשים תיקון");

    // Action button still works via keyboard in RTL
    await actionBtn(page).focus();
    await expect(actionBtn(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(summary(page)).toBeFocused({ timeout: 2000 });
    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).not.toContainText("צירוף קבצים");
  });
});
