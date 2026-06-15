import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Smooth scroll to a section must land exactly with the section heading
 * sitting just below the sticky header — both with default motion (smooth
 * animation) and with prefers-reduced-motion: reduce (instant scroll).
 */

const SECTIONS = [
  { label: "שירותים", id: "services" },
  { label: "אודות", id: "about" },
  { label: "צור קשר", id: "contact" },
] as const;

const menuButton = (page: Page) => page.getByRole("button", { name: "תפריט" });
const mobileNav = (page: Page) => page.locator("#mobile-nav");

const openMenu = async (page: Page) => {
  await menuButton(page).click();
  await expect(mobileNav(page)).toBeVisible();
};

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
        // @ts-expect-error scratch state on window
        const last = window.__lastY;
        // @ts-expect-error scratch state on window
        window.__lastY = window.scrollY;
        return last === window.scrollY && window.scrollY > 0;
      },
      undefined,
      { timeout: 3000, polling: 100 }
    )
    .catch(() => {});
  await page.waitForTimeout(120);
};

const clickMenuLink = async (page: Page, label: string) => {
  await openMenu(page);
  await mobileNav(page).getByRole("link", { name: label }).click();
  await expect(mobileNav(page)).toHaveCount(0);
  await waitForScrollSettled(page);
};

test.describe("Smooth scroll lands precisely below sticky header (default motion)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  for (const s of SECTIONS) {
    test(`"${s.label}" heading sits flush below the header after smooth scroll`, async ({ page }) => {
      await clickMenuLink(page, s.label);

      const top = await sectionHeadingTop(page, s.id);
      const hb = await headerBottom(page);

      expect(top, `#${s.id} heading should exist`).not.toBeNull();
      // Not occluded by the sticky header
      expect(top!).toBeGreaterThanOrEqual(hb - 1);
      // Tight landing — within the reserved 96px offset + breathing room
      expect(top! - hb).toBeLessThan(160);
    });
  }

  test("Final scroll position is stable (no continued animation drift)", async ({ page }) => {
    await clickMenuLink(page, "אודות");
    const y1 = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(400);
    const y2 = await page.evaluate(() => window.scrollY);
    expect(Math.abs(y2 - y1)).toBeLessThanOrEqual(1);
  });
});

test.describe("Smooth scroll under prefers-reduced-motion: reduce", () => {
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

  for (const s of SECTIONS) {
    test(`reduce-motion: "${s.label}" heading lands flush below the header`, async ({ page }) => {
      await clickMenuLink(page, s.label);

      const top = await sectionHeadingTop(page, s.id);
      const hb = await headerBottom(page);

      expect(top, `#${s.id} heading should exist`).not.toBeNull();
      expect(top!).toBeGreaterThanOrEqual(hb - 1);
      expect(top! - hb).toBeLessThan(160);
    });
  }

  test("reduce-motion: scroll reaches its final position quickly without drift", async ({ page }) => {
    await openMenu(page);
    await mobileNav(page).getByRole("link", { name: "צור קשר" }).click();
    await expect(mobileNav(page)).toHaveCount(0);

    // Sample shortly after click — under reduce, position should already be final
    await page.waitForTimeout(80);
    const yEarly = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(400);
    const yLate = await page.evaluate(() => window.scrollY);
    expect(yEarly).toBeGreaterThan(0);
    expect(Math.abs(yLate - yEarly)).toBeLessThanOrEqual(2);
  });
});
