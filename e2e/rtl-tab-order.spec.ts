import { test, expect, Page } from "@playwright/test";
import path from "path";

/**
 * E2E: Tab / Shift+Tab navigation in RTL mode is consistent across all
 * file selection states (no selection, valid, invalid, mixed-then-fixed)
 * and never re-routes focus into a field that was already fixed.
 *
 * DOM order of focusable form fields:
 *   name → phone → email → address → type (combobox) → desc → files → submit
 *
 * In RTL the visual direction flips, but Tab order follows DOM order.
 * We verify DOM-order navigation regardless of file state.
 */

const PDF_FIXTURE = path.join(__dirname, "fixtures", "sample.pdf");
const TXT_FIXTURE = path.join(__dirname, "fixtures", "sample.txt");

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

const focusedTestId = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    return {
      name: el.getAttribute("name"),
      id: el.id,
      tag: el.tagName.toLowerCase(),
    };
  });

test.describe("RTL: Tab/Shift+Tab order is consistent across file states", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
    // Sanity: the document is RTL
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("RTL Tab order with no files matches DOM order", async ({ page }) => {
    await page.locator('input[name="name"]').focus();
    const seq: string[] = ["name"];
    for (const expected of ["phone", "email", "address"]) {
      await page.keyboard.press("Tab");
      const f = await focusedTestId(page);
      expect(f?.name).toBe(expected);
      seq.push(expected);
    }
    expect(seq).toEqual(["name", "phone", "email", "address"]);
  });

  test("RTL Tab order with a valid file selected matches DOM order", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);

    await page.locator('input[name="address"]').focus();
    // address → type (combobox) → desc → files
    await page.keyboard.press("Tab");
    const afterAddress = await focusedTestId(page);
    expect(afterAddress?.id).toBe("type");

    await page.locator('textarea[name="desc"]').focus();
    await page.keyboard.press("Tab");
    const afterDesc = await focusedTestId(page);
    expect(afterDesc?.id).toBe("files");
  });

  test("Shift+Tab in RTL with bad file does not skip back into already-fixed fields", async ({ page }) => {
    // Submit with empty name + bad file → both invalid
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(summary(page)).toContainText("שם מלא");
    await expect(summary(page)).toContainText("צירוף קבצים");

    // Fix the name field live (without resubmit)
    await page.locator('input[name="name"]').fill("ישראל ישראלי");
    await expect(summary(page)).not.toContainText("שם מלא");

    // From #files, Shift+Tab should walk backwards through the form in DOM order
    // and never auto-jump to a "first invalid" field — it should land on desc next.
    await page.locator("#files").focus();
    await page.keyboard.press("Shift+Tab");
    const prev = await focusedTestId(page);
    expect(prev?.id).toBe("desc");
  });

  test("After fixing the file live, Tab from #files moves forward (not back to a fixed field)", async ({ page }) => {
    await fillValid(page);
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "true");

    // Fix file live
    await page.locator("#files").focus();
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await expect(page.locator("#files")).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#files")).toBeFocused();

    // Tab should NOT loop back into the form to any "previously invalid" field.
    await page.keyboard.press("Tab");
    const next = await focusedTestId(page);
    expect(next?.name).not.toBe("name");
    expect(next?.id).not.toBe("desc");
    expect(next?.id).not.toBe("files");
  });

  test("Tab order is identical before bad selection, after submit, and after live fix", async ({ page }) => {
    const collectFromAddress = async () => {
      await page.locator('input[name="address"]').focus();
      const order: string[] = [];
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("Tab");
        const f = await focusedTestId(page);
        order.push(f?.id || f?.name || "");
      }
      return order;
    };

    await fillValid(page);

    // 1) With a valid file
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    const orderValid = await collectFromAddress();

    // 2) After submitting with a bad selection
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);
    const orderBad = await collectFromAddress();

    // 3) After live fix back to valid
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    const orderFixed = await collectFromAddress();

    // All three sequences should be identical (type → desc → files)
    expect(orderValid).toEqual(["type", "desc", "files"]);
    expect(orderBad).toEqual(["type", "desc", "files"]);
    expect(orderFixed).toEqual(["type", "desc", "files"]);
  });

  test("Shift+Tab in RTL traverses backwards in DOM order regardless of file state", async ({ page }) => {
    await fillValid(page);

    // No file
    await page.locator('textarea[name="desc"]').focus();
    await page.keyboard.press("Shift+Tab");
    expect((await focusedTestId(page))?.id).toBe("type");

    // Bad file
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);
    await page.locator('textarea[name="desc"]').focus();
    await page.keyboard.press("Shift+Tab");
    expect((await focusedTestId(page))?.id).toBe("type");

    // Fixed file
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);
    await page.locator('textarea[name="desc"]').focus();
    await page.keyboard.press("Shift+Tab");
    expect((await focusedTestId(page))?.id).toBe("type");
  });
});
