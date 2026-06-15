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

test.describe("Select keyboard escape — no trap inside listbox", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Tab while open closes the listbox and moves to textarea", async ({ page }) => {
    await openSelect(page);
    await page.keyboard.press("Tab");

    await expect(listbox(page)).toBeHidden({ timeout: 2000 });
    await expect(page.locator('textarea[name="desc"]')).toBeFocused({ timeout: 2000 });
  });

  test("Shift+Tab while open closes the listbox and moves to address", async ({ page }) => {
    await openSelect(page);
    await page.keyboard.press("Shift+Tab");

    await expect(listbox(page)).toBeHidden({ timeout: 2000 });
    await expect(page.locator('input[name="address"]')).toBeFocused({ timeout: 2000 });
  });

  test("Tab after navigating options still escapes, no trap", async ({ page }) => {
    await openSelect(page);
    // Move highlight a few times inside the listbox
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    // Focus must still be inside the listbox (not on a form field) before Tab
    const insideListboxBefore = await page.evaluate(() =>
      !!(document.activeElement as HTMLElement | null)?.closest('[role="listbox"]')
    );
    expect(insideListboxBefore).toBe(true);

    await page.keyboard.press("Tab");
    await expect(listbox(page)).toBeHidden({ timeout: 2000 });
    await expect(page.locator('textarea[name="desc"]')).toBeFocused({ timeout: 2000 });
  });

  test("Spamming Tab while open never leaves focus inside the listbox", async ({ page }) => {
    await openSelect(page);

    let stuckInListbox = false;
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() =>
        !!(document.activeElement as HTMLElement | null)?.closest('[role="listbox"]')
      );
      if (inside) {
        stuckInListbox = true;
        break;
      }
    }
    expect(stuckInListbox, "Focus must never remain inside an open listbox after Tab").toBe(false);
    await expect(listbox(page)).toBeHidden();
  });
});
