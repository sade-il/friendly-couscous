import { Helmet } from "react-helmet-async";
import { Header } from "@/components/site/Header";
import { EngineeringGridBackground } from "@/components/site/EngineeringGridBackground";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { Hero } from "@/components/site/Hero";
import { Services } from "@/components/site/Services";

import { Faq, faqs } from "@/components/site/Faq";
import { Disclaimer } from "@/components/site/Disclaimer";
import { Footer } from "@/components/site/Footer";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";
import { Seo } from "@/components/site/Seo";
import { useScrollDepthTracking } from "@/hooks/use-scroll-depth-tracking";
import { Suspense, lazy, useEffect } from "react";
import { alignToCurrentHash } from "@/lib/scroll";

// Below-the-fold home sections are code-split so the critical bundle stays
// small — mobile FCP/LCP/TBT (Lighthouse Performance) are gated on initial JS.
// The chunks start loading immediately on mount (React.lazy fetches on render,
// not on scroll), so crawlers and deep links still get the full page; the
// hash-alignment retry in alignToCurrentHash absorbs the late mount.
// Faq stays eager: its `faqs` data feeds the FAQPage JSON-LD above.
const Calculators = lazy(() =>
  import("@/components/site/Calculators").then((m) => ({ default: m.Calculators })),
);
const Prepare = lazy(() =>
  import("@/components/site/Prepare").then((m) => ({ default: m.Prepare })),
);
const About = lazy(() =>
  import("@/components/site/About").then((m) => ({ default: m.About })),
);
const Testimonials = lazy(() =>
  import("@/components/site/Testimonials").then((m) => ({ default: m.Testimonials })),
);
const Charter = lazy(() =>
  import("@/components/site/Charter").then((m) => ({ default: m.Charter })),
);
const ServiceAreas = lazy(() =>
  import("@/components/site/ServiceAreas").then((m) => ({ default: m.ServiceAreas })),
);
const Contact = lazy(() =>
  import("@/components/site/Contact").then((m) => ({ default: m.Contact })),
);

const SITE_URL = "https://sade-il.com/";

const META = {
  title: "קונסטרוקטור ומהנדס מבנים במרכז | א. סדצקי הנדסה",
  description:
    "קונסטרוקטור במרכז: אישורי מהנדס, חוות דעת הנדסית, היתר בנייה, חיזוק מבנים, תכנון ממ״ד, פרגולות ושינויים פנימיים. מענה תוך 24 שעות, ראשון לציון, תל אביב והסביבה.",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "א. סדצקי הנדסה וייעוץ",
  url: SITE_URL,
  inLanguage: "he-IL",
  publisher: { "@type": "Person", name: "Ilia Sadetsky" },
};

const servicesCatalogSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "א. סדצקי הנדסה וייעוץ — קונסטרוקטור ומהנדס מבנים",
  url: SITE_URL,
  telephone: "+972524209183",
  areaServed: ["ראשון לציון", "תל אביב", "פתח תקווה", "חולון", "בת ים", "רחובות", "נס ציונה", "רמת גן", "גבעתיים"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "שירותי הנדסת מבנים",
    itemListElement: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "אישור קונסטרוקטור", description: "אישור מהנדס חתום ליציבות ועיגונים — פרגולות, בריכות, שינויים פנימיים ועומסים חריגים." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "היתר בנייה", description: "חישובים סטטיים וחתימת קונסטרוקטור להגשת היתר בנייה לוועדה המקומית." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "חיזוק מבנים", description: "תכנון חיזוקים למבנים קיימים — קורות, עמודים, יסודות וקירות נושאים." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "תכנון ממ״ד", description: "תכנון קונסטרוקטיבי לממ״ד דירתי וקומתי, כולל היתכנות ותוספות בנייה." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "חוות דעת הנדסית", description: "חוות דעת מומחה למבנים, ליקויי בנייה ובית משפט — בדיקה, ממצאים, מסקנות והמלצות." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "אישור פרגולה ופטור 45 יום", description: "אישור עיגון ויציבות חתום לפרגולה, כולל ליווי דיווח לרשות תוך 45 יום." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "שינויים פנימיים בדירה", description: "הריסת קיר נושא, פתיחת פתחים ואיחוד חדרים עם תכנון העברת עומסים." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "מבנה מסוכן", description: "בדיקת ליקויים, סדיקה וקורוזיה, מסמך הנדסי וליווי מול הרשות." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "תכנון שלד", description: "תכנון קונסטרוקציה למבנים פרטיים וציבוריים — בטון, פלדה ותוספות בנייה." } },
    ],
  },
};

const Index = () => {
  useScrollDepthTracking();

  // Direct hash entry (deep link, reload, or typing #section in the address
  // bar) has no nav click, so `scrollToHash` never runs and the SPA's late-
  // mounting sections miss the browser's native hash jump. Align on mount and
  // on every hashchange so the target lands flush below the sticky header.
  useEffect(() => {
    const previousScrollRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    let lastHash = window.location.hash;
    let cancelAlignment = alignToCurrentHash();
    let resizeTimer: number | undefined;
    const realign = () => {
      cancelAlignment();
      cancelAlignment = alignToCurrentHash();
      lastHash = window.location.hash;
    };
    const onHashChange = () => realign();
    const onPopState = () => realign();
    const onResize = () => {
      if (!window.location.hash) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(realign, 50);
    };
    const onPageShow = () => {
      if (window.location.hash) realign();
    };
    const watchHash = window.setInterval(() => {
      if (window.location.hash !== lastHash) realign();
    }, 50);
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("resize", onResize);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      history.scrollRestoration = previousScrollRestoration;
      cancelAlignment();
      window.clearTimeout(resizeTimer);
      window.clearInterval(watchHash);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={META.title}
        description={META.description}
        path="/"
        alternates={[
          // Only Hebrew is a live, indexable language. ru/en/fr are noindex
          // "coming soon" stubs (LangComingSoon.tsx) — advertising hreflang to
          // noindex URLs is an invalid signal Google drops. Re-add per-language
          // alternates (here + in the sitemap + prerender) only when the
          // translated pages are genuinely indexable. Matches generate-sitemap.ts.
          { hrefLang: "he", href: "https://sade-il.com/" },
          { hrefLang: "x-default", href: "https://sade-il.com/" },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(servicesCatalogSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <EngineeringGridBackground />
      <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
      <a
        href="#contact"
        className="skip-link"
        onClick={() => {
          // Let Contact decide: focus summary + first invalid field, or first input
          setTimeout(() => window.dispatchEvent(new CustomEvent("a11y:jump-to-form")), 50);
        }}
      >
        דלג לתוכן הסיכום והטופס
      </a>
      <ScrollProgress />
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <Services />
        {/* independent boundaries so each section streams in as its chunk lands */}
        <Suspense fallback={null}><Calculators /></Suspense>
        <Suspense fallback={null}><Prepare /></Suspense>
        <Suspense fallback={null}><About /></Suspense>
        <Suspense fallback={null}><Testimonials /></Suspense>
        <Suspense fallback={null}><Charter /></Suspense>
        <Faq />
        <Suspense fallback={null}><ServiceAreas /></Suspense>
        <Suspense fallback={null}><Contact /></Suspense>
        <Disclaimer />
      </main>
      <Footer />
      <FloatingWhatsApp />
      <AccessibilityWidget />
    </div>
  );
};

export default Index;
