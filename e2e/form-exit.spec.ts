import { test, expect, Page } from "@playwright/test";

/**
 * E2E: exiting the contact form via Tab / Shift+Tab after the user has
 * navigated through the file input and submit button.
 *
 *  - Shift+Tab from "submit" → returns to file input → textarea (no skip)
 *  - Tab forward from "submit" leaves the form and lands on a non-form element
 *  - The exit target is reachable and visible (not aria-hidden / display:none)
 *  - A reasonable number of Tabs eventually reaches a known landmark element
 *    (footer link, floating WhatsApp button, or accessibility widget toggle)
 */

const submit = (page: Page) => page.locator('button[type="submit"]');
const fileInput = (page: Page) => page.locator('input[type="file"]');
const desc = (page: Page) => page.locator('textarea[name="desc"]');

const inContactForm = (page: Page) =>
  page.evaluate(() => !!(document.activeElement as HTMLElement | null)?.closest("#contact form"));

test.describe("Exiting the form after the file/submit fields", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Shift+Tab from submit goes back: submit → files → textarea", async ({ page }) => {
    await submit(page).focus();
    await expect(submit(page)).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(desc(page)).toBeFocused({ timeout: 2000 });
  });

  test("Tab forward from submit leaves the form", async ({ page }) => {
    await submit(page).focus();
    await page.keyboard.press("Tab");

    // Active element must NOT be inside the contact form anymore
    expect(await inContactForm(page)).toBe(false);

    // And it must be a real, visible focusable element
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        visible: cs.visibility !== "hidden" && cs.display !== "none",
        ariaHidden: el.closest('[aria-hidden="true"]') !== null,
      };
    });
    expect(info, "Some element must receive focus after the form").not.toBeNull();
    expect(info!.visible).toBe(true);
    expect(info!.ariaHidden).toBe(false);
  });

  test("Tab eventually reaches a known landmark after the form", async ({ page }) => {
    await submit(page).focus();

    // Walk forward up to 30 Tabs and look for known post-form targets:
    //  - any link inside <footer>
    //  - the floating WhatsApp button (aria-label contains "WhatsApp")
    //  - the accessibility widget toggle (aria-label "פתיחת תפריט נגישות")
    let reached: string | null = null;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        if (el.closest("footer")) return "footer";
        const label = el.getAttribute("aria-label") || "";
        if (/WhatsApp/i.test(label)) return "whatsapp";
        if (label.includes("נגישות")) return "a11y";
        return null;
      });
      if (reached) break;
    }
    expect(reached, "Tab must eventually reach footer / WhatsApp / a11y widget").not.toBeNull();
  });

  test("Round trip: focus file → Tab to submit → Shift+Tab back to file works", async ({ page }) => {
    await fileInput(page).focus();
    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused({ timeout: 2000 });

    await page.keyboard.press("Shift+Tab");
    await expect(fileInput(page)).toBeFocused({ timeout: 2000 });
  });

  test("Shift+Tab spam from submit eventually exits the form upward", async ({ page }) => {
    await submit(page).focus();

    let escaped = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Shift+Tab");
      if (!(await inContactForm(page))) {
        escaped = true;
        break;
      }
    }
    expect(escaped, "Shift+Tab must be able to leave the form upward").toBe(true);
  });
});
