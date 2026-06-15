import { test, expect, Page } from "@playwright/test";

/**
 * E2E: file size limits.
 *  - Single file > 10MB → invalid, focus to file (when other fields are valid)
 *  - Total of all files > 30MB → invalid with "סך כל הקבצים" message
 *  - When other required fields are also empty, focus goes to the first invalid
 *    field per FIELD_ORDER (name), not to the file input.
 */

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

const pdfBuffer = (size: number) => {
  const buf = Buffer.alloc(size, 0x20);
  Buffer.from("%PDF-1.4\n").copy(buf);
  return buf;
};

test.describe("File size limits — focus & error messaging", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Single file > 10MB: aria-invalid set, summary names file & 10MB limit", async ({ page }) => {
    await fillValid(page);

    await page.locator("#files").setInputFiles({
      name: "huge.pdf",
      mimeType: "application/pdf",
      buffer: pdfBuffer(11 * 1024 * 1024), // 11MB
    });

    await submitForm(page);

    await expect(summary(page)).toBeVisible();
    await expect(summary(page)).toContainText("צירוף קבצים");
    await expect(summary(page)).toContainText("huge.pdf");
    await expect(summary(page)).toContainText("10MB");

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#files-error")).toContainText("10MB");

    // Click the summary entry → focus to file input
    await summary(page).locator("button", { hasText: "צירוף קבצים" }).click();
    await expect(page.locator("#files")).toBeFocused({ timeout: 2000 });
  });

  test("Total > 30MB across many ≤10MB files: 'סך כל הקבצים' message", async ({ page }) => {
    await fillValid(page);

    // 4 × 9MB = 36MB total, each individual file is under the 10MB limit
    const files = Array.from({ length: 4 }).map((_, i) => ({
      name: `part-${i}.pdf`,
      mimeType: "application/pdf",
      buffer: pdfBuffer(9 * 1024 * 1024),
    }));
    await page.locator("#files").setInputFiles(files);

    await submitForm(page);

    await expect(summary(page)).toBeVisible();
    await expect(summary(page)).toContainText("סך כל הקבצים");
    await expect(summary(page)).toContainText(/30MB|חורג/);

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");

    await summary(page).locator("button", { hasText: "צירוף קבצים" }).click();
    await expect(page.locator("#files")).toBeFocused({ timeout: 2000 });
  });

  test("Oversized file + other empty fields: focus goes to FIRST invalid (name)", async ({ page }) => {
    // Leave name/phone/desc empty; just attach an oversized file
    await page.locator("#files").setInputFiles({
      name: "huge.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(11 * 1024 * 1024, 0xff),
    });

    await submitForm(page);

    await expect(summary(page)).toBeVisible();
    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).toContainText("צירוף קבצים");

    // Order: name BEFORE files
    const items = await summary(page).locator("ul li").allInnerTexts();
    const idxName = items.findIndex((t) => t.includes("שם מלא"));
    const idxFiles = items.findIndex((t) => t.includes("צירוף קבצים"));
    expect(idxName).toBeGreaterThanOrEqual(0);
    expect(idxFiles).toBeGreaterThan(idxName);

    // Skip-link → first invalid = name (NOT files)
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    await skip.focus();
    await skip.press("Enter");
    await expect(page.locator('input[name="name"]')).toBeFocused({ timeout: 2000 });
  });

  test("Reducing total size below 30MB clears the file error", async ({ page }) => {
    await fillValid(page);

    await page.locator("#files").setInputFiles(
      Array.from({ length: 4 }).map((_, i) => ({
        name: `big-${i}.pdf`,
        mimeType: "application/pdf",
        buffer: pdfBuffer(9 * 1024 * 1024),
      }))
    );
    await submitForm(page);
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");

    // Replace with a single small valid PDF
    await page.locator("#files").setInputFiles({
      name: "ok.pdf",
      mimeType: "application/pdf",
      buffer: pdfBuffer(1024),
    });

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#files-error")).toHaveCount(0);
    await expect(summary(page)).toHaveCount(0);
  });
});
