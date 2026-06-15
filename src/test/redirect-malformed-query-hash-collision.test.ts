/**
 * Coverage for malformed percent-encoding (`%`, `%Z`, `%ZZ`, `%E2%82`,
 * truncated escapes) appearing in ONLY the query or ONLY the fragment,
 * combined with selective double-encoding on the OTHER component and
 * trailing-slash variants on the path.
 *
 * Invariant (from scripts/validate-sitemap-structure.ts and the sibling
 * test files in src/test/redirect-*-collision.test.ts):
 *
 *   1. Malformed `%` confined to query or fragment is BENIGN for
 *      canonical-identity matching — query/hash are stripped before the
 *      decode step.
 *   2. Malformed `%` in the PATH is always flagged
 *      `malformed-percent-encoding` regardless of what's in query/hash.
 *   3. Selective double-encoding in the OPPOSITE component (e.g. query
 *      malformed + hash double-encoded) doesn't change either rule —
 *      both pieces are dropped wholesale.
 *   4. Trailing slash on the path still drives `target-trailing-*`
 *      detection independently of query/hash encoding hygiene.
 */
import { describe, expect, it } from "vitest";
import {
  checkRedirect,
  type RedirectIssue,
} from "@/lib/redirect-canonical";

// Re-export so the type stays referenced for downstream tooling.
export type { RedirectIssue };


const CANONICAL_PATH = "/api/v1:auth;mode=2/@me!~*+(beta)";
const ENCODED_PATH   = "/api/v1%3Aauth%3Bmode=2/%40me%21%7E%2A%2B%28beta%29";
const SITEMAP = new Set<string>(["/", "/projects", CANONICAL_PATH]);

// Malformed query/fragment fixtures. Each violates `pct-encoded = "%" HEXDIG HEXDIG`
// from RFC 3986 §2.1 in a distinct way.
const MALFORMED_QUERIES = {
  loneTrailingPercent:  "?u=%",           // bare %
  loneMidPercent:       "?a=%&b=ok",      // % followed by `&`
  oneHex:               "?u=%A",          // truncated to 1 hex digit
  nonHexHigh:           "?u=%Z1",         // first hex digit invalid
  nonHexLow:            "?u=%1Z",         // second hex digit invalid
  bothNonHex:           "?u=%ZZ",
  truncatedAtEnd:       "?u=v%E2%82",     // valid `%E2%82` but bytes incomplete UTF-8 → throws
  spaceAfterPercent:    "?u=% extra",
  percentBeforeHash:    "?u=%",           // boundary case (no `#` follows here)
} as const;

const MALFORMED_HASHES = {
  loneTrailingPercent:  "#%",
  loneMidPercent:       "#a%b",
  oneHex:               "#%A",
  nonHexHigh:           "#%Z1",
  nonHexLow:            "#%1Z",
  bothNonHex:           "#%ZZ",
  truncatedAtEnd:       "#frag%E2%82",
  spaceAfterPercent:    "#% midword",
  pathInside:           "#deep/path/with/%-bad",
} as const;

// Valid encodings of query/hash for the "other" component in the matrix.
const Q_LIT = "?u=@alice&v=2";
const Q_ENC = "?u=%40alice&v=2";
const Q_DBL = "?u=%2540alice&v=2";

const H_LIT = "#section:1";
const H_ENC = "#section%3A1";
const H_DBL = "#section%253A1";

