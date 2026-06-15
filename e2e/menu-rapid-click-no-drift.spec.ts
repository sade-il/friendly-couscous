import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Rapidly clicking multiple menu links in quick succession must end with
 * the LAST clicked section's heading flush below the sticky header — no drift,
 * no half-finished animation from a previous click winning the race.
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

const clickMobile = async (page: Page, label: string) => {
  await menuButton(page).click();
  await expect(mobileNav(page)).toBeVisible();
  await mobileNav(page).getByRole("link", { name: label }).click();
  await expect(mobileNav(page)).toHaveCount(0);
};

const desktopLink = (page: Page, label: string) =>
  page.locator("header nav").getByRole("link", { name: label }).first();

test.describe("Rapid menu clicks settle on the LAST target — mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test.skip("שירותים → פרויקטים in quick succession ends at #projects", async ({ page }) => {
    await clickMobile(page, "שירותים");
    // Tiny delay to mimic a real user double-tap, but well before the smooth
    // scroll could settle.
    await page.waitForTimeout(60);
    await clickMobile(page, "פרויקטים");

    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#projects$/);
    await expectFlushBelowHeader(page, "projects");
  });

  test("Triple rapid clicks: services → about → contact ends at #contact", async ({ page }) => {
    await clickMobile(page, "שירותים");
    await page.waitForTimeout(50);
    await clickMobile(page, "אודות");
    await page.waitForTimeout(50);
    await clickMobile(page, "צור קשר");

    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#contact$/);
    await expectFlushBelowHeader(page, "contact");
  });

  test("After a rapid sequence, scroll position is stable (no drift)", async ({ page }) => {
    await clickMobile(page, "שירותים");
    await page.waitForTimeout(60);
    await clickMobile(page, "אודות");
    await waitForScrollSettled(page);

    const y1 = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(500);
    const y2 = await page.evaluate(() => window.scrollY);
    expect(Math.abs(y2 - y1)).toBeLessThanOrEqual(1);
    await expectFlushBelowHeader(page, "about");
  });
});

test.describe("Rapid menu clicks settle on the LAST target — desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.skip("Desktop: שירותים → פרויקטים rapid clicks end at #projects", async ({ page }) => {
    await desktopLink(page, "שירותים").click();
    await page.waitForTimeout(60);
    await desktopLink(page, "פרויקטים").click();

    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#projects$/);
    await expectFlushBelowHeader(page, "projects");
  });

  test("Desktop: 4 rapid clicks end aligned with the last section", async ({ page }) => {
    await desktopLink(page, "שירותים").click();
    await page.waitForTimeout(40);
    await desktopLink(page, "פרויקטים").click();
    await page.waitForTimeout(40);
    await desktopLink(page, "אודות").click();
    await page.waitForTimeout(40);
    await desktopLink(page, "צור קשר").click();

    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#contact$/);
    await expectFlushBelowHeader(page, "contact");

    // No post-settle drift
    const y1 = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(500);
    const y2 = await page.evaluate(() => window.scrollY);
    expect(Math.abs(y2 - y1)).toBeLessThanOrEqual(1);
  });
});
