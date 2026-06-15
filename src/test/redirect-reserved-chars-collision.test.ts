/**
 * Coverage for URL reserved / sub-delim characters in redirect targets:
 *   `:`  `;`  `@`  `!`  `~`  `*`
 *
 * Per RFC 3986 these are valid inside a path segment unencoded (`pchar`
 * includes `sub-delims = !$&'()*+,;=`, plus `:` and `@`; `~` is unreserved).
 * Crawlers therefore treat `/foo:bar` and `/foo%3Abar` as the SAME URL,
 * but only after decoding once. Double-encoding (`%253A`) decodes to the
 * literal string `%3A` — a DIFFERENT URL.
 *
 * Mirrors src/test/redirect-percent-encoding-collision.test.ts. Same
 * issue type and trailing-slash policy.
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
  | "malformed-percent-encoding";

export function checkRedirect(
  from: string,
  to: string,
  sitemapPaths: Set<string>,
): RedirectIssue[] {
  const issues: RedirectIssue[] = [];

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

// Fixture sitemap (DECODED paths). Each entry uses one reserved character
// in its literal form — the canonical that crawlers will index.
const SITEMAP = new Set<string>([
  "/",
  "/users/me:profile",      // colon `:` inside segment
  "/scope;v=2",              // semicolon `;` (RFC 3986 path param separator)
  "/handles/@alice",         // at-sign `@`
  "/wow!bang",               // exclamation `!`
  "/about~tilde",            // tilde `~` (unreserved per RFC)
  "/star*me",                // asterisk `*` (sub-delim)
]);

describe("checkRedirect() — reserved chars (:, ;, @, !, ~, *) × encoding × trailing slash", () => {
  describe("colon `:` / `%3A`", () => {
    it("literal `:` target matches sitemap", () => {
      expect(checkRedirect("/old", "/users/me:profile", SITEMAP)).toEqual([]);
    });
    it("single-encoded `%3A` target decodes to `:` and matches", () => {
      expect(checkRedirect("/old", "/users/me%3Aprofile", SITEMAP)).toEqual([]);
    });
    it("lowercase `%3a` decodes the same", () => {
      expect(checkRedirect("/old", "/users/me%3aprofile", SITEMAP)).toEqual([]);
    });
    it("double-encoded `%253A` does NOT decode to `:` — flagged missing", () => {
      expect(
        checkRedirect("/old", "/users/me%253Aprofile", SITEMAP),
      ).toContain("target-missing-from-sitemap");
    });
    it("literal `:` source matching sitemap is flagged duplicate", () => {
      expect(
        checkRedirect("/users/me:profile", "/", SITEMAP),
      ).toContain("source-in-sitemap");
    });
    it("encoded `:` source + trailing slash is flagged as trailing variant", () => {
      expect(
        checkRedirect("/users/me%3Aprofile/", "/", SITEMAP),
      ).toContain("source-trailing-variant-in-sitemap");
    });
    it("double-encoded `:` source does NOT collide", () => {
      expect(
        checkRedirect("/users/me%253Aprofile", "/", SITEMAP),
      ).not.toContain("source-in-sitemap");
    });
  });

  describe("semicolon `;` / `%3B`", () => {
    it("literal `;` target matches sitemap", () => {
      expect(checkRedirect("/old", "/scope;v=2", SITEMAP)).toEqual([]);
    });
    it("encoded `%3B` target decodes and matches", () => {
      expect(checkRedirect("/old", "/scope%3Bv=2", SITEMAP)).toEqual([]);
    });
    it("double-encoded `%253B` flagged missing", () => {
      expect(
        checkRedirect("/old", "/scope%253Bv=2", SITEMAP),
      ).toContain("target-missing-from-sitemap");
    });
    it("trailing slash on literal `;` target — flagged as trailing dup if both forms in sitemap", () => {
      const withTrail = new Set([...SITEMAP, "/scope;v=2/"]);
      expect(
        checkRedirect("/old", "/scope;v=2/", withTrail),
      ).toContain("target-trailing-duplicate-in-sitemap");
    });
    it("encoded `;` source + trailing slash flagged as trailing-variant dup", () => {
      expect(
        checkRedirect("/scope%3Bv=2/", "/", SITEMAP),
      ).toContain("source-trailing-variant-in-sitemap");
    });
  });

  describe("at-sign `@` / `%40`", () => {
    it("literal `@` target matches sitemap", () => {
      expect(checkRedirect("/old", "/handles/@alice", SITEMAP)).toEqual([]);
    });
    it("encoded `%40` target decodes and matches", () => {
      expect(checkRedirect("/old", "/handles/%40alice", SITEMAP)).toEqual([]);
    });
    it("double-encoded `%2540` flagged missing", () => {
      expect(
        checkRedirect("/old", "/handles/%2540alice", SITEMAP),
      ).toContain("target-missing-from-sitemap");
    });
    it("encoded `@` source matching sitemap is flagged duplicate", () => {
      expect(
        checkRedirect("/handles/%40alice", "/", SITEMAP),
      ).toContain("source-in-sitemap");
    });
    it("double-encoded `@` source with trailing slash — neither variant in sitemap", () => {
      const issues = checkRedirect("/handles/%2540alice/", "/", SITEMAP);
      expect(issues).not.toContain("source-in-sitemap");
      expect(issues).not.toContain("source-trailing-variant-in-sitemap");
    });
  });

  describe("exclamation `!` / `%21`", () => {
    it("literal `!` target matches sitemap", () => {
      expect(checkRedirect("/old", "/wow!bang", SITEMAP)).toEqual([]);
    });
    it("encoded `%21` target decodes and matches", () => {
      expect(checkRedirect("/old", "/wow%21bang", SITEMAP)).toEqual([]);
    });
    it("double-encoded `%2521` flagged missing", () => {
      expect(
        checkRedirect("/old", "/wow%2521bang", SITEMAP),
      ).toContain("target-missing-from-sitemap");
    });
    it("trailing slash on encoded `!` source matches as trailing-variant", () => {
      expect(
        checkRedirect("/wow%21bang/", "/", SITEMAP),
      ).toContain("source-trailing-variant-in-sitemap");
    });
  });

  describe("tilde `~` / `%7E`", () => {
    it("literal `~` target matches sitemap", () => {
      expect(checkRedirect("/old", "/about~tilde", SITEMAP)).toEqual([]);
    });
    it("encoded `%7E` decodes to `~` and matches (unreserved — must accept either form)", () => {
      expect(checkRedirect("/old", "/about%7Etilde", SITEMAP)).toEqual([]);
    });
    it("lowercase `%7e` decodes the same", () => {
      expect(checkRedirect("/old", "/about%7etilde", SITEMAP)).toEqual([]);
    });
    it("double-encoded `%257E` flagged missing", () => {
      expect(
        checkRedirect("/old", "/about%257Etilde", SITEMAP),
      ).toContain("target-missing-from-sitemap");
    });
    it("encoded `~` source matching sitemap is flagged duplicate", () => {
      expect(
        checkRedirect("/about%7Etilde", "/", SITEMAP),
      ).toContain("source-in-sitemap");
    });
  });

  describe("asterisk `*` / `%2A`", () => {
    it("literal `*` target matches sitemap", () => {
      expect(checkRedirect("/old", "/star*me", SITEMAP)).toEqual([]);
    });
    it("encoded `%2A` target decodes and matches", () => {
      expect(checkRedirect("/old", "/star%2Ame", SITEMAP)).toEqual([]);
    });
    it("double-encoded `%252A` flagged missing", () => {
      expect(
        checkRedirect("/old", "/star%252Ame", SITEMAP),
      ).toContain("target-missing-from-sitemap");
    });
    it("encoded `*` source + trailing slash flagged as trailing-variant", () => {
      expect(
        checkRedirect("/star%2Ame/", "/", SITEMAP),
      ).toContain("source-trailing-variant-in-sitemap");
    });
  });

  describe("multi-reserved combinations", () => {
    const MULTI = new Set<string>(["/", "/api/v1:auth;mode=2/@me!~*"]);

    it("fully literal target matches", () => {
      expect(
        checkRedirect("/old", "/api/v1:auth;mode=2/@me!~*", MULTI),
      ).toEqual([]);
    });
    it("fully encoded target decodes and matches", () => {
      expect(
        checkRedirect(
          "/old",
          "/api/v1%3Aauth%3Bmode=2/%40me%21%7E%2A",
          MULTI,
        ),
      ).toEqual([]);
    });
    it("fully double-encoded target flagged missing", () => {
      expect(
        checkRedirect(
          "/old",
          "/api/v1%253Aauth%253Bmode=2/%2540me%2521%257E%252A",
          MULTI,
        ),
      ).toContain("target-missing-from-sitemap");
    });
    it("fully encoded source + trailing slash flagged as trailing-variant", () => {
      expect(
        checkRedirect(
          "/api/v1%3Aauth%3Bmode=2/%40me%21%7E%2A/",
          "/",
          MULTI,
        ),
      ).toContain("source-trailing-variant-in-sitemap");
    });
    it("trailing slash + canonical both in sitemap → target-trailing-duplicate-in-sitemap", () => {
      const withTrail = new Set([...MULTI, "/api/v1:auth;mode=2/@me!~*/"]);
      expect(
        checkRedirect(
          "/old",
          "/api/v1%3Aauth%3Bmode=2/%40me%21%7E%2A/",
          withTrail,
        ),
      ).toContain("target-trailing-duplicate-in-sitemap");
    });
  });
});
