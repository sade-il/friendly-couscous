import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: removing only the invalid file from a multi-file selection
 * (in practice: re-selecting just the valid ones, since native <input type=file>
 * cannot drop a single file from its FileList) updates focus + errors correctly.
 */

const PDF_FIXTURE = path.join(__dirname, "fixtures", "sample.pdf");
const TXT_FIXTURE = path.join(__dirname, "fixtures", "sample.txt"); // disallowed

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

test.describe("Removing the invalid file from a multi-file selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Re-selecting only the valid file clears aria-invalid and the summary", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    // Baseline: invalid + summary visible
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");
    await expect(summary(page)).toBeVisible();
    await expect(page.locator("#files-error")).toContainText("sample.txt");

    // Drop the bad file — only the PDF remains
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#files-error")).toHaveCount(0);
    await expect(summary(page)).toHaveCount(0);

    // The remaining file is still attached
    const remaining = await page
      .locator("#files")
      .evaluate((el: HTMLInputElement) => Array.from(el.files ?? []).map((f) => f.name));
    expect(remaining).toEqual(["sample.pdf"]);
  });

  test("Re-selecting an empty list also clears the file error (file is optional)", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");

    await page.locator("#files").setInputFiles([]);

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#files-error")).toHaveCount(0);
    await expect(summary(page)).toHaveCount(0);
  });

  test("Focus stays inside the form on the file field after the fix", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    // User clicks the summary entry → focus on file input
    await summary(page).locator("button", { hasText: "צירוף קבצים" }).click();
    await expect(page.locator("#files")).toBeFocused();

    // Then re-selects only the valid one
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await page.locator("#files").focus();

    // Tab order from #files is unchanged: → submit
    await page.keyboard.press("Tab");
    await expect(page.locator('button[type="submit"]')).toBeFocused({ timeout: 2000 });
  });

  test("Removing the bad file while OTHER fields are still invalid keeps non-file errors", async ({ page }) => {
    // Empty name + bad file
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).toContainText("צירוף קבצים");

    // Drop the bad file — the file error goes away, name error remains
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);

    await expect(summary(page)).toBeVisible();
    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).not.toContainText("צירוף קבצים");

    // First-invalid skip-link still jumps to name (the only remaining issue)
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    await skip.focus();
    await skip.press("Enter");
    await expect(page.locator('input[name="name"]')).toBeFocused({ timeout: 2000 });
  });
});
