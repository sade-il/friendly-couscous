import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  ChevronLeft,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Building2,
  ShieldCheck,
  FileText,
  Hammer,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";
import { EngineeringGridBackground } from "@/components/site/EngineeringGridBackground";
import { Button } from "@/components/ui/button";
import { waLink, openWhatsApp } from "@/lib/whatsapp";
import { track } from "@/lib/analytics";
import { Seo } from "@/components/site/Seo";
import { AREAS, getArea } from "@/data/areas";

const SERVICES = [
  { icon: ShieldCheck, title: "אישור קונסטרוקטור", desc: "מסמך הנדסי חתום ליציבות ולעיגונים — לפרגולה, לשינוי פנימי או לעומסים חריגים.", href: "/services/pergola-approval" },
  { icon: Hammer, title: "שינויים פנימיים", desc: "פתיחת פתח, הסרת קיר נושא, איחוד חדרים — תכנון העברת עומסים וחתימה.", href: "/services/interior-changes" },
  { icon: Building2, title: "חיזוק מבנים ותמ״א 38", desc: "תכנון חיזוקים ליסודות, לעמודים ולקירות נושאים, כולל ליווי תמ״א 38.", href: "/services/building-reinforcement" },
  { icon: FileText, title: "תכנון ממ״ד", desc: "תכנון קונסטרוקטיבי לממ״ד דירתי וקומתי, כולל הגשה לפיקוד העורף.", href: "/services/mamad" },
];

