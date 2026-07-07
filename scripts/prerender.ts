/**
 * Post-build prerender — no browser required.
 *
 * Takes `dist/index.html` (the Vite SPA shell) and stamps out a per-route
 * `dist/<route>/index.html` for each public route, rewriting <title>,
 * <meta name=description>, <link rel=canonical>, <meta property=og:url>,
 * <meta property=og:title>, <meta property=og:description>, twitter:title,
 * twitter:description, and og:type.
 *
 * Why not Playwright? The earlier browser-based version required Chromium +
 * system deps which aren't always available in the build environment
 * (Lovable hosting, minimal CI images). String substitution on the built
 * index.html has zero runtime deps and works everywhere — and crawlers
 * (LinkedIn, Slack, Facebook, Bing, plain Google) only read the static head,
 * so this delivers identical SEO output.
 *
 * Source of truth: the ROUTES array below. Helmet (in <Seo>) still owns the
 * runtime <head> for users with JS, so SPA navigation keeps working.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
// Pure, React-free schema objects shared with src/components/site/Seo.tsx.
// RELATIVE import on purpose — tsx does not resolve the "@/" alias.
import { businessSchema, breadcrumbSchema } from "../src/lib/schema";
import { AREAS } from "../src/data/areas";

const SITE = "https://sade-il.com";

/** All served cities, single-sourced from AREAS (keeps /areas copy in sync with routes). */
const AREA_CITIES = AREAS.map((a) => a.city).join(", ");

type RouteMeta = {
  /** Path beginning with "/". Used for output file location. */
  path: string;
  /** Canonical URL written verbatim into <link rel=canonical> + og:url. */
  canonical: string;
  title: string;
  description: string;
  ogType?: "website" | "article";
  /** Short breadcrumb label (the last crumb after "בית"). Omit for home. */
  crumb?: string;
  /** Extra per-route JSON-LD nodes stamped into the static head. */
  jsonLd?: Record<string, unknown>[];
};

