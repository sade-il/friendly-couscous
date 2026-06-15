import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: Rapid back-and-forth replacement between invalid and valid file
 * selections. After each swap:
 *   - aria-invalid, #files-error, and the summary row reflect the CURRENT
 *     selection (not a stale prior state),
 *   - focus stays on #files and never jumps to a previously-invalid field
 *     or to the error summary,
 *   - Tab from #files goes to submit (DOM order) regardless of how many
 *     swaps happened.
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

const swapTo = async (page: Page, files: string | string[]) => {
  await fileInput(page).focus();
  await fileInput(page).setInputFiles(files);
};

test.describe("Rapid invalid↔valid file swaps — state stays consistent, focus stable", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Multiple swaps: error state matches current selection at every step", async ({ page }) => {
    await fillValid(page);
    await fileInput(page).setInputFiles(TXT_FIXTURE);
    await submitForm(page);

    // Baseline: invalid
    await expect(fileInput(page)).toHaveAttribute("aria-invalid", "true");
    await expect(summary(page)).toContainText("צירוף קבצים");

    const sequence: Array<{ files: string | string[]; invalid: boolean }> = [
      { files: PDF_FIXTURE, invalid: false },
      { files: TXT_FIXTURE, invalid: true },
      { files: PDF_FIXTURE, invalid: false },
      { files: [PDF_FIXTURE, TXT_FIXTURE], invalid: true },
      { files: [PDF_FIXTURE], invalid: false },
      { files: TXT_FIXTURE, invalid: true },
      { files: PDF_FIXTURE, invalid: false },
    ];

    for (const [i, step] of sequence.entries()) {
      await swapTo(page, step.files);

      if (step.invalid) {
        await expect(
          fileInput(page),
          `step ${i}: aria-invalid should be true`,
        ).toHaveAttribute("aria-invalid", "true", { timeout: 2000 });
        await expect(page.locator("#files-error")).toBeVisible();
        await expect(summary(page)).toContainText("צירוף קבצים");
      } else {
        await expect(
          fileInput(page),
          `step ${i}: aria-invalid should be false`,
        ).toHaveAttribute("aria-invalid", "false", { timeout: 2000 });
        await expect(page.locator("#files-error")).toHaveCount(0);
        // Other fields are valid here, so summary should disappear entirely
        await expect(summary(page)).toHaveCount(0);
      }

      // Focus must remain on #files after every swap — never on summary or another field
      await expect(fileInput(page), `step ${i}: focus stays on #files`).toBeFocused();
    }
  });

  test("After ending on a VALID file, Tab → submit and Shift+Tab → desc", async ({ page }) => {
    await fillValid(page);
    await fileInput(page).setInputFiles(TXT_FIXTURE);
    await submitForm(page);

    // Bounce a few times, end valid
    await swapTo(page, PDF_FIXTURE);
    await swapTo(page, TXT_FIXTURE);
    await swapTo(page, PDF_FIXTURE);

    await expect(fileInput(page)).toHaveAttribute("aria-invalid", "false");
    await expect(fileInput(page)).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(desc(page)).toBeFocused({ timeout: 2000 });
  });

  test("After ending on an INVALID file, focus is on #files and Tab still goes to submit (no jump to old errors)", async ({ page }) => {
    await fillValid(page);
    await fileInput(page).setInputFiles(TXT_FIXTURE);
    await submitForm(page);

    await swapTo(page, PDF_FIXTURE);
    await swapTo(page, [PDF_FIXTURE, TXT_FIXTURE]); // invalid again
    await swapTo(page, PDF_FIXTURE);
    await swapTo(page, TXT_FIXTURE); // end invalid

    await expect(fileInput(page)).toHaveAttribute("aria-invalid", "true");
    await expect(summary(page)).toContainText("צירוף קבצים");
    await expect(fileInput(page)).toBeFocused();

    // Tab must NOT jump backwards to a stale invalid field — it goes forward to submit
    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });
  });

  test("Summary updates do not steal focus during rapid swaps", async ({ page }) => {
    await fillValid(page);
    await fileInput(page).setInputFiles(TXT_FIXTURE);
    await submitForm(page);

    // Track that focus is always #files (or body during transient updates) — never another form field
    for (const files of [PDF_FIXTURE, TXT_FIXTURE, PDF_FIXTURE, TXT_FIXTURE, PDF_FIXTURE]) {
      await swapTo(page, files);
      const focusedId = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.id ?? "");
      expect(focusedId, `focus must stay on #files, got "${focusedId}"`).toBe("files");
    }
  });
});
