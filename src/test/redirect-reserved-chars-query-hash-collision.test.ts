/**
 * Coverage for URL reserved/sub-delim chars (`:` `;` `@` `!` `~` `*` plus
 * `&` `=` `,` `$` `(` `)` `'`) appearing in the **query string** and
 * **fragment** of a redirect target.
 *
 * Policy: query (`?...`) and hash (`#...`) are user-state, NOT part of
 * canonical identity. They MUST be stripped before sitemap-loc comparison
 * regardless of what reserved chars or percent-encoding they contain.
 *
 * Also covers trailing slash on the path portion combined with rich
 * query/hash payloads, and double-encoded reserved chars in query/hash
 * (which still get stripped — the encoding only matters for path).
 *
 * Mirrors src/test/redirect-percent-encoding-collision.test.ts and
 * src/test/redirect-reserved-chars-collision.test.ts.
 */
import { describe, expect, it } from "vitest";

const trailingVariant = (p: string) =>
  p === "/" ? "/" : p.endsWith("/") ? p.slice(0, -1) : `${p}/`;

/**
 * Strip query and fragment. The order matters: split on `#` FIRST (fragment
 * is everything after the first `#`, even if it contains `?`), then `?`.
 * RFC 3986 §3.5 — `fragment = *( pchar / "/" / "?" )`.
 */
const stripQueryHash = (p: string) => p.split("#")[0].split("?")[0];

const safeDecode = (p: string) => {
  try { return decodeURIComponent(p); } catch { return p; }
};

const normalize = (p: string) => safeDecode(stripQueryHash(p));

export type RedirectIssue =
  | "source-in-sitemap"
  | "source-trailing-variant-in-sitemap"
  | "target-missing-from-sitemap"
  | "target-trailing-duplicate-in-sitemap"
  | "source-has-query-or-hash"
  | "malformed-percent-encoding";

export function checkRedirect(
  from: string,
  to: string,
  sitemapPaths: Set<string>,
): RedirectIssue[] {
  const issues: RedirectIssue[] = [];

  if (from.includes("?") || from.includes("#")) {
    issues.push("source-has-query-or-hash");
  }

  for (const raw of [from, to]) {
    try { decodeURIComponent(stripQueryHash(raw)); }
    catch { issues.push("malformed-percent-encoding"); }
  }

  const fromPath = normalize(from);
  if (sitemapPaths.has(fromPath)) issues.push("source-in-sitemap");
  if (sitemapPaths.has(trailingVariant(fromPath))) {
    issues.push("source-trailing-variant-in-sitemap");
  }

  const toPath = normalize(to);
  if (!sitemapPaths.has(toPath)) issues.push("target-missing-from-sitemap");
  if (
    toPath !== "/" &&
    sitemapPaths.has(toPath) &&
    sitemapPaths.has(trailingVariant(toPath))
  ) {
    issues.push("target-trailing-duplicate-in-sitemap");
  }

  return issues;
}

const SITEMAP = new Set<string>([
  "/",
  "/projects",
  "/services/pergola-approval",
]);

