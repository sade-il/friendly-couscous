import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: live update of errors + skip-link target after replacing the selection
 * with only the valid files — WITHOUT pressing submit again.
 *
 * The onChange handler clears the file error, which:
 *   - removes #files-error and aria-invalid
 *   - removes the file row from the summary
 *   - if no other errors remain, removes the summary entirely
 *   - the skip-link reverts to "jump to first form field" mode
 *     (announces "מעבר לטופס...") instead of "jump to summary".
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

const summary = (page: Page) => page.locator('[aria-labelledby="error-summary-title"]');
const live = (page: Page) => page.locator('#contact [role="status"][aria-live="polite"]');

test.describe("Live update on file selection change (no resubmit)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Replacing selection with only valid files clears errors immediately", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    // Baseline: errors visible
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");
    await expect(summary(page)).toBeVisible();
    await expect(page.locator("#files-error")).toBeVisible();

    // Re-select only the valid file — DO NOT submit again
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);

    // Errors update without a resubmit
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#files-error")).toHaveCount(0);
    await expect(summary(page)).toHaveCount(0);
  });

  test("Skip-link reverts to 'jump to first field' mode immediately after fix", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    // Sanity: skip-link currently lands on the summary (focus moves to summary container)
    {
      const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
      await skip.focus();
      await skip.press("Enter");
      await expect(summary(page)).toBeFocused({ timeout: 2000 });
      await expect(live(page)).toContainText("מעבר לסיכום השגיאות");
    }

    // Fix the file selection — without resubmitting
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(summary(page)).toHaveCount(0);

    // Now the skip-link should land on the first form field
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    await skip.focus();
    await skip.press("Enter");
    await expect(page.locator('input[name="name"]')).toBeFocused({ timeout: 2000 });
    await expect(live(page)).toContainText("מעבר לטופס");
  });

  test("With other errors still present, only the file row is removed; skip-link still goes to summary", async ({ page }) => {
    // Empty name + bad file
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).toContainText("צירוף קבצים");

    // Fix only the file — name is still empty
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);

    // Summary stays, file row gone
    await expect(summary(page)).toBeVisible();
    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).not.toContainText("צירוף קבצים");

    // Skip-link → summary, then to first invalid (name)
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    await skip.focus();
    await skip.press("Enter");
    await expect(summary(page)).toBeFocused({ timeout: 2000 });
    await expect(live(page)).toContainText("שם מלא");
    await expect(page.locator('input[name="name"]')).toBeFocused({ timeout: 2000 });
  });

  test("Re-selecting an empty list also updates errors live", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");

    await page.locator("#files").setInputFiles([]);

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#files-error")).toHaveCount(0);
    await expect(summary(page)).toHaveCount(0);
  });
});