describe("checkRedirect() — malformed `%` in ONLY query OR ONLY fragment × selective DBL × trailing slash", () => {
  describe("malformed `%` in query only — canonical path still resolves; not flagged malformed", () => {
    const qCases = Object.entries(MALFORMED_QUERIES);
    it.each(qCases)(
      "path=LIT + malformed query (%s) + no hash → canonical match, no `malformed-percent-encoding`",
      (_label, q) => {
        const issues = checkRedirect("/old", `${CANONICAL_PATH}${q}`, SITEMAP);
        expect(issues).not.toContain("malformed-percent-encoding");
        expect(issues).not.toContain("target-missing-from-sitemap");
      },
    );

    it.each(qCases)(
      "path=ENC + malformed query (%s) + no hash → canonical match",
      (_label, q) => {
        expect(
          checkRedirect("/old", `${ENCODED_PATH}${q}`, SITEMAP),
        ).toEqual([]);
      },
    );

    it.each(qCases)(
      "path=LIT + malformed query (%s) + hash=LIT → canonical match",
      (_label, q) => {
        expect(
          checkRedirect("/old", `${CANONICAL_PATH}${q}${H_LIT}`, SITEMAP),
        ).toEqual([]);
      },
    );

    it.each(qCases)(
      "path=LIT + malformed query (%s) + hash=DBL → canonical match (hash also stripped)",
      (_label, q) => {
        expect(
          checkRedirect("/old", `${CANONICAL_PATH}${q}${H_DBL}`, SITEMAP),
        ).toEqual([]);
      },
    );

    it.each(qCases)(
      "path=ENC + malformed query (%s) + hash=DBL → canonical match",
      (_label, q) => {
        expect(
          checkRedirect("/old", `${ENCODED_PATH}${q}${H_DBL}`, SITEMAP),
        ).toEqual([]);
      },
    );
  });

  describe("malformed `%` in fragment only — canonical path still resolves", () => {
    const hCases = Object.entries(MALFORMED_HASHES);

    it.each(hCases)(
      "path=LIT + no query + malformed hash (%s) → canonical match",
      (_label, h) => {
        expect(
          checkRedirect("/old", `${CANONICAL_PATH}${h}`, SITEMAP),
        ).toEqual([]);
      },
    );

    it.each(hCases)(
      "path=ENC + no query + malformed hash (%s) → canonical match",
      (_label, h) => {
        expect(
          checkRedirect("/old", `${ENCODED_PATH}${h}`, SITEMAP),
        ).toEqual([]);
      },
    );

    it.each(hCases)(
      "path=LIT + query=LIT + malformed hash (%s) → canonical match",
      (_label, h) => {
        expect(
          checkRedirect("/old", `${CANONICAL_PATH}${Q_LIT}${h}`, SITEMAP),
        ).toEqual([]);
      },
    );

    it.each(hCases)(
      "path=LIT + query=DBL + malformed hash (%s) → canonical match (query also stripped)",
      (_label, h) => {
        expect(
          checkRedirect("/old", `${CANONICAL_PATH}${Q_DBL}${h}`, SITEMAP),
        ).toEqual([]);
      },
    );

    it.each(hCases)(
      "path=ENC + query=ENC + malformed hash (%s) → canonical match",
      (_label, h) => {
        expect(
          checkRedirect("/old", `${ENCODED_PATH}${Q_ENC}${h}`, SITEMAP),
        ).toEqual([]);
      },
    );
  });

  describe("trailing slash on path + malformed query OR hash", () => {
    describe("canonical+trailing twin both in sitemap → `target-trailing-duplicate-in-sitemap`", () => {
      const sitemap = new Set([...SITEMAP, `${CANONICAL_PATH}/`]);
      const qLabels = Object.keys(MALFORMED_QUERIES) as Array<keyof typeof MALFORMED_QUERIES>;
      const hLabels = Object.keys(MALFORMED_HASHES) as Array<keyof typeof MALFORMED_HASHES>;

      it.each(qLabels)(
        "path=LIT/ + malformed query (%s) + hash=DBL → trailing-dup",
        (qLabel) => {
          const target = `${CANONICAL_PATH}/${MALFORMED_QUERIES[qLabel]}${H_DBL}`;
          expect(checkRedirect("/old", target, sitemap)).toContain(
            "target-trailing-duplicate-in-sitemap",
          );
        },
      );

      it.each(hLabels)(
        "path=ENC/ + query=DBL + malformed hash (%s) → trailing-dup",
        (hLabel) => {
          const target = `${ENCODED_PATH}/${Q_DBL}${MALFORMED_HASHES[hLabel]}`;
          expect(checkRedirect("/old", target, sitemap)).toContain(
            "target-trailing-duplicate-in-sitemap",
          );
        },
      );
    });

    describe("only canonical (no trailing twin) in sitemap → trailing-slash variant is missing", () => {
      const qLabels = Object.keys(MALFORMED_QUERIES) as Array<keyof typeof MALFORMED_QUERIES>;
      const hLabels = Object.keys(MALFORMED_HASHES) as Array<keyof typeof MALFORMED_HASHES>;

      it.each(qLabels)(
        "path=LIT/ + malformed query (%s) + no hash → missing (not malformed)",
        (qLabel) => {
          const issues = checkRedirect(
            "/old",
            `${CANONICAL_PATH}/${MALFORMED_QUERIES[qLabel]}`,
            SITEMAP,
          );
          expect(issues).toContain("target-missing-from-sitemap");
          expect(issues).not.toContain("malformed-percent-encoding");
        },
      );

      it.each(hLabels)(
        "path=ENC/ + query=ENC + malformed hash (%s) → missing (not malformed)",
        (hLabel) => {
          const issues = checkRedirect(
            "/old",
            `${ENCODED_PATH}/${Q_ENC}${MALFORMED_HASHES[hLabel]}`,
            SITEMAP,
          );
          expect(issues).toContain("target-missing-from-sitemap");
          expect(issues).not.toContain("malformed-percent-encoding");
        },
      );
    });
  });

  describe("regression: malformed `%` IN THE PATH is still flagged even if query/hash are pristine", () => {
    it("path with lone `%` + valid query + valid hash → flagged malformed", () => {
      expect(
        checkRedirect("/old", `${CANONICAL_PATH}%${Q_LIT}${H_LIT}`, SITEMAP),
      ).toContain("malformed-percent-encoding");
    });

    it("path with `%ZZ` + valid query + valid hash → flagged malformed", () => {
      expect(
        checkRedirect("/old", `${CANONICAL_PATH}%ZZ${Q_LIT}${H_LIT}`, SITEMAP),
      ).toContain("malformed-percent-encoding");
    });

    it("path with `%E2%82` (truncated UTF-8) + valid query → flagged malformed", () => {
      expect(
        checkRedirect("/old", `${CANONICAL_PATH}/seg%E2%82${Q_ENC}`, SITEMAP),
      ).toContain("malformed-percent-encoding");
    });

    it("path with trailing slash + bad `%` + malformed query → both path issues fire", () => {
      const issues = checkRedirect(
        "/old",
        `${CANONICAL_PATH}/%ZZ?u=%`,
        SITEMAP,
      );
      expect(issues).toContain("malformed-percent-encoding");
      expect(issues).toContain("target-missing-from-sitemap");
    });
  });

  describe("source path with malformed `%` only in query/hash — still flagged `source-has-query-or-hash`", () => {
    const qLabels = Object.keys(MALFORMED_QUERIES) as Array<keyof typeof MALFORMED_QUERIES>;
    const hLabels = Object.keys(MALFORMED_HASHES) as Array<keyof typeof MALFORMED_HASHES>;

    it.each(qLabels)(
      "source path=LIT + malformed query (%s) → has-query-or-hash + source-in-sitemap, NOT malformed",
      (qLabel) => {
        const issues = checkRedirect(
          `${CANONICAL_PATH}${MALFORMED_QUERIES[qLabel]}`,
          "/projects",
          SITEMAP,
        );
        expect(issues).toContain("source-has-query-or-hash");
        expect(issues).toContain("source-in-sitemap");
        expect(issues).not.toContain("malformed-percent-encoding");
      },
    );

    it.each(hLabels)(
      "source path=ENC/ + malformed hash (%s) → has-query-or-hash + trailing-variant, NOT malformed",
      (hLabel) => {
        const issues = checkRedirect(
          `${ENCODED_PATH}/${MALFORMED_HASHES[hLabel]}`,
          "/projects",
          SITEMAP,
        );
        expect(issues).toContain("source-has-query-or-hash");
        expect(issues).toContain("source-trailing-variant-in-sitemap");
        expect(issues).not.toContain("malformed-percent-encoding");
      },
    );
  });

  describe("root `/` target with malformed `%` only in query OR hash", () => {
    const qLabels = Object.keys(MALFORMED_QUERIES) as Array<keyof typeof MALFORMED_QUERIES>;
    const hLabels = Object.keys(MALFORMED_HASHES) as Array<keyof typeof MALFORMED_HASHES>;

    it.each(qLabels)(
      "`/` + malformed query (%s) + hash=DBL → canonical match",
      (qLabel) => {
        expect(
          checkRedirect("/index", `/${MALFORMED_QUERIES[qLabel]}${H_DBL}`, SITEMAP),
        ).toEqual([]);
      },
    );

    it.each(hLabels)(
      "`/` + query=DBL + malformed hash (%s) → canonical match",
      (hLabel) => {
        expect(
          checkRedirect("/index", `/${Q_DBL}${MALFORMED_HASHES[hLabel]}`, SITEMAP),
        ).toEqual([]);
      },
    );
  });
});
