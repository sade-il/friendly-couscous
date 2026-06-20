import { Helmet } from "react-helmet-async";
import { Header } from "@/components/site/Header";
import { EngineeringGridBackground } from "@/components/site/EngineeringGridBackground";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { Hero } from "@/components/site/Hero";
import { Services } from "@/components/site/Services";

import { Calculators } from "@/components/site/Calculators";
import { Prepare } from "@/components/site/Prepare";
import { About } from "@/components/site/About";
import { Testimonials } from "@/components/site/Testimonials";
import { Charter } from "@/components/site/Charter";
import { Faq, faqs } from "@/components/site/Faq";
import { ServiceAreas } from "@/components/site/ServiceAreas";
import { Contact } from "@/components/site/Contact";
import { Disclaimer } from "@/components/site/Disclaimer";
import { Footer } from "@/components/site/Footer";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";
import { Seo } from "@/components/site/Seo";
import { useScrollDepthTracking } from "@/hooks/use-scroll-depth-tracking";
import { useEffect } from "react";
import { alignToCurrentHash } from "@/lib/scroll";

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
    const cancelMount = alignToCurrentHash();
    const onHashChange = () => alignToCurrentHash();
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelMount();
      window.removeEventListener("hashchange", onHashChange);
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
        
        <Calculators />
        <Prepare />
        <About />
        <Testimonials />
        <Charter />
        <Faq />
        <ServiceAreas />
        <Contact />
        <Disclaimer />
      </main>
      <Footer />
      <FloatingWhatsApp />
      <AccessibilityWidget />
    </div>
  );
};

export default Index;
