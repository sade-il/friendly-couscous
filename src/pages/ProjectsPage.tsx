import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, ArrowLeft, MessageCircle } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";
import { EngineeringGridBackground } from "@/components/site/EngineeringGridBackground";
import { Projects } from "@/components/site/Projects";
import { Seo } from "@/components/site/Seo";
import { Button } from "@/components/ui/button";
import { waLink, openWhatsApp } from "@/lib/whatsapp";
import { track } from "@/lib/analytics";

const META = {
  title: "פרויקטים נבחרים — קונסטרוקטור ותכנון שלד | א. סדצקי",
  description:
    "גלריית פרויקטים אמיתיים: תכנון קונסטרוקציה, פרגולות, מבנים מסוכנים, חיזוקים, בריכות וחוות דעת — דוגמאות ליווי הנדסי מקצה לקצה.",
};

const WA_TEXT = "שלום, ראיתי את הפרויקטים באתר ואשמח להתייעץ על פרויקט דומה.";

export default function ProjectsPage() {
  useEffect(() => {
    track("projects_page_view", { page: "projects" });
  }, []);

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://sade-il.com/" },
      { "@type": "ListItem", position: 2, name: "פרויקטים", item: "https://sade-il.com/projects" },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={META.title}
        description={META.description}
        path="/projects"
        ogType="article"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(breadcrumbsJsonLd)}</script>
      </Helmet>
      <EngineeringGridBackground />
      <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
      <Header />

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section className="relative bg-gradient-hero text-primary-foreground overflow-hidden">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--primary-foreground)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)/0.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="container mx-auto py-16 sm:py-24 lg:py-28 relative">
            <nav aria-label="פירורי לחם" className="mb-6 text-sm text-primary-foreground/75">
              <ol className="flex items-center gap-2 flex-wrap">
                <li><Link to="/" className="hover:text-accent transition-smooth">דף הבית</Link></li>
                <li aria-hidden><ChevronLeft className="w-3.5 h-3.5" /></li>
                <li className="text-accent" aria-current="page">פרויקטים</li>
              </ol>
            </nav>

            <div className="max-w-3xl">
              <span className="t-eyebrow">גלריית פרויקטים</span>
              <h1 className="mt-3 t-h1 text-primary-foreground leading-tight">
                פרויקטים נבחרים
              </h1>
              <p className="mt-5 t-lead text-primary-foreground/85 max-w-2xl">
                דוגמאות אנונימיות של פרויקטים שתוכננו וליווי הנדסית — תכנון קונסטרוקציה, פרגולות,
                מבנים מסוכנים, חיזוקים, בריכות, מקוואות, חוות דעת הנדסיות וקונסטרוקציות פלדה.
                ללא פרטי לקוחות וכתובות.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="xl">
                  <Link
                    to="/#contact"
                    onClick={() => track("projects_cta_click", { cta: "primary_contact" })}
                  >
                    לפנייה דומה <ArrowLeft className="w-5 h-5" />
                  </Link>
                </Button>
                <Button asChild variant="outlineHero" size="xl">
                  <a
                    href={waLink(WA_TEXT)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      track("projects_cta_click", { cta: "whatsapp" });
                      openWhatsApp(e, WA_TEXT);
                    }}
                  >
                    <MessageCircle className="w-5 h-5" /> WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Projects grid + approvals gallery (reuses existing component) */}
        <Projects />

        {/* CTA */}
        <section className="py-16 lg:py-20" aria-labelledby="cta-title">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-8 sm:p-12 shadow-elevated flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 id="cta-title" className="t-h2">יש לכם פרויקט דומה?</h2>
                <p className="mt-3 t-lead text-primary-foreground/85 max-w-xl">
                  שליחת פרטים ראשוניים — מענה תוך 24 שעות עם הערכה ראשונית, לוח זמנים ורשימת מסמכים נדרשים.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button asChild variant="hero" size="lg">
                  <Link
                    to="/#contact"
                    onClick={() => track("projects_cta_click", { cta: "bottom_contact" })}
                  >
                    שליחת פרטים <ArrowLeft className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="outlineHero" size="lg">
                  <a
                    href={waLink(WA_TEXT)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      track("projects_cta_click", { cta: "bottom_whatsapp" });
                      openWhatsApp(e, WA_TEXT);
                    }}
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
      <AccessibilityWidget />
    </div>
  );
}
