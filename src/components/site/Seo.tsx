import { Helmet } from "react-helmet-async";

const SITE = "https://sade-il.com";

const professionalServiceSchema = {
  "@context": "https://schema.org",
  "@type": ["ProfessionalService", "LocalBusiness"],
  "@id": "https://sade-il.com/#business",
  name: "א. סדצקי הנדסה וייעוץ",
  alternateName: "Sadetsky Structural Engineering",
  description:
    "קונסטרוקטור ומהנדס מבנים — אישורי קונסטרוקטור, חוות דעת הנדסיות, חיזוק מבנים, תכנון ממ״ד, היתר בנייה ותכנון שלד.",
  url: "https://sade-il.com",
  telephone: "+972524209183",
  email: "office@sade-il.com",
  image: "https://sade-il.com/logo.jpg",
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
    latitude: 31.9730,
    longitude: 34.7925,
  },
  areaServed: [
    "ראשון לציון",
    "תל אביב",
    "פתח תקווה",
    "חולון",
    "בת ים",
    "רחובות",
    "נס ציונה",
    "רמת גן",
    "גבעתיים",
  ],
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
  founder: { "@type": "Person", name: "איליה סדצקי", jobTitle: "הנדסאי בניין רשום (מ.ר. 35825)" },
  foundingDate: "2018",
  knowsLanguage: ["he", "ru", "en", "fr"],
};


export type SeoAlternate = { hrefLang: string; href: string };

type SeoProps = {
  title: string;
  description: string;
  /** Path beginning with "/" — canonical will be built on https://sade-il.com. */
  path: string;
  /** Optional override for absolute canonical URL. */
  canonical?: string;
  alternates?: SeoAlternate[];
  noindex?: boolean;
  ogType?: "website" | "article";
};

export const Seo = ({
  title,
  description,
  path,
  canonical,
  alternates,
  noindex,
  ogType = "website",
}: SeoProps) => {
  const url = canonical ?? `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {alternates?.map((a) => (
        <link key={a.hrefLang} rel="alternate" hrefLang={a.hrefLang} href={a.href} />
      ))}
      <script type="application/ld+json">{JSON.stringify(professionalServiceSchema)}</script>
    </Helmet>
  );
};

export default Seo;
