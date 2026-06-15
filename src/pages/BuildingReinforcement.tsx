import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ShieldCheck, CheckCircle2, FileText, MessageCircle, AlertCircle, ChevronLeft, HelpCircle, ChevronDown, Building2 } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";
import { EngineeringGridBackground } from "@/components/site/EngineeringGridBackground";
import { Button } from "@/components/ui/button";
import { waLink, openWhatsApp } from "@/lib/whatsapp";
import { track } from "@/lib/analytics";
import { Seo } from "@/components/site/Seo";

const PATH = "/services/building-reinforcement";
const WA_TEXT = "שלום, אשמח לקבל הצעה לחיזוק מבנה. אצרף תמונות ופרטים על המבנה.";

const META = {
  title: "חיזוק מבנים — תכנון קונסטרוקטיבי, תמ״א 38 ותוספות | א. סדצקי",
  description:
    "תכנון חיזוקים למבנים קיימים: יסודות, עמודים, קורות וקירות נושאים, חיזוק לרעידות אדמה (תמ״א 38), הוספת קומות ושיפוץ מבנים מסוכנים. ראשון לציון, תל אביב והמרכז.",
};

const whenNeeded = [
  "סדקים, שקיעות או עיוותים במבנה קיים",
  "מבנה ישן לפני שיפוץ נרחב או הוספת קומות",
  "חיזוק לרעידות אדמה (תמ״א 38 / חיזוק עצמאי)",
  "תוספות בנייה — קומה נוספת, ממ״ד או הרחבת דירה",
  "מבנה שהוכרז כמסוכן ע״י הרשות המקומית",
  "שינוי שימוש שמגדיל עומסים (משרד למחסן, מגורים לעסק)",
];

const whatsIncluded = [
  { icon: ShieldCheck, title: "אבחון הנדסי", desc: "סקר במקום, מיפוי סדקים ועיוותים, בדיקת יסודות, עמודים וקורות, וזיהוי שורש הבעיה." },
  { icon: FileText, title: "תכנון חיזוק", desc: "תכנון פתרון מותאם — מעטפות בטון, מסגרות פלדה, פייבר קרבון (FRP), חיזוק יסודות או חיזוק קשיח." },
  { icon: CheckCircle2, title: "מסמך חתום ופיקוח", desc: "תכניות ביצוע, חישוב סטטי חתום, פרטי קישור, וליווי בביצוע מול הקבלן והרשות." },
];

const processSteps = [
  { step: "1", title: "ביקור ואבחון", desc: "סקר במקום, צילום סדקים, בדיקת תכניות קיימות אם יש, ואיתור מקורות הכשל." },
  { step: "2", title: "תכנון פתרון", desc: "חישוב עומסים במצב קיים ומבוקש, בחירת שיטת חיזוק מיטבית, ותכנון פרטים." },
  { step: "3", title: "מסמכים וליווי", desc: "תכניות חתומות להגשה לרשות, פרטי ביצוע לקבלן, וליווי הנדסי בזמן הביצוע." },
];

const faqs = [
  {
    q: "מתי באמת צריך חיזוק מבנה?",
    a: "כאשר מופיעים סדקים מבניים (לא רק טיח), שקיעות לא אחידות, עיוותים בקורות או בעמודים, או כאשר רוצים להוסיף עומסים — קומה נוספת, ממ״ד, מחיצות כבדות או שינוי שימוש. גם מבנים מסוכנים שהוכרזו ע״י הרשות מחייבים תכנון חיזוק לפני שיפוץ.",
  },
  {
    q: "מה ההבדל בין תמ״א 38/1 לתמ״א 38/2?",
    a: "תמ״א 38/1 — חיזוק המבנה הקיים תוך כדי תוספת קומות וממ״דים, הדיירים נשארים בבית. תמ״א 38/2 (\"הריסה ובנייה\") — הריסת הבניין הקיים והקמתו מחדש. שני המסלולים מחייבים תכנון קונסטרוקטיבי לפי ת״י 413 (עמידות לרעידות אדמה).",
  },
  {
    q: "מהן שיטות החיזוק הנפוצות?",
    a: "מעטפות בטון מזוין סביב עמודים וקורות, מסגרות פלדה (קשיחות או דחיקה), חיזוק בפייבר קרבון (FRP) דק וגמיש, חיזוק יסודות בכלונסאות מיקרו או הזרקות, וקירות גזירה (Shear Walls) נוספים. הבחירה תלויה במצב המבנה, בעומסים ובאילוצי הביצוע.",
  },
  {
    q: "כמה זמן לוקח תכנון חיזוק?",
    a: "אבחון ראשוני וחוות דעת — שבוע עד שבועיים. תכנון חיזוק מלא עם פרטי ביצוע ומסמכים להגשה לרשות — בין 3 שבועות לחודשיים, תלוי בהיקף הפרויקט ובדרישות הרשות.",
  },
  {
    q: "מבנה שהוכרז מסוכן — מה עושים?",
    a: "ברגע שהרשות הוציאה צו מבנה מסוכן, יש לפעול במהירות: אבחון הנדסי מיידי, תכנון חיזוק או תמיכה זמנית, והגשת תכנית פעולה לרשות. אנחנו מלווים את התהליך מול הוועדה ומול הקבלן עד הסרת הצו.",
  },
  {
    q: "האם נדרש היתר בנייה לחיזוק?",
    a: "חיזוק פנימי שאינו משנה חזיתות או נפח בנייה — לרוב פטור מהיתר, אך מחייב הגשת מסמכים הנדסיים לרשות. חיזוק במסגרת תמ״א 38, תוספת קומות או שינוי חזיתות — מחייבים היתר בנייה מלא.",
  },
  {
    q: "מה לשלוח לפני הביקור?",
    a: "תמונות של הסדקים והעיוותים, תכניות בניין קיימות אם יש, שנת הבנייה ומספר קומות, ותיאור מטרת החיזוק (שיפוץ, תוספת, צו רשות וכו'). מידע מוקדם מאפשר הערכת מצב ראשונית מהירה יותר.",
  },
];

