/**
 * Fast standalone sitemap structure check — runs in ~1 sec, no build needed.
 *
 * Validates public/sitemap.xml without touching dist/:
 *   1. XML parses and has at least one <url> entry.
 *   2. Every <loc> is an absolute URL on the production host (BASE_URL).
 *   3. Every <loc> has a valid <lastmod> in YYYY-MM-DD format.
 *   4. The set of <loc> paths matches the ROUTES array in
 *      scripts/generate-sitemap.ts exactly (no drift between generator
 *      and committed file).
 *   5. No duplicate <loc> entries.
 *
 * Use in CI as a fast PR gate. The deeper validator
 * (scripts/validate-sitemap.ts) still runs after `vite build && prerender`
 * to verify the actual HTML <head> on disk.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const BASE_URL = "https://sade-il.com";
const SITEMAP = resolve("public/sitemap.xml");
const GENERATOR = resolve("scripts/generate-sitemap.ts");
const PRERENDER = resolve("scripts/prerender.ts");
const APP_ROUTER = resolve("src/App.tsx");

const issues: string[] = [];
const fail = (msg: string) => issues.push(msg);

const encodePath = (p: string) =>
  p.split("/").map((seg) => encodeURIComponent(seg)).join("/");

async function main() {
  const xml = await readFile(SITEMAP, "utf8");
  const gen = await readFile(GENERATOR, "utf8");
  const pre = await readFile(PRERENDER, "utf8");
  const app = await readFile(APP_ROUTER, "utf8");


  // 1. Parse <loc> + <lastmod>
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
    const block = m[1];
    return {
      loc: block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim() ?? null,
      lastmod: block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? null,
    };
  });

  if (urls.length === 0) fail("sitemap has no <url> entries");

  // 2 + 3. host + lastmod
  for (const { loc, lastmod } of urls) {
    if (!loc) {
      fail("found <url> with no <loc>");
      continue;
    }
    try {
      const u = new URL(loc);
      if (u.protocol !== "https:") {
        fail(`loc must use https (got "${u.protocol}"): ${loc}`);
      }
      if (`${u.protocol}//${u.host}` !== BASE_URL) {
        fail(`loc host ≠ ${BASE_URL}: ${loc}`);
      }
      // Trailing-slash policy: root is "/" (bare domain), every other
      // path MUST NOT end with "/". Mixing creates duplicate URLs.
      if (u.pathname !== "/" && u.pathname.endsWith("/")) {
        fail(`loc has trailing slash (policy: only root "/" may end with "/"): ${loc}`);
      }
    } catch {
      fail(`invalid URL: ${loc}`);
    }
    if (!lastmod || !/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
      fail(`missing or malformed <lastmod> (expected YYYY-MM-DD) on ${loc}`);
    }
  }

  // 4. routes drift — extract ROUTES paths from generate-sitemap.ts and compare
  const routeMatches = [...gen.matchAll(/path:\s*["']([^"']+)["']/g)].map((m) => m[1]);
  if (routeMatches.length === 0) {
    fail("could not find any ROUTES path entries in scripts/generate-sitemap.ts");
  }
  // Area detail pages are generated dynamically (`AREA_SLUGS.map()` → backtick
  // template-literal paths), which the quoted-string regex above cannot see.
  // Expand them from the AREA_SLUGS list so the drift check reflects reality.
  const areaSlugs = (() => {
    const block = gen.match(/AREA_SLUGS\s*=\s*\[([\s\S]*?)\]/);
    return block ? [...block[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]) : [];
  })();
  for (const slug of areaSlugs) routeMatches.push(`/areas/${slug}`);
  const expected = new Set(routeMatches.map((p) => `${BASE_URL}${encodePath(p)}`));
  const actual = new Set(urls.map((u) => u.loc).filter(Boolean) as string[]);

  for (const e of expected) {
    if (!actual.has(e)) fail(`route in generate-sitemap.ts missing from sitemap.xml: ${e}`);
  }
  for (const a of actual) {
    if (!expected.has(a)) fail(`sitemap.xml contains URL not in generate-sitemap.ts ROUTES: ${a}`);
  }

  // 5. duplicates
  const seen = new Set<string>();
  for (const u of urls) {
    if (!u.loc) continue;
    if (seen.has(u.loc)) fail(`duplicate <loc>: ${u.loc}`);
    seen.add(u.loc);
  }

  // 6. canonical agreement with scripts/prerender.ts — every sitemap loc must
  // map to exactly one ROUTES entry in prerender.ts whose `canonical` equals
  // the loc verbatim. This is what the prerender will stamp into <head>, so
  // verifying it here catches drift on PR without needing a full build.
  const blocks = [...pre.matchAll(/\{\s*path:\s*["']([^"']+)["'][\s\S]*?canonical:\s*(`[^`]+`|["'][^"']+["'])/g)];
  if (blocks.length === 0) {
    fail("could not parse ROUTES entries from scripts/prerender.ts");
  }
  const resolveCanonical = (raw: string): string => {
    // Strip quote/backtick wrappers and substitute the literal ${SITE} placeholder.
    const inner = raw.slice(1, -1);
    return inner.replace(/\$\{SITE\}/g, BASE_URL);
  };
  const canonByPath = new Map<string, string[]>();
  for (const [, p, raw] of blocks) {
    const arr = canonByPath.get(p) ?? [];
    const resolved = resolveCanonical(raw);
    // Enforce absolute canonical URLs (protocol + host) — relative paths
    // are ambiguous to crawlers and break cross-domain canonicalization.
    try {
      const u = new URL(resolved);
      if (u.protocol !== "https:") {
        fail(`prerender canonical for path="${p}" must use https (got "${u.protocol}"): ${resolved}`);
      } else if (`${u.protocol}//${u.host}` !== BASE_URL) {
        fail(`prerender canonical for path="${p}" is on wrong host (expected ${BASE_URL}): ${resolved}`);
      }
      if (u.pathname !== "/" && u.pathname.endsWith("/")) {
        fail(`prerender canonical for path="${p}" has trailing slash (policy: only root "/" may end with "/"): ${resolved}`);
      }
    } catch {
      fail(`prerender canonical for path="${p}" is not an absolute URL: ${resolved}`);
    }
    arr.push(resolved);
    canonByPath.set(p, arr);
  }

  // prerender builds the same area detail canonicals dynamically (backtick
  // template in a `.map()` over tuples) — invisible to the block regex above.
  // Expand them from the shared AREA_SLUGS list parsed from generate-sitemap.ts.
  for (const slug of areaSlugs) {
    const p = `/areas/${slug}`;
    canonByPath.set(p, [...(canonByPath.get(p) ?? []), `${BASE_URL}/areas/${slug}`]);
  }

  for (const { loc } of urls) {
    if (!loc) continue;
    // Find prerender entry whose canonical equals loc exactly.
    let matches = 0;
    let foundPath: string | null = null;
    for (const [p, canons] of canonByPath) {
      for (const c of canons) {
        if (c === loc) {
          matches++;
          foundPath = p;
        }
      }
    }
    if (matches === 0) {
      fail(`no canonical in scripts/prerender.ts matches sitemap loc: ${loc}`);
    } else if (matches > 1) {
      fail(`canonical "${loc}" is defined ${matches}× in scripts/prerender.ts (must be unique)`);
    } else if (foundPath) {
      // Also confirm the path side matches generate-sitemap encoding.
      const expectedLoc = `${BASE_URL}${encodePath(foundPath)}`;
      if (expectedLoc !== loc) {
        fail(`prerender path "${foundPath}" would encode to ${expectedLoc} but sitemap loc is ${loc}`);
      }
    }
  }
  // Reverse direction: every prerender ROUTE must appear in sitemap.
  for (const [p, canons] of canonByPath) {
    for (const c of canons) {
      if (!urls.some((u) => u.loc === c)) {
        fail(`prerender ROUTE path="${p}" canonical=${c} is not in sitemap.xml`);
      }
    }
  }

  // 7. Redirect hygiene — Lovable hosting has no server-side redirect config,
  // so the only redirects in this project are React Router `<Navigate to=...>`
  // rules in src/App.tsx. For each one we enforce:
  //   a. The source path is NOT itself a sitemap loc (would create a
  //      duplicate URL pointing at the same page).
  //   b. The target path resolves to exactly one sitemap loc (canonical
  //      destination is defined and indexable).
  //   c. The source has no trailing-slash variant in the sitemap either —
  //      i.e. we never list both `/foo` and `/foo/`.
  const redirectMatches = [
    ...app.matchAll(
      /<Route\s+path=["']([^"']+)["']\s+element=\{\s*<Navigate\s+to=["']([^"']+)["']/g,
    ),
  ];
  const sitemapPaths = new Set(
    urls
      .map((u) => {
        try { return decodeURIComponent(new URL(u.loc!).pathname); } catch { return null; }
      })
      .filter(Boolean) as string[],
  );
  for (const [, from, to] of redirectMatches) {
    if (sitemapPaths.has(from)) {
      fail(`redirect source "${from}" is also a sitemap loc — duplicate of canonical "${to}"`);
    }
    const fromTrail = from !== "/" && from.endsWith("/") ? from.slice(0, -1) : `${from}/`;
    if (sitemapPaths.has(fromTrail)) {
      fail(`redirect source "${from}" has trailing-slash variant "${fromTrail}" present in sitemap — duplicate`);
    }
    // Hash/query-only targets are out of scope; only check path targets.
    const toPath = to.split("#")[0].split("?")[0];
    if (toPath && !sitemapPaths.has(toPath)) {
      fail(`redirect "${from}" → "${to}" target path "${toPath}" is not a sitemap loc (canonical not defined)`);
    }
    const toTrailVariant =
      toPath !== "/" && toPath.endsWith("/") ? toPath.slice(0, -1) : `${toPath}/`;
    if (toPath !== "/" && sitemapPaths.has(toTrailVariant) && sitemapPaths.has(toPath)) {
      fail(`redirect target "${to}" — both "${toPath}" and "${toTrailVariant}" appear in sitemap (trailing-slash duplicate)`);
    }
  }

  if (issues.length) {

    console.error("✗ sitemap structure check failed:\n");
    for (const i of issues) console.error(`    ⚠ ${i}`);
    console.error(`\n${issues.length} issue(s) — fix scripts/generate-sitemap.ts and re-run.`);
    process.exit(1);
  }

  console.log(`✓ sitemap structure OK (${urls.length} URLs, host=${BASE_URL})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
