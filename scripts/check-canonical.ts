/**
 * Canonical check.
 *
 * Fetches the sitemap, then for every <loc> validates that the HTML exposes a
 * matching `<link rel="canonical">` and `<meta property="og:url">`. Exits with
 * code 1 if any mismatch is found.
 *
 * Usage:
 *   bunx tsx scripts/check-canonical.ts [sitemapUrl]
 *   bunx tsx scripts/check-canonical.ts --origin http://127.0.0.1:4319
 *
 * --origin <url>   Rewrite each sitemap <loc> host to this origin before
 *                  fetching. Use to verify prerendered output against a local
 *                  `vite preview` instance.
 */

const args = process.argv.slice(2);
const originIdx = args.indexOf("--origin");
const ORIGIN_OVERRIDE = originIdx >= 0 ? args[originIdx + 1] : null;
const positional = args.filter((_, i) => i !== originIdx && i !== originIdx + 1);
const SITEMAP_URL = positional[0]
  ?? (ORIGIN_OVERRIDE ? `${ORIGIN_OVERRIDE}/sitemap.xml` : "https://sade-il.com/sitemap.xml");

const applyOrigin = (loc: string) => {
  if (!ORIGIN_OVERRIDE) return loc;
  try {
    const u = new URL(loc);
    const o = new URL(ORIGIN_OVERRIDE);
    u.protocol = o.protocol;
    u.host = o.host;
    return u.toString();
  } catch {
    return loc;
  }
};

type Row = {
  url: string;
  canonical: string | null;
  ogUrl: string | null;
  status: number;
  ok: boolean;
  issues: string[];
};

const stripHash = (u: string) => u.split("#")[0];
const normalize = (u: string) => {
  try {
    const x = new URL(stripHash(u));
    // ignore trailing slash differences on the path
    const path = x.pathname.replace(/\/+$/, "") || "/";
    return `${x.protocol}//${x.host}${path}${x.search}`;
  } catch {
    return u;
  }
};

const match = (tag: RegExp, html: string) => {
  const m = html.match(tag);
  return m ? m[1] : null;
};

const countMatches = (tag: RegExp, html: string) => {
  return [...html.matchAll(tag)].length;
};

const CANONICAL_RE = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/gi;
const OG_URL_RE = /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/gi;

async function fetchSitemapLocs(url: string): Promise<string[]> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function checkUrl(expectedUrl: string): Promise<Row> {
  const issues: string[] = [];
  const fetchUrl = applyOrigin(expectedUrl);
  const res = await fetch(fetchUrl, { redirect: "follow" });
  const html = await res.text();

  const canonical = match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    html,
  );
  const ogUrl = match(
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    html,
  );

  const canonicalCount = countMatches(CANONICAL_RE, html);
  const ogUrlCount = countMatches(OG_URL_RE, html);

  if (!res.ok) issues.push(`HTTP ${res.status}`);
  if (!canonical) issues.push("missing <link rel=canonical>");
  if (!ogUrl) issues.push("missing og:url");
  if (canonicalCount > 1) issues.push(`duplicate <link rel=canonical> (${canonicalCount} found)`);
  if (ogUrlCount > 1) issues.push(`duplicate og:url (${ogUrlCount} found)`);

  // Canonical must always point at the production URL from the sitemap, even
  // when fetched from a localhost preview.
  if (canonical && normalize(canonical) !== normalize(expectedUrl)) {
    issues.push(`canonical ≠ sitemap loc (${canonical})`);
  }
  if (ogUrl && canonical && normalize(ogUrl) !== normalize(canonical)) {
    issues.push(`og:url ≠ canonical (${ogUrl})`);
  }

  return {
    url: expectedUrl,
    canonical,
    ogUrl,
    status: res.status,
    ok: issues.length === 0,
    issues,
  };
}

(async () => {
  console.log(`→ sitemap: ${SITEMAP_URL}`);
  const locs = await fetchSitemapLocs(SITEMAP_URL);
  console.log(`→ ${locs.length} URLs to check\n`);

  const rows = await Promise.all(locs.map(checkUrl));
  let failed = 0;
  for (const r of rows) {
    const tag = r.ok ? "✅" : "❌";
    console.log(`${tag} ${r.url}  [${r.status}]`);
    console.log(`    canonical: ${r.canonical ?? "—"}`);
    console.log(`    og:url:    ${r.ogUrl ?? "—"}`);
    if (!r.ok) {
      failed++;
      for (const i of r.issues) console.log(`    ⚠ ${i}`);
    }
    console.log();
  }

  console.log(`Summary: ${rows.length - failed}/${rows.length} passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