export default function BuildingReinforcement() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    track("service_page_view", { page: "building_reinforcement" });
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
    serviceType: "חיזוק מבנים",
    name: "חיזוק מבנים — תכנון קונסטרוקטיבי, תמ״א 38 ותוספות",
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
      { "@type": "ListItem", position: 2, name: "חיזוק מבנים", item: `https://sade-il.com${PATH}` },
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
                <li className="text-accent" aria-current="page">חיזוק מבנים</li>
              </ol>
            </nav>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur px-3 py-1.5 mb-5 text-xs sm:text-sm">
                <Building2 className="w-4 h-4 text-teal" />
                <span className="text-primary-foreground/90">תמ״א 38 · מבנים מסוכנים · תוספות בנייה</span>
              </div>
              <h1 className="t-h1 text-primary-foreground leading-tight">
                חיזוק מבנים — תכנון קונסטרוקטיבי לכל מבנה קיים
              </h1>
              <p className="mt-4 t-h3 text-primary-foreground/85 font-normal">
                חיזוק יסודות, עמודים, קורות וקירות נושאים · עמידות לרעידות אדמה · תוספות והרחבות
              </p>
              <p className="mt-5 t-lead text-primary-foreground/80 max-w-2xl">
                אבחון הנדסי, תכנון פתרון מותאם וליווי ביצוע — למבנים פרטיים, בנייני מגורים ומבנים מסוכנים.
                שירות בראשון לציון, תל אביב ובאזור המרכז.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="xl">
                  <a href="/#contact" onClick={() => track("service_cta_click", { page: "building_reinforcement", cta: "primary_contact" })}>
                    שליחת פרטים לבדיקה <ArrowLeft className="w-5 h-5" />
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="xl">
                  <a href={waLink(WA_TEXT)} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => { track("service_cta_click", { page: "building_reinforcement", cta: "whatsapp" }); openWhatsApp(e, WA_TEXT); }}>
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
              <h2 id="when-title" className="mt-3 t-h2">מתי נדרש חיזוק מבנה?</h2>
              <p className="mt-4 t-lead">
                כל שינוי בעומסים, סימני כשל הנדסי או דרישת רשות לחיזוק — מחייבים תכנון קונסטרוקטיבי לפני ביצוע.
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
              <h2 id="included-title" className="mt-3 t-h2">תכנון חיזוק מלא — מאבחון ועד ביצוע</h2>
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
              <h2 id="process-title" className="mt-3 t-h2">איך מתבצע תכנון חיזוק?</h2>
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

        <section id="reinforcement-faq" className="py-20 lg:py-24 bg-muted/30 border-y border-border" aria-labelledby="reinforcement-faq-title">
          <div className="container mx-auto max-w-4xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">שאלות נפוצות</span>
              <h2 id="reinforcement-faq-title" className="mt-3 t-h2">חיזוק מבנים — שאלות נפוצות</h2>
            </div>
            <ul className="space-y-3">
              {faqs.map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <li key={f.q} className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`reinforcement-faq-panel-${i}`}
                      id={`reinforcement-faq-trigger-${i}`}
                      onClick={() => {
                        const next = isOpen ? null : i;
                        setOpenFaq(next);
                        if (next !== null) track("faq_open", { page: "building_reinforcement", index: i, question: f.q });
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
                        id={`reinforcement-faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`reinforcement-faq-trigger-${i}`}
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
                <h2 id="cta-title" className="t-h2">חיזוק מבנה? נתחיל באבחון קצר</h2>
                <p className="mt-3 t-lead text-primary-foreground/85 max-w-xl">
                  שליחת תמונות ופרטי המבנה — מענה תוך 24 שעות עם הערכת מצב ראשונית.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button asChild variant="hero" size="lg">
                  <a href="/#contact" onClick={() => track("service_cta_click", { page: "building_reinforcement", cta: "bottom_contact" })}>
                    שליחת פרטים <ArrowLeft className="w-5 h-5" />
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="lg">
                  <a href={waLink(WA_TEXT)} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => { track("service_cta_click", { page: "building_reinforcement", cta: "bottom_whatsapp" }); openWhatsApp(e, WA_TEXT); }}>
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
                    התוכן בעמוד זה הינו מידע כללי ואינו מהווה תכנון פרטני או חוות דעת הנדסית.
                    כל מבנה דורש אבחון פרטני במקום, בליווי תכניות ומסמכים, וכל ביצוע יעשה לאחר תכנון חתום בידי מהנדס מבנים רשום.
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
