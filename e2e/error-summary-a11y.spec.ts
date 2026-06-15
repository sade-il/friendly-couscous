import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "path";

/**
 * E2E + a11y: In RTL, the error summary lists invalid fields in the
 * canonical FIELD_ORDER (DOM/visual top-to-bottom), and the relevant ARIA
 * landmarks are announced from the right place:
 *
 *  - The summary container is role="alert", aria-live="assertive",
 *    aria-labelledby="error-summary-title", tabIndex=-1 and focusable.
 *  - The summary title h3#error-summary-title contains the count.
 *  - Each invalid field row appears in the canonical order:
 *      name → phone → email → address → type → desc → files
 *  - Each invalid field has aria-invalid="true" and an aria-describedby
 *    pointing to its <id>-error message.
 *  - axe-core finds no critical/serious accessibility violations on the
 *    contact form region while errors are present.
 */

const PDF_FIXTURE = path.join(__dirname, "fixtures", "sample.pdf");
const TXT_FIXTURE = path.join(__dirname, "fixtures", "sample.txt");

const submitForm = (page: Page) =>
  page.getByRole("button", { name: /שליחת פנייה/ }).click();

const summary = (page: Page) => page.locator('[aria-labelledby="error-summary-title"]');

test.describe("RTL error summary order + ARIA landmark accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.locator("#contact").scrollIntoViewIfNeeded();
  });

  test("Summary lists invalid fields in canonical FIELD_ORDER (top-to-bottom)", async ({ page }) => {
    // Make every field invalid: leave all empty and add a bad file
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    await expect(summary(page)).toBeVisible();

    const items = summary(page).locator("ul > li button");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      labels.push((await items.nth(i).innerText()).trim());
    }

    // Expected canonical order (only the labels that should be invalid here)
    const expectedOrder = [
      "שם מלא",
      "טלפון",
      "תיאור הפנייה",
      "צירוף קבצים",
    ];
    // Labels that DO appear must appear in the canonical sequence
    const found = expectedOrder.filter((lbl) =>
      labels.some((l) => l.startsWith(lbl + ":"))
    );
    const positions = found.map((lbl) =>
      labels.findIndex((l) => l.startsWith(lbl + ":"))
    );
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
    // And it must include at least name and files
    expect(found).toContain("שם מלא");
    expect(found).toContain("צירוף קבצים");
  });

  test("Summary container exposes correct ARIA landmark attributes", async ({ page }) => {
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    const s = summary(page);
    await expect(s).toHaveAttribute("role", "alert");
    await expect(s).toHaveAttribute("aria-live", "assertive");
    await expect(s).toHaveAttribute("aria-labelledby", "error-summary-title");
    await expect(s).toHaveAttribute("tabindex", "-1");

    // The labelling element exists, has the right id, and is non-empty
    const title = page.locator("#error-summary-title");
    await expect(title).toBeVisible();
    await expect(title).toContainText("יש לתקן");

    // Summary is focusable programmatically (skip-link target)
    await s.focus();
    await expect(s).toBeFocused();
  });

  test("Each invalid field has aria-invalid + aria-describedby pointing to its error", async ({ page }) => {
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    const checks: Array<{ sel: string; errId: string }> = [
      { sel: 'input[name="name"]', errId: "name-error" },
      { sel: "#files", errId: "files-error" },
    ];

    for (const { sel, errId } of checks) {
      const field = page.locator(sel);
      await expect(field).toHaveAttribute("aria-invalid", "true");
      const describedBy = await field.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(describedBy!.split(/\s+/)).toContain(errId);
      // The referenced element exists and has visible text
      const errEl = page.locator(`#${errId}`);
      await expect(errEl).toBeVisible();
      await expect(errEl).not.toHaveText("");
    }
  });

  test("Clicking a summary entry moves focus to the associated form field", async ({ page }) => {
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    // Click the "צירוף קבצים" entry → focus jumps to #files
    const filesEntry = summary(page).getByRole("button", { name: /צירוף קבצים/ });
    await filesEntry.click();
    await expect(page.locator("#files")).toBeFocused();

    // Click the "שם מלא" entry → focus jumps to name input
    const nameEntry = summary(page).getByRole("button", { name: /שם מלא/ });
    await nameEntry.click();
    await expect(page.locator('input[name="name"]')).toBeFocused();
  });

  test("axe-core: no serious/critical a11y violations in the contact form with errors visible", async ({ page }) => {
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);
    await expect(summary(page)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include("#contact")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    if (blocking.length) {
      console.log(
        "axe violations:",
        JSON.stringify(
          blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
          null,
          2
        )
      );
    }
    expect(blocking).toEqual([]);
  });

  test("Summary updates and stays correctly ordered after a live fix", async ({ page }) => {
    // Three invalid: name (empty), desc (empty), files (bad)
    await page.locator('input[name="phone"]').fill("0501234567");
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="address"]').fill("תל אביב 1");
    await page.locator("#type").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.locator("#files").setInputFiles([PDF_FIXTURE, TXT_FIXTURE]);
    await submitForm(page);

    // Fix the file → remaining: name, desc — must stay in this order
    await page.locator("#files").setInputFiles([PDF_FIXTURE]);

    const items = summary(page).locator("ul > li button");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("שם מלא");
    await expect(items.nth(1)).toContainText("תיאור הפנייה");
  });
});
