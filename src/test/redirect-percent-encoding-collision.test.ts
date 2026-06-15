/**
 * Synthetic-input coverage for percent-encoding normalization in the
 * redirect-vs-sitemap collision logic.
 *
 * Rule: `%20` (space), `%2F` (slash), Hebrew characters, etc. must be
 * decoded before comparing a redirect's source/target path against the
 * sitemap. Otherwise `/חדר-עבודה` (decoded sitemap loc) and
 * `/%D7%97%D7%93%D7%A8-%D7%A2%D7%91%D7%95%D7%93%D7%94` (raw redirect
 * target) would look different and silently bypass the duplicate check.
 *
 * Mirrors the decode step in scripts/validate-sitemap-structure.ts
 * (which decodes sitemap loc pathnames via `decodeURIComponent`) and
 * extends src/test/redirect-query-hash-collision.test.ts with the
 * encoding axis.
 */
import { describe, expect, it } from "vitest";

const trailingVariant = (p: string) =>
  p === "/" ? "/" : p.endsWith("/") ? p.slice(0, -1) : `${p}/`;

const stripQueryHash = (p: string) => p.split("#")[0].split("?")[0];

const safeDecode = (p: string) => {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
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

  // Detect malformed percent-escapes early — `%ZZ` and lone `%` would
  // throw in decodeURIComponent and we don't want to silently treat them
  // as literal strings.
  for (const raw of [from, to]) {
    try {
      decodeURIComponent(stripQueryHash(raw));
    } catch {
      issues.push("malformed-percent-encoding");
    }
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

// Fixture: sitemap stores DECODED paths (matches the real loader in
// scripts/validate-sitemap-structure.ts which decodeURIComponent's each loc).
const SITEMAP = new Set<string>([
  "/",
  "/projects",
  "/חדר-עבודה",
  "/services/with space",
]);

describe("checkRedirect() — percent-encoding normalization", () => {
  describe("%20 (space)", () => {
    it("encoded source matching decoded sitemap loc is flagged as duplicate", () => {
      expect(
        checkRedirect("/services/with%20space", "/projects", SITEMAP),
      ).toContain("source-in-sitemap");
    });

    it("encoded target matching decoded sitemap loc resolves cleanly", () => {
      expect(
        checkRedirect("/old", "/services/with%20space", SITEMAP),
      ).toEqual([]);
    });

    it("encoded target NOT in sitemap still fails after decode", () => {
      expect(
        checkRedirect("/old", "/services/no%20such%20page", SITEMAP),
      ).toContain("target-missing-from-sitemap");
    });
  });

  describe("percent-encoded Hebrew (UTF-8)", () => {
    const encodedHebrew =
      "/%D7%97%D7%93%D7%A8-%D7%A2%D7%91%D7%95%D7%93%D7%94"; // /חדר-עבודה

    it("encoded target matches decoded sitemap loc", () => {
      expect(checkRedirect("/old", encodedHebrew, SITEMAP)).toEqual([]);
    });

    it("encoded source identical to decoded sitemap loc is flagged", () => {
      expect(checkRedirect(encodedHebrew, "/projects", SITEMAP)).toContain(
        "source-in-sitemap",
      );
    });

    it("encoded source + encoded trailing slash variant still detected", () => {
      // sitemap has "/חדר-עבודה"; redirect from its encoded /-suffixed twin
      expect(
        checkRedirect(`${encodedHebrew}/`, "/projects", SITEMAP),
      ).toContain("source-trailing-variant-in-sitemap");
    });
  });

  describe("%2F (encoded slash)", () => {
    it("encoded `/` inside a segment decodes to literal `/` and must not be treated as a path separator", () => {
      // `/services%2Fwith%20space` decodes to `/services/with space`,
      // which IS in the sitemap — so this would collide.
      expect(
        checkRedirect("/services%2Fwith%20space", "/projects", SITEMAP),
      ).toContain("source-in-sitemap");
    });

    it("encoded `/` target that decodes to a sitemap loc passes target lookup", () => {
      expect(
        checkRedirect("/old", "/services%2Fwith%20space", SITEMAP),
      ).toEqual([]);
    });
  });

  describe("case-insensitive percent escapes", () => {
    it("lowercase `%d7` decodes the same as uppercase `%D7`", () => {
      const lower = "/%d7%97%d7%93%d7%a8-%d7%a2%d7%91%d7%95%d7%93%d7%94";
      expect(checkRedirect("/old", lower, SITEMAP)).toEqual([]);
    });
  });

  describe("query/hash + percent-encoding combined", () => {
    it("encoded target with query string still normalizes to canonical path", () => {
      expect(
        checkRedirect("/old", "/services/with%20space?utm=x", SITEMAP),
      ).toEqual([]);
    });

    it("encoded target with hash still normalizes to canonical path", () => {
      expect(
        checkRedirect("/old", "/services/with%20space#top", SITEMAP),
      ).toEqual([]);
    });
  });

  describe("malformed percent-encoding", () => {
    it("lone `%` in target is flagged", () => {
      const issues = checkRedirect("/old", "/projects%", SITEMAP);
      expect(issues).toContain("malformed-percent-encoding");
    });

    it("invalid escape `%ZZ` in source is flagged", () => {
      const issues = checkRedirect("/old%ZZ", "/projects", SITEMAP);
      expect(issues).toContain("malformed-percent-encoding");
    });
  });

  describe("regression — already-decoded inputs still work", () => {
    it("decoded Hebrew source matching sitemap is flagged", () => {
      expect(checkRedirect("/חדר-עבודה", "/projects", SITEMAP)).toContain(
        "source-in-sitemap",
      );
    });

    it("decoded target with space matches sitemap", () => {
      expect(
        checkRedirect("/old", "/services/with space", SITEMAP),
      ).toEqual([]);
    });
  });

  describe("double-encoding (%2520, %252F) — must NOT silently match canonical", () => {
    // Rationale: validate-sitemap-structure.ts decodes loc ONCE via
    // decodeURIComponent. A double-encoded redirect like `/foo%2520bar`
    // decodes once to the literal string `/foo%20bar` (not a space) and
    // therefore should NOT match the sitemap's `/foo bar`. Treating
    // double-encoded forms as canonical would let crawlers index two
    // different URLs for the same logical page.

    it("`%2520` in target does NOT collapse to space — flagged as missing", () => {
      // `/services/with%2520space` → decode once → `/services/with%20space`
      // which is NOT the sitemap's `/services/with space`.
      expect(
        checkRedirect("/old", "/services/with%2520space", SITEMAP),
      ).toContain("target-missing-from-sitemap");
    });

    it("`%2520` in source does NOT match decoded sitemap loc", () => {
      // `/services/with%2520space` decoded once ≠ `/services/with space`,
      // so it should NOT be flagged as a source duplicate.
      expect(
        checkRedirect("/services/with%2520space", "/projects", SITEMAP),
      ).not.toContain("source-in-sitemap");
    });

    it("`%252F` in target does NOT decode to a path separator", () => {
      // `/services%252Fwith%2520space` → `/services%2Fwith%20space`
      // (literal `%2F` and `%20` strings), NOT `/services/with space`.
      expect(
        checkRedirect("/old", "/services%252Fwith%2520space", SITEMAP),
      ).toContain("target-missing-from-sitemap");
    });

    it("double-encoded Hebrew does NOT match decoded sitemap loc", () => {
      // `%25D7%2597...` → decode once → `%D7%97...` (literal), NOT `חדר-עבודה`.
      const doubleEncodedHebrew =
        "/%25D7%2597%25D7%2593%25D7%25A8-%25D7%25A2%25D7%2591%25D7%2595%25D7%2593%25D7%2594";
      expect(
        checkRedirect("/old", doubleEncodedHebrew, SITEMAP),
      ).toContain("target-missing-from-sitemap");
      expect(
        checkRedirect(doubleEncodedHebrew, "/projects", SITEMAP),
      ).not.toContain("source-in-sitemap");
    });

    it("double-encoded form is NOT considered malformed (it's valid once-decodable)", () => {
      // `%2520` is a perfectly valid percent-escape that yields `%20`.
      // It's a canonicalization bug, not a parse error.
      expect(
        checkRedirect("/old", "/services/with%2520space", SITEMAP),
      ).not.toContain("malformed-percent-encoding");
    });

    describe("trailing-slash combinations on double-encoded paths", () => {
      it("double-encoded target with trailing slash is still missing from sitemap", () => {
        expect(
          checkRedirect("/old", "/services/with%2520space/", SITEMAP),
        ).toContain("target-missing-from-sitemap");
      });

      it("double-encoded source with trailing slash — neither variant matches sitemap", () => {
        const issues = checkRedirect(
          "/services/with%2520space/",
          "/projects",
          SITEMAP,
        );
        expect(issues).not.toContain("source-in-sitemap");
        expect(issues).not.toContain("source-trailing-variant-in-sitemap");
      });

      it("sitemap that mistakenly contains a double-encoded literal flags trailing-slash dup", () => {
        // Hypothetical bad sitemap: includes the literal string `/foo%20bar`
        // (i.e. someone wrote a double-encoded loc). Then a redirect to
        // `/foo%2520bar` decodes to that literal and IS a source dup.
        const badSitemap = new Set<string>([
          "/",
          "/foo%20bar",
          "/foo%20bar/",
        ]);
        expect(
          checkRedirect("/old", "/foo%2520bar", badSitemap),
        ).toContain("target-trailing-duplicate-in-sitemap");
      });

      it("double-encoded source matching a (bad) double-encoded sitemap loc is flagged", () => {
        const badSitemap = new Set<string>(["/", "/foo%20bar"]);
        expect(
          checkRedirect("/foo%2520bar", "/", badSitemap),
        ).toContain("source-in-sitemap");
      });

      it("triple-encoding (`%252520`) decodes once to `%2520`, still missing", () => {
        expect(
          checkRedirect("/old", "/services/with%252520space", SITEMAP),
        ).toContain("target-missing-from-sitemap");
      });
    });
  });

  describe("double-encoding × special chars (%25, +, hyphens) × trailing slash", () => {
    // SITEMAP fixture with decoded special-character paths a real site
    // might publish (literal percent, plus sign, hyphenated slugs).
    const SPECIAL_SITEMAP = new Set<string>([
      "/",
      "/sale-50%-off",       // decoded literal `%`
      "/c++-guide",          // literal `+` (path-segment `+` is NOT space)
      "/foo-bar-baz",        // hyphens — never percent-encoded
      "/tag/a+b",            // `+` inside path segment
    ]);

    describe("literal percent sign (`%25`)", () => {
      it("encoded `%25` target matches sitemap loc with literal `%`", () => {
        // `/sale-50%25-off` → decode once → `/sale-50%-off` ✓
        expect(
          checkRedirect("/old", "/sale-50%25-off", SPECIAL_SITEMAP),
        ).toEqual([]);
      });

      it("double-encoded `%2525` does NOT collapse to `%` — flagged missing", () => {
        // `/sale-50%2525-off` → decode once → `/sale-50%25-off` (literal `%25`),
        // which is NOT `/sale-50%-off`.
        expect(
          checkRedirect("/old", "/sale-50%2525-off", SPECIAL_SITEMAP),
        ).toContain("target-missing-from-sitemap");
      });

      it("encoded `%25` source matching decoded sitemap loc is flagged as dup", () => {
        expect(
          checkRedirect("/sale-50%25-off", "/", SPECIAL_SITEMAP),
        ).toContain("source-in-sitemap");
      });

      it("double-encoded `%25` source with trailing slash does NOT match either variant", () => {
        const issues = checkRedirect(
          "/sale-50%2525-off/",
          "/",
          SPECIAL_SITEMAP,
        );
        expect(issues).not.toContain("source-in-sitemap");
        expect(issues).not.toContain("source-trailing-variant-in-sitemap");
      });
    });

    describe("plus sign (`+`) — must stay literal in path segments", () => {
      it("literal `+` target matches sitemap (no space conversion in paths)", () => {
        expect(
          checkRedirect("/old", "/c++-guide", SPECIAL_SITEMAP),
        ).toEqual([]);
      });

      it("encoded `%2B` target decodes to `+` and matches sitemap", () => {
        // `/c%2B%2B-guide` → `/c++-guide` ✓
        expect(
          checkRedirect("/old", "/c%2B%2B-guide", SPECIAL_SITEMAP),
        ).toEqual([]);
      });

      it("double-encoded `%252B` does NOT collapse to `+` — flagged missing", () => {
        // `/c%252B%252B-guide` → `/c%2B%2B-guide` (literal `%2B` strings).
        expect(
          checkRedirect("/old", "/c%252B%252B-guide", SPECIAL_SITEMAP),
        ).toContain("target-missing-from-sitemap");
      });

      it("encoded `%2B` source matching `tag/a+b` is flagged as dup", () => {
        expect(
          checkRedirect("/tag/a%2Bb", "/", SPECIAL_SITEMAP),
        ).toContain("source-in-sitemap");
      });

      it("double-encoded `%252B` source does NOT match `tag/a+b`", () => {
        expect(
          checkRedirect("/tag/a%252Bb", "/", SPECIAL_SITEMAP),
        ).not.toContain("source-in-sitemap");
      });

      it("trailing slash on encoded `+` source — neither variant in sitemap", () => {
        const issues = checkRedirect("/tag/a%2Bb/", "/", SPECIAL_SITEMAP);
        expect(issues).toContain("source-trailing-variant-in-sitemap");
      });
    });

    describe("hyphens — never percent-encoded, must pass through cleanly", () => {
      it("plain hyphenated target matches sitemap", () => {
        expect(
          checkRedirect("/old", "/foo-bar-baz", SPECIAL_SITEMAP),
        ).toEqual([]);
      });

      it("encoded `%2D` (hyphen) target decodes to `-` and matches sitemap", () => {
        // `/foo%2Dbar%2Dbaz` → `/foo-bar-baz` ✓ (RFC 3986: `-` is unreserved
        // but encoding it is still valid and decoders MUST accept it).
        expect(
          checkRedirect("/old", "/foo%2Dbar%2Dbaz", SPECIAL_SITEMAP),
        ).toEqual([]);
      });

      it("double-encoded `%252D` does NOT decode to `-` — flagged missing", () => {
        // `/foo%252Dbar%252Dbaz` → `/foo%2Dbar%2Dbaz` (literal `%2D`).
        expect(
          checkRedirect("/old", "/foo%252Dbar%252Dbaz", SPECIAL_SITEMAP),
        ).toContain("target-missing-from-sitemap");
      });

      it("encoded-hyphen source with trailing slash matches sitemap as trailing-variant dup", () => {
        expect(
          checkRedirect("/foo%2Dbar%2Dbaz/", "/", SPECIAL_SITEMAP),
        ).toContain("source-trailing-variant-in-sitemap");
      });
    });

    describe("mixed: `%25` + `+` + hyphen combined", () => {
      const MIXED_SITEMAP = new Set<string>([
        "/",
        "/deal-30%-c++-bundle",
      ]);

      it("single-encoded mix decodes cleanly to canonical", () => {
        // `/deal-30%25-c%2B%2B-bundle` → `/deal-30%-c++-bundle` ✓
        expect(
          checkRedirect("/old", "/deal-30%25-c%2B%2B-bundle", MIXED_SITEMAP),
        ).toEqual([]);
      });

      it("double-encoded mix does NOT match canonical", () => {
        expect(
          checkRedirect(
            "/old",
            "/deal-30%2525-c%252B%252B-bundle",
            MIXED_SITEMAP,
          ),
        ).toContain("target-missing-from-sitemap");
      });

      it("trailing slash on single-encoded mix target is flagged as trailing dup if both in sitemap", () => {
        const withTrail = new Set([...MIXED_SITEMAP, "/deal-30%-c++-bundle/"]);
        expect(
          checkRedirect(
            "/old",
            "/deal-30%25-c%2B%2B-bundle/",
            withTrail,
          ),
        ).toContain("target-trailing-duplicate-in-sitemap");
      });

      it("single-encoded mix as source is flagged duplicate of canonical loc", () => {
        expect(
          checkRedirect("/deal-30%25-c%2B%2B-bundle", "/", MIXED_SITEMAP),
        ).toContain("source-in-sitemap");
      });

      it("double-encoded mix as source does NOT collide", () => {
        expect(
          checkRedirect(
            "/deal-30%2525-c%252B%252B-bundle",
            "/",
            MIXED_SITEMAP,
          ),
        ).not.toContain("source-in-sitemap");
      });
    });
  });
});


