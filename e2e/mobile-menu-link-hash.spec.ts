import { test, expect, Page } from "@playwright/test";

/**
 * E2E: After clicking a link in the open mobile menu, the URL hash must
 * update to the clicked target — and must NOT retain a previous hash.
 */

const menuButton = (page: Page) => page.getByRole("button", { name: "תפריט", exact: true });
const mobileNav = (page: Page) => page.locator("#mobile-nav");

const openMenu = async (page: Page) => {
  await menuButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(mobileNav(page)).toBeVisible();
};

const getHash = (page: Page) => page.evaluate(() => window.location.hash);

const cases: Array<{ label: string; id: string }> = [
  { label: "שירותים", id: "services" },
  { label: "אודות", id: "about" },
  { label: "צור קשר", id: "contact" },
  { label: "המלצות", id: "testimonials" },
];

test.describe("Mobile menu — URL hash updates correctly after link click", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
  });

  for (const c of cases) {
    test(`Clicking "${c.label}" sets hash to #${c.id}`, async ({ page }) => {
      await openMenu(page);
      await mobileNav(page).getByRole("link", { name: c.label }).click();

      await expect(page).toHaveURL(new RegExp(`#${c.id}$`));
      expect(await getHash(page)).toBe(`#${c.id}`);
    });
  }

  test("Hash replaces previous hash — no stale value remains", async ({ page }) => {
    await openMenu(page);
    await mobileNav(page).getByRole("link", { name: "שירותים" }).click();
    await expect(page).toHaveURL(/#services$/);
    expect(await getHash(page)).toBe("#services");

    await openMenu(page);
    await mobileNav(page).getByRole("link", { name: "אודות" }).click();
    await expect(page).toHaveURL(/#about$/);
    const hash = await getHash(page);
    expect(hash).toBe("#about");
    expect(hash).not.toContain("services");
  });

  test("Hash only contains the new target — never concatenates", async ({ page }) => {
    const sequence = ["שירותים", "אודות", "צור קשר"];
    const expected = ["services", "about", "contact"];

    for (let i = 0; i < sequence.length; i++) {
      await openMenu(page);
      await mobileNav(page).getByRole("link", { name: sequence[i] }).click();
      await expect(page).toHaveURL(new RegExp(`#${expected[i]}$`));
      const hash = await getHash(page);
      expect(hash).toBe(`#${expected[i]}`);
      // Must not retain any previous target id
      for (let j = 0; j < i; j++) {
        expect(hash).not.toContain(expected[j]);
      }
      // Single '#' only
      expect((hash.match(/#/g) || []).length).toBe(1);
    }
  });

  test("URL pathname is preserved — only hash changes", async ({ page }) => {
    const pathBefore = new URL(page.url()).pathname;
    await openMenu(page);
    await mobileNav(page).getByRole("link", { name: "צור קשר" }).click();
    await expect(page).toHaveURL(/#contact$/);

    const url = new URL(page.url());
    expect(url.pathname).toBe(pathBefore);
    expect(url.hash).toBe("#contact");
  });

  test("Navigating from a pre-existing hash replaces it cleanly", async ({ page }) => {
    await page.goto("/#services");
    expect(await getHash(page)).toBe("#services");

    await openMenu(page);
    await mobileNav(page).getByRole("link", { name: "אודות" }).click();
    await expect(page).toHaveURL(/#about$/);
    expect(await getHash(page)).toBe("#about");
  });
});
