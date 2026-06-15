import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: when the form is submitted with an invalid file (wrong type),
 * the file field is reported as invalid and:
 *   - if other fields are also invalid, focus goes to the first invalid one
 *     (per FIELD_ORDER: name → phone → email → address → type → desc → files)
 *   - if all other fields are valid, focus goes to the file input
 *
 * The file input only accepts image/* and application/pdf and ≤ 10MB.
 */

const TXT_FIXTURE = path.join(__dirname, "fixtures", "sample.txt");
const PDF_FIXTURE = path.join(__dirname, "fixtures", "sample.pdf");

const fillValid = async (page: Page) => {
  await page.locator('input[name="name"]').fill("ישראל ישראלי");
  await page.locator('input[name="phone"]').fill("0501234567");
  await page.locator('input[name="email"]').fill("test@example.com");
  await page.locator('input[name="address"]').fill("תל אביב 1");
  // Select first option via keyboard
  await page.locator("#type").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  // Description (focus has advanced to desc after select)
  await page.locator('textarea[name="desc"]').fill("תיאור קצר אך מספיק לבדיקה.");
};

const submitForm = (page: Page) =>
  page.getByRole("button", { name: /שליחת פנייה/ }).click();

test.describe("Invalid file submission — focus & error handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Invalid file type alone: focus moves to the file input", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles(TXT_FIXTURE);

    await submitForm(page);

    // Error summary appears with the files entry only
    const summary = page.locator('[aria-labelledby="error-summary-title"]');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("צירוף קבצים");

    // File input is marked invalid and has its describedby error
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#files-error")).toBeVisible();

    // Activate the first error link in the summary → focus to file input
    await summary.locator("button").first().click();
    await expect(page.locator("#files")).toBeFocused({ timeout: 2000 });
  });

  test("Invalid file + other invalid fields: focus goes to FIRST invalid (name), not file", async ({ page }) => {
    // Leave all fields empty AND attach a bad file
    await page.locator("#files").setInputFiles(TXT_FIXTURE);
    await submitForm(page);

    const summary = page.locator('[aria-labelledby="error-summary-title"]');
    await expect(summary).toBeVisible();

    // Both "שם מלא" and "צירוף קבצים" should appear in the summary
    await expect(summary).toContainText("שם מלא");
    await expect(summary).toContainText("צירוף קבצים");

    // Order in the list: name comes BEFORE files
    const items = await summary.locator("ul li").allInnerTexts();
    const idxName = items.findIndex((t) => t.includes("שם מלא"));
    const idxFiles = items.findIndex((t) => t.includes("צירוף קבצים"));
    expect(idxName).toBeGreaterThanOrEqual(0);
    expect(idxFiles).toBeGreaterThan(idxName);

    // Skip-link should jump to first invalid (name), not files
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    await skip.focus();
    await skip.press("Enter");
    await expect(page.locator('input[name="name"]')).toBeFocused({ timeout: 2000 });
  });

  test("Valid file (PDF) does not produce a file error", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles(PDF_FIXTURE);

    // We don't actually submit (would open mailto). Just ensure no eager error UI.
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
  });

  test("Fixing the bad file by re-selecting a valid one clears the error", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles(TXT_FIXTURE);
    await submitForm(page);
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");

    // Replace with a valid PDF
    await page.locator("#files").setInputFiles(PDF_FIXTURE);

    // onChange clears the error immediately
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#files-error")).toHaveCount(0);
    await expect(page.locator('[aria-labelledby="error-summary-title"]')).toHaveCount(0);
  });
});
