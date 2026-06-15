import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: After replacing an invalid file selection with a valid one,
 *  - all validation errors related to #files clear (aria-invalid, inline
 *    #files-error, and the summary row),
 *  - focus stays on #files (the field the user just interacted with),
 *  - pressing Tab from #files advances to the NEXT correct field in DOM
 *    order (the submit button), without bouncing to the summary or to a
 *    previously-invalid field.
 */

const PDF_FIXTURE = path.join(__dirname, "fixtures", "sample.pdf");
const TXT_FIXTURE = path.join(__dirname, "fixtures", "sample.txt");

const fileInput = (page: Page) => page.locator("#files");
const submit = (page: Page) => page.locator('button[type="submit"]');
const desc = (page: Page) => page.locator('textarea[name="desc"]');
const summary = (page: Page) => page.locator('[aria-labelledby="error-summary-title"]');

const fillValid = async (page: Page) => {
  await page.locator('input[name="name"]').fill("ישראל ישראלי");
  await page.locator('input[name="phone"]').fill("0501234567");
  await page.locator('input[name="email"]').fill("test@example.com");
  await page.locator('input[name="address"]').fill("תל אביב 1");
  await page.locator("#type").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await desc(page).fill("תיאור קצר אך מספיק לבדיקה.");
};

const submitForm = (page: Page) =>
  page.getByRole("button", { name: /שליחת פנייה/ }).click();

test.describe("Replacing invalid file with valid one — errors clear and focus advances correctly", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Errors clear and Tab from #files advances to submit (next correct field)", async ({ page }) => {
    await fillValid(page);
    await fileInput(page).setInputFiles(TXT_FIXTURE);
    await submitForm(page);

    // Baseline: file is invalid
    await expect(fileInput(page)).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#files-error")).toBeVisible();
    await expect(summary(page)).toContainText("צירוף קבצים");

    // Replace with a valid file
    await fileInput(page).focus();
    await fileInput(page).setInputFiles(PDF_FIXTURE);

    // Errors gone
    await expect(fileInput(page)).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#files-error")).toHaveCount(0);
    await expect(summary(page)).toHaveCount(0);

    // Focus stays on the field the user just interacted with
    await expect(fileInput(page)).toBeFocused();

    // Tab → next correct field is submit
    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    // Shift+Tab walks back into the form normally
    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });
    await page.keyboard.press("Shift+Tab");
    await expect(desc(page)).toBeFocused({ timeout: 2000 });
  });

  test("Mixed selection (invalid+valid) replaced by valid only clears file errors", async ({ page }) => {
    await fillValid(page);
    await fileInput(page).setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(fileInput(page)).toHaveAttribute("aria-invalid", "true");
    await expect(summary(page)).toContainText("צירוף קבצים");

    await fileInput(page).focus();
    await fileInput(page).setInputFiles([PDF_FIXTURE]);

    await expect(fileInput(page)).toHaveAttribute("aria-invalid", "false");
    await expect(summary(page)).toHaveCount(0);
    await expect(fileInput(page)).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });
  });

  test("With other fields still invalid, fixing the file removes only the file error and Tab order continues to submit", async ({ page }) => {
    // Leave desc empty so it remains invalid after fixing the file
    await page.locator('input[name="name"]').fill("ישראל ישראלי");
    await page.locator('input[name="phone"]').fill("0501234567");
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="address"]').fill("תל אביב 1");
    await page.locator("#type").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    // desc intentionally empty
    await fileInput(page).setInputFiles(TXT_FIXTURE);
    await submitForm(page);

    await expect(summary(page)).toContainText("צירוף קבצים");
    await expect(summary(page)).toContainText("תיאור");

    // Fix the file only
    await fileInput(page).focus();
    await fileInput(page).setInputFiles(PDF_FIXTURE);

    // File errors cleared, desc still invalid
    await expect(fileInput(page)).toHaveAttribute("aria-invalid", "false");
    await expect(summary(page)).not.toContainText("צירוף קבצים");
    await expect(summary(page)).toContainText("תיאור");

    // Focus remained on #files (no auto-jump to remaining invalid field)
    await expect(fileInput(page)).toBeFocused();

    // Tab still advances to submit (DOM order, no detour)
    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });
  });
});