const ROUTES: RouteMeta[] = [
  {
    path: "/",
    canonical: `${SITE}/`,
    title: "קונסטרוקטור ומהנדס מבנים במרכז | א. סדצקי הנדסה וייעוץ",
    description:
      "אישורי קונסטרוקטור, חוות דעת הנדסיות ותכנון שלד במרכז הארץ — מהיר, חתום ואחראי. ראשון לציון, תל אביב והסביבה.",
  },
  {
    path: "/projects",
    canonical: `${SITE}/projects`,
    title: "פרויקטים נבחרים — קונסטרוקטור ותכנון שלד | א. סדצקי",
    description:
      "גלריית פרויקטים אמיתיים: תכנון קונסטרוקציה, פרגולות, מבנים מסוכנים, חיזוקים, בריכות וחוות דעת — דוגמאות ליווי הנדסי מקצה לקצה.",
    crumb: "פרויקטים",
  },
  {
    path: "/services/pergola-approval",
    canonical: `${SITE}/services/pergola-approval`,
    title: "אישור קונסטרוקטור לפרגולה — יציבות, עיגון ודיווח לרשות",
    description:
      "פרגולה עד 50 מ״ר פטורה מהיתר — אך מחייבת דיווח לרשות תוך 45 יום ואישור מהנדס על עיגון ויציבות לפי ת״י 414. אישור חתום, ראשל״צ והמרכז.",
    ogType: "article",
    crumb: "אישור פרגולה",
  },
  {
    path: "/services/interior-changes",
    canonical: `${SITE}/services/interior-changes`,
    title: "אישור מהנדס לפתיחת פתח והסרת קיר נושא | א. סדצקי",
    description:
      "שוקלים לפתוח פתח או להסיר קיר נושא? קונסטרוקטור בודק, מחשב חיזוקים וחותם. אל תבצעו ללא אישור — דברו איתנו.",
    crumb: "פתיחת פתח והסרת קיר",
  },
  {
    path: "/services/building-reinforcement",
    canonical: `${SITE}/services/building-reinforcement`,
    title: "חיזוק מבנים — תמ״א 38 ותוספות | א. סדצקי",
    description:
      "תכנון חיזוקים למבנים קיימים: יסודות, עמודים וקירות נושאים, חיזוק לרעידות אדמה (תמ״א 38), תוספות קומות ושיפוץ מבנים מסוכנים. ראשל״צ והמרכז.",
    ogType: "article",
    crumb: "חיזוק מבנים",
  },
  {
    path: "/services/mamad",
    canonical: `${SITE}/services/mamad`,
    title: "תכנון ממ״ד — חישוב סטטי ואישור פיקוד העורף | א. סדצקי",
    description:
      "תכנון ממ״ד דירתי וקומתי: בדיקת היתכנות, חישוב קונסטרוקטיבי לפי תקנות הג״א, תכניות חתומות והגשה לפיקוד העורף ולוועדה המקומית. ראשון לציון והמרכז.",
    ogType: "article",
    crumb: "תכנון ממ״ד",
  },

  // /אישור-פרגולה consolidated into /services/pergola-approval (above).


  {
    path: "/articles/what-is-konstruktor",
    canonical: `${SITE}/articles/what-is-konstruktor`,
    title: "מה זה קונסטרוקטור ומתי נדרש אישור מהנדס מבנים? | א. סדצקי",
    description:
      "מדריך קצר: מה תפקיד הקונסטרוקטור, מתי החוק מחייב אישור מהנדס מבנים, באיזה שלב פונים אליו וכמה זה עולה. כתוב על ידי מהנדס פעיל במרכז הארץ.",
    ogType: "article",
    crumb: "מה זה קונסטרוקטור",
  },

  {
    path: "/areas",
    canonical: `${SITE}/areas`,
    title: "אזורי שירות — קונסטרוקטור במרכז הארץ | א. סדצקי הנדסה",
    description: `קונסטרוקטור ומהנדס מבנים במרכז הארץ: ${AREA_CITIES}. ליווי מול הוועדה המקומית.`,
    crumb: "אזורי שירות",
  },

  ...(
    [
      ["rishon-lezion", "ראשון לציון", "בראשון לציון", "הוועדה המקומית ראשון לציון"],
      ["tel-aviv", "תל אביב", "בתל אביב", "הוועדה המקומית תל אביב-יפו"],
      ["holon", "חולון", "בחולון", "הוועדה המקומית חולון"],
      ["bat-yam", "בת ים", "בבת ים", "הוועדה המקומית בת ים"],
      ["rehovot", "רחובות", "ברחובות", "הוועדה המקומית רחובות"],
      ["nes-ziona", "נס ציונה", "בנס ציונה", "הוועדה המקומית נס ציונה"],
      ["beer-yaakov", "באר יעקב", "בבאר יעקב", "הוועדה המקומית באר יעקב"],
      ["ramla", "רמלה", "ברמלה", "הוועדה המקומית רמלה"],
      ["petah-tikva", "פתח תקווה", "בפתח תקווה", "הוועדה המקומית פתח תקווה"],
      ["herzliya", "הרצליה", "בהרצליה", "הוועדה המקומית הרצליה"],
      ["ramat-gan", "רמת גן", "ברמת גן", "הוועדה המקומית רמת גן"],
      ["givatayim", "גבעתיים", "בגבעתיים", "הוועדה המקומית גבעתיים"],
    ] as const
  ).map(([slug, city, cityInTitle, committee]): RouteMeta => ({
    path: `/areas/${slug}`,
    canonical: `${SITE}/areas/${slug}`,
    title: `קונסטרוקטור ${cityInTitle} — אישורי מהנדס ותכנון שלד | א. סדצקי`,
    description: `קונסטרוקטור ${cityInTitle}: אישורי מהנדס, חוות דעת, חיזוק מבנים, תכנון ממ״ד ופרגולות. ליווי מול ${committee}. מענה תוך 24 שעות.`,
    ogType: "article",
    crumb: `קונסטרוקטור ${city}`,
  })),
];

