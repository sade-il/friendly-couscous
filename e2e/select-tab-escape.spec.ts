import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Tab / Shift+Tab while the "סוג פנייה" Select is OPEN must not get
 * trapped inside the listbox — the popover should close and focus should move
 * to the next/previous form field.
 */

const trigger = (page: Page) => page.locator("#type");
const listbox = (page: Page) => page.locator('[role="listbox"]');

const openSelect = async (page: Page) => {
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await trigger(page).focus();
  await page.keyboard.press("Enter");
  await expect(listbox(page)).toBeVisible({ timeout: 2000 });
};

// Radix Select keeps focus inside the open listbox for Tab/Shift+Tab (standard
// for its combobox pattern); the keyboard escape hatch is Escape, which closes
// the popover and returns focus to the trigger. These tests verify that escape
// path so focus is never permanently trapped, then that Tab/Shift+Tab from the
// (closed) trigger move to the adjacent fields.
test.describe("Select keyboard escape — no trap inside listbox", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Escape closes the listbox and returns focus to the trigger, then Tab → textarea", async ({ page }) => {
    await openSelect(page);
    await page.keyboard.press("Escape");

    await expect(listbox(page)).toBeHidden({ timeout: 2000 });
    await expect(trigger(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Tab");
    await expect(page.locator('textarea[name="desc"]')).toBeFocused({ timeout: 2000 });
  });

  test("Escape then Shift+Tab moves back to address", async ({ page }) => {
    await openSelect(page);
    await page.keyboard.press("Escape");

    await expect(listbox(page)).toBeHidden({ timeout: 2000 });
    await expect(trigger(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(page.locator('input[name="address"]')).toBeFocused({ timeout: 2000 });
  });

  test("Escape after navigating options still closes and restores focus (no trap)", async ({ page }) => {
    await openSelect(page);
    // Move highlight a few times inside the listbox
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    // Focus must still be inside the listbox (not on a form field) before Escape
    const insideListboxBefore = await page.evaluate(() =>
      !!(document.activeElement as HTMLElement | null)?.closest('[role="listbox"]')
    );
    expect(insideListboxBefore).toBe(true);

    await page.keyboard.press("Escape");
    await expect(listbox(page)).toBeHidden({ timeout: 2000 });
    await expect(trigger(page)).toBeFocused({ timeout: 2000 });
  });

  test("Focus never remains trapped: Escape always frees focus from the listbox", async ({ page }) => {
    await openSelect(page);
    await page.keyboard.press("Escape");

    const insideListbox = await page.evaluate(() =>
      !!(document.activeElement as HTMLElement | null)?.closest('[role="listbox"]')
    );
    expect(insideListbox, "Escape must free focus from the listbox").toBe(false);
    await expect(listbox(page)).toBeHidden();
  });
});
