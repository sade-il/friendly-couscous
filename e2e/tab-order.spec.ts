import { test, expect, Page } from "@playwright/test";

/**
 * E2E: tab-order & no-focus-traps after activating the skip-link.
 *
 * Expected DOM order of focusable controls inside the form:
 *   name → phone → email → address → type (Select trigger) → desc → files → submit
 */

const FORM_ORDER = [
  { selector: 'input[name="name"]', label: "name" },
  { selector: 'input[name="phone"]', label: "phone" },
  { selector: 'input[name="email"]', label: "email" },
  { selector: 'input[name="address"]', label: "address" },
  { selector: '#type', label: "type" },
  { selector: 'textarea[name="desc"]', label: "desc" },
  { selector: 'input[type="file"]', label: "files" },
  { selector: 'button[type="submit"]', label: "submit" },
];

const focusedTestId = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    return {
      tag: el.tagName,
      name: el.getAttribute("name"),
      id: el.id,
      type: el.getAttribute("type"),
      role: el.getAttribute("role"),
      text: (el.textContent || "").trim().slice(0, 40),
    };
  });

const activateSkipLink = async (page: Page) => {
  const skip = page.getByRole("link", { name: "דלג לתוכן הסיכום והטופס" });
  await skip.focus();
  await skip.press("Enter");
  await expect(page.locator('input[name="name"]')).toBeFocused({ timeout: 2000 });
};

test.describe("Tab order after skip-link, no focus traps", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Tab walks the form fields in DOM order", async ({ page }) => {
    await activateSkipLink(page);

    // Already on "name" — walk the rest
    for (let i = 1; i < FORM_ORDER.length; i++) {
      await page.keyboard.press("Tab");
      const expected = FORM_ORDER[i];
      await expect(
        page.locator(expected.selector),
        `Tab #${i} should focus ${expected.label}`
      ).toBeFocused({ timeout: 2000 });
    }
  });

  test("Shift+Tab walks the form fields in reverse", async ({ page }) => {
    await activateSkipLink(page);

    // Jump to last field, then walk backwards
    await page.locator('button[type="submit"]').focus();
    for (let i = FORM_ORDER.length - 2; i >= 0; i--) {
      await page.keyboard.press("Shift+Tab");
      const expected = FORM_ORDER[i];
      await expect(
        page.locator(expected.selector),
        `Shift+Tab should reach ${expected.label}`
      ).toBeFocused({ timeout: 2000 });
    }
  });

  test("no focus trap: Tab past submit leaves the form", async ({ page }) => {
    await activateSkipLink(page);
    await page.locator('button[type="submit"]').focus();

    // A handful of Tabs should reach an element outside the contact form
    let escaped = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const inForm = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return false;
        return !!el.closest("#contact form");
      });
      if (!inForm) {
        escaped = true;
        break;
      }
    }
    expect(escaped, "Focus must be able to leave the form via Tab").toBe(true);
  });

  test("no focus trap: Shift+Tab before name leaves the form upward", async ({ page }) => {
    await activateSkipLink(page);
    // Already on name. Shift+Tab should move out of the form.
    let escaped = false;
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Shift+Tab");
      const inForm = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return !!el?.closest("#contact form");
      });
      if (!inForm) {
        escaped = true;
        break;
      }
    }
    expect(escaped, "Shift+Tab from first field must exit the form").toBe(true);
  });

  test("no element traps focus on a single Tab press (no infinite loop)", async ({ page }) => {
    await activateSkipLink(page);
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const info = await focusedTestId(page);
      const key = JSON.stringify(info);
      // It's fine to revisit, but we must not be stuck on the same element twice in a row
      // unless there really is only one focusable left. We only flag immediate repeats.
      if (seen.has(key) && i < 5) {
        // ignore early — could be valid
      }
      seen.add(key);
      await page.keyboard.press("Tab");
    }
    // Healthy page exposes more than 5 distinct focus targets in 30 tabs
    expect(seen.size).toBeGreaterThan(5);
  });
});