describe("checkRedirect() — reserved chars in query/hash × double-encoding × trailing slash", () => {
  describe("reserved chars inside query string", () => {
    it("`:` in query value is stripped — target resolves to `/projects`", () => {
      expect(
        checkRedirect("/old", "/projects?ref=v1:alpha", SITEMAP),
      ).toEqual([]);
    });

    it("`;` `@` `!` `~` `*` together in query value are stripped", () => {
      expect(
        checkRedirect("/old", "/projects?q=v;mode=2&user=@me!~*", SITEMAP),
      ).toEqual([]);
    });

    it("encoded `%3A` `%40` `%21` etc. in query value are stripped (no decode of query)", () => {
      expect(
        checkRedirect(
          "/old",
          "/projects?u=%40alice%3Aprofile%21%7E%2A",
          SITEMAP,
        ),
      ).toEqual([]);
    });

    it("double-encoded reserved chars in query value still get stripped", () => {
      // `?u=%2540alice%253A...` — query is dropped wholesale before the
      // sitemap lookup, so the bogus double-encoding is irrelevant.
      expect(
        checkRedirect(
          "/old",
          "/projects?u=%2540alice%253Aprofile%2521",
          SITEMAP,
        ),
      ).toEqual([]);
    });

    it("`&` (sub-delim) separating multiple params is stripped", () => {
      expect(
        checkRedirect(
          "/old",
          "/projects?utm_source=fb&utm_medium=cpc&utm_campaign=q4",
          SITEMAP,
        ),
      ).toEqual([]);
    });

    it("`=` `,` `$` `(` `)` `'` in query value are stripped", () => {
      expect(
        checkRedirect(
          "/old",
          "/projects?filter=name='Joe',price=$10..(20)",
          SITEMAP,
        ),
      ).toEqual([]);
    });

    it("encoded `?` inside query value (`%3F`) does NOT terminate the query", () => {
      // Splitting on raw `?` is correct: only the FIRST `?` separates path
      // from query. Encoded `%3F` inside the value is opaque.
      expect(
        checkRedirect(
          "/old",
          "/projects?q=where%3Foperator=eq",
          SITEMAP,
        ),
      ).toEqual([]);
    });
  });

  describe("reserved chars inside fragment", () => {
    it("`:` `;` `@` `!` `~` `*` together in fragment are stripped", () => {
      expect(
        checkRedirect(
          "/old",
          "/projects#section:1;v=2@anchor!~*",
          SITEMAP,
        ),
      ).toEqual([]);
    });

    it("encoded reserved chars in fragment are stripped", () => {
      expect(
        checkRedirect(
          "/old",
          "/projects#%40section%3Aone",
          SITEMAP,
        ),
      ).toEqual([]);
    });

    it("double-encoded reserved chars in fragment are stripped", () => {
      expect(
        checkRedirect(
          "/old",
          "/projects#%2540section%253Aone",
          SITEMAP,
        ),
      ).toEqual([]);
    });

    it("fragment containing `?` is treated as fragment text, not query", () => {
      // RFC 3986: `?` may appear inside a fragment. Stripping `#` first
      // (then `?`) keeps the path intact.
      expect(
        checkRedirect("/old", "/projects#with?qmark", SITEMAP),
      ).toEqual([]);
    });

    it("fragment with `/` (path-like) is stripped", () => {
      expect(
        checkRedirect("/old", "/projects#/deep/anchor/path", SITEMAP),
      ).toEqual([]);
    });
  });

  describe("query + fragment combined", () => {
    it("full attribution payload with reserved chars + fragment resolves cleanly", () => {
      expect(
        checkRedirect(
          "/old",
          "/projects?utm=fb&u=@me;v=2!&ref=a:b*c#gallery~item:3",
          SITEMAP,
        ),
      ).toEqual([]);
    });

    it("double-encoded reserved chars in BOTH query and fragment are stripped", () => {
      expect(
        checkRedirect(
          "/old",
          "/projects?u=%2540me%253Aprofile#sec%2540%253Aone",
          SITEMAP,
        ),
      ).toEqual([]);
    });

    it("query/fragment never rescue a missing canonical path", () => {
      expect(
        checkRedirect("/old", "/missing?utm=x#anchor", SITEMAP),
      ).toContain("target-missing-from-sitemap");
    });
  });

  describe("trailing slash on path × rich query/fragment", () => {
    it("trailing slash on non-root path is flagged even with rich query payload", () => {
      // Sitemap has BOTH `/projects` and `/projects/` → `target-trailing-duplicate-in-sitemap`.
      const withTrail = new Set([...SITEMAP, "/projects/"]);
      expect(
        checkRedirect(
          "/old",
          "/projects/?utm=fb&u=@me;v=2#anchor:1",
          withTrail,
        ),
      ).toContain("target-trailing-duplicate-in-sitemap");
    });

    it("trailing slash on path with double-encoded reserved chars in query — query still stripped", () => {
      // `/projects/` (path) is NOT in the base SITEMAP → flagged missing.
      // The double-encoded query is irrelevant — strip step happens first.
      expect(
        checkRedirect(
          "/old",
          "/projects/?u=%2540me%253Aprofile",
          SITEMAP,
        ),
      ).toContain("target-missing-from-sitemap");
    });

    it("root `/?...&...#...` with packed query/hash passes (root has no trailing-slash variant)", () => {
      expect(
        checkRedirect(
          "/index",
          "/?utm=fb&u=@me;v=2!&ref=a:b*c#top~one",
          SITEMAP,
        ),
      ).toEqual([]);
    });
  });

  describe("source path with query/hash is still flagged (regression)", () => {
    it("source containing `?` plus reserved chars is flagged", () => {
      expect(
        checkRedirect("/old?u=@me", "/projects", SITEMAP),
      ).toContain("source-has-query-or-hash");
    });

    it("source containing `#` plus reserved chars is flagged", () => {
      expect(
        checkRedirect("/old#section:1*", "/projects", SITEMAP),
      ).toContain("source-has-query-or-hash");
    });

    it("source with double-encoded reserved chars in fragment is still flagged", () => {
      expect(
        checkRedirect("/old#%2540me%253A", "/projects", SITEMAP),
      ).toContain("source-has-query-or-hash");
    });
  });

  describe("malformed encoding only in query/hash does NOT poison path lookup", () => {
    // Encoding validation runs on the stripped path only — query/hash are
    // not part of canonical identity, so a bad `%` there is benign for
    // the duplicate-detection contract this file covers.
    it("malformed `%` in query is ignored; path lookup succeeds", () => {
      const issues = checkRedirect("/old", "/projects?u=%", SITEMAP);
      expect(issues).not.toContain("malformed-percent-encoding");
      expect(issues).not.toContain("target-missing-from-sitemap");
    });

    it("malformed `%ZZ` in fragment is ignored; path still resolves", () => {
      const issues = checkRedirect("/old", "/projects#%ZZ", SITEMAP);
      expect(issues).not.toContain("malformed-percent-encoding");
      expect(issues).not.toContain("target-missing-from-sitemap");
    });

    it("malformed `%` in PATH (not query/hash) is still flagged", () => {
      const issues = checkRedirect("/old", "/projects%?u=ok", SITEMAP);
      expect(issues).toContain("malformed-percent-encoding");
    });
  });

});
