import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Smooth scroll must land precisely below the sticky header even when the
 * user is already mid-page when they click the menu link — both upward and
 * downward navigation, and across mobile + desktop nav surfaces.
 */

const SECTIONS = [
  { label: "שירותים", id: "services" },
  { label: "אודות", id: "about" },
  { label: "צור קשר", id: "contact" },
] as const;

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

const documentHeight = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight);

const waitForScrollSettled = async (page: Page) => {
  await page
    .waitForFunction(
      () => {
        // @ts-expect-error scratch state
        const last = window.__lastY;
        // @ts-expect-error scratch state
        window.__lastY = window.scrollY;
        return last === window.scrollY;
      },
      undefined,
      { timeout: 3000, polling: 100 }
    )
    .catch(() => {});
  await page.waitForTimeout(120);
};

const scrollToY = async (page: Page, y: number) => {
  await page.evaluate((target) => window.scrollTo({ top: target, behavior: "auto" }), y);
  await page.waitForTimeout(80);
};

const scrollToMidPage = async (page: Page) => {
  const h = await documentHeight(page);
  await scrollToY(page, Math.floor(h / 2));
};

const expectFlushBelowHeader = async (page: Page, id: string) => {
  const top = await sectionHeadingTop(page, id);
  const hb = await headerBottom(page);
  expect(top, `#${id} heading should exist`).not.toBeNull();
  expect(top!).toBeGreaterThanOrEqual(hb - 1);
  expect(top! - hb).toBeLessThan(160);
};

test.describe("Smooth scroll from mid-page — mobile menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  for (const s of SECTIONS) {
    test(`From mid-page, mobile "${s.label}" lands flush below header`, async ({ page }) => {
      await scrollToMidPage(page);
      const startY = await page.evaluate(() => window.scrollY);
      expect(startY).toBeGreaterThan(200);

      await menuButton(page).click();
      await expect(mobileNav(page)).toBeVisible();
      await mobileNav(page).getByRole("link", { name: s.label }).click();
      await expect(mobileNav(page)).toHaveCount(0);
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(new RegExp(`#${s.id}$`));
      await expectFlushBelowHeader(page, s.id);
    });
  }

  test("Scrolling UP from below: contact → services lands flush", async ({ page }) => {
    // Jump near the bottom, then navigate upward to an earlier section.
    const h = await documentHeight(page);
    await scrollToY(page, h - 1200);

    await menuButton(page).click();
    await mobileNav(page).getByRole("link", { name: "שירותים" }).click();
    await expect(mobileNav(page)).toHaveCount(0);
    await waitForScrollSettled(page);

    await expect(page).toHaveURL(/#services$/);
    await expectFlushBelowHeader(page, "services");
  });

  test("Re-clicking the same section from mid-page re-aligns flush", async ({ page }) => {
    // Land on #about
    await menuButton(page).click();
    await mobileNav(page).getByRole("link", { name: "אודות" }).click();
    await waitForScrollSettled(page);
    const aligned = await page.evaluate(() => window.scrollY);

    // Nudge the user mid-page, then click the same link again
    await scrollToY(page, aligned + 400);

    await menuButton(page).click();
    await mobileNav(page).getByRole("link", { name: "אודות" }).click();
    await waitForScrollSettled(page);

    await expectFlushBelowHeader(page, "about");
  });
});

test.describe("Smooth scroll from mid-page — desktop nav", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  for (const s of SECTIONS) {
    test(`From mid-page, desktop "${s.label}" lands flush below header`, async ({ page }) => {
      await scrollToMidPage(page);
      const startY = await page.evaluate(() => window.scrollY);
      expect(startY).toBeGreaterThan(200);

      await page.locator("header nav").getByRole("link", { name: s.label }).first().click();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(new RegExp(`#${s.id}$`));
      await expectFlushBelowHeader(page, s.id);
    });
  }

  test("Desktop: scrolling UP from bottom lands flush", async ({ page }) => {
    const h = await documentHeight(page);
    await scrollToY(page, h - 1000);

    await page.locator("header nav").getByRole("link", { name: "שירותים" }).first().click();
    await waitForScrollSettled(page);

    await expect(page).toHaveURL(/#services$/);
    await expectFlushBelowHeader(page, "services");
  });
});
