import { test, expect, Page } from "@playwright/test";

/**
 * E2E: In RTL, the Tab focus order through the header (logo → nav links / menu
 * toggle → CTA / social) must remain logical (visual right-to-left in RTL maps
 * to DOM order — Tab still walks DOM order, which should match reading flow),
 * and the link that ultimately receives focus must be reported as the
 * `document.activeElement` before Enter is pressed.
 */

const HEADER_LINK_LABELS = [
  "בית",
  "שירותים",
  "פרויקטים",
  "מחשבונים",
  "לפני בדיקה",
  "אודות",
  "המלצות",
  "אמנת שירות",
  "צור קשר",
] as const;

const tabUntil = async (
  page: Page,
  predicate: () => boolean,
  max = 40
): Promise<boolean> => {
  for (let i = 0; i < max; i++) {
    const matched = await page.evaluate(predicate);
    if (matched) return true;
    await page.keyboard.press("Tab");
  }
  return await page.evaluate(predicate);
};

const focusedSummary = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      ariaLabel: el.getAttribute("aria-label"),
      href: (el as HTMLAnchorElement).getAttribute?.("href") ?? null,
      inHeader: !!el.closest("header"),
      inHeaderNav: !!el.closest("header nav"),
      inMobileNav: !!el.closest("#mobile-nav"),
      text: (el.textContent || "").trim(),
    };
  });

test.describe("RTL Tab focus order — desktop header", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Document is RTL and header nav is rendered", async ({ page }) => {
    expect(await page.evaluate(() => document.documentElement.dir)).toBe("rtl");
    await expect(page.locator("header nav").first()).toBeVisible();
  });

  test("Tab walks header nav links in DOM order matching the visible labels", async ({ page }) => {
    // Snapshot the DOM order of header nav links and assert it matches the
    // expected labels (reading flow). Tab will traverse this same order.
    const labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll("header nav a")).map((a) =>
        (a.textContent || "").replace(/\s+/g, " ").trim()
      )
    );
    for (const expected of HEADER_LINK_LABELS) {
      expect(labels.some((l) => l.includes(expected))).toBe(true);
    }
    // First nav link in DOM should be "בית" (logical reading flow start)
    expect(labels[0]).toContain("בית");
  });

  test("Tab through the page reaches each header nav link in order, and each is the active element", async ({ page }) => {
    const seen: string[] = [];
    for (let i = 0; i < 60 && seen.length < HEADER_LINK_LABELS.length; i++) {
      await page.keyboard.press("Tab");
      const info = await focusedSummary(page);
      if (info?.inHeaderNav && info.tag === "a") {
        const matched = HEADER_LINK_LABELS.find((l) => info.text.includes(l));
        if (matched && !seen.includes(matched)) seen.push(matched);
      }
    }
    expect(seen).toEqual([...HEADER_LINK_LABELS]);
  });

  test('"צור קשר" link is the document.activeElement just before Enter', async ({ page }) => {
    const reached = await tabUntil(page, () => {
      const el = document.activeElement as HTMLElement | null;
      return (
        !!el &&
        el.tagName === "A" &&
        !!el.closest("header nav") &&
        (el.textContent || "").includes("צור קשר")
      );
    });
    expect(reached, "should reach 'צור קשר' via Tab").toBe(true);

    const info = await focusedSummary(page);
    expect(info?.tag).toBe("a");
    expect(info?.inHeaderNav).toBe(true);
    expect(info?.text).toContain("צור קשר");
    expect(info?.href).toBe("#contact");

    // Now Enter activates exactly that link
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contact$/);
  });
});

test.describe("RTL Tab focus order — mobile header & menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("Tab eventually reaches the mobile menu toggle, which reports as active", async ({ page }) => {
    const reached = await tabUntil(
      page,
      () => {
        const el = document.activeElement as HTMLElement | null;
        return (
          !!el &&
          el.tagName === "BUTTON" &&
          el.getAttribute("aria-label") === "תפריט"
        );
      },
      50
    );
    expect(reached).toBe(true);

    const info = await focusedSummary(page);
    expect(info?.tag).toBe("button");
    expect(info?.ariaLabel).toBe("תפריט");
    expect(info?.inHeader).toBe(true);
  });

  test("With menu open, Tab walks links in DOM order and each is reported active", async ({ page }) => {
    const toggle = page.getByRole("button", { name: "תפריט" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#mobile-nav")).toBeVisible();

    const seen: string[] = [];
    // Toggle is index 0 in the trap; Tab from there enters the link list.
    for (let i = 0; i < HEADER_LINK_LABELS.length + 2; i++) {
      await page.keyboard.press("Tab");
      const info = await focusedSummary(page);
      if (info?.inMobileNav && info.tag === "a") {
        const matched = HEADER_LINK_LABELS.find((l) => info.text.includes(l));
        if (matched && !seen.includes(matched)) seen.push(matched);
      }
    }
    // Visited in DOM order, complete and unique
    expect(seen).toEqual([...HEADER_LINK_LABELS]);
  });

  test('Mobile: "אודות" link is active just before Enter activates it', async ({ page }) => {
    const toggle = page.getByRole("button", { name: "תפריט" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#mobile-nav")).toBeVisible();

    // Walk Tab forward until the "אודות" link is the activeElement
    const reached = await tabUntil(
      page,
      () => {
        const el = document.activeElement as HTMLElement | null;
        return (
          !!el &&
          el.tagName === "A" &&
          !!el.closest("#mobile-nav") &&
          (el.textContent || "").includes("אודות")
        );
      },
      HEADER_LINK_LABELS.length + 4
    );
    expect(reached).toBe(true);

    const info = await focusedSummary(page);
    expect(info?.tag).toBe("a");
    expect(info?.inMobileNav).toBe(true);
    expect(info?.text).toContain("אודות");
    expect(info?.href).toBe("#about");

    await page.keyboard.press("Enter");
    await expect(page.locator("#mobile-nav")).toHaveCount(0);
    await expect(page).toHaveURL(/#about$/);
  });

  test("Shift+Tab inside the open menu walks back through links in reverse DOM order", async ({ page }) => {
    const toggle = page.getByRole("button", { name: "תפריט" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#mobile-nav")).toBeVisible();

    // Walk forward to the LAST link
    const lastLabel = HEADER_LINK_LABELS[HEADER_LINK_LABELS.length - 1];
    const reachedLast = await tabUntil(
      page,
      () => {
        const el = document.activeElement as HTMLElement | null;
        return (
          !!el &&
          el.tagName === "A" &&
          !!el.closest("#mobile-nav") &&
          (el.textContent || "").includes(lastLabel)
        );
      },
      HEADER_LINK_LABELS.length + 4
    );
    expect(reachedLast).toBe(true);

    // Now Shift+Tab should walk back through the links in reverse order
    const seenReverse: string[] = [];
    for (let i = 0; i < HEADER_LINK_LABELS.length; i++) {
      const info = await focusedSummary(page);
      if (info?.inMobileNav && info.tag === "a") {
        const matched = HEADER_LINK_LABELS.find((l) => info.text.includes(l));
        if (matched && !seenReverse.includes(matched)) seenReverse.push(matched);
      }
      await page.keyboard.press("Shift+Tab");
    }

    const expectedReverse = [...HEADER_LINK_LABELS].reverse();
    // seenReverse should be a prefix of expectedReverse (we may stop early
    // when focus hits the toggle at the start of the trap)
    for (let i = 0; i < seenReverse.length; i++) {
      expect(seenReverse[i]).toBe(expectedReverse[i]);
    }
    expect(seenReverse.length).toBeGreaterThanOrEqual(2);
  });
});
