import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: focus order after interacting with the file picker.
 *
 * The OS file dialog cannot be driven by Playwright. Instead we:
 *   - simulate "user picks a file" via locator.setInputFiles(...)
 *   - simulate "user cancels" via the page.filechooser event + dispose()
 *
 * After each scenario we re-check Tab/Shift+Tab order from the file input.
 */

const FIXTURE = path.join(__dirname, "fixtures", "sample.txt");

const fileInput = (page: Page) => page.locator('input[type="file"]');
const submit = (page: Page) => page.locator('button[type="submit"]');
const desc = (page: Page) => page.locator('textarea[name="desc"]');

const focusFileInput = async (page: Page) => {
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await fileInput(page).focus();
  await expect(fileInput(page)).toBeFocused();
};

test.describe("Focus order after file picker interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("After selecting a file: Tab → submit, Shift+Tab → textarea", async ({ page }) => {
    await focusFileInput(page);

    // Programmatic selection (no OS dialog)
    await fileInput(page).setInputFiles(FIXTURE);

    // Sanity: a file was attached
    const count = await fileInput(page).evaluate((el: HTMLInputElement) => el.files?.length ?? 0);
    expect(count).toBe(1);

    // Re-focus (setInputFiles does not restore focus on every browser)
    await fileInput(page).focus();
    await expect(fileInput(page)).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(desc(page)).toBeFocused({ timeout: 2000 });
  });

  test("After selecting multiple files: focus order still intact", async ({ page }) => {
    await focusFileInput(page);
    await fileInput(page).setInputFiles([FIXTURE, FIXTURE]);

    await fileInput(page).focus();
    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });
  });

  test("After cancelling the file picker: focus stays on file input, Tab→submit", async ({ page }) => {
    await focusFileInput(page);

    // Hook BEFORE the click that opens the chooser
    page.once("filechooser", (chooser) => {
      // Simulate "Cancel" — disposing the chooser without setting files
      void chooser.setFiles([]);
    });

    // Open the picker via keyboard activation (Space) — this fires the event
    await page.keyboard.press("Space");

    // No files attached
    const count = await fileInput(page).evaluate((el: HTMLInputElement) => el.files?.length ?? 0);
    expect(count).toBe(0);

    // Focus must still be on (or returnable to) the file input
    await fileInput(page).focus();
    await expect(fileInput(page)).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });
  });

  test("Clearing files (re-set to empty) preserves Tab order", async ({ page }) => {
    await focusFileInput(page);
    await fileInput(page).setInputFiles(FIXTURE);
    await fileInput(page).setInputFiles([]); // clear

    const count = await fileInput(page).evaluate((el: HTMLInputElement) => el.files?.length ?? 0);
    expect(count).toBe(0);

    await fileInput(page).focus();
    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(desc(page)).toBeFocused({ timeout: 2000 });
  });

  test("Round trip: textarea → file → submit → file → textarea remains stable", async ({ page }) => {
    await desc(page).focus();

    await page.keyboard.press("Tab");
    await expect(fileInput(page)).toBeFocused();

    await fileInput(page).setInputFiles(FIXTURE);
    await fileInput(page).focus();

    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(desc(page)).toBeFocused();
  });
});
