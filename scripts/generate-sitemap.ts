/**
 * Generate public/sitemap.xml with today's date as <lastmod> for every route.
 * Runs as `predev` and `prebuild` so the file is always fresh.
 *
 * Source of truth = ROUTES below. Keep in sync with src/App.tsx public routes.
 * Excluded by design: /auth, /admin/*, /ru /en /fr (coming-soon), /index redirect, * catch-all.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://sade-il.com";

type Entry = {
  /** Path beginning with "/". Hebrew paths are URL-encoded for <loc>. */
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  /** Optional hreflang alternates (only used on "/" today). */
  alternates?: { hreflang: string; href: string }[];
};

const AREA_SLUGS = [
  "rishon-lezion",
  "tel-aviv",
  "holon",
  "bat-yam",
  "rehovot",
  "nes-ziona",
  "beer-yaakov",
  "ramla",
  "petah-tikva",
  "herzliya",
  "ramat-gan",
  "givatayim",
] as const;

const ROUTES: Entry[] = [
  {
    path: "/",
    changefreq: "weekly",
    priority: "1.0",
    alternates: [
      { hreflang: "he", href: `${BASE_URL}/` },
      { hreflang: "x-default", href: `${BASE_URL}/` },
    ],
  },
  { path: "/projects", changefreq: "monthly", priority: "0.9" },
  { path: "/services/pergola-approval", changefreq: "monthly", priority: "0.9" },
  { path: "/services/interior-changes", changefreq: "monthly", priority: "0.9" },
  { path: "/services/building-reinforcement", changefreq: "monthly", priority: "0.9" },
  { path: "/services/mamad", changefreq: "monthly", priority: "0.9" },
  // /אישור-פרגולה consolidated into /services/pergola-approval (301 redirect via SPA Navigate)
  { path: "/articles/what-is-konstruktor", changefreq: "monthly", priority: "0.8" },
  { path: "/areas", changefreq: "monthly", priority: "0.8" },
  ...AREA_SLUGS.map((slug) => ({
    path: `/areas/${slug}`,
    changefreq: "monthly" as const,
    priority: "0.8",
  })),
];

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const encodePath = (p: string) =>
  p
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

const urls = ROUTES.map((e) => {
  const loc = `${BASE_URL}${encodePath(e.path)}`;
  const lines = [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
    e.priority ? `    <priority>${e.priority}</priority>` : null,
    ...(e.alternates ?? []).map(
      (a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`,
    ),
    "  </url>",
  ].filter(Boolean);
  return lines.join("\n");
});

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
  `        xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
  ...urls,
  `</urlset>`,
  ``,
].join("\n");

const out = resolve("public/sitemap.xml");
writeFileSync(out, xml);
console.log(`✓ sitemap.xml written (${ROUTES.length} entries, lastmod=${today})`);
