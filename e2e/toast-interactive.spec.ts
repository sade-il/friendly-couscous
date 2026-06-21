import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: while the validation Toast is appearing, updating, and disappearing
 * during live error fixes, its interactive controls (close button) remain
 * accessible and clickable — without getting stuck or trapping focus.
 *
 * The shadcn/Radix toast renders a close button (aria-label="Close")
 * inside the toast container.
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

const closeBtn = (page: Page) =>
  toast(page).locator('button[toast-close], button[aria-label="Close"]');

test.describe("Toast interactive controls during live fixes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Close button is visible and clickable as soon as the toast appears", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(toast(page)).toBeVisible();
    await expect(closeBtn(page)).toBeVisible();
    await expect(closeBtn(page)).toBeEnabled();

    await closeBtn(page).click();
    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });
  });

  test("Close button stays clickable after the toast description updates live", async ({ page }) => {
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
    await expect(closeBtn(page)).toBeVisible();

    // Fix the file → toast description updates to "1 ..."
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(toast(page)).toContainText("1 שדות דורשים תיקון");

    // The close button is still there and works
    await expect(closeBtn(page)).toBeVisible();
    await expect(closeBtn(page)).toBeEnabled();
    await closeBtn(page).click();
    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });
  });

  test("Close button is reachable via keyboard while the toast is open", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(closeBtn(page)).toBeVisible();

    // Focus and activate via keyboard — should not be intercepted by the form
    await closeBtn(page).focus();
    await expect(closeBtn(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });
  });

  test("After toast is auto-dismissed by fixing all errors, focus is not trapped", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(toast(page)).toBeVisible();

    // Fix file → toast disappears via effect
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });

    // Form interactions still work — no stuck overlay/focus trap left behind
    await page.locator('input[name="name"]').focus();
    await expect(page.locator('input[name="name"]')).toBeFocused();
    await page.locator('input[name="name"]').fill("שם חדש");
    await expect(page.locator('input[name="name"]')).toHaveValue("שם חדש");
  });

  test("Submitting again after closing the toast manually re-opens a working toast", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(closeBtn(page)).toBeVisible();
    await closeBtn(page).click();
    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });

    // Resubmit with the same bad selection → fresh toast, fresh working close button
    await submitForm(page);
    await expect(toast(page)).toBeVisible();
    await expect(closeBtn(page)).toBeVisible();
    await expect(closeBtn(page)).toBeEnabled();
    await closeBtn(page).click();
    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });
  });
});
