import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Shield, CheckCircle2, FileText, MessageCircle, AlertCircle, ChevronLeft, HelpCircle, ChevronDown, ShieldCheck } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";
import { EngineeringGridBackground } from "@/components/site/EngineeringGridBackground";
import { Button } from "@/components/ui/button";
import { waLink, openWhatsApp } from "@/lib/whatsapp";
import { track } from "@/lib/analytics";
import { Seo } from "@/components/site/Seo";

const PATH = "/services/mamad";
const WA_TEXT = "שלום, אשמח לקבל ייעוץ לתכנון ממ״ד בדירה/בבניין. אצרף תכניות ופרטים.";

const META = {
  title: "תכנון ממ״ד — היתכנות, חישוב סטטי ואישור | א. סדצקי",
  description:
    "תכנון ממ״ד דירתי וקומתי: בדיקת היתכנות, חישוב קונסטרוקטיבי לפי תקנות הג״א, תכניות חתומות והגשה לפיקוד העורף ולוועדה המקומית. ראשון לציון והמרכז.",
};

const whenNeeded = [
  "הוספת ממ״ד דירתי לדירה קיימת",
  "תכנון ממ״ד בבנייה חדשה או הרחבת דירה",
  "ממ״ד קומתי (ממ״ק) במסגרת תמ״א 38 או פינוי-בינוי",
  "בדיקת היתכנות הוספת ממ״ד לפני רכישת דירה או שיפוץ",
  "תכנון חיזוק שלד קיים לעמידה בעומסי ממ״ד",
  "אישור מהנדס לתכנית ממ״ד להגשה לפיקוד העורף",
];

const whatsIncluded = [
  { icon: Shield, title: "בדיקת היתכנות", desc: "בדיקת מיקום אפשרי, עמידה בקווי בניין, זכויות בנייה ועומסים שהמבנה הקיים יכול לשאת." },
  { icon: FileText, title: "תכנון מלא", desc: "תכניות אדריכליות וקונסטרוקטיביות לפי תקנות הג״א, חישוב סטטי לקירות בטון מזוין ולתקרה." },
  { icon: ShieldCheck, title: "אישורים והגשות", desc: "הגשה לפיקוד העורף, לוועדה המקומית ולכבאות, וליווי עד קבלת היתר ואישור איכלוס." },
];

const processSteps = [
  { step: "1", title: "היתכנות וייעוץ", desc: "בדיקת תכניות הבניין, מיקום הממ״ד, זכויות בנייה ותקנות הג״א הרלוונטיות." },
  { step: "2", title: "תכנון מפורט", desc: "תכניות אדריכליות וקונסטרוקטיביות, חישוב סטטי, פרטי קישור לשלד קיים ותכנון מערכות." },
  { step: "3", title: "הגשה וליווי", desc: "הגשה לפיקוד העורף ולוועדה המקומית, מענה לדרישות, וליווי ביצוע עד אישור איכלוס." },
];

const faqs = [
  {
    q: "האם חייבים ממ״ד בכל דירה?",
    a: "כן — בכל בנייה חדשה משנת 1992 חובה ממ״ד דירתי לפי תקנות ההתגוננות האזרחית. בדירות ישנות אין חובה רטרואקטיבית, אך הוספת ממ״ד מומלצת מטעמי בטיחות ולרוב מקבלת זכויות בנייה נוספות מהוועדה המקומית.",
  },
  {
    q: "מה ההבדל בין ממ״ד, ממ״ק ומקלט?",
    a: "ממ״ד — מרחב מוגן דירתי בתוך הדירה, מ-9 מ״ר. ממ״ק — מרחב מוגן קומתי, משותף לכל קומה (לרוב 12 מ״ר). מקלט — מרחב מוגן ציבורי משותף לכל הבניין. כולם דורשים תכנון לפי תקנות הג״א, אך עומסי התכנון ודרישות האוורור שונים.",
  },
  {
    q: "מה הגודל המינימלי של ממ״ד?",
    a: "9 מ״ר נטו לדירה עד 4 חדרים, 12 מ״ר לדירות 5 חדרים ומעלה. הקירות, התקרה והרצפה מבטון מזוין בעובי 20-30 ס״מ, עם דלת הדף ופתח חירום מאושרים על ידי פיקוד העורף.",
  },
  {
    q: "האם אפשר להוסיף ממ״ד לדירה קיימת?",
    a: "ברוב המקרים כן — בדירה קומת קרקע עם חצר, בדירת גג עם זכויות בנייה, או במסגרת תמ״א 38. נדרשת בדיקת היתכנות הנדסית של חיזוק השלד הקיים, וקבלת זכויות בנייה מהוועדה המקומית. אנחנו מבצעים את שתי הבדיקות בשלב מוקדם.",
  },
  {
    q: "כמה זמן לוקח התהליך?",
    a: "בדיקת היתכנות — שבועיים. תכנון מלא והגשה לפיקוד העורף — חודש עד חודשיים. אישור פיקוד העורף — 30 עד 60 יום. היתר בנייה מהוועדה המקומית — 3 עד 6 חודשים, תלוי במורכבות ובדרישות.",
  },
  {
    q: "מי מאשר את תכנית הממ״ד?",
    a: "פיקוד העורף — אישור הנדסי לתכנית ההגנה (קירות, דלת, אוורור). הוועדה המקומית לתכנון ובנייה — אישור היתר הבנייה. שני האישורים נדרשים, ואנחנו מלווים את התהליך מול שני הגופים.",
  },
  {
    q: "מה לשלוח לפני הבדיקה?",
    a: "תכנית דירה קיימת, תכניות בניין אם יש, תמונות של האזור המיועד לממ״ד, וכתובת מלאה לבדיקת תב״ע וזכויות בנייה. מידע מוקדם מאפשר הערכת היתכנות ראשונית מהירה.",
  },
];

