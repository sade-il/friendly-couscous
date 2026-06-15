import { test, expect } from "@playwright/test";

/**
 * E2E: skip-link "דלג לתוכן הסיכום והטופס" must:
 *  1. Render an aria-live="polite" status region in the contact section
 *  2. Update the live region with an announcement when activated
 *  3. Announce summary + first invalid field when the form has errors
 */

test.describe("Accessibility skip-link aria-live announcement", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("live region exists with role=status and aria-live=polite", async ({ page }) => {
    const live = page.locator('#contact [role="status"][aria-live="polite"]');
    await expect(live).toHaveCount(1);
    await expect(live).toHaveAttribute("aria-atomic", "true");
  });

  test("announces jump to form when no errors are present", async ({ page }) => {
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    // Skip-links become visible only when focused
    await skip.focus();
    await skip.press("Enter");

    const live = page.locator('#contact [role="status"][aria-live="polite"]');
    await expect(live).toContainText("קפצת לטופס", { timeout: 3000 });
    await expect(live).toContainText("שם מלא");

    // First form field should receive focus
    await expect(page.locator('input[name="name"]')).toBeFocused();
  });

  test("announces summary + first invalid field when form has errors", async ({ page }) => {
    // Trigger validation by submitting an empty form
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /שליחת פנייה/ }).click();

    // Error summary should appear and first invalid field is "name"
    const summary = page.locator('[aria-labelledby="error-summary-title"]');
    await expect(summary).toBeVisible();

    // Activate the skip-link
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    await skip.focus();
    await skip.press("Enter");

    const live = page.locator('#contact [role="status"][aria-live="polite"]');
    await expect(live).toContainText("קפצת לסיכום השגיאות", { timeout: 3000 });
    await expect(live).toContainText("שדות דורשים תיקון");
    await expect(live).toContainText("שם מלא"); // first invalid field

    // Focus moves to summary first, then (after ~600ms) to the first invalid field
    await expect(summary).toBeFocused();
    await expect(page.locator('input[name="name"]')).toBeFocused({ timeout: 2000 });
    await expect(page.locator('input[name="name"]')).toHaveAttribute("aria-invalid", "true");
  });

  test("focus jumps to first remaining invalid field when earlier fields are fixed", async ({ page }) => {
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /שליחת פנייה/ }).click();
    await expect(page.locator('[aria-labelledby="error-summary-title"]')).toBeVisible();

    // Fix the first two invalid fields (name + phone)
    await page.locator('input[name="name"]').fill("ישראל ישראלי");
    await page.locator('input[name="phone"]').fill("0501234567");

    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    await skip.focus();
    await skip.press("Enter");

    // First remaining invalid field is "type" (Select). Its trigger has id="type".
    const live = page.locator('#contact [role="status"][aria-live="polite"]');
    await expect(live).toContainText("סוג פנייה", { timeout: 3000 });
    await expect(page.locator('#type')).toBeFocused({ timeout: 2000 });
  });

  test("focus jumps to first form input (name) when there are no errors", async ({ page }) => {
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    await skip.focus();
    await skip.press("Enter");

    await expect(page.locator('input[name="name"]')).toBeFocused({ timeout: 2000 });
  });

  test("live region re-announces (clears then re-fills) on repeated activation", async ({ page }) => {
    const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
    const live = page.locator('#contact [role="status"][aria-live="polite"]');

    await skip.focus();
    await skip.press("Enter");
    await expect(live).toContainText("קפצת לטופס");

    // Second activation: live region should briefly clear, then re-populate
    await skip.focus();
    await skip.press("Enter");
    // Eventually contains the message again — the reset trick re-fires SR announcement
    await expect(live).toContainText("קפצת לטופס", { timeout: 3000 });
  });
});