export default function AreaPage() {
  const { slug } = useParams<{ slug: string }>();
  const area = slug ? getArea(slug) : undefined;

  useEffect(() => {
    if (area) track("area_page_view", { area: area.slug });
  }, [area]);

  if (!area) return <Navigate to="/areas" replace />;

  const title = `קונסטרוקטור ${area.cityInTitle} — אישורי מהנדס ותכנון שלד | א. סדצקי`;
  const description = `קונסטרוקטור ${area.cityInTitle}: אישורי מהנדס, חוות דעת, חיזוק מבנים, תכנון ממ״ד ופרגולות. ליווי מול ${area.committee}. מענה תוך 24 שעות.`;
  const path = `/areas/${area.slug}`;
  const waText = `שלום, אני מ${area.city} ואשמח לקבל פרטים על שירותי קונסטרוקטור.`;

  const localBusinessLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: `א. סדצקי הנדסה — קונסטרוקטור ${area.cityInTitle}`,
    url: `https://sade-il.com${path}`,
    telephone: "+972524209183",
    areaServed: {
      "@type": "City",
      name: area.city,
      address: { "@type": "PostalAddress", addressLocality: area.city, addressCountry: "IL" },
    },
    geo: { "@type": "GeoCoordinates", latitude: area.geo.lat, longitude: area.geo.lon },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://sade-il.com/" },
      { "@type": "ListItem", position: 2, name: "אזורי שירות", item: "https://sade-il.com/areas" },
      { "@type": "ListItem", position: 3, name: area.city, item: `https://sade-il.com${path}` },
    ],
  };

  const otherAreas = AREAS.filter((a) => a.slug !== area.slug).slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <Seo title={title} description={description} path={path} ogType="article" />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(localBusinessLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
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
                <li><Link to="/areas" className="hover:text-accent transition-smooth">אזורי שירות</Link></li>
                <li aria-hidden><ChevronLeft className="w-3.5 h-3.5" /></li>
                <li className="text-accent" aria-current="page">{area.city}</li>
              </ol>
            </nav>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur px-3 py-1.5 mb-5 text-xs sm:text-sm">
                <MapPin className="w-4 h-4 text-teal" />
                <span className="text-primary-foreground/90">אזור שירות</span>
              </div>
              <h1 className="t-h1 text-primary-foreground leading-tight">
                קונסטרוקטור {area.cityInTitle}
              </h1>
              <p className="mt-4 t-h3 text-primary-foreground/85 font-normal">
                אישורי מהנדס, חוות דעת ותכנון שלד — ליווי מקצועי ל{area.committee}
              </p>
              <p className="mt-5 t-lead text-primary-foreground/80 max-w-2xl">{area.intro}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="xl">
                  <a
                    href="/#contact"
                    onClick={() => track("area_cta_click", { area: area.slug, cta: "primary_contact" })}
                  >
                    שליחת פרטים <ArrowLeft className="w-5 h-5" />
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="xl">
                  <a
                    href={waLink(waText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      track("area_cta_click", { area: area.slug, cta: "whatsapp" });
                      openWhatsApp(e, waText);
                    }}
                  >
                    <MessageCircle className="w-5 h-5" /> WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Local cases */}
        <section className="py-20 lg:py-24" aria-labelledby="cases-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">פניות נפוצות</span>
              <h2 id="cases-title" className="mt-3 t-h2">
                מתי תושבי {area.city} פונים לקונסטרוקטור?
              </h2>
              <p className="mt-4 t-lead">
                להלן הסוגים השכיחים של פניות שמגיעות אלינו מ{area.city}. אם מצבכם דומה — נשמח לבדוק
                ולחזור תוך 24 שעות עם הצעת מחיר ולוח זמנים.
              </p>
            </div>
            <ul className="grid sm:grid-cols-2 gap-3">
              {area.localCases.map((c) => (
                <li
                  key={c}
                  className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-card"
                >
                  <CheckCircle2 className="w-5 h-5 text-teal shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Services for this area */}
        <section
          className="py-20 lg:py-24 bg-muted/30 border-y border-border"
          aria-labelledby="services-title"
        >
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">שירותים</span>
              <h2 id="services-title" className="mt-3 t-h2">
                שירותי קונסטרוקטור הניתנים {area.cityInTitle}
              </h2>
              <p className="mt-4 t-lead">
                כל השירותים ניתנים בליווי הנדסי מלא — בדיקה, חישוב, מסמך חתום והגשה מול הרשות.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {SERVICES.map((s) => (
                <Link
                  key={s.title}
                  to={s.href}
                  className="rounded-2xl bg-card border border-border shadow-card p-6 hover:shadow-elevated transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  <div className="w-11 h-11 rounded-xl bg-teal/10 text-teal grid place-items-center mb-4">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <h3 className="t-h3 leading-snug">{s.title}</h3>
                  <p className="t-body text-foreground/80 mt-2 leading-relaxed">{s.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Other areas */}
        <section className="py-16 lg:py-20" aria-labelledby="nearby-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-6">
              <span className="t-eyebrow">אזורי שירות נוספים</span>
              <h2 id="nearby-title" className="mt-3 t-h2">פעילות גם בערים סמוכות</h2>
            </div>
            <ul className="flex flex-wrap gap-2">
              {otherAreas.map((a) => (
                <li key={a.slug}>
                  <Link
                    to={`/areas/${a.slug}`}
                    className="px-4 py-2 rounded-full bg-card text-foreground/80 text-sm border border-border hover:bg-muted hover:text-foreground transition-smooth"
                  >
                    {a.city}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/areas"
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm border border-primary hover:bg-primary/90 transition-smooth"
                >
                  כל אזורי השירות ←
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-20" aria-labelledby="cta-title">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-8 sm:p-12 shadow-elevated flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 id="cta-title" className="t-h2">
                  צריכים קונסטרוקטור {area.cityInTitle}?
                </h2>
                <p className="mt-3 t-lead text-primary-foreground/85 max-w-xl">
                  שליחת תמונות ופרטים בסיסיים — מענה תוך 24 שעות עם מחיר, לוח זמנים ורשימת המסמכים
                  הנדרשים מול {area.committee}.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button asChild variant="hero" size="lg">
                  <a
                    href="/#contact"
                    onClick={() => track("area_cta_click", { area: area.slug, cta: "footer_contact" })}
                  >
                    שליחת פרטים <ArrowLeft className="w-5 h-5" />
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="lg">
                  <a
                    href={waLink(waText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      track("area_cta_click", { area: area.slug, cta: "footer_whatsapp" });
                      openWhatsApp(e, waText);
                    }}
                  >
                    <MessageCircle className="w-5 h-5" /> WhatsApp
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
