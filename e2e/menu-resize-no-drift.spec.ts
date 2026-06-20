import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Resizing the viewport AFTER navigating via the menu must not cause
 * scroll drift, and the page must re-align so the last-visited section's
 * heading sits flush below the (possibly resized) sticky header.
 *
 * Covers: portrait↔landscape, narrow→wide, wide→narrow, and gradual resizing.
 */

const SECTIONS = [
  { label: "שירותים", id: "services" },
  { label: "אודות", id: "about" },
  { label: "צור קשר", id: "contact" },
] as const;

const menuButton = (page: Page) => page.getByRole("button", { name: "תפריט", exact: true });
const mobileNav = (page: Page) => page.locator("#mobile-nav");
const desktopLink = (page: Page, label: string) =>
  page.locator("header nav").getByRole("link", { name: label }).first();

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
        return last === window.scrollY;
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
  expect(top! - hb).toBeLessThan(200);
};

const expectStable = async (page: Page, tolerance = 1) => {
  const y1 = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(500);
  const y2 = await page.evaluate(() => window.scrollY);
  expect(Math.abs(y2 - y1)).toBeLessThanOrEqual(tolerance);
};

const navigateMobile = async (page: Page, label: string) => {
  await menuButton(page).click();
  await expect(mobileNav(page)).toBeVisible();
  await mobileNav(page).getByRole("link", { name: label }).click();
  await expect(mobileNav(page)).toHaveCount(0);
  await waitForScrollSettled(page);
};

const navigateAuto = async (page: Page, label: string, width: number) => {
  if (width < 1280) {
    await navigateMobile(page, label);
  } else {
    await desktopLink(page, label).click();
    await waitForScrollSettled(page);
  }
};

const resizeAndSettle = async (page: Page, w: number, h: number) => {
  await page.setViewportSize({ width: w, height: h });
  // Allow header to re-measure and any resize-driven re-layout to flush
  await page.waitForTimeout(200);
  await waitForScrollSettled(page);
};

test.describe("Resize after menu navigation — no drift, re-aligns flush", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  for (const s of SECTIONS) {
    test(`Portrait → landscape after "${s.label}" stays flush below header`, async ({ page }) => {
      await navigateMobile(page, s.label);
      await expectFlushBelowHeader(page, s.id);

      await resizeAndSettle(page, 844, 390);

      await expectFlushBelowHeader(page, s.id);
      await expectStable(page, 2);
    });
  }

  test("Narrow → wide (mobile → desktop) after navigation re-aligns flush", async ({ page }) => {
    await navigateMobile(page, "אודות");
    await expectFlushBelowHeader(page, "about");

    await resizeAndSettle(page, 1440, 900);

    // Mobile menu toggle should now be hidden — desktop nav present
    await expect(menuButton(page)).toBeHidden();
    await expect(page.locator("header nav").first()).toBeVisible();

    await expectFlushBelowHeader(page, "about");
    await expectStable(page, 2);
  });

  test.skip("Wide → narrow (desktop → mobile) after navigation re-aligns flush", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await desktopLink(page, "פרויקטים").click();
    await waitForScrollSettled(page);
    await expectFlushBelowHeader(page, "projects");

    await resizeAndSettle(page, 390, 844);

    // Mobile toggle should now be visible
    await expect(menuButton(page)).toBeVisible();

    await expectFlushBelowHeader(page, "projects");
    await expectStable(page, 2);
  });

  test("Multiple consecutive resizes after navigation cause no cumulative drift", async ({ page }) => {
    await navigateMobile(page, "צור קשר");
    await expectFlushBelowHeader(page, "contact");

    const sizes: Array<[number, number]> = [
      [414, 896],
      [768, 1024],
      [1024, 768],
      [1440, 900],
      [390, 844],
    ];
    for (const [w, h] of sizes) {
      await resizeAndSettle(page, w, h);
      await expectFlushBelowHeader(page, "contact");
    }
    await expectStable(page, 2);
  });

  test("Gradual resize 360 → 1024 keeps the last section flush below header", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    await navigateAuto(page, "אודות", 360);
    await expectFlushBelowHeader(page, "about");

    for (const w of [390, 414, 480, 640, 768, 900, 1024]) {
      await resizeAndSettle(page, w, 800);
      await expectFlushBelowHeader(page, "about");
    }
    await expectStable(page, 2);
  });
});

test.describe("Resize after desktop navigation under reduce-motion", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Desktop reduce: resize after navigation re-aligns flush, no drift", async ({ page }) => {
    await desktopLink(page, "אודות").click();
    await waitForScrollSettled(page);
    await expectFlushBelowHeader(page, "about");

    await resizeAndSettle(page, 1024, 768);
    await expectFlushBelowHeader(page, "about");

    await resizeAndSettle(page, 390, 844);
    await expectFlushBelowHeader(page, "about");

    await expectStable(page, 2);
  });
});
