import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: Custom action button inside the validation Toast (besides the
 * dedicated close button) stays visible, focusable and clickable across
 * the full toast lifecycle: appearance, live description updates while
 * fixing errors one at a time, and final auto-dismissal.
 *
 * The action button is rendered with text "עבור לסיכום" and altText
 * "עבור לסיכום השגיאות". Clicking it focuses the error summary.
 */

const PDF_FIXTURE = path.join(__dirname, "fixtures", "sample.pdf");
const TXT_FIXTURE = path.join(__dirname, "fixtures", "sample.txt");

const fillValid = async (page: Page) => {
  await page.locator('input[name="name"]').fill("ישראל ישראלי");
  await page.locator('input[name="phone"]').fill("0501234567");
  await page.locator('input[name="email"]').fill("test@example.com");
  await page.locator('input[name="address"]').fill("תל אביב 1");
  await page.locator("#type").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.locator('textarea[name="desc"]').fill("תיאור קצר אך מספיק לבדיקה.");
};

const submitForm = (page: Page) =>
  page.getByRole("button", { name: /שליחת פנייה/ }).click();

const toast = (page: Page) =>
  page.locator('ol').locator('li[role="status"]').filter({ hasText: "יש לתקן שדות בטופס" });

const actionBtn = (page: Page) =>
  toast(page).getByRole("button", { name: "עבור לסיכום" });

const summary = (page: Page) => page.locator('[aria-labelledby="error-summary-title"]');

test.describe("Toast custom action button stays accessible across lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Action button is visible and clickable when toast first appears", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(toast(page)).toBeVisible();
    await expect(actionBtn(page)).toBeVisible();
    await expect(actionBtn(page)).toBeEnabled();

    await actionBtn(page).click();
    await expect(summary(page)).toBeFocused({ timeout: 2000 });
  });

  test("Action button persists and works after the toast description updates live", async ({ page }) => {
    // Two issues: empty name + bad file
    await page.locator('input[name="phone"]').fill("0501234567");
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator("#type").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.locator('textarea[name="desc"]').fill("תיאור קצר אך מספיק לבדיקה.");
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(toast(page)).toContainText("2 שדות דורשים תיקון");
    await expect(actionBtn(page)).toBeVisible();

    // Fix file → toast updates to "1"
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(toast(page)).toContainText("1 שדות דורשים תיקון");

    // Action button is still there and still functional
    await expect(actionBtn(page)).toBeVisible();
    await expect(actionBtn(page)).toBeEnabled();
    await actionBtn(page).click();
    await expect(summary(page)).toBeFocused({ timeout: 2000 });

    // Toast remains while there are still errors
    await expect(toast(page)).toBeVisible();
  });

  test("Action button is reachable and activatable via keyboard", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(actionBtn(page)).toBeVisible();
    await actionBtn(page).focus();
    await expect(actionBtn(page)).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(summary(page)).toBeFocused({ timeout: 2000 });
  });

  test("Action button still works mid-fix with multiple errors remaining", async ({ page }) => {
    // Three issues: empty name, empty desc, bad file
    await page.locator('input[name="phone"]').fill("0501234567");
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator("#type").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(toast(page)).toContainText("3 שדות דורשים תיקון");

    // Fix only the file → 2 errors remain
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(toast(page)).toContainText("2 שדות דורשים תיקון");

    // Action button still works → focuses summary, which still lists name + desc
    await actionBtn(page).click();
    await expect(summary(page)).toBeFocused({ timeout: 2000 });
    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).toContainText("תיאור");
  });

  test("Action button gracefully disappears with the toast when all errors are fixed", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(actionBtn(page)).toBeVisible();

    // Fix the only error → toast (and its action) should auto-dismiss
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);

    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });
    await expect(actionBtn(page)).toHaveCount(0);

    // No leftover overlay traps focus
    await page.locator('input[name="name"]').focus();
    await expect(page.locator('input[name="name"]')).toBeFocused();
  });

  test("Re-submitting after a manual close re-creates a working action button", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    // Close the toast manually
    const closeBtn = toast(page).locator('button[toast-close], button[aria-label="Close"]');
    await closeBtn.click();
    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });

    // Resubmit → fresh toast with a fresh, working action button
    await submitForm(page);
    await expect(toast(page)).toBeVisible();
    await expect(actionBtn(page)).toBeVisible();
    await actionBtn(page).click();
    await expect(summary(page)).toBeFocused({ timeout: 2000 });
  });
});
