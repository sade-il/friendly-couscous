import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: when the user attaches MULTIPLE files and at least one is invalid,
 *  - the file field receives focus,
 *  - aria-invalid="true" is set,
 *  - the error message names the offending file,
 *  - the summary lists "צירוף קבצים" with the correct reason.
 */

const PDF_FIXTURE = path.join(__dirname, "fixtures", "sample.pdf");
const TXT_FIXTURE = path.join(__dirname, "fixtures", "sample.txt"); // disallowed type

const fillValid = async (page: Page) => {
  await page.locator('input[name="name"]').fill("ישראל ישראלי");
  await page.locator('input[name="phone"]').fill("0501234567");
  await page.locator('input[name="email"]').fill("test@example.com");
  await page.locator('input[name="address"]').fill("תל אביב 1");
  await page.locator("#type").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter"); // pick first option
  await page.locator('textarea[name="desc"]').fill("תיאור קצר אך מספיק לבדיקה.");
};

const submitForm = (page: Page) =>
  page.getByRole("button", { name: /שליחת פנייה/ }).click();

const summary = (page: Page) => page.locator('[aria-labelledby="error-summary-title"]');

test.describe("Multi-file upload with one invalid file", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Mix of valid PDF + invalid TXT → focus to file, error names the bad file", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);

    await submitForm(page);

    await expect(summary(page)).toBeVisible();
    await expect(summary(page)).toContainText("צירוף קבצים");
    // The error must mention the offending file name and the reason
    await expect(summary(page)).toContainText("sample.txt");
    await expect(summary(page)).toContainText(/לא נתמך|תמונות|PDF/);

    // File input is invalid + describedby points to error
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#files-error")).toBeVisible();
    await expect(page.locator("#files-error")).toContainText("sample.txt");

    // Activating the summary entry returns focus to the file input
    const fileEntry = summary(page).locator("button", { hasText: "צירוף קבצים" });
    await fileEntry.click();
    await expect(page.locator("#files")).toBeFocused({ timeout: 2000 });
  });

  test("Oversized file (>10MB) among valid files → focus to file, message names size limit", async ({ page }) => {
    await fillValid(page);

    // 11MB binary blob, valid mime type but too big
    const big = Buffer.alloc(11 * 1024 * 1024, 0xff);
    await page.locator("#files").setInputFiles([
      { name: "small.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n") },
      { name: "huge.png", mimeType: "image/png", buffer: big },
    ]);

    await submitForm(page);

    await expect(summary(page)).toBeVisible();
    await expect(summary(page)).toContainText("huge.png");
    await expect(summary(page)).toContainText(/10MB|חורג/);

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");

    // Click the summary entry → focus on the file field
    await summary(page).locator("button", { hasText: "צירוף קבצים" }).click();
    await expect(page.locator("#files")).toBeFocused({ timeout: 2000 });
  });

  test("Two invalid files → only one (the first encountered) reason is shown, no duplicate summary entries", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([
      { name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("a") },
      { name: "b.exe", mimeType: "application/octet-stream", buffer: Buffer.from("b") },
    ]);

    await submitForm(page);

    await expect(summary(page)).toBeVisible();
    // Exactly one summary item for files (not duplicated per bad file)
    const fileItems = summary(page).locator("ul li", { hasText: "צירוף קבצים" });
    await expect(fileItems).toHaveCount(1);

    // The first invalid file ("a.txt") is the one named in the error
    await expect(page.locator("#files-error")).toContainText("a.txt");
  });

  test("Replacing the bad file with all-valid selection clears the file error", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");

    // Re-select with only valid files
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#files-error")).toHaveCount(0);
    await expect(summary(page)).toHaveCount(0);
  });
});
