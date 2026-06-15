/**
 * Post-build sitemap validator. Runs after prerender as part of `bun run build`.
 *
 * For every <loc> in public/sitemap.xml, verifies the prerendered HTML in dist/:
 *   1. The file exists (route was prerendered).
 *   2. Exactly one <link rel="canonical"> exists and matches the loc.
 *   3. Exactly one <meta property="og:url"> exists and matches the canonical.
 *   4. <title> is present and non-empty.
 *   5. <meta name="description"> is present and non-empty.
 *   6. No <meta name="robots" content="...noindex..."> — sitemap must only
 *      list indexable URLs.
 *
 * No HTTP server or browser required — reads files straight from disk.
 * Exits 1 on any failure so the build fails fast.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const DIST = resolve("dist");
const SITEMAP = resolve("public/sitemap.xml");

const stripHash = (u: string) => u.split("#")[0];
const normalize = (u: string) => {
  try {
    const x = new URL(stripHash(u));
    const path = x.pathname.replace(/\/+$/, "") || "/";
    return `${x.protocol}//${x.host}${path}${x.search}`;
  } catch {
    return u;
  }
};

const ALL_CANONICAL = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/gi;
const ALL_OG_URL = /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/gi;
const ROBOTS = /<meta[^>]+name=["'](?:robots|googlebot|bingbot)["'][^>]+content=["']([^"']+)["']/gi;
const TITLE = /<title>([\s\S]*?)<\/title>/i;
const DESCRIPTION = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i;

const locToFile = (loc: string): string => {
  const u = new URL(loc);
  // decode percent-encoding so "/אישור-פרגולה" maps to its real folder
  const decoded = decodeURIComponent(u.pathname);
  if (decoded === "/" || decoded === "") return resolve(DIST, "index.html");
  return resolve(DIST, `.${decoded.replace(/\/$/, "")}`, "index.html");
};

async function readSitemapLocs(): Promise<string[]> {
  const xml = await readFile(SITEMAP, "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

type Result = { loc: string; ok: boolean; issues: string[] };

async function validate(loc: string): Promise<Result> {
  const issues: string[] = [];
  const file = locToFile(loc);
  let html: string;
  try {
    html = await readFile(file, "utf8");
  } catch {
    return { loc, ok: false, issues: [`prerendered file missing: ${file.replace(DIST, "dist")}`] };
  }

  const canonicals = [...html.matchAll(ALL_CANONICAL)].map((m) => m[1]);
  const ogUrls = [...html.matchAll(ALL_OG_URL)].map((m) => m[1]);
  const robots = [...html.matchAll(ROBOTS)].map((m) => m[1].toLowerCase());
  const titleMatch = html.match(TITLE);
  const descMatch = html.match(DESCRIPTION);

  if (canonicals.length === 0) issues.push("missing <link rel=canonical>");
  if (canonicals.length > 1) issues.push(`duplicate canonicals (${canonicals.length})`);
  if (canonicals[0]) {
    try {
      const cu = new URL(canonicals[0]);
      if (cu.protocol !== "https:") {
        issues.push(`canonical must use https (got "${cu.protocol}"): ${canonicals[0]}`);
      }
      const lu = new URL(loc);
      if (cu.protocol !== lu.protocol) {
        issues.push(`canonical protocol ≠ sitemap loc protocol (${cu.protocol} vs ${lu.protocol})`);
      }
    } catch {
      issues.push(`canonical is not an absolute URL: ${canonicals[0]}`);
    }
    if (normalize(canonicals[0]) !== normalize(loc)) {
      issues.push(`canonical ≠ sitemap loc (${canonicals[0]})`);
    }
    // Trailing-slash parity: catch the case where normalize() hid the diff.
    try {
      const cp = new URL(canonicals[0]).pathname;
      const lp = new URL(loc).pathname;
      const cTrail = cp !== "/" && cp.endsWith("/");
      const lTrail = lp !== "/" && lp.endsWith("/");
      if (cTrail !== lTrail) {
        issues.push(`trailing-slash mismatch between canonical (${cp}) and loc (${lp}) — creates duplicate URLs`);
      }
      if (cTrail) {
        issues.push(`canonical pathname has trailing slash (policy: only root "/" may end with "/"): ${canonicals[0]}`);
      }
    } catch {/* parse errors already reported above */}
  }

  if (ogUrls.length === 0) issues.push("missing og:url");
  if (ogUrls.length > 1) issues.push(`duplicate og:url (${ogUrls.length})`);
  if (ogUrls[0] && canonicals[0] && normalize(ogUrls[0]) !== normalize(canonicals[0])) {
    issues.push(`og:url ≠ canonical (${ogUrls[0]})`);
  }

  if (!titleMatch || !titleMatch[1].trim()) issues.push("missing or empty <title>");
  if (!descMatch || !descMatch[1].trim()) issues.push("missing or empty <meta name=description>");

  for (const r of robots) {
    if (r.includes("noindex")) {
      issues.push(`route is noindex (robots="${r}") — must not be in sitemap`);
      break;
    }
  }

  return { loc, ok: issues.length === 0, issues };
}

(async () => {
  const locs = await readSitemapLocs();
  console.log(`→ validating ${locs.length} sitemap URLs against dist/\n`);

  const results = await Promise.all(locs.map(validate));
  let failed = 0;
  for (const r of results) {
    const tag = r.ok ? "✓" : "✗";
    console.log(`${tag} ${r.loc}`);
    if (!r.ok) {
      failed++;
      for (const i of r.issues) console.log(`    ⚠ ${i}`);
    }
  }

  console.log(`\nSitemap validation: ${results.length - failed}/${results.length} passed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
