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

const menuButton = (page: Page) => page.getByRole("button", { name: "תפריט", exact: true });
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

const alignmentDelta = (page: Page, id: string) =>
  page.evaluate((sid) => {
    const el = document.getElementById(sid);
    if (!el) return null;
    const heading = el.querySelector("h1, h2, h3");
    const target = heading ?? el;
    const stickyBar = document.querySelector("header > .container");
    const header = document.querySelector("header");
    const hb = stickyBar instanceof HTMLElement
      ? stickyBar.getBoundingClientRect().bottom
      : header instanceof HTMLElement
        ? header.getBoundingClientRect().bottom
        : 0;
    return target.getBoundingClientRect().top - hb;
  }, id);

const documentHeight = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight);

const waitForScrollSettled = async (page: Page) => {
  await page.evaluate(() => {
    const w = window as Window & {
      __lastY?: number;
      __sameYCount?: number;
      __settleStartY?: number;
      __seenMotion?: boolean;
    };
    delete w.__lastY;
    delete w.__sameYCount;
    delete w.__settleStartY;
    delete w.__seenMotion;
  });
  await page
    .waitForFunction(
      () => {
        const w = window as Window & {
          __lastY?: number;
          __sameYCount?: number;
          __settleStartY?: number;
          __seenMotion?: boolean;
        };
        const y = Math.round(window.scrollY);
        if (typeof w.__settleStartY === "undefined") w.__settleStartY = y;
        w.__seenMotion = w.__seenMotion || y !== w.__settleStartY;
        const same = Math.round(w.__lastY ?? Number.NaN) === y;
        w.__sameYCount = same ? (w.__sameYCount ?? 0) + 1 : 0;
        w.__lastY = y;
        return !!w.__seenMotion && (w.__sameYCount ?? 0) >= 3;
      },
      undefined,
      { timeout: 5000, polling: 100 }
    )
    .catch(() => {});
  await page.waitForTimeout(150);
};

const scrollToY = async (page: Page, y: number) => {
  await page.evaluate((target) => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, target);
    root.style.scrollBehavior = previous;
  }, y);
  await page.waitForFunction((target) => Math.abs(window.scrollY - target) < 2 || window.scrollY > 200, y, {
    timeout: 3000,
    polling: 50,
  });
};

const scrollToMidPage = async (page: Page) => {
  const h = await documentHeight(page);
  await scrollToY(page, Math.floor(h / 2));
};

const expectFlushBelowHeader = async (page: Page, id: string) => {
  const top = await sectionHeadingTop(page, id);
  expect(top, `#${id} heading should exist`).not.toBeNull();
  await expect.poll(() => alignmentDelta(page, id), { timeout: 5000 }).toBeGreaterThanOrEqual(-1);
  await expect.poll(() => alignmentDelta(page, id), { timeout: 5000 }).toBeLessThan(160);
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
      const link = mobileNav(page).getByRole("link", { name: s.label });
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await expect(mobileNav(page)).toHaveCount(0);
      await waitForScrollSettled(page);

      await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 5000 }).toBe(`#${s.id}`);
      await expectFlushBelowHeader(page, s.id);
    });
  }

  test("Scrolling UP from below: contact → services lands flush", async ({ page }) => {
    // Jump near the bottom, then navigate upward to an earlier section.
    const h = await documentHeight(page);
    await scrollToY(page, h - 1200);

    await menuButton(page).click();
    const link = mobileNav(page).getByRole("link", { name: "שירותים" });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(mobileNav(page)).toHaveCount(0);
    await waitForScrollSettled(page);

    await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 5000 }).toBe("#services");
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
    const link = mobileNav(page).getByRole("link", { name: "אודות" });
    await link.scrollIntoViewIfNeeded();
    await link.click();
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

      await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 5000 }).toBe(`#${s.id}`);
      await expectFlushBelowHeader(page, s.id);
    });
  }

  test("Desktop: scrolling UP from bottom lands flush", async ({ page }) => {
    const h = await documentHeight(page);
    await scrollToY(page, h - 1000);

    await page.locator("header nav").getByRole("link", { name: "שירותים" }).first().click();
    await waitForScrollSettled(page);

    await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 5000 }).toBe("#services");
    await expectFlushBelowHeader(page, "services");
  });
});
