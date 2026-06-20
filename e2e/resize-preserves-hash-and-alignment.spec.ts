import { test, expect, Page } from "@playwright/test";

/**
 * E2E: After viewport resize, the section heading must remain flush below
 * the sticky header AND the URL hash (e.g. #about) must stay intact —
 * resize must not strip, rewrite, or duplicate the hash.
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

const getHash = (page: Page) => page.evaluate(() => window.location.hash);
const getPathname = (page: Page) => page.evaluate(() => window.location.pathname);

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

const expectStable = async (page: Page, tolerance = 2) => {
  const y1 = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(400);
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

const resizeAndSettle = async (page: Page, w: number, h: number) => {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(200);
  await waitForScrollSettled(page);
};

test.describe("Resize preserves alignment AND URL hash — mobile start", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  for (const s of SECTIONS) {
    test(`After "${s.label}", portrait → landscape keeps alignment and #${s.id}`, async ({ page }) => {
      await navigateMobile(page, s.label);
      await expect(page).toHaveURL(new RegExp(`#${s.id}$`));
      await expectFlushBelowHeader(page, s.id);

      const pathBefore = await getPathname(page);
      await resizeAndSettle(page, 844, 390);

      // Hash intact
      expect(await getHash(page)).toBe(`#${s.id}`);
      // Pathname unchanged
      expect(await getPathname(page)).toBe(pathBefore);
      // No duplicated/concatenated hash
      const url = await page.evaluate(() => window.location.href);
      expect((url.match(/#/g) ?? []).length).toBe(1);

      await expectFlushBelowHeader(page, s.id);
      await expectStable(page);
    });
  }

  test("Multiple resizes after navigation keep #about and alignment", async ({ page }) => {
    await navigateMobile(page, "אודות");
    await expect(page).toHaveURL(/#about$/);

    const sizes: Array<[number, number]> = [
      [414, 896],
      [768, 1024],
      [1024, 768],
      [1440, 900],
      [390, 844],
    ];
    for (const [w, h] of sizes) {
      await resizeAndSettle(page, w, h);
      expect(await getHash(page)).toBe("#about");
      await expectFlushBelowHeader(page, "about");
    }
    await expectStable(page);
  });

  test.skip("Mobile → desktop resize: hash stays #projects, alignment preserved", async ({ page }) => {
    await navigateMobile(page, "פרויקטים");
    await expect(page).toHaveURL(/#projects$/);

    await resizeAndSettle(page, 1440, 900);

    // Mobile toggle should now be hidden — desktop nav present
    await expect(menuButton(page)).toBeHidden();
    await expect(page.locator("header nav").first()).toBeVisible();

    expect(await getHash(page)).toBe("#projects");
    await expectFlushBelowHeader(page, "projects");
    await expectStable(page);
  });
});

test.describe("Resize preserves alignment AND URL hash — desktop start", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Desktop → mobile resize: hash stays #contact, alignment preserved", async ({ page }) => {
    await desktopLink(page, "צור קשר").click();
    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#contact$/);

    await resizeAndSettle(page, 390, 844);

    expect(await getHash(page)).toBe("#contact");
    await expectFlushBelowHeader(page, "contact");
    await expectStable(page);
  });

  test("Gradual desktop widths keep #about and alignment", async ({ page }) => {
    await desktopLink(page, "אודות").click();
    await waitForScrollSettled(page);
    await expect(page).toHaveURL(/#about$/);

    for (const w of [1280, 1366, 1440, 1536, 1920]) {
      await resizeAndSettle(page, w, 900);
      expect(await getHash(page)).toBe("#about");
      await expectFlushBelowHeader(page, "about");
    }
    await expectStable(page);
  });
});

test.describe("Resize preserves alignment AND URL hash — reduce-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  test("Reduce-motion: resize after navigation keeps hash and alignment", async ({ page }) => {
    await navigateMobile(page, "אודות");
    await expect(page).toHaveURL(/#about$/);

    await resizeAndSettle(page, 844, 390);
    expect(await getHash(page)).toBe("#about");
    await expectFlushBelowHeader(page, "about");

    await resizeAndSettle(page, 1440, 900);
    expect(await getHash(page)).toBe("#about");
    await expectFlushBelowHeader(page, "about");

    await expectStable(page);
  });
});
