/**
 * Pure helpers for redirect-vs-sitemap canonical-collision detection.
 *
 * Used by:
 *   - scripts/validate-sitemap-structure.ts (parity should be kept manually
 *     since that script runs without bundling and inlines the same logic)
 *   - src/test/redirect-decoding-order-collision.test.ts (coverage-gated)
 *   - src/test/redirect-malformed-query-hash-collision.test.ts (coverage-gated)
 *
 * Decoding-order contract (see redirect-decoding-order-collision.test.ts):
 *   1. Split on the FIRST `#`         (fragment dropped)
 *   2. Split left side on the FIRST `?` (query dropped)
 *   3. decodeURIComponent EXACTLY ONCE
 *
 * Reserved chars in path matter; in query/hash they don't. Trailing slash
 * policy: root `/` keeps `/`; every other path must not end with `/`.
 */

export type RedirectIssue =
  | "source-in-sitemap"
  | "source-trailing-variant-in-sitemap"
  | "target-missing-from-sitemap"
  | "target-trailing-duplicate-in-sitemap"
  | "source-has-query-or-hash"
  | "malformed-percent-encoding";

export const trailingVariant = (p: string): string =>
  p === "/" ? "/" : p.endsWith("/") ? p.slice(0, -1) : `${p}/`;

/** RFC 3986 §3.5: fragment may contain `?`, so split on `#` FIRST. */
export const stripQueryHash = (p: string): string =>
  p.split("#")[0].split("?")[0];

export const safeDecode = (p: string): string => {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
};

/** Strip query+fragment, then decode exactly once. */
export const canonicalPath = (p: string): string =>
  safeDecode(stripQueryHash(p));

/** Alias for callers that prefer the historical `normalize()` name. */
export const normalize = canonicalPath;

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
    try {
      decodeURIComponent(stripQueryHash(raw));
    } catch {
      issues.push("malformed-percent-encoding");
    }
  }

  const fromPath = canonicalPath(from);
  if (sitemapPaths.has(fromPath)) issues.push("source-in-sitemap");
  if (sitemapPaths.has(trailingVariant(fromPath))) {
    issues.push("source-trailing-variant-in-sitemap");
  }

  const toPath = canonicalPath(to);
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
