/**
 * End-to-end coverage for canonical duplicate detection when URL reserved
 * characters (`:` `;` `@` `!` `~` `*` `+` and friends) appear
 * SIMULTANEOUSLY in path, query, and fragment — combined with
 * double-encoding (`%25xx`) and trailing-slash variants.
 *
 * Policy recap (same as sibling files in src/test/redirect-*-collision.test.ts
 * and scripts/validate-sitemap-structure.ts):
 *   - Strip fragment, then query, then percent-decode ONCE → that's the
 *     canonical path used for sitemap-loc comparison.
 *   - Reserved chars in the path are part of the canonical URL; in
 *     query/fragment they are user-state and irrelevant.
 *   - Double-encoded forms (`%253A`) decode to literal `%3A` strings and
 *     therefore DO NOT match a sitemap loc that contains a real `:`.
 *   - Trailing slash policy: root `/` keeps `/`; any other path must NOT
 *     end with `/`. Both flagged when a redirect would create a duplicate.
 */
import { describe, expect, it } from "vitest";

const trailingVariant = (p: string) =>
  p === "/" ? "/" : p.endsWith("/") ? p.slice(0, -1) : `${p}/`;

/** Fragment splits FIRST (RFC 3986 §3.5: fragment may contain `?`). */
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

// Canonical sitemap entry packs every interesting reserved char into the
// path itself — that's what real apps publish for things like API browsers,
// scoped tokens, and handle-style URLs.
const CANONICAL_PATH = "/api/v1:auth;mode=2/@me!~*+(beta)";
const SITEMAP = new Set<string>(["/", "/projects", CANONICAL_PATH]);

// Same path, every reserved char percent-encoded ONCE.
const ENCODED_PATH = "/api/v1%3Aauth%3Bmode=2/%40me%21%7E%2A%2B%28beta%29";
// Same path, every reserved char DOUBLE-encoded — should NOT match canonical.
const DOUBLE_ENCODED_PATH =
  "/api/v1%253Aauth%253Bmode=2/%2540me%2521%257E%252A%252B%2528beta%2529";

// Rich query+fragment payloads (with their own reserved-char zoo).
const QUERY_LITERAL = "?u=@alice;v=2&filter=name='Joe',price=$10..(20)&ref=a:b*c+!~";
const QUERY_ENCODED =
  "?u=%40alice%3Bv=2&filter=name%3D%27Joe%27%2Cprice%3D%2410..%2820%29&ref=a%3Ab%2Ac%2B%21%7E";
const QUERY_DOUBLE_ENCODED =
  "?u=%2540alice%253Bv=2&filter=name%253D%2527Joe%2527%252Cprice%253D%252410..%252820%2529&ref=a%253Ab%252Ac%252B%2521%257E";

const HASH_LITERAL = "#section:1;v=2/@anchor!~*+(end)";
const HASH_ENCODED = "#section%3A1%3Bv=2/%40anchor%21%7E%2A%2B%28end%29";
const HASH_DOUBLE_ENCODED =
  "#section%253A1%253Bv=2/%2540anchor%2521%257E%252A%252B%2528end%2529";

