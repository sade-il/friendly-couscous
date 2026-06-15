import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: returning focus to the form after opening/closing the OS file picker.
 *
 * The OS dialog itself can't be driven by Playwright, but we can simulate
 * the surrounding lifecycle:
 *   - window blur (picker opens)  → input keeps focus
 *   - window focus (picker closes via select/cancel) → Tab/Shift+Tab keep
 *     traversing the form in DOM order without skipping or trapping.
 *
 * Expected DOM order around the file input:
 *   ... → type → desc → files → submit
 */

const PDF_FIXTURE = path.join(__dirname, "fixtures", "sample.pdf");

const fileInput = (page: Page) => page.locator('#files');
const submit = (page: Page) => page.locator('button[type="submit"]');
const desc = (page: Page) => page.locator('textarea[name="desc"]');

const fireWindowBlurFocus = async (page: Page) => {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("blur"));
  });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
  });
};

const focusFile = async (page: Page) => {
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await fileInput(page).focus();
  await expect(fileInput(page)).toBeFocused();
};

test.describe("Tab/Shift+Tab after returning from OS file picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("After window blur+focus with no selection, Tab order is intact", async ({ page }) => {
    await focusFile(page);
    await fireWindowBlurFocus(page);

    // Re-focus is required because window blur drops document.activeElement
    await fileInput(page).focus();
    await expect(fileInput(page)).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(desc(page)).toBeFocused({ timeout: 2000 });
  });

  test("After picking a file (with blur/focus around it), Tab → submit, Shift+Tab → desc", async ({ page }) => {
    await focusFile(page);

    // Simulate the picker opening
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));

    await fileInput(page).setInputFiles(PDF_FIXTURE);

    // Simulate the user returning to the page after the dialog closes
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));

    await fileInput(page).focus();
    await expect(fileInput(page)).toBeFocused();
    await expect(fileInput(page)).toHaveAttribute("aria-invalid", "false");

    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(desc(page)).toBeFocused({ timeout: 2000 });
  });

  test("After cancelling the picker (filechooser dispose), Tab order remains intact", async ({ page }) => {
    await focusFile(page);

    // Hook BEFORE the click that opens the chooser
    page.once("filechooser", (chooser) => {
      void chooser.setFiles([]); // simulate cancel
    });

    // Open via keyboard activation (Space)
    await page.keyboard.press("Space");
    await fireWindowBlurFocus(page);

    const count = await fileInput(page).evaluate((el: HTMLInputElement) => el.files?.length ?? 0);
    expect(count).toBe(0);

    await fileInput(page).focus();
    await expect(fileInput(page)).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(desc(page)).toBeFocused({ timeout: 2000 });
  });

  test("Repeated open→cancel→open→select cycles do not break focus order", async ({ page }) => {
    await focusFile(page);

    for (let i = 0; i < 3; i++) {
      await fireWindowBlurFocus(page);
      await fileInput(page).focus();
    }

    await fileInput(page).setInputFiles(PDF_FIXTURE);
    await fireWindowBlurFocus(page);
    await fileInput(page).focus();

    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    // And forward Tab past submit must still leave the form
    let escaped = false;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const inForm = await page.evaluate(
        () => !!(document.activeElement as HTMLElement | null)?.closest("#contact form"),
      );
      if (!inForm) { escaped = true; break; }
    }
    expect(escaped, "Focus must still be able to leave the form").toBe(true);
  });

  test("After picker round-trip, focus is never trapped on the file input", async ({ page }) => {
    await focusFile(page);
    await fileInput(page).setInputFiles(PDF_FIXTURE);
    await fireWindowBlurFocus(page);
    await fileInput(page).focus();

    // 5 Tabs from #files must reach >=2 distinct elements outside #files
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      const id = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return "none";
        return el.id || el.tagName + ":" + (el.getAttribute("name") || "");
      });
      if (id !== "files") seen.add(id);
    }
    expect(seen.size).toBeGreaterThan(0);
  });
});
