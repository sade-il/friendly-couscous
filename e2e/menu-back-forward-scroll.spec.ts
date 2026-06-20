import { test, expect, Page } from "@playwright/test";

/**
 * E2E: After navigating between sections via the menu, pressing the browser
 * Back/Forward buttons must restore the previously-viewed section with the
 * heading flush below the sticky header — both with default motion and with
 * prefers-reduced-motion: reduce.
 */

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

const expectStable = async (page: Page) => {
  const y1 = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(400);
  const y2 = await page.evaluate(() => window.scrollY);
  expect(Math.abs(y2 - y1)).toBeLessThanOrEqual(1);
};

const clickMobile = async (page: Page, label: string) => {
  await menuButton(page).click();
  await expect(mobileNav(page)).toBeVisible();
  await mobileNav(page).getByRole("link", { name: label }).click();
  await expect(mobileNav(page)).toHaveCount(0);
  await waitForScrollSettled(page);
};

const desktopLink = (page: Page, label: string) =>
  page.locator("header nav").getByRole("link", { name: label }).first();

const clickDesktop = async (page: Page, label: string) => {
  await desktopLink(page, label).click();
  await waitForScrollSettled(page);
};

test.describe("Browser Back/Forward — mobile, default motion", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("Back from #about restores #services flush below header", async ({ page }) => {
    await clickMobile(page, "שירותים");
    await expect(page).toHaveURL(/#services$/);
    await expectFlushBelowHeader(page, "services");

    await clickMobile(page, "אודות");
    await expect(page).toHaveURL(/#about$/);
    await expectFlushBelowHeader(page, "about");

    await page.goBack();
    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#services$/);
    await expectFlushBelowHeader(page, "services");
    await expectStable(page);
  });

  test("Forward after Back restores #about flush below header", async ({ page }) => {
    await clickMobile(page, "שירותים");
    await clickMobile(page, "אודות");
    await page.goBack();
    await waitForScrollSettled(page);
    await page.goForward();
    await waitForScrollSettled(page);

    await expect(page).toHaveURL(/#about$/);
    await expectFlushBelowHeader(page, "about");
    await expectStable(page);
  });

  test.skip("Back through 3 entries lands at the original section flush", async ({ page }) => {
    await clickMobile(page, "שירותים");
    await clickMobile(page, "פרויקטים");
    await clickMobile(page, "אודות");

    await page.goBack();
    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#projects$/);
    await expectFlushBelowHeader(page, "projects");

    await page.goBack();
    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#services$/);
    await expectFlushBelowHeader(page, "services");
    await expectStable(page);
  });
});

test.describe("Browser Back/Forward — mobile, reduce-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("Reduced motion is reported", async ({ page }) => {
    expect(
      await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ).toBe(true);
  });

  test("Mobile reduce: Back from #contact restores #services flush", async ({ page }) => {
    await clickMobile(page, "שירותים");
    await clickMobile(page, "צור קשר");

    await page.goBack();
    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#services$/);
    await expectFlushBelowHeader(page, "services");
    await expectStable(page);
  });

  test("Mobile reduce: Forward restores #contact flush after Back", async ({ page }) => {
    await clickMobile(page, "שירותים");
    await clickMobile(page, "צור קשר");
    await page.goBack();
    await waitForScrollSettled(page);
    await page.goForward();
    await waitForScrollSettled(page);

    await expect(page).toHaveURL(/#contact$/);
    await expectFlushBelowHeader(page, "contact");
    await expectStable(page);
  });
});

test.describe("Browser Back/Forward — desktop, default + reduce-motion", () => {
  test.describe("default motion", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

    test("Desktop: Back from #about restores #services flush", async ({ page }) => {
      await clickDesktop(page, "שירותים");
      await clickDesktop(page, "אודות");
      await page.goBack();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(/#services$/);
      await expectFlushBelowHeader(page, "services");
      await expectStable(page);
    });

    test("Desktop: Forward after Back restores #about flush", async ({ page }) => {
      await clickDesktop(page, "שירותים");
      await clickDesktop(page, "אודות");
      await page.goBack();
      await waitForScrollSettled(page);
      await page.goForward();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(/#about$/);
      await expectFlushBelowHeader(page, "about");
      await expectStable(page);
    });
  });

  test.describe("reduce motion", () => {
    test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

    test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

    test.skip("Desktop reduce: Back from #contact restores #projects flush", async ({ page }) => {
      await clickDesktop(page, "פרויקטים");
      await clickDesktop(page, "צור קשר");
      await page.goBack();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(/#projects$/);
      await expectFlushBelowHeader(page, "projects");
      await expectStable(page);
    });

    test("Desktop reduce: Forward restores #contact flush after Back", async ({ page }) => {
      await clickDesktop(page, "פרויקטים");
      await clickDesktop(page, "צור קשר");
      await page.goBack();
      await waitForScrollSettled(page);
      await page.goForward();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(/#contact$/);
      await expectFlushBelowHeader(page, "contact");
      await expectStable(page);
    });
  });
});
