import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Keyboard activation (Tab to focus, Enter to activate) of menu links
 * must produce the same precise smooth-scroll landing as a mouse click —
 * the section heading sits flush below the sticky header, no drift.
 * Verified for both the mobile menu and the desktop nav.
 */

const menuButton = (page: Page) => page.getByRole("button", { name: "תפריט" });
const mobileNav = (page: Page) => page.locator("#mobile-nav");

const headerBottom = (page: Page) =>
  page.evaluate(() => {
    const h = document.querySelector("header");
    return h ? h.getBoundingClientRect().bottom : 0;
  });

const sectionHeadingTop = (page: Page, id: string) =>
  page.evaluate((sid) => {
    const el = document.getElementById(sid);
    if (!el) return null;
    const heading = el.querySelector("h1, h2, h3");
    return (heading ?? el).getBoundingClientRect().top;
  }, id);

const waitForScrollSettled = async (page: Page) => {
  await page
    .waitForFunction(
      () => {
        // @ts-expect-error scratch state
        const last = window.__lastY;
        // @ts-expect-error scratch state
        window.__lastY = window.scrollY;
        return last === window.scrollY && window.scrollY > 0;
      },
      undefined,
      { timeout: 5000, polling: 100 }
    )
    .catch(() => {});
  await page.waitForTimeout(150);
};

const expectFlushBelowHeader = async (page: Page, id: string) => {
  const top = await sectionHeadingTop(page, id);
  const hb = await headerBottom(page);
  expect(top, `#${id} heading should exist`).not.toBeNull();
  expect(top!).toBeGreaterThanOrEqual(hb - 1);
  expect(top! - hb).toBeLessThan(160);
};

const SECTIONS = [
  { label: "שירותים", id: "services" },
  { label: "אודות", id: "about" },
  { label: "צור קשר", id: "contact" },
] as const;

test.describe("Keyboard activation — mobile menu lands flush below header", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  for (const s of SECTIONS) {
    test(`Mobile keyboard: focus toggle → Enter → focus "${s.label}" → Enter lands at #${s.id}`, async ({ page }) => {
      // Open menu via keyboard
      await menuButton(page).focus();
      await expect(menuButton(page)).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(mobileNav(page)).toBeVisible();

      // Focus the link via the in-menu locator and activate via keyboard
      const link = mobileNav(page).getByRole("link", { name: s.label });
      await link.focus();
      await expect(link).toBeFocused();
      await page.keyboard.press("Enter");

      await expect(mobileNav(page)).toHaveCount(0);
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(new RegExp(`#${s.id}$`));
      await expectFlushBelowHeader(page, s.id);
    });
  }

  test("Mobile keyboard: position is stable after Enter activation (no drift)", async ({ page }) => {
    await menuButton(page).focus();
    await page.keyboard.press("Enter");
    await mobileNav(page).getByRole("link", { name: "אודות" }).focus();
    await page.keyboard.press("Enter");
    await waitForScrollSettled(page);

    const y1 = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(500);
    const y2 = await page.evaluate(() => window.scrollY);
    expect(Math.abs(y2 - y1)).toBeLessThanOrEqual(1);
    await expectFlushBelowHeader(page, "about");
  });
});

test.describe("Keyboard activation — desktop nav lands flush below header", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  for (const s of SECTIONS) {
    test(`Desktop keyboard: focus "${s.label}" → Enter lands at #${s.id}`, async ({ page }) => {
      const link = page.locator("header nav").getByRole("link", { name: s.label }).first();
      await link.focus();
      await expect(link).toBeFocused();
      await page.keyboard.press("Enter");
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(new RegExp(`#${s.id}$`));
      await expectFlushBelowHeader(page, s.id);
    });
  }

  test("Desktop keyboard: Tabbing into the nav reaches a real link, Enter scrolls flush", async ({ page }) => {
    // Walk focus from the document start until a header nav link is focused.
    // Cap the loop so a regression cannot hang the test forever.
    let focusedInHeaderNav = false;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      focusedInHeaderNav = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el && !!el.closest("header nav") && el.tagName === "A";
      });
      if (focusedInHeaderNav) break;
    }
    expect(focusedInHeaderNav, "should reach a header nav link via Tab").toBe(true);

    const targetId = await page.evaluate(() => {
      const el = document.activeElement as HTMLAnchorElement | null;
      const href = el?.getAttribute("href") ?? "";
      return href.startsWith("#") ? href.slice(1) : "";
    });
    expect(targetId).not.toBe("");

    await page.keyboard.press("Enter");
    await waitForScrollSettled(page);

    await expect(page).toHaveURL(new RegExp(`#${targetId}$`));
    await expectFlushBelowHeader(page, targetId);
  });

  test("Desktop keyboard: position is stable after Enter activation (no drift)", async ({ page }) => {
    const link = page.locator("header nav").getByRole("link", { name: "אודות" }).first();
    await link.focus();
    await page.keyboard.press("Enter");
    await waitForScrollSettled(page);

    const y1 = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(500);
    const y2 = await page.evaluate(() => window.scrollY);
    expect(Math.abs(y2 - y1)).toBeLessThanOrEqual(1);
    await expectFlushBelowHeader(page, "about");
  });
});
