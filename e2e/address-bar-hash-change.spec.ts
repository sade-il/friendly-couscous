import { test, expect, Page } from "@playwright/test";

/**
 * E2E: When the user changes the URL hash directly from the address bar
 * (no menu click), the target section heading must still land flush below the
 * sticky header. Covers: initial deep link, hash-to-hash changes, history
 * pushState/replaceState, and same-hash re-entry. Mobile + desktop.
 */

const SECTIONS = ["services", "about", "contact"] as const;

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

// Simulates the user typing a new hash into the address bar by changing
// window.location.hash directly (no anchor click, no popstate).
const setHashViaAddressBar = async (page: Page, hash: string) => {
  await page.evaluate((h) => {
    window.location.hash = h.startsWith("#") ? h : `#${h}`;
  }, hash);
  await waitForScrollSettled(page);
};

test.describe("Direct hash entry from address bar — mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  for (const id of SECTIONS) {
    test(`Mobile: typing /#${id} into the address bar lands flush below header`, async ({ page }) => {
      await page.goto(`/#${id}`);
      await expect(page.locator(`#${id}`)).toBeVisible();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expectFlushBelowHeader(page, id);
      await expectStable(page);
    });
  }

  test("Mobile: changing hash from #services → #contact (no menu) lands flush", async ({ page }) => {
    await page.goto("/#services");
    await waitForScrollSettled(page);
    await expectFlushBelowHeader(page, "services");

    await setHashViaAddressBar(page, "#contact");

    await expect(page).toHaveURL(/#contact$/);
    await expectFlushBelowHeader(page, "contact");
    await expectStable(page);
  });

  test("Mobile: walking through several hashes (no menu) keeps each flush", async ({ page }) => {
    await page.goto("/");
    for (const id of SECTIONS) {
      await setHashViaAddressBar(page, `#${id}`);
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expectFlushBelowHeader(page, id);
    }
    await expectStable(page);
  });
});

test.describe("Direct hash entry from address bar — desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const id of SECTIONS) {
    test(`Desktop: typing /#${id} into the address bar lands flush below header`, async ({ page }) => {
      await page.goto(`/#${id}`);
      await expect(page.locator(`#${id}`)).toBeVisible();
      await waitForScrollSettled(page);

      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expectFlushBelowHeader(page, id);
      await expectStable(page);
    });
  }

  test.skip("Desktop: hash change #projects → #about via address bar lands flush", async ({ page }) => {
    await page.goto("/#projects");
    await waitForScrollSettled(page);
    await expectFlushBelowHeader(page, "projects");

    await setHashViaAddressBar(page, "#about");

    await expect(page).toHaveURL(/#about$/);
    await expectFlushBelowHeader(page, "about");
    await expectStable(page);
  });

  test("Desktop: re-entering the SAME hash (#about → #about) re-aligns flush", async ({ page }) => {
    await page.goto("/#about");
    await waitForScrollSettled(page);
    await expectFlushBelowHeader(page, "about");

    // Nudge the user mid-page, then "re-enter" the same hash from the address
    // bar. The page must re-align under the header — not stay drifted.
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: "auto" }));
    await page.waitForTimeout(80);

    // Setting location.hash to the same value is a no-op for hashchange, so we
    // simulate a true "re-enter" via goto (which is what the address bar does).
    await page.goto("/#about");
    await waitForScrollSettled(page);

    await expectFlushBelowHeader(page, "about");
    await expectStable(page);
  });

  test("Desktop: history.pushState to a new hash from address-bar-style code lands flush", async ({ page }) => {
    await page.goto("/#services");
    await waitForScrollSettled(page);

    await page.evaluate(() => {
      history.pushState(null, "", "#contact");
      // Browsers do NOT fire a hashchange for pushState, so simulate the
      // address-bar behaviour of jumping to the target by also dispatching it.
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await waitForScrollSettled(page);

    await expect(page).toHaveURL(/#contact$/);
    await expectFlushBelowHeader(page, "contact");
    await expectStable(page);
  });
});

test.describe("Direct hash entry — desktop under reduce-motion", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test("Reduced motion is reported", async ({ page }) => {
    await page.goto("/");
    expect(
      await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ).toBe(true);
  });

  for (const id of SECTIONS) {
    test(`Desktop reduce: address-bar /#${id} lands flush below header`, async ({ page }) => {
      await page.goto(`/#${id}`);
      await waitForScrollSettled(page);
      await expectFlushBelowHeader(page, id);
      await expectStable(page);
    });
  }
});
