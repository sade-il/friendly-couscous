/**
 * Pins down the canonicalization DECODING ORDER for redirect targets when
 * one of {query, fragment} carries a mix of double-encoded valid escapes
 * AND malformed `%`. The order must be invariant; otherwise the same
 * target could canonicalize to two different sitemap-loc comparisons.
 *
 * Order spec (matches scripts/validate-sitemap-structure.ts and every
 * sibling file in src/test/redirect-*-collision.test.ts):
 *
 *     1. Split on the FIRST `#`         (fragment = right side, dropped)
 *     2. Split the left side on the FIRST `?` (query = right side, dropped)
 *     3. decodeURIComponent the surviving path EXACTLY ONCE
 *     4. NFC-normalize (handled in sibling unicode file, not here)
 *
 * Consequences this file asserts:
 *
 *   - `?` and `#` inside double-encoded sequences (`%253F`, `%2523`) NEVER
 *     act as separators, because the split runs on the raw string before
 *     any decode.
 *   - Multiple `?` / `#` characters never re-split: the FIRST one wins.
 *   - Malformed `%` strictly inside the fragment (which is dropped first)
 *     never reaches the query-validity check or the path decode.
 *   - Selective double-encoding of valid escapes in query OR fragment is
 *     irrelevant to canonical identity at every trailing-slash variant.
 *
 * Sibling files:
 *   src/test/redirect-percent-encoding-collision.test.ts
 *   src/test/redirect-query-hash-collision.test.ts
 *   src/test/redirect-malformed-query-hash-collision.test.ts
 *   src/test/redirect-selective-double-encoding-collision.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  canonicalPath,
  checkRedirect,
  type RedirectIssue,
  safeDecode,
} from "@/lib/redirect-canonical";

// Re-export so the type stays referenced for downstream tooling.
export type { RedirectIssue };


const CANONICAL_PATH = "/api/v1:auth;mode=2/@me!~*+(beta)";
const ENCODED_PATH   = "/api/v1%3Aauth%3Bmode=2/%40me%21%7E%2A%2B%28beta%29";
const SITEMAP = new Set<string>(["/", "/projects", CANONICAL_PATH]);

// ─── Stage-1 invariant: fragment splits FIRST ────────────────────────────────
describe("decoding order — stage 1: fragment splits before query", () => {
  it("`?` inside fragment is part of fragment, not a query terminator", () => {
    // Raw: /projects#with?qmark&q=2
    // After #-split: /projects   AND fragment "with?qmark&q=2"
    // After ?-split on left: still /projects
    expect(canonicalPath("/projects#with?qmark&q=2")).toBe("/projects");
    expect(checkRedirect("/old", "/projects#with?qmark&q=2", SITEMAP)).toEqual([]);
  });

  it("fragment that LOOKS like a full URL still resolves to base path", () => {
    expect(
      canonicalPath("/projects#https://evil.example.com/?steal=1"),
    ).toBe("/projects");
  });

  it("multiple `#` — only FIRST one separates fragment; rest are fragment text", () => {
    expect(canonicalPath("/projects#frag1#frag2#frag3")).toBe("/projects");
    expect(
      checkRedirect("/old", "/projects#frag1#frag2#frag3", SITEMAP),
    ).toEqual([]);
  });

  it("multiple `?` BEFORE any `#` — only first `?` separates query", () => {
    // Raw: /projects?a=1?b=2?c=3
    // After #-split (no #): same
    // After ?-split: /projects   AND query "a=1?b=2?c=3"
    expect(canonicalPath("/projects?a=1?b=2?c=3")).toBe("/projects");
  });

  it("`?` BEFORE `#` and `?` AFTER `#` — both queries dropped (after-# is fragment)", () => {
    // Raw: /projects?a=1#frag?b=2
    // After #-split: /projects?a=1
    // After ?-split: /projects
    expect(canonicalPath("/projects?a=1#frag?b=2")).toBe("/projects");
  });
});

// ─── Stage-2 invariant: encoded `#`/`?` are NOT separators ───────────────────
describe("decoding order — stage 2: split runs on RAW string (encoded `?` / `#` are opaque)", () => {
  it("`%23` (encoded `#`) in path does NOT split off a fragment", () => {
    // Path component `%23topic` decodes to literal `#topic`.
    const sitemap = new Set(["/", "/articles/#topic"]);
    expect(canonicalPath("/articles/%23topic")).toBe("/articles/#topic");
    expect(checkRedirect("/old", "/articles/%23topic", sitemap)).toEqual([]);
  });

  it("`%3F` (encoded `?`) in path does NOT split off a query", () => {
    const sitemap = new Set(["/", "/faq/?-help"]);
    expect(canonicalPath("/faq/%3F-help")).toBe("/faq/?-help");
    expect(checkRedirect("/old", "/faq/%3F-help", sitemap)).toEqual([]);
  });

  it("`%2523` (double-encoded `#`) in path stays literal `%23` after one decode", () => {
    // Decode once: `%2523` → `%23` (NOT `#`). So no fragment splitting.
    const sitemap = new Set(["/", "/literal%23-in-path"]);
    expect(canonicalPath("/literal%2523-in-path")).toBe("/literal%23-in-path");
    expect(checkRedirect("/old", "/literal%2523-in-path", sitemap)).toEqual([]);
  });

  it("`%253F` (double-encoded `?`) in path stays literal `%3F` after one decode", () => {
    const sitemap = new Set(["/", "/literal%3F-in-path"]);
    expect(canonicalPath("/literal%253F-in-path")).toBe("/literal%3F-in-path");
    expect(checkRedirect("/old", "/literal%253F-in-path", sitemap)).toEqual([]);
  });

  it("`%3F` in query value does NOT prematurely terminate the query", () => {
    // Raw `/projects?q=where%3Foperator=eq` — first `?` is the real separator,
    // `%3F` inside the value is opaque.
    expect(canonicalPath("/projects?q=where%3Foperator=eq")).toBe("/projects");
  });

  it("`%23` in query value does NOT spawn a fragment", () => {
    expect(canonicalPath("/projects?u=%23me")).toBe("/projects");
  });
});

// ─── Selective double-encoding × malformed `%` in the OTHER component ────────
describe("decoding order — selective DBL valid + malformed `%` in ONE component only", () => {
  describe("query has DBL valid + malformed `%`; fragment is benign", () => {
    const matrix: Array<[string, string]> = [
      ["DBL valid then lone `%`",                 "?u=%2540alice&x=%"],
      ["lone `%` then DBL valid",                 "?x=%&u=%2540alice"],
      ["DBL valid then `%ZZ`",                    "?u=%2540alice&y=%ZZ"],
      ["DBL valid then truncated UTF-8 `%E2%82`", "?u=%2540alice&z=%E2%82"],
      ["interleaved DBL valid + lone `%`",        "?a=%2540&b=%&c=%2541"],
      ["mid-string `%` after DBL valid",          "?a=%2540alice%xy"],
    ];

    it.each(matrix)(
      "path=LIT + hash=LIT + query has %s → canonical match, NOT malformed (query stripped before decode)",
      (_label, query) => {
        const target = `${CANONICAL_PATH}${query}#anchor:1`;
        const issues = checkRedirect("/old", target, SITEMAP);
        expect(issues).not.toContain("malformed-percent-encoding");
        expect(issues).not.toContain("target-missing-from-sitemap");
      },
    );

    it.each(matrix)(
      "path=ENC + hash=DBL + query has %s → canonical match, NOT malformed",
      (_label, query) => {
        const target = `${ENCODED_PATH}${query}#anchor%253A1`;
        expect(checkRedirect("/old", target, SITEMAP)).toEqual([]);
      },
    );
  });

  describe("fragment has DBL valid + malformed `%`; query is benign or absent", () => {
    const matrix: Array<[string, string]> = [
      ["DBL valid then lone `%`",                 "#sec%253A1-then-%"],
      ["lone `%` then DBL valid",                 "#%-then-sec%253A1"],
      ["DBL valid then `%ZZ`",                    "#sec%253A1-then-%ZZ"],
      ["DBL valid then truncated UTF-8 `%E2%82`", "#sec%253A1-then-%E2%82"],
      ["fragment with internal `?` AND bad `%`",  "#a?b=1&c=%"],
      ["fragment with `#`-after-`#` AND bad `%`", "#first-then-#%-trailing"],
    ];

    it.each(matrix)(
      "path=LIT + no query + fragment has %s → canonical match (fragment dropped first)",
      (_label, hash) => {
        expect(
          checkRedirect("/old", `${CANONICAL_PATH}${hash}`, SITEMAP),
        ).toEqual([]);
      },
    );

    it.each(matrix)(
      "path=ENC + query=DBL + fragment has %s → canonical match",
      (_label, hash) => {
        expect(
          checkRedirect("/old", `${ENCODED_PATH}?u=%2540alice${hash}`, SITEMAP),
        ).toEqual([]);
      },
    );
  });

  it("malformed `%` in fragment + `%3F`-in-query VALUE — neither perturbs path canonical", () => {
    // `?q=foo%3Fbar` keeps `%3F` opaque inside query; `#bad-%` is dropped first.
    expect(
      checkRedirect("/old", `${CANONICAL_PATH}?q=foo%3Fbar#bad-%`, SITEMAP),
    ).toEqual([]);
  });

  it("malformed `%` in query + `%23`-in-fragment VALUE — fragment dropped first, then bad query stripped", () => {
    expect(
      checkRedirect("/old", `${CANONICAL_PATH}?u=%#anchor-%23topic`, SITEMAP),
    ).toEqual([]);
  });
});

// ─── Trailing slash invariants across the stage-ordered pipeline ─────────────
describe("decoding order — trailing-slash detection runs AFTER strip+decode", () => {
  it("trailing `/` BEFORE `?` flags trailing-variant; bad query/hash irrelevant", () => {
    const sitemap = new Set([...SITEMAP, `${CANONICAL_PATH}/`]);
    expect(
      checkRedirect(
        "/old",
        `${CANONICAL_PATH}/?u=%2540alice&x=%#anchor%253A1#bad-%`,
        sitemap,
      ),
    ).toContain("target-trailing-duplicate-in-sitemap");
  });

  it("trailing `/` only inside fragment (`#path/`) does NOT count as a path trailing slash", () => {
    // `/projects#deep/`: after #-split, path = `/projects` (no trailing slash).
    expect(canonicalPath("/projects#deep/")).toBe("/projects");
    expect(checkRedirect("/old", "/projects#deep/", SITEMAP)).toEqual([]);
  });

  it("trailing `/` only inside query value does NOT count as a path trailing slash", () => {
    expect(canonicalPath("/projects?path=/deep/")).toBe("/projects");
    expect(checkRedirect("/old", "/projects?path=/deep/", SITEMAP)).toEqual([]);
  });

  it("`%2F` (encoded `/`) at end of path DOES decode to trailing `/` and gets flagged", () => {
    // `/projects%2F` decodes once → `/projects/`. If sitemap has BOTH, trailing-dup.
    const sitemap = new Set([...SITEMAP, "/projects/"]);
    expect(canonicalPath("/projects%2F")).toBe("/projects/");
    expect(
      checkRedirect("/old", "/projects%2F?u=%&junk=%E2%82#bad-%", sitemap),
    ).toContain("target-trailing-duplicate-in-sitemap");
  });

  it("`%252F` (double-encoded `/`) at end of path stays literal `%2F` — NOT trailing slash", () => {
    // `/projects%252F` → `/projects%2F` (literal). Not in sitemap → missing,
    // but NOT flagged as trailing-variant since it never decodes to `/`.
    const issues = checkRedirect(
      "/old",
      "/projects%252F?u=%2540alice#%ZZ",
      SITEMAP,
    );
    expect(issues).toContain("target-missing-from-sitemap");
    expect(issues).not.toContain("target-trailing-duplicate-in-sitemap");
  });
});

// ─── Determinism: same raw input → same issue set regardless of call order ──
describe("decoding order — determinism / idempotency", () => {
  const fixtures = [
    `${CANONICAL_PATH}?u=%2540alice&x=%#anchor%253A1`,
    `${CANONICAL_PATH}/?q=where%3Foperator=eq#deep/`,
    `${ENCODED_PATH}?a=%&b=%E2%82#%ZZ`,
    `/projects%252F?u=%&junk=%E2%82#bad-%`,
    `/projects#with?qmark&q=2`,
    "/literal%2523-in-path?u=%#%23topic",
  ];

  it.each(fixtures)("canonicalPath() is pure for input %#: same string in → same string out", (raw) => {
    const a = canonicalPath(raw);
    const b = canonicalPath(raw);
    expect(a).toBe(b);
  });

  it.each(fixtures)("checkRedirect() is pure for input %#: same issue set across repeated calls", (raw) => {
    const a = checkRedirect("/old", raw, SITEMAP);
    const b = checkRedirect("/old", raw, SITEMAP);
    expect(a).toEqual(b);
  });

  it("decoding more than once would CHANGE results — pin to exactly-once", () => {
    // `/projects%252F` decoded ONCE = `/projects%2F` (literal); TWICE = `/projects/`.
    // The single-decode contract must yield the literal form. We assert by
    // reproducing both decodes and confirming they differ — and that the
    // validator picks the single-decode (literal) outcome.
    const once = safeDecode("/projects%252F");
    const twice = safeDecode(once);
    expect(once).toBe("/projects%2F");
    expect(twice).toBe("/projects/");
    expect(canonicalPath("/projects%252F")).toBe(once);
    expect(canonicalPath("/projects%252F")).not.toBe(twice);
  });
});
