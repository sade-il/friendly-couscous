/**
 * Synthetic-input coverage for redirect collision logic, focused on the
 * cases the real App.tsx doesn't exercise today: query strings (`?foo=1`),
 * hash fragments (`#section`), and combinations with trailing slashes.
 *
 * The pure `checkRedirect()` helper here mirrors the rules in
 * scripts/validate-sitemap-structure.ts and src/test/redirect-sitemap-collision.test.ts —
 * if you change those, update here too.
 *
 * Rule: query/hash on a <Navigate to=...> target are user-state, NOT part
 * of canonical identity. We strip them before comparing against sitemap loc
 * (which never contains `?` or `#`).
 */
import { describe, expect, it } from "vitest";

const trailingVariant = (p: string) =>
  p === "/" ? "/" : p.endsWith("/") ? p.slice(0, -1) : `${p}/`;

const stripQueryHash = (p: string) => p.split("#")[0].split("?")[0];

export type RedirectIssue =
  | "source-in-sitemap"
  | "source-trailing-variant-in-sitemap"
  | "target-missing-from-sitemap"
  | "target-trailing-duplicate-in-sitemap"
  | "source-has-query-or-hash";

export function checkRedirect(
  from: string,
  to: string,
  sitemapPaths: Set<string>,
): RedirectIssue[] {
  const issues: RedirectIssue[] = [];

  // Source paths in React Router routes should never carry ?/# — those are
  // matched on pathname only. Flag if someone writes one anyway.
  if (from.includes("?") || from.includes("#")) {
    issues.push("source-has-query-or-hash");
  }

  const fromPath = stripQueryHash(from);
  if (sitemapPaths.has(fromPath)) issues.push("source-in-sitemap");
  if (sitemapPaths.has(trailingVariant(fromPath))) {
    issues.push("source-trailing-variant-in-sitemap");
  }

  const toPath = stripQueryHash(to);
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

// Canonical fixture sitemap: root + two non-root paths, all no-trailing-slash.
const SITEMAP = new Set<string>(["/", "/projects", "/services/pergola-approval"]);

describe("checkRedirect() — query/hash + trailing-slash combinations", () => {
  it("clean redirect to canonical target passes", () => {
    expect(checkRedirect("/index", "/", SITEMAP)).toEqual([]);
    expect(checkRedirect("/old-projects", "/projects", SITEMAP)).toEqual([]);
  });

  describe("query strings on the target", () => {
    it("`?utm_source=...` on target is stripped before sitemap lookup", () => {
      expect(
        checkRedirect("/old", "/projects?utm_source=newsletter", SITEMAP),
      ).toEqual([]);
    });

    it("query on target whose path is NOT in sitemap still fails", () => {
      expect(
        checkRedirect("/old", "/missing?utm_source=x", SITEMAP),
      ).toContain("target-missing-from-sitemap");
    });
  });

  describe("hash fragments on the target", () => {
    it("`#section` on target is stripped before sitemap lookup", () => {
      expect(checkRedirect("/old", "/projects#gallery", SITEMAP)).toEqual([]);
      expect(checkRedirect("/index", "/#top", SITEMAP)).toEqual([]);
    });

    it("hash on target whose path is NOT in sitemap still fails", () => {
      expect(checkRedirect("/old", "/missing#x", SITEMAP)).toContain(
        "target-missing-from-sitemap",
      );
    });
  });

  describe("query + hash combined", () => {
    it("both stripped, canonical path resolves", () => {
      expect(
        checkRedirect("/old", "/projects?utm=fb&ref=ig#hero", SITEMAP),
      ).toEqual([]);
    });
  });

  describe("trailing-slash interactions", () => {
    it("target with trailing slash on non-root path fails (would duplicate canonical)", () => {
      // SITEMAP has only "/projects"; pretend someone tries to canonical "/projects/"
      const withTrail = new Set([...SITEMAP, "/projects/"]);
      expect(checkRedirect("/old", "/projects/", withTrail)).toContain(
        "target-trailing-duplicate-in-sitemap",
      );
    });

    it("target `/projects/?utm=x` strips both — clean lookup of `/projects`", () => {
      expect(
        checkRedirect("/old", "/projects/?utm=x", SITEMAP),
      ).toContain("target-missing-from-sitemap"); // `/projects/` ≠ `/projects` in our fixture
    });

    it("source with trailing slash whose stripped form is in sitemap is flagged", () => {
      expect(checkRedirect("/projects/", "/projects", SITEMAP)).toContain(
        "source-trailing-variant-in-sitemap",
      );
    });

    it("source path identical to a sitemap loc is flagged (duplicate URL)", () => {
      expect(checkRedirect("/projects", "/", SITEMAP)).toContain(
        "source-in-sitemap",
      );
    });
  });

  describe("malformed source", () => {
    it("source with query is flagged — React Router routes are pathname-only", () => {
      expect(checkRedirect("/old?x=1", "/projects", SITEMAP)).toContain(
        "source-has-query-or-hash",
      );
    });

    it("source with hash is flagged", () => {
      expect(checkRedirect("/old#section", "/projects", SITEMAP)).toContain(
        "source-has-query-or-hash",
      );
    });
  });

  describe("root `/` edge case", () => {
    it("root target with hash passes (`/#top` → `/`)", () => {
      expect(checkRedirect("/index", "/#top", SITEMAP)).toEqual([]);
    });

    it("root target with query passes (`/?ref=x` → `/`)", () => {
      expect(checkRedirect("/index", "/?ref=x", SITEMAP)).toEqual([]);
    });
  });
});
