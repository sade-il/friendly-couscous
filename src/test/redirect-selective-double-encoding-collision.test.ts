/**
 * Coverage for SELECTIVE double-encoding: only one of {query, fragment} is
 * double-encoded while the other parts stay single-encoded (or literal).
 *
 * The canonical-identity contract says path-only matters for sitemap-loc
 * comparison: query and fragment are stripped wholesale, so it doesn't
 * matter whether they are literal, single-encoded, double-encoded, or a
 * mix of the two. These tests pin that invariant down on every
 * permutation we can produce, including trailing slashes on the path.
 *
 * Sibling files:
 *   - src/test/redirect-percent-encoding-collision.test.ts
 *   - src/test/redirect-reserved-chars-query-hash-collision.test.ts
 *   - src/test/redirect-reserved-chars-path-query-hash-collision.test.ts
 */
import { describe, expect, it } from "vitest";

const trailingVariant = (p: string) =>
  p === "/" ? "/" : p.endsWith("/") ? p.slice(0, -1) : `${p}/`;

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

// Canonical path with reserved chars. Same fixture as the path+query+hash
// combined file so test failures triangulate cleanly across files.
const CANONICAL_PATH = "/api/v1:auth;mode=2/@me!~*+(beta)";
const ENCODED_PATH   = "/api/v1%3Aauth%3Bmode=2/%40me%21%7E%2A%2B%28beta%29";
const DBL_ENC_PATH   = "/api/v1%253Aauth%253Bmode=2/%2540me%2521%257E%252A%252B%2528beta%2529";

const SITEMAP = new Set<string>(["/", "/projects", CANONICAL_PATH]);

// Query and fragment payloads in three encoding tiers each.
const Q_LIT = "?u=@alice;v=2&ref=a:b*c+!~";
const Q_ENC = "?u=%40alice%3Bv=2&ref=a%3Ab%2Ac%2B%21%7E";
const Q_DBL = "?u=%2540alice%253Bv=2&ref=a%253Ab%252Ac%252B%2521%257E";

const H_LIT = "#section:1;v=2/@anchor!~*+(end)";
const H_ENC = "#section%3A1%3Bv=2/%40anchor%21%7E%2A%2B%28end%29";
const H_DBL = "#section%253A1%253Bv=2/%2540anchor%2521%257E%252A%252B%2528end%2529";

// Cross-product helpers for naming.
const QUERIES = { LIT: Q_LIT, ENC: Q_ENC, DBL: Q_DBL } as const;
const HASHES  = { LIT: H_LIT, ENC: H_ENC, DBL: H_DBL } as const;
const PATHS   = { LIT: CANONICAL_PATH, ENC: ENCODED_PATH, DBL: DBL_ENC_PATH } as const;

type PathTier  = keyof typeof PATHS;
type QueryTier = keyof typeof QUERIES;
type HashTier  = keyof typeof HASHES;

