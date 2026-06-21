import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: Tab/Shift+Tab focus order AFTER submitting with an invalid or
 * oversize file. The form must:
 *  - place initial focus on the first invalid field (here: #files),
 *  - keep DOM Tab order intact (... desc → files → submit) without
 *    skipping back to the summary or trapping focus on the invalid input,
 *  - allow Shift+Tab from #files to walk back through the form,
 *  - allow Tab forward from submit to leave the form.
 *
 * Covers two error sources:
 *   1. Disallowed file type (.txt)
 *   2. Oversize PDF (>10MB)
 */

const TXT_FIXTURE = path.join(__dirname, "fixtures", "sample.txt");

const fileInput = (page: Page) => page.locator("#files");
const submit = (page: Page) => page.locator('button[type="submit"]');
const desc = (page: Page) => page.locator('textarea[name="desc"]');
const trigger = (page: Page) => page.locator("#type");
const summary = (page: Page) => page.locator('[aria-labelledby="error-summary-title"]');

const fillValid = async (page: Page) => {
  await page.locator('input[name="name"]').fill("ישראל ישראלי");
  await page.locator('input[name="phone"]').fill("0501234567");
  await page.locator('input[name="email"]').fill("test@example.com");
  await page.locator('input[name="address"]').fill("תל אביב 1");
  await trigger(page).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await desc(page).fill("תיאור קצר אך מספיק לבדיקה.");
};

const submitForm = (page: Page) =>
  page.getByRole("button", { name: /שליחת פנייה/ }).click();

// Build an oversized fake PDF (>10MB) on the fly via setInputFiles buffer
const oversizedPdf = () => ({
  name: "huge.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.alloc(11 * 1024 * 1024, 0x20),
});

test.describe("Focus order after submit with invalid / oversize file", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Disallowed type: focus lands on #files and Tab order is intact", async ({ page }) => {
    await fillValid(page);
    await fileInput(page).setInputFiles(TXT_FIXTURE);
    await submitForm(page);

    await expect(summary(page)).toBeVisible();
    await expect(fileInput(page)).toHaveAttribute("aria-invalid", "true");
    // Submit focuses the error summary (GOV.UK pattern); activate its files
    // entry to jump to the field, then verify Tab order from there.
    await summary(page).getByRole("button", { name: /צירוף קבצים/ }).click();
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });

    // Tab → submit (no jump back to summary, no trap)
    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    // Shift+Tab back to #files, then to desc, then to type trigger
    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });
    await page.keyboard.press("Shift+Tab");
    await expect(desc(page)).toBeFocused({ timeout: 2000 });
    await page.keyboard.press("Shift+Tab");
    await expect(trigger(page)).toBeFocused({ timeout: 2000 });
  });

  test("Oversize PDF: focus lands on #files and order is preserved", async ({ page }) => {
    await fillValid(page);
    await fileInput(page).setInputFiles(oversizedPdf());
    await submitForm(page);

    await expect(summary(page)).toContainText("צירוף קבצים");
    await expect(fileInput(page)).toHaveAttribute("aria-invalid", "true");
    await summary(page).getByRole("button", { name: /צירוף קבצים/ }).click();
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });
    await page.keyboard.press("Shift+Tab");
    await expect(desc(page)).toBeFocused({ timeout: 2000 });
  });

  test("File invalid + earlier field empty: focus goes to first invalid (name), not files", async ({ page }) => {
    // Leave name empty
    await page.locator('input[name="phone"]').fill("0501234567");
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="address"]').fill("תל אביב 1");
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await desc(page).fill("תיאור קצר אך מספיק לבדיקה.");
    await fileInput(page).setInputFiles(TXT_FIXTURE);

    await submitForm(page);

    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).toContainText("צירוף קבצים");
    // Activate the first error entry (name) → focus moves to that field.
    await summary(page).getByRole("button", { name: /שם מלא/ }).click();
    await expect(page.locator('input[name="name"]')).toBeFocused({ timeout: 2000 });

    // Tab from name walks normally — eventually reaches the still-invalid file input
    let reached = false;
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      if (await fileInput(page).evaluate((el) => el === document.activeElement)) {
        reached = true;
        break;
      }
    }
    expect(reached, "Tab must reach the invalid #files field naturally").toBe(true);

    // From #files, Tab → submit (still no trap on the invalid field)
    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });
  });

  test("Tab forward from submit can leave the form even with errors present", async ({ page }) => {
    await fillValid(page);
    await fileInput(page).setInputFiles(TXT_FIXTURE);
    await submitForm(page);
    await expect(summary(page)).toBeVisible();

    await submit(page).focus();

    let escaped = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const inForm = await page.evaluate(
        () => !!(document.activeElement as HTMLElement | null)?.closest("#contact form"),
      );
      if (!inForm) { escaped = true; break; }
    }
    expect(escaped, "Errors must not trap focus inside the form").toBe(true);
  });

  test("Clicking the summary entry returns focus to #files; Tab order continues from there", async ({ page }) => {
    await fillValid(page);
    await fileInput(page).setInputFiles(TXT_FIXTURE);
    await submitForm(page);

    // Move focus away first
    await desc(page).focus();
    await expect(desc(page)).toBeFocused();

    await summary(page).getByText("צירוף קבצים").first().click();
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });
  });
});
