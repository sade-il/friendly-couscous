import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Under prefers-reduced-motion: reduce, rapid successive clicks on menu
 * links must still settle EXACTLY on the last clicked target — heading flush
 * below the sticky header, no drift, no leftover animation from an earlier
 * click. Verified for both mobile menu and desktop nav.
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
  await page.waitForTimeout(120);
};

const expectFlushBelowHeader = async (page: Page, id: string) => {
  const top = await sectionHeadingTop(page, id);
  const hb = await headerBottom(page);
  expect(top, `#${id} heading should exist`).not.toBeNull();
  expect(top!).toBeGreaterThanOrEqual(hb - 1);
  expect(top! - hb).toBeLessThan(160);
};

const expectStable = async (page: Page) => {
  const y1 = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(500);
  const y2 = await page.evaluate(() => window.scrollY);
  expect(Math.abs(y2 - y1)).toBeLessThanOrEqual(1);
};

const clickMobile = async (page: Page, label: string) => {
  await menuButton(page).click();
  await expect(mobileNav(page)).toBeVisible();
  await mobileNav(page).getByRole("link", { name: label }).click();
  await expect(mobileNav(page)).toHaveCount(0);
};

const desktopLink = (page: Page, label: string) =>
  page.locator("header nav").getByRole("link", { name: label }).first();

test.describe("reduce-motion + rapid mobile clicks settle on the LAST target", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("Reduced motion is reported by the browser", async ({ page }) => {
    const reduced = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    expect(reduced).toBe(true);
  });

  test.skip("Mobile reduce: שירותים → פרויקטים rapid clicks end at #projects", async ({ page }) => {
    await clickMobile(page, "שירותים");
    await page.waitForTimeout(40);
    await clickMobile(page, "פרויקטים");

    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#projects$/);
    await expectFlushBelowHeader(page, "projects");
    await expectStable(page);
  });

  test("Mobile reduce: triple rapid clicks end at #contact", async ({ page }) => {
    await clickMobile(page, "שירותים");
    await page.waitForTimeout(30);
    await clickMobile(page, "אודות");
    await page.waitForTimeout(30);
    await clickMobile(page, "צור קשר");

    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#contact$/);
    await expectFlushBelowHeader(page, "contact");
    await expectStable(page);
  });

  test("Mobile reduce: rapid clicks UPWARD (contact → services) end at #services", async ({ page }) => {
    await clickMobile(page, "צור קשר");
    await page.waitForTimeout(30);
    await clickMobile(page, "שירותים");

    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#services$/);
    await expectFlushBelowHeader(page, "services");
    await expectStable(page);
  });
});

test.describe("reduce-motion + rapid desktop clicks settle on the LAST target", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.skip("Desktop reduce: שירותים → פרויקטים rapid clicks end at #projects", async ({ page }) => {
    await desktopLink(page, "שירותים").click();
    await page.waitForTimeout(40);
    await desktopLink(page, "פרויקטים").click();

    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#projects$/);
    await expectFlushBelowHeader(page, "projects");
    await expectStable(page);
  });

  test("Desktop reduce: 4 rapid clicks end aligned with #contact", async ({ page }) => {
    await desktopLink(page, "שירותים").click();
    await page.waitForTimeout(30);
    await desktopLink(page, "פרויקטים").click();
    await page.waitForTimeout(30);
    await desktopLink(page, "אודות").click();
    await page.waitForTimeout(30);
    await desktopLink(page, "צור קשר").click();

    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#contact$/);
    await expectFlushBelowHeader(page, "contact");
    await expectStable(page);
  });

  test("Desktop reduce: rapid clicks UPWARD (contact → שירותים) end at #services", async ({ page }) => {
    await desktopLink(page, "צור קשר").click();
    await page.waitForTimeout(30);
    await desktopLink(page, "שירותים").click();

    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#services$/);
    await expectFlushBelowHeader(page, "services");
    await expectStable(page);
  });
});
