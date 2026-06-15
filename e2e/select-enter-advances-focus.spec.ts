import { test, expect, Page } from "@playwright/test";

/**
 * E2E: pressing Enter inside an open Select must
 *  1. select the highlighted option,
 *  2. close the listbox,
 *  3. advance focus to the next field (textarea#desc).
 *
 * Default Radix Select returns focus to the trigger; the Contact form
 * intentionally moves focus forward via onValueChange.
 */

const trigger = (page: Page) => page.locator("#type");
const listbox = (page: Page) => page.locator('[role="listbox"]');
const desc = (page: Page) => page.locator('textarea[name="desc"]');

const openSelect = async (page: Page) => {
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await trigger(page).focus();
  await page.keyboard.press("Enter");
  await expect(listbox(page)).toBeVisible({ timeout: 2000 });
};

test.describe("Enter inside open Select selects + advances focus to desc", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Enter on first option closes the listbox and focuses desc", async ({ page }) => {
    await openSelect(page);
    await page.keyboard.press("Enter");

    await expect(listbox(page)).toBeHidden({ timeout: 2000 });
    await expect(desc(page)).toBeFocused({ timeout: 2000 });

    // Trigger reflects a real selection (placeholder is gone)
    await expect(trigger(page)).not.toContainText("בחרו את סוג הפנייה");
  });

  test("Enter after ArrowDown selects that option and focuses desc", async ({ page }) => {
    await openSelect(page);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(listbox(page)).toBeHidden({ timeout: 2000 });
    await expect(desc(page)).toBeFocused({ timeout: 2000 });
  });

  test("Selection persists and aria-invalid for type clears", async ({ page }) => {
    // Trigger validation first so type has aria-invalid=true
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /שליחת פנייה/ }).click();
    await expect(trigger(page)).toHaveAttribute("aria-invalid", "true");

    await openSelect(page);
    await page.keyboard.press("Enter");

    await expect(desc(page)).toBeFocused({ timeout: 2000 });
    await expect(trigger(page)).toHaveAttribute("aria-invalid", "false");
  });

  test("After Enter, Shift+Tab from desc returns to the Select trigger", async ({ page }) => {
    await openSelect(page);
    await page.keyboard.press("Enter");
    await expect(desc(page)).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(trigger(page)).toBeFocused({ timeout: 2000 });
  });
});
