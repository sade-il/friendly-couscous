import { test, expect, Page } from "@playwright/test";

/**
 * E2E: tab order & focus management AFTER submitting an empty/invalid form.
 *
 *  - The error summary container receives focus on submit
 *  - Tab from the summary walks the error-list buttons in order
 *  - Shift+Tab walks them back, no traps
 *  - Activating an error button moves focus to the matching field
 *  - Tab order through the form fields is preserved after errors are shown
 */

const FIELDS_IN_DOM_ORDER = ["name", "phone", "email", "address", "type", "desc"] as const;

const submitEmptyForm = async (page: Page) => {
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /שליחת פנייה/ }).click();
  await expect(page.locator('[aria-labelledby="error-summary-title"]')).toBeVisible();
};

const summaryButtons = (page: Page) =>
  page.locator('[aria-labelledby="error-summary-title"] ul button');

test.describe("Focus & tab order after invalid submit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("error summary receives focus on submit", async ({ page }) => {
    await submitEmptyForm(page);
    await expect(page.locator('[aria-labelledby="error-summary-title"]')).toBeFocused();
  });

  test("Tab from summary walks error-list buttons in order", async ({ page }) => {
    await submitEmptyForm(page);

    const buttons = summaryButtons(page);
    const total = await buttons.count();
    expect(total).toBeGreaterThan(0);

    for (let i = 0; i < total; i++) {
      await page.keyboard.press("Tab");
      await expect(buttons.nth(i), `Tab #${i + 1} → error item ${i + 1}`).toBeFocused({
        timeout: 2000,
      });
    }
  });

  test("Shift+Tab walks error-list buttons in reverse, then exits upward", async ({ page }) => {
    await submitEmptyForm(page);

    const buttons = summaryButtons(page);
    const total = await buttons.count();
    await buttons.nth(total - 1).focus();

    for (let i = total - 2; i >= 0; i--) {
      await page.keyboard.press("Shift+Tab");
      await expect(buttons.nth(i)).toBeFocused({ timeout: 2000 });
    }

    // One more Shift+Tab: focus should leave the summary block (no trap)
    await page.keyboard.press("Shift+Tab");
    const stillInSummary = await page.evaluate(() =>
      !!(document.activeElement as HTMLElement | null)?.closest(
        '[aria-labelledby="error-summary-title"]'
      )
    );
    expect(stillInSummary, "Shift+Tab from first error must exit the summary").toBe(false);
  });

  test("activating an error link moves focus to the matching field", async ({ page }) => {
    await submitEmptyForm(page);
    const buttons = summaryButtons(page);
    const count = await buttons.count();

    // Click each summary button and verify the focus jumps to the matching field
    const fieldSelectorByLabel: Record<string, string> = {
      "שם מלא": 'input[name="name"]',
      "טלפון": 'input[name="phone"]',
      "דוא״ל": 'input[name="email"]',
      "כתובת הנכס": 'input[name="address"]',
      "סוג פנייה": "#type",
      "תיאור הפנייה": 'textarea[name="desc"]',
    };

    for (let i = 0; i < count; i++) {
      const text = (await buttons.nth(i).textContent()) || "";
      const matched = Object.entries(fieldSelectorByLabel).find(([label]) =>
        text.includes(label)
      );
      if (!matched) continue;
      await buttons.nth(i).click();
      await expect(
        page.locator(matched[1]),
        `error link "${matched[0]}" should focus its field`
      ).toBeFocused({ timeout: 2000 });
    }
  });

  test("form field tab order is preserved after errors are shown", async ({ page }) => {
    await submitEmptyForm(page);

    await page.locator('input[name="name"]').focus();
    const order = ['input[name="phone"]', 'input[name="email"]', 'input[name="address"]', "#type", 'textarea[name="desc"]'];
    for (const sel of order) {
      await page.keyboard.press("Tab");
      await expect(page.locator(sel)).toBeFocused({ timeout: 2000 });
    }
  });

  test("each invalid input is marked aria-invalid=true", async ({ page }) => {
    await submitEmptyForm(page);
    for (const name of FIELDS_IN_DOM_ORDER) {
      const sel = name === "type"
        ? "#type"
        : name === "desc"
          ? 'textarea[name="desc"]'
          : `input[name="${name}"]`;
      // address is optional in the schema; only assert if errored
      const el = page.locator(sel);
      const ariaInvalid = await el.getAttribute("aria-invalid");
      if (name === "address" || name === "email") {
        // optional fields — may be "false"
        expect(["true", "false", null]).toContain(ariaInvalid);
      } else {
        expect(ariaInvalid, `${name} should be aria-invalid=true`).toBe("true");
      }
    }
  });
});
