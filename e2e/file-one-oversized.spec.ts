import { test, expect, Page } from "@playwright/test";

/**
 * E2E: among multiple files, exactly one exceeds 10MB.
 *  - aria-invalid="true" on #files
 *  - the inline error (#files-error) names the offending file
 *  - the summary entry for "צירוף קבצים" names the offending file + 10MB
 *  - the toast description acknowledges the error count
 *  - clicking the summary entry returns focus to #files
 *  - the offending file is identified regardless of its position in the list
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

const pdfBuf = (size: number) => {
  const buf = Buffer.alloc(size, 0x20);
  Buffer.from("%PDF-1.4\n").copy(buf);
  return buf;
};
const pngBuf = (size: number) => Buffer.alloc(size, 0xff);

test.describe("Single oversized file among many — error & focus", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Oversized file in the MIDDLE of the selection is named in all messages", async ({ page }) => {
    await fillValid(page);

    await page.locator("#files").setInputFiles([
      { name: "first.pdf", mimeType: "application/pdf", buffer: pdfBuf(1024) },
      { name: "way-too-big.png", mimeType: "image/png", buffer: pngBuf(11 * 1024 * 1024) },
      { name: "third.pdf", mimeType: "application/pdf", buffer: pdfBuf(2048) },
    ]);

    await submitForm(page);

    // aria-invalid + inline error
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");
    const inline = page.locator("#files-error");
    await expect(inline).toBeVisible();
    await expect(inline).toContainText("way-too-big.png");
    await expect(inline).toContainText("10MB");

    // Summary entry mirrors the same reason
    const fileEntry = summary(page).locator("li", { hasText: "צירוף קבצים" });
    await expect(fileEntry).toHaveCount(1);
    await expect(fileEntry).toContainText("way-too-big.png");
    await expect(fileEntry).toContainText("10MB");

    // Toast acknowledges the error
    await expect(page.locator('[role="status"], [role="alert"]').filter({ hasText: /יש לתקן|דורשים תיקון/ })).toBeVisible({ timeout: 3000 });

    // Click summary entry → focus on file input
    await fileEntry.locator("button").click();
    await expect(page.locator("#files")).toBeFocused({ timeout: 2000 });
  });

  test("Oversized file as the LAST item is still the one named", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([
      { name: "a.pdf", mimeType: "application/pdf", buffer: pdfBuf(1024) },
      { name: "b.pdf", mimeType: "application/pdf", buffer: pdfBuf(1024) },
      { name: "last-huge.pdf", mimeType: "application/pdf", buffer: pdfBuf(11 * 1024 * 1024) },
    ]);

    await submitForm(page);

    await expect(page.locator("#files-error")).toContainText("last-huge.pdf");
    await expect(summary(page)).toContainText("last-huge.pdf");
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");

    await summary(page).locator("button", { hasText: "צירוף קבצים" }).click();
    await expect(page.locator("#files")).toBeFocused({ timeout: 2000 });
  });

  test("Oversized file as the FIRST item is the one named (validation stops at first violation)", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([
      { name: "early-huge.png", mimeType: "image/png", buffer: pngBuf(11 * 1024 * 1024) },
      { name: "small.pdf", mimeType: "application/pdf", buffer: pdfBuf(1024) },
    ]);

    await submitForm(page);

    await expect(page.locator("#files-error")).toContainText("early-huge.png");
    // The smaller, valid file must NOT be mentioned as bad
    await expect(page.locator("#files-error")).not.toContainText("small.pdf");
    await expect(summary(page)).toContainText("early-huge.png");

    await summary(page).locator("button", { hasText: "צירוף קבצים" }).click();
    await expect(page.locator("#files")).toBeFocused({ timeout: 2000 });
  });

  test("Replacing the oversized file with a small one clears all messages", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([
      { name: "ok.pdf", mimeType: "application/pdf", buffer: pdfBuf(1024) },
      { name: "huge.png", mimeType: "image/png", buffer: pngBuf(11 * 1024 * 1024) },
    ]);
    await submitForm(page);
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");

    await page.locator("#files").setInputFiles([
      { name: "ok.pdf", mimeType: "application/pdf", buffer: pdfBuf(1024) },
      { name: "small.png", mimeType: "image/png", buffer: pngBuf(1024) },
    ]);

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#files-error")).toHaveCount(0);
    await expect(summary(page)).toHaveCount(0);
  });
});
