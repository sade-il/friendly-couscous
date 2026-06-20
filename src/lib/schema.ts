/**
 * Single source of truth for JSON-LD structured data.
 *
 * Imported by BOTH:
 *   - src/components/site/Seo.tsx  (runtime <head> via react-helmet-async)
 *   - scripts/prerender.ts         (static <head> stamping, no browser)
 *
 * Keep this file PURE — no React, no Helmet, and only RELATIVE imports — so the
 * prerender script (run via tsx, which does not resolve the "@/" alias) can
 * import it with zero runtime dependencies. The runtime and static copies share
 * the same "@id", so search engines coalesce them into one node.
 */
import { AREAS } from "../data/areas";

const SITE = "https://sade-il.com";

/** Sitewide ProfessionalService / LocalBusiness node. */
export const businessSchema = {
  "@context": "https://schema.org",
  "@type": ["ProfessionalService", "LocalBusiness"],
  "@id": `${SITE}/#business`,
  name: "א. סדצקי הנדסה וייעוץ",
  alternateName: "Sadetsky Structural Engineering",
  description:
    "קונסטרוקטור ומהנדס מבנים — אישורי קונסטרוקטור, חוות דעת הנדסיות, חיזוק מבנים, תכנון ממ״ד, היתר בנייה ותכנון שלד.",
  url: SITE,
  telephone: "+972524209183",
  email: "office@sade-il.com",
  image: `${SITE}/logo.jpg`,
  priceRange: "₪₪",
  currenciesAccepted: "ILS",
  paymentAccepted: "Cash, Credit Card, Bank Transfer",
  address: {
    "@type": "PostalAddress",
    streetAddress: "נים 2",
    addressLocality: "ראשון לציון",
    addressRegion: "מחוז המרכז",
    postalCode: "7570002",
    addressCountry: "IL",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 31.973,
    longitude: 34.7925,
  },
  // Derived from the single AREAS source so the served-areas list can never
  // drift from the actual routes/sitemap (all 12 cities, not a hand-listed 9).
  areaServed: AREAS.map((a) => a.city),
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
      opens: "08:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Friday",
      opens: "08:00",
      closes: "13:00",
    },
  ],
  sameAs: [
    "https://www.facebook.com/sadetskyengineering",
    "https://www.instagram.com/sadetsky_engineering",
  ],
  founder: {
    "@type": "Person",
    name: "איליה סדצקי",
    jobTitle: "הנדסאי בניין רשום (מ.ר. 35825)",
  },
  foundingDate: "2018",
  knowsLanguage: ["he", "ru", "en", "fr"],
};

/** Build a BreadcrumbList node from ordered crumbs. */
export function breadcrumbSchema(crumbs: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}