export default function Mamad() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    track("service_page_view", { page: "mamad" });
  }, []);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "תכנון ממ״ד",
    name: "תכנון ממ״ד — בדיקת היתכנות, חישוב סטטי ואישור פיקוד העורף",
    description: META.description,
    areaServed: ["ראשון לציון", "תל אביב", "מרכז", "ישראל"],
    provider: {
      "@type": "ProfessionalService",
      name: "א. סדצקי הנדסה וייעוץ",
      url: "https://sade-il.com",
      telephone: "+972524209183",
    },
  };

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://sade-il.com/" },
      { "@type": "ListItem", position: 2, name: "תכנון ממ״ד", item: `https://sade-il.com${PATH}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title={META.title} description={META.description} path={PATH} ogType="article" />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(serviceJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbsJsonLd)}</script>
      </Helmet>
      <EngineeringGridBackground />
      <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
      <Header />

      <main id="main-content" tabIndex={-1}>
        <section className="relative bg-gradient-hero text-primary-foreground overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none"
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
                <li><Link to="/#services" className="hover:text-accent transition-smooth">שירותים</Link></li>
                <li aria-hidden><ChevronLeft className="w-3.5 h-3.5" /></li>
                <li className="text-accent" aria-current="page">תכנון ממ״ד</li>
              </ol>
            </nav>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur px-3 py-1.5 mb-5 text-xs sm:text-sm">
                <Shield className="w-4 h-4 text-teal" />
                <span className="text-primary-foreground/90">תקנות הג״א · פיקוד העורף · ועדה מקומית</span>
              </div>
              <h1 className="t-h1 text-primary-foreground leading-tight">
                תכנון ממ״ד — מהיתכנות ועד אישור פיקוד העורף
              </h1>
              <p className="mt-4 t-h3 text-primary-foreground/85 font-normal">
                ממ״ד דירתי · ממ״ק קומתי · הוספת ממ״ד לדירה קיימת ובתוספות בנייה
              </p>
              <p className="mt-5 t-lead text-primary-foreground/80 max-w-2xl">
                בדיקת היתכנות, תכנון קונסטרוקטיבי לפי תקנות הג״א, חישוב סטטי, תכניות חתומות
                והגשה לפיקוד העורף ולוועדה המקומית. ראשון לציון, תל אביב והמרכז.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="xl">
                  <a href="/#contact" onClick={() => track("service_cta_click", { page: "mamad", cta: "primary_contact" })}>
                    שליחת פרטים לבדיקה <ArrowLeft className="w-5 h-5" />
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="xl">
                  <a href={waLink(WA_TEXT)} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => { track("service_cta_click", { page: "mamad", cta: "whatsapp" }); openWhatsApp(e, WA_TEXT); }}>
                    <MessageCircle className="w-5 h-5" /> WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-24" aria-labelledby="when-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">מתי נדרש</span>
              <h2 id="when-title" className="mt-3 t-h2">מתי נדרש תכנון ממ״ד?</h2>
              <p className="mt-4 t-lead">
                בכל בנייה חדשה — חובה. בדירה קיימת — מומלץ ולרוב אפשרי, בכפוף לבדיקת היתכנות הנדסית.
              </p>
            </div>
            <ul className="grid sm:grid-cols-2 gap-3">
              {whenNeeded.map((item) => (
                <li key={item} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-card">
                  <CheckCircle2 className="w-5 h-5 text-teal shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-20 lg:py-24 bg-muted/30 border-y border-border" aria-labelledby="included-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">מה כולל השירות</span>
              <h2 id="included-title" className="mt-3 t-h2">תכנון ממ״ד מלא — מהיתכנות עד אישור</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {whatsIncluded.map((c) => (
                <div key={c.title} className="rounded-2xl bg-card border border-border shadow-card p-6">
                  <div className="w-11 h-11 rounded-xl bg-teal/10 text-teal grid place-items-center mb-4">
                    <c.icon className="w-5 h-5" />
                  </div>
                  <h3 className="t-h3 leading-snug">{c.title}</h3>
                  <p className="t-body text-foreground/80 mt-2 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-24" aria-labelledby="process-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">תהליך העבודה</span>
              <h2 id="process-title" className="mt-3 t-h2">איך מתבצע תכנון ממ״ד?</h2>
            </div>
            <ol className="grid md:grid-cols-3 gap-4">
              {processSteps.map((p) => (
                <li key={p.step} className="rounded-2xl bg-card border border-border shadow-card p-6">
                  <div className="text-accent font-mono text-sm tracking-widest">שלב {p.step}</div>
                  <h3 className="t-h3 mt-2 leading-snug">{p.title}</h3>
                  <p className="t-body text-foreground/80 mt-2 leading-relaxed">{p.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="mamad-faq" className="py-20 lg:py-24 bg-muted/30 border-y border-border" aria-labelledby="mamad-faq-title">
          <div className="container mx-auto max-w-4xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">שאלות נפוצות</span>
              <h2 id="mamad-faq-title" className="mt-3 t-h2">תכנון ממ״ד — שאלות נפוצות</h2>
            </div>
            <ul className="space-y-3">
              {faqs.map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <li key={f.q} className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`mamad-faq-panel-${i}`}
                      id={`mamad-faq-trigger-${i}`}
                      onClick={() => {
                        const next = isOpen ? null : i;
                        setOpenFaq(next);
                        if (next !== null) track("faq_open", { page: "mamad", index: i, question: f.q });
                      }}
                      className="w-full flex items-center justify-between gap-4 text-right px-5 py-4 sm:px-6 sm:py-5 hover:bg-muted/40 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <HelpCircle className="w-5 h-5 text-teal shrink-0" />
                        <span className="t-h3 leading-snug">{f.q}</span>
                      </span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div
                        id={`mamad-faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`mamad-faq-trigger-${i}`}
                        className="px-5 pb-5 sm:px-6 sm:pb-6 t-body text-foreground/85 leading-relaxed"
                      >
                        {f.a}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="py-16 lg:py-20" aria-labelledby="cta-title">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-8 sm:p-12 shadow-elevated flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 id="cta-title" className="t-h2">שוקלים להוסיף ממ״ד? נתחיל מהיתכנות</h2>
                <p className="mt-3 t-lead text-primary-foreground/85 max-w-xl">
                  שליחת תכנית דירה וכתובת — מענה תוך 24 שעות עם הערכת היתכנות ראשונית.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button asChild variant="hero" size="lg">
                  <a href="/#contact" onClick={() => track("service_cta_click", { page: "mamad", cta: "bottom_contact" })}>
                    שליחת פרטים <ArrowLeft className="w-5 h-5" />
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="lg">
                  <a href={waLink(WA_TEXT)} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => { track("service_cta_click", { page: "mamad", cta: "bottom_whatsapp" }); openWhatsApp(e, WA_TEXT); }}>
                    <MessageCircle className="w-5 h-5" /> WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="page-disc-title" className="py-12 bg-muted/40 border-t border-border">
          <div className="container mx-auto max-w-4xl">
            <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-card">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="page-disc-title" className="t-h3">הצהרת אחריות מקצועית</h2>
                  <p className="mt-2 t-body text-muted-foreground leading-relaxed">
                    התוכן בעמוד זה הינו מידע כללי בלבד ואינו מהווה תכנון פרטני או חוות דעת.
                    תכנון ממ״ד מחייב בדיקת היתכנות במקום ועמידה בתקנות הג״א העדכניות, וכל ביצוע יעשה לאחר תכנון חתום ואישור פיקוד העורף.
                  </p>
                </div>
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