describe("checkRedirect() — reserved chars in path + query + fragment, simultaneously", () => {
  describe("all three carry literal reserved chars", () => {
    it("literal path + literal query + literal hash → canonical match", () => {
      expect(
        checkRedirect("/old", `${CANONICAL_PATH}${QUERY_LITERAL}${HASH_LITERAL}`, SITEMAP),
      ).toEqual([]);
    });

    it("encoded path + literal query + literal hash → canonical match", () => {
      expect(
        checkRedirect("/old", `${ENCODED_PATH}${QUERY_LITERAL}${HASH_LITERAL}`, SITEMAP),
      ).toEqual([]);
    });

    it("literal path + encoded query + encoded hash → canonical match", () => {
      expect(
        checkRedirect("/old", `${CANONICAL_PATH}${QUERY_ENCODED}${HASH_ENCODED}`, SITEMAP),
      ).toEqual([]);
    });

    it("encoded path + encoded query + encoded hash → canonical match", () => {
      expect(
        checkRedirect("/old", `${ENCODED_PATH}${QUERY_ENCODED}${HASH_ENCODED}`, SITEMAP),
      ).toEqual([]);
    });
  });

  describe("query/hash double-encoded — still irrelevant to canonical identity", () => {
    it("literal path + double-encoded query → canonical match", () => {
      expect(
        checkRedirect("/old", `${CANONICAL_PATH}${QUERY_DOUBLE_ENCODED}`, SITEMAP),
      ).toEqual([]);
    });

    it("encoded path + double-encoded query + double-encoded hash → canonical match", () => {
      expect(
        checkRedirect(
          "/old",
          `${ENCODED_PATH}${QUERY_DOUBLE_ENCODED}${HASH_DOUBLE_ENCODED}`,
          SITEMAP,
        ),
      ).toEqual([]);
    });

    it("literal path + double-encoded query + double-encoded hash → canonical match", () => {
      expect(
        checkRedirect(
          "/old",
          `${CANONICAL_PATH}${QUERY_DOUBLE_ENCODED}${HASH_DOUBLE_ENCODED}`,
          SITEMAP,
        ),
      ).toEqual([]);
    });
  });

  describe("PATH double-encoded — must NOT match canonical even with valid query/hash", () => {
    it("double-encoded path + literal query + literal hash → flagged missing", () => {
      expect(
        checkRedirect(
          "/old",
          `${DOUBLE_ENCODED_PATH}${QUERY_LITERAL}${HASH_LITERAL}`,
          SITEMAP,
        ),
      ).toContain("target-missing-from-sitemap");
    });

    it("double-encoded path + double-encoded query + double-encoded hash → flagged missing", () => {
      expect(
        checkRedirect(
          "/old",
          `${DOUBLE_ENCODED_PATH}${QUERY_DOUBLE_ENCODED}${HASH_DOUBLE_ENCODED}`,
          SITEMAP,
        ),
      ).toContain("target-missing-from-sitemap");
    });

    it("double-encoded path as SOURCE does NOT collide with canonical", () => {
      expect(
        checkRedirect(DOUBLE_ENCODED_PATH, "/projects", SITEMAP),
      ).not.toContain("source-in-sitemap");
    });
  });

  describe("trailing-slash on path × rich query/hash", () => {
    it("literal path + trailing slash + rich query/hash → flagged trailing dup when both forms in sitemap", () => {
      const withTrail = new Set([...SITEMAP, `${CANONICAL_PATH}/`]);
      expect(
        checkRedirect(
          "/old",
          `${CANONICAL_PATH}/${QUERY_LITERAL}${HASH_LITERAL}`,
          withTrail,
        ),
      ).toContain("target-trailing-duplicate-in-sitemap");
    });

    it("encoded path + trailing slash + double-encoded query/hash → flagged trailing dup", () => {
      const withTrail = new Set([...SITEMAP, `${CANONICAL_PATH}/`]);
      expect(
        checkRedirect(
          "/old",
          `${ENCODED_PATH}/${QUERY_DOUBLE_ENCODED}${HASH_DOUBLE_ENCODED}`,
          withTrail,
        ),
      ).toContain("target-trailing-duplicate-in-sitemap");
    });

    it("encoded path + trailing slash (canonical NOT also in sitemap) → flagged missing", () => {
      // Sitemap only has the no-slash canonical. With a trailing slash the
      // decoded path becomes `<canonical>/` which is NOT in sitemap.
      expect(
        checkRedirect(
          "/old",
          `${ENCODED_PATH}/${QUERY_ENCODED}${HASH_ENCODED}`,
          SITEMAP,
        ),
      ).toContain("target-missing-from-sitemap");
    });

    it("double-encoded path + trailing slash + rich query/hash → flagged missing", () => {
      expect(
        checkRedirect(
          "/old",
          `${DOUBLE_ENCODED_PATH}/${QUERY_LITERAL}${HASH_LITERAL}`,
          SITEMAP,
        ),
      ).toContain("target-missing-from-sitemap");
    });

    it("encoded path + trailing slash as SOURCE → flagged as trailing-variant of canonical", () => {
      expect(
        checkRedirect(`${ENCODED_PATH}/`, "/projects", SITEMAP),
      ).toContain("source-trailing-variant-in-sitemap");
    });
  });

  describe("source with query/hash always flagged regardless of payload", () => {
    it("literal source path + literal query → `source-has-query-or-hash`", () => {
      const issues = checkRedirect(
        `${CANONICAL_PATH}${QUERY_LITERAL}`,
        "/projects",
        SITEMAP,
      );
      expect(issues).toContain("source-has-query-or-hash");
      expect(issues).toContain("source-in-sitemap");
    });

    it("encoded source path + double-encoded query + double-encoded hash → `source-has-query-or-hash`", () => {
      const issues = checkRedirect(
        `${ENCODED_PATH}${QUERY_DOUBLE_ENCODED}${HASH_DOUBLE_ENCODED}`,
        "/projects",
        SITEMAP,
      );
      expect(issues).toContain("source-has-query-or-hash");
      expect(issues).toContain("source-in-sitemap");
    });

    it("double-encoded source path + rich query/hash → `source-has-query-or-hash` but NOT a duplicate", () => {
      const issues = checkRedirect(
        `${DOUBLE_ENCODED_PATH}${QUERY_LITERAL}${HASH_LITERAL}`,
        "/projects",
        SITEMAP,
      );
      expect(issues).toContain("source-has-query-or-hash");
      expect(issues).not.toContain("source-in-sitemap");
    });
  });

  describe("malformed `%` confined to query or hash never breaks path resolution", () => {
    it("encoded path + malformed query → path still resolves cleanly", () => {
      const issues = checkRedirect(
        "/old",
        `${ENCODED_PATH}?u=%${HASH_ENCODED}`,
        SITEMAP,
      );
      expect(issues).not.toContain("target-missing-from-sitemap");
      expect(issues).not.toContain("malformed-percent-encoding");
    });

    it("literal path + malformed hash → path still resolves cleanly", () => {
      const issues = checkRedirect(
        "/old",
        `${CANONICAL_PATH}${QUERY_LITERAL}#%ZZ`,
        SITEMAP,
      );
      expect(issues).not.toContain("target-missing-from-sitemap");
      expect(issues).not.toContain("malformed-percent-encoding");
    });

    it("malformed `%` in PATH + valid query/hash → flagged malformed", () => {
      expect(
        checkRedirect(
          "/old",
          `${CANONICAL_PATH}%${QUERY_LITERAL}${HASH_LITERAL}`,
          SITEMAP,
        ),
      ).toContain("malformed-percent-encoding");
    });
  });

  describe("root `/` target with packed query/hash zoo on every encoding tier", () => {
    it("`/` + literal rich query + literal rich hash → canonical match", () => {
      expect(
        checkRedirect("/index", `/${QUERY_LITERAL}${HASH_LITERAL}`, SITEMAP),
      ).toEqual([]);
    });

    it("`/` + encoded rich query + encoded rich hash → canonical match", () => {
      expect(
        checkRedirect("/index", `/${QUERY_ENCODED}${HASH_ENCODED}`, SITEMAP),
      ).toEqual([]);
    });

    it("`/` + double-encoded rich query + double-encoded rich hash → canonical match", () => {
      expect(
        checkRedirect(
          "/index",
          `/${QUERY_DOUBLE_ENCODED}${HASH_DOUBLE_ENCODED}`,
          SITEMAP,
        ),
      ).toEqual([]);
    });
  });
});
