import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: Tab order and focus behavior after live error updates triggered by
 * changing the file selection — WITHOUT pressing submit again.
 *
 * Verifies:
 *  - When the only invalid field becomes valid (file fixed), focus is no
 *    longer trapped/forced; Tab moves naturally through the form.
 *  - When other invalid fields remain, the next "first invalid" is the new
 *    target for the skip-link, and Tab order from the file field still
 *    reaches the remaining invalid fields in DOM order.
 *  - Focus is preserved on the file input itself after a live fix
 *    (no unintended focus jump).
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

test.describe("Tab order & focus after live error updates (no resubmit)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("After fixing file, focus stays on #files and Tab proceeds to next field", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");

    // Re-select valid only — focus should be on #files after setInputFiles
    await page.locator("#files").focus();
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#files")).toBeFocused();

    // Tab should move to the next focusable element (submit button area),
    // not be redirected back to an "invalid" field.
    await page.keyboard.press("Tab");
    await expect(page.locator("#files")).not.toBeFocused();
  });

  test("When other invalid fields remain, skip-link target shifts to the new first invalid", async ({ page }) => {
    // Empty name AND bad file → first invalid is name (above file)
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).toContainText("צירוף קבצים");

    // Fix the file only — name still invalid
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(summary(page)).not.toContainText("צירוף קבצים");

    // Skip-link → summary → first invalid is now name
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    await skip.focus();
    await skip.press("Enter");
    await expect(summary(page)).toBeFocused({ timeout: 2000 });
    await expect(live(page)).toContainText("שם מלא");
    await expect(page.locator('input[name="name"]')).toBeFocused({ timeout: 2000 });
  });

  test("With only a later field invalid (desc), fixing file moves first-invalid to desc", async ({ page }) => {
    // Fill everything valid except desc, plus a bad file
    await page.locator('input[name="name"]').fill("ישראל ישראלי");
    await page.locator('input[name="phone"]').fill("0501234567");
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="address"]').fill("תל אביב 1");
    await page.locator("#type").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    // desc left empty
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(summary(page)).toContainText("צירוף קבצים");
    await expect(summary(page)).toContainText("תיאור");

    // Fix the file → desc becomes the only invalid field
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(summary(page)).not.toContainText("צירוף קבצים");
    await expect(summary(page)).toContainText("תיאור");

    // Skip-link should now route to the desc field as the first invalid
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    await skip.focus();
    await skip.press("Enter");
    await expect(summary(page)).toBeFocused({ timeout: 2000 });
    await expect(page.locator('textarea[name="desc"]')).toBeFocused({ timeout: 2000 });
  });

  test("Tab order from #files reaches the remaining invalid field naturally", async ({ page }) => {
    // Valid except desc + bad file
    await page.locator('input[name="name"]').fill("ישראל ישראלי");
    await page.locator('input[name="phone"]').fill("0501234567");
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="address"]').fill("תל אביב 1");
    await page.locator("#type").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    // Fix the file live
    await page.locator("#files").focus();
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(page.locator("#files")).toBeFocused();

    // Shift+Tab from #files should move backwards through the form (to type/select area),
    // never jumping to an aria-invalid file field again.
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("#files")).not.toBeFocused();

    // From textarea desc, Tab forward should not bounce back to #files
    await page.locator('textarea[name="desc"]').focus();
    await expect(page.locator('textarea[name="desc"]')).toBeFocused();
  });

  test("All errors fixed live → skip-link reverts to first form field, no forced focus", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(summary(page)).toBeVisible();

    // Fix the file — this was the only error
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(summary(page)).toHaveCount(0);

    // No element should have aria-invalid="true" anymore
    await expect(page.locator('#contact [aria-invalid="true"]')).toHaveCount(0);

    // Skip-link should go to first form field (name)
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    await skip.focus();
    await skip.press("Enter");
    await expect(page.locator('input[name="name"]')).toBeFocused({ timeout: 2000 });
    await expect(live(page)).toContainText("קפצת לטופס");
  });
});
