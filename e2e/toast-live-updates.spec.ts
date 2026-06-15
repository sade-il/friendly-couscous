import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: validation toast tracks the live errors state.
 *  - On submit with errors → a destructive toast appears with the count.
 *  - As the user fixes errors (file or otherwise) WITHOUT resubmitting,
 *    the toast description updates with the new count.
 *  - When the last error is cleared, the toast disappears entirely.
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

// The shadcn/Radix toast is rendered with role="status" and the title text we use
const toast = (page: Page) =>
  page.locator('[role="status"]').filter({ hasText: "יש לתקן שדות בטופס" });

test.describe("Toast updates live with the errors state", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Toast disappears immediately after replacing bad file with valid one", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    // Toast appears
    await expect(toast(page)).toBeVisible();
    await expect(toast(page)).toContainText("1 שדות דורשים תיקון");

    // Fix the file selection (no resubmit)
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);

    // Toast is dismissed because errors are now empty
    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });
  });

  test("Toast description updates when only some errors are fixed", async ({ page }) => {
    // Three issues: empty name, empty desc, bad file
    await page.locator('input[name="phone"]').fill("0501234567");
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator("#type").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);

    await submitForm(page);
    await expect(toast(page)).toBeVisible();
    await expect(toast(page)).toContainText("3 שדות דורשים תיקון");

    // Fix the file → 2 left
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(toast(page)).toContainText("2 שדות דורשים תיקון", { timeout: 3000 });

    // Fix the name → 1 left
    await page.locator('input[name="name"]').fill("ישראל ישראלי");
    await expect(toast(page)).toContainText("1 שדות דורשים תיקון", { timeout: 3000 });

    // Fix the desc → toast disappears
    await page.locator('textarea[name="desc"]').fill("תיאור קצר אך מספיק לבדיקה.");
    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });
  });

  test("Re-selecting an empty file list also dismisses the toast", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);
    await expect(toast(page)).toBeVisible();

    await page.locator("#files").setInputFiles([]);
    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });
  });

  test("Toast remains while file error persists; updates after fixing OTHER fields first", async ({ page }) => {
    // Two issues: empty name + bad file
    await page.locator('input[name="phone"]').fill("0501234567");
    await page.locator("#type").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.locator('textarea[name="desc"]').fill("תיאור קצר אך מספיק לבדיקה.");
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);

    await submitForm(page);
    await expect(toast(page)).toContainText("2 שדות דורשים תיקון");

    // Fix the name first → still 1 (file)
    await page.locator('input[name="name"]').fill("ישראל ישראלי");
    await expect(toast(page)).toContainText("1 שדות דורשים תיקון", { timeout: 3000 });

    // Then fix the file → toast gone
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(toast(page)).toHaveCount(0, { timeout: 3000 });
  });
});
