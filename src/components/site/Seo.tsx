import { Helmet } from "react-helmet-async";
// Single source of truth for the business JSON-LD (shared with scripts/prerender.ts
// so the static and runtime copies never drift; they coalesce via the same @id).
import { businessSchema } from "@/lib/schema";

const SITE = "https://sade-il.com";

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
      <script type="application/ld+json">{JSON.stringify(businessSchema)}</script>
    </Helmet>
  );
};

export default Seo;