describe("checkRedirect() — selective double-encoding (one of query/hash) × trailing slash", () => {
  describe("only query is double-encoded; path literal or single-encoded; hash literal or single-encoded", () => {
    const matrix: Array<[PathTier, HashTier]> = [
      ["LIT", "LIT"],
      ["LIT", "ENC"],
      ["ENC", "LIT"],
      ["ENC", "ENC"],
    ];
    it.each(matrix)(
      "path=%s + query=DBL + hash=%s → canonical match (query/hash always stripped)",
      (pTier, hTier) => {
        const target = `${PATHS[pTier]}${Q_DBL}${HASHES[hTier]}`;
        expect(checkRedirect("/old", target, SITEMAP)).toEqual([]);
      },
    );
  });

  describe("only hash is double-encoded; path literal or single-encoded; query literal or single-encoded", () => {
    const matrix: Array<[PathTier, QueryTier]> = [
      ["LIT", "LIT"],
      ["LIT", "ENC"],
      ["ENC", "LIT"],
      ["ENC", "ENC"],
    ];
    it.each(matrix)(
      "path=%s + query=%s + hash=DBL → canonical match",
      (pTier, qTier) => {
        const target = `${PATHS[pTier]}${QUERIES[qTier]}${H_DBL}`;
        expect(checkRedirect("/old", target, SITEMAP)).toEqual([]);
      },
    );
  });

  describe("query DBL × hash DBL — combined still benign for canonical lookup", () => {
    const pathMatrix: PathTier[] = ["LIT", "ENC"];
    it.each(pathMatrix)(
      "path=%s + query=DBL + hash=DBL → canonical match",
      (pTier) => {
        expect(
          checkRedirect("/old", `${PATHS[pTier]}${Q_DBL}${H_DBL}`, SITEMAP),
        ).toEqual([]);
      },
    );
  });

  describe("path DBL with selective query/hash double-encoding — always missing", () => {
    const matrix: Array<[QueryTier, HashTier]> = [
      ["LIT", "DBL"],
      ["DBL", "LIT"],
      ["ENC", "DBL"],
      ["DBL", "ENC"],
      ["DBL", "DBL"],
    ];
    it.each(matrix)(
      "path=DBL + query=%s + hash=%s → flagged missing (path is what matters)",
      (qTier, hTier) => {
        const target = `${DBL_ENC_PATH}${QUERIES[qTier]}${HASHES[hTier]}`;
        expect(checkRedirect("/old", target, SITEMAP)).toContain(
          "target-missing-from-sitemap",
        );
      },
    );
  });

  describe("trailing slash on path × selective DBL query OR hash", () => {
    describe("canonical also has trailing-slash twin → `target-trailing-duplicate-in-sitemap`", () => {
      const sitemap = new Set([...SITEMAP, `${CANONICAL_PATH}/`]);
      const matrix: Array<[PathTier, QueryTier, HashTier]> = [
        ["LIT", "DBL", "LIT"],
        ["LIT", "LIT", "DBL"],
        ["ENC", "DBL", "ENC"],
        ["ENC", "ENC", "DBL"],
        ["LIT", "DBL", "DBL"],
      ];
      it.each(matrix)(
        "path=%s + trailing slash + query=%s + hash=%s → trailing-duplicate",
        (pTier, qTier, hTier) => {
          const target = `${PATHS[pTier]}/${QUERIES[qTier]}${HASHES[hTier]}`;
          expect(checkRedirect("/old", target, sitemap)).toContain(
            "target-trailing-duplicate-in-sitemap",
          );
        },
      );
    });

    describe("only the no-slash canonical is in sitemap → trailing-slash variant is missing", () => {
      const matrix: Array<[PathTier, QueryTier, HashTier]> = [
        ["LIT", "DBL", "LIT"],
        ["ENC", "LIT", "DBL"],
        ["LIT", "DBL", "DBL"],
      ];
      it.each(matrix)(
        "path=%s + trailing slash + query=%s + hash=%s → flagged missing",
        (pTier, qTier, hTier) => {
          const target = `${PATHS[pTier]}/${QUERIES[qTier]}${HASHES[hTier]}`;
          expect(checkRedirect("/old", target, SITEMAP)).toContain(
            "target-missing-from-sitemap",
          );
        },
      );
    });

    describe("path DBL + trailing slash + selective DBL on query/hash → always missing", () => {
      const matrix: Array<[QueryTier, HashTier]> = [
        ["DBL", "LIT"],
        ["LIT", "DBL"],
        ["ENC", "DBL"],
        ["DBL", "ENC"],
        ["DBL", "DBL"],
      ];
      it.each(matrix)(
        "path=DBL + trailing slash + query=%s + hash=%s → flagged missing",
        (qTier, hTier) => {
          const target = `${DBL_ENC_PATH}/${QUERIES[qTier]}${HASHES[hTier]}`;
          expect(checkRedirect("/old", target, SITEMAP)).toContain(
            "target-missing-from-sitemap",
          );
        },
      );
    });
  });

  describe("source path × selective DBL query/hash — always flagged `source-has-query-or-hash`", () => {
    const matrix: Array<[PathTier, QueryTier, HashTier, boolean]> = [
      // [pathTier, qTier, hTier, expectSourceInSitemap]
      ["LIT", "DBL", "LIT", true],   // path matches canonical → dup
      ["LIT", "LIT", "DBL", true],
      ["ENC", "DBL", "DBL", true],   // encoded path normalizes to canonical
      ["DBL", "DBL", "DBL", false],  // double-encoded path → no dup
      ["DBL", "LIT", "DBL", false],
    ];
    it.each(matrix)(
      "source path=%s + query=%s + hash=%s → has-query-or-hash; in-sitemap=%s",
      (pTier, qTier, hTier, expectDup) => {
        const from = `${PATHS[pTier]}${QUERIES[qTier]}${HASHES[hTier]}`;
        const issues = checkRedirect(from, "/projects", SITEMAP);
        expect(issues).toContain("source-has-query-or-hash");
        if (expectDup) {
          expect(issues).toContain("source-in-sitemap");
        } else {
          expect(issues).not.toContain("source-in-sitemap");
        }
      },
    );

    it("source with trailing slash + selective DBL query → trailing-variant dup detected", () => {
      const from = `${ENCODED_PATH}/${Q_DBL}`;
      const issues = checkRedirect(from, "/projects", SITEMAP);
      expect(issues).toContain("source-has-query-or-hash");
      expect(issues).toContain("source-trailing-variant-in-sitemap");
    });
  });

  describe("root `/` target with selective DBL on query OR hash", () => {
    it("`/` + query=DBL + hash=LIT → canonical match", () => {
      expect(checkRedirect("/index", `/${Q_DBL}${H_LIT}`, SITEMAP)).toEqual([]);
    });
    it("`/` + query=ENC + hash=DBL → canonical match", () => {
      expect(checkRedirect("/index", `/${Q_ENC}${H_DBL}`, SITEMAP)).toEqual([]);
    });
    it("`/` + query=DBL + hash=DBL → canonical match", () => {
      expect(checkRedirect("/index", `/${Q_DBL}${H_DBL}`, SITEMAP)).toEqual([]);
    });
    it("`/` + query=LIT + hash=DBL → canonical match", () => {
      expect(checkRedirect("/index", `/${Q_LIT}${H_DBL}`, SITEMAP)).toEqual([]);
    });
  });
});