const DIST = resolve("dist");

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Replace or insert a tag whose opening matches `matcher`. */
function upsert(html: string, matcher: RegExp, replacement: string): string {
  if (matcher.test(html)) return html.replace(matcher, replacement);
  // Insert before </head>
  return html.replace(/<\/head>/i, `    ${replacement}\n  </head>`);
}

function stampHead(shell: string, meta: RouteMeta): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const u = meta.canonical;
  const ogType = meta.ogType ?? "website";

  let html = shell;

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`);

  // description
  html = upsert(
    html,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${d}" />`,
  );

  // canonical
  html = upsert(
    html,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${u}" />`,
  );

  // og:url
  html = upsert(
    html,
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${u}" />`,
  );

  // og:type
  html = upsert(
    html,
    /<meta\s+property=["']og:type["'][^>]*>/i,
    `<meta property="og:type" content="${ogType}" />`,
  );

  // og:title / twitter:title
  html = upsert(
    html,
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${t}" />`,
  );
  html = upsert(
    html,
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${t}" />`,
  );

  // og:description / twitter:description
  html = upsert(
    html,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${d}" />`,
  );
  html = upsert(
    html,
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${d}" />`,
  );

  // JSON-LD — stamp the sitewide business node on every route so crawlers that
  // read only the static head (LinkedIn/Slack/Facebook/Bing/plain Google) get
  // structured data. The runtime Helmet copy in <Seo> shares the same @id, so
  // the two coalesce into one node. A BreadcrumbList is added for non-home
  // routes, plus any route-specific nodes from meta.jsonLd.
  const nodes: Record<string, unknown>[] = [businessSchema];
  if (meta.crumb) {
    nodes.push(
      breadcrumbSchema([
        { name: "בית", url: `${SITE}/` },
        { name: meta.crumb, url: meta.canonical },
      ]),
    );
  }
  if (meta.jsonLd?.length) nodes.push(...meta.jsonLd);

  const ldTags = nodes
    .map((n) => `<script type="application/ld+json">${JSON.stringify(n)}</script>`)
    .join("\n    ");
  html = html.replace(/<\/head>/i, `    ${ldTags}\n  </head>`);

  return html;
}

async function main() {
  const shellPath = resolve(DIST, "index.html");
  let shell: string;
  try {
    shell = await readFile(shellPath, "utf8");
  } catch {
    console.error(`✗ ${shellPath} not found — run \`vite build\` first.`);
    process.exit(1);
  }

  // Sanity: vite-built shell must include the bundled script tag
  if (!/<script[^>]+src=["']\/assets\//.test(shell)) {
    console.warn("⚠ dist/index.html doesn't look like a Vite build (no /assets/ script). Continuing anyway.");
  }

  // The hero image is the mobile LCP element on the home page. Its Vite hash
  // changes every build, so resolve the emitted filename here and preload it
  // in the static head — the browser then fetches it in parallel with the JS
  // bundle instead of discovering it only after React mounts.
  let heroPreloadTag = "";
  try {
    const assets = await readdir(resolve(DIST, "assets"));
    const hero = assets.find((f) => /^hero-structural-bw-.*\.webp$/.test(f));
    if (hero) {
      heroPreloadTag = `<link rel="preload" as="image" href="/assets/${hero}" fetchpriority="high" />`;
    }
  } catch {
    /* assets dir missing — skip preload */
  }

  for (const route of ROUTES) {
    let stamped = stampHead(shell, route);
    if (route.path === "/" && heroPreloadTag) {
      stamped = stamped.replace(/<\/head>/i, `    ${heroPreloadTag}\n  </head>`);
    }
    const out =
      route.path === "/"
        ? resolve(DIST, "index.html")
        : resolve(DIST, `.${route.path}`, "index.html");
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, stamped, "utf8");
    console.log(`✓ ${route.path}  →  ${out.replace(DIST, "dist")}`);
  }

  console.log(`\nPrerendered ${ROUTES.length} route(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
