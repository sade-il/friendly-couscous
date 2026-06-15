/**
 * Guards that every React Router <Navigate> redirect in src/App.tsx:
 *   1. The source path is NOT itself in the sitemap (no duplicate URL).
 *   2. The trailing-slash variant of the source is NOT in the sitemap.
 *   3. The target path IS in the sitemap exactly once (defined canonical).
 *   4. Both `/foo` and `/foo/` of the target never co-exist in the sitemap.
 *
 * Mirrors the redirect-hygiene checks in scripts/validate-sitemap-structure.ts
 * so regressions surface in the unit test run too, not only in CI.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BASE_URL = "https://sade-il.com";

const sitemapXml = readFileSync(resolve("public/sitemap.xml"), "utf8");
const appSrc = readFileSync(resolve("src/App.tsx"), "utf8");

const sitemapPaths = new Set(
  [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => {
      try {
        return decodeURIComponent(new URL(m[1].trim()).pathname);
      } catch {
        return null;
      }
    })
    .filter((p): p is string => Boolean(p)),
);

const redirects = [
  ...appSrc.matchAll(
    /<Route\s+path=["']([^"']+)["']\s+element=\{\s*<Navigate\s+to=["']([^"']+)["']/g,
  ),
].map(([, from, to]) => ({ from, to }));

const trailingVariant = (p: string) =>
  p === "/" ? "/" : p.endsWith("/") ? p.slice(0, -1) : `${p}/`;

describe("React Router redirects vs sitemap", () => {
  it("parses at least one redirect and a non-empty sitemap", () => {
    expect(sitemapPaths.size).toBeGreaterThan(0);
    expect(redirects.length).toBeGreaterThan(0);
  });

  it.each(redirects)(
    'redirect "$from" → "$to" does not collide with sitemap',
    ({ from, to }) => {
      // 1. Source must not be a sitemap loc.
      expect(
        sitemapPaths.has(from),
        `redirect source "${from}" is also a sitemap loc — duplicate of "${to}"`,
      ).toBe(false);

      // 2. Trailing-slash variant of source must not be a sitemap loc either.
      const fromVariant = trailingVariant(from);
      expect(
        sitemapPaths.has(fromVariant),
        `trailing-slash variant "${fromVariant}" of redirect source "${from}" is in sitemap`,
      ).toBe(false);

      // 3. Target path must exist in sitemap exactly once.
      const toPath = to.split("#")[0].split("?")[0];
      expect(
        sitemapPaths.has(toPath),
        `redirect target "${to}" (path "${toPath}") is not a sitemap loc — canonical not defined`,
      ).toBe(true);

      // 4. Target must not co-exist with its trailing-slash twin.
      const toVariant = trailingVariant(toPath);
      if (toPath !== "/") {
        expect(
          sitemapPaths.has(toVariant) && sitemapPaths.has(toPath),
          `both "${toPath}" and "${toVariant}" are in sitemap — trailing-slash duplicate`,
        ).toBe(false);
      }
    },
  );

  it("sitemap itself contains no trailing-slash duplicates", () => {
    for (const p of sitemapPaths) {
      if (p === "/") continue;
      expect(
        sitemapPaths.has(trailingVariant(p)),
        `sitemap contains both "${p}" and "${trailingVariant(p)}"`,
      ).toBe(false);
    }
  });

  it("BASE_URL host matches every sitemap loc", () => {
    const hosts = new Set(
      [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
        const u = new URL(m[1].trim());
        return `${u.protocol}//${u.host}`;
      }),
    );
    expect([...hosts]).toEqual([BASE_URL]);
  });
});
