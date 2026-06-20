import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Eye, CheckCircle2, FileText, ShieldCheck, MessageCircle, AlertCircle, ChevronLeft, HelpCircle, ChevronDown } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";
import { EngineeringGridBackground } from "@/components/site/EngineeringGridBackground";
import { Button } from "@/components/ui/button";
import { waLink, openWhatsApp } from "@/lib/whatsapp";
import { track } from "@/lib/analytics";
import { Seo } from "@/components/site/Seo";

const WA_TEXT = "שלום, אשמח לקבל בדיקה הנדסית לשינויים פנימיים בדירה. אצרף תמונות ופרטים.";

const META = {
  title: "אישור מהנדס לפתיחת פתח והסרת קיר נושא | א. סדצקי",
  description:
    "שוקלים לפתוח פתח או להסיר קיר נושא? קונסטרוקטור בודק, מחשב חיזוקים וחותם. אל תבצעו ללא אישור — דברו איתנו.",
};

const whenNeeded = [
  "הריסת קיר נושא או פתיחת פתח בקיר פנימי",
  "איחוד חדרים או ביטול קיר בין סלון לחדר נוסף",
  "פתיחת פתח חדש לדלת או חלון פנימי",
  "העתקת מטבח או ביטול קיר בין מטבח לסלון",
  "שינוי תכנון פנימי בדירה ישנה",
  "דרישה של ועד בית, רשות מקומית או חברת ביטוח למסמך הנדסי",
];

const whatsIncluded = [
  { icon: CheckCircle2, title: "סיווג הקיר", desc: "האם הקיר נושא, מחיצה או אלמנט קונסטרוקטיבי משני — לפי תכניות וסקירה במקום." },
  { icon: ShieldCheck, title: "פתרון הנדסי", desc: "תכנון חיזוקים, קורות, עמודים או מסגרות פלדה להעברת עומסים במצב החדש." },
  { icon: FileText, title: "מסמך הנדסי חתום", desc: "תוכנית, חישוב סטטי ומסמך חתום להגשה לרשות, לוועד בית או לחברת ביטוח." },
];

const processSteps = [
  { step: "1", title: "שליחת פרטים", desc: "תמונות של הקיר, מידות, תכניות קיימות אם יש, ותיאור השינוי המבוקש." },
  { step: "2", title: "בדיקה במקום", desc: "ביקור בדירה, סיווג הקיר, בדיקת אלמנטים נושאים סמוכים ומדידה." },
  { step: "3", title: "תכנון ומסמך חתום", desc: "תכנון חיזוקים, חישוב סטטי, פרט ביצוע ואישור חתום לביצוע ולרשות." },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "מתי צריך בדיקה הנדסית לפני שבירת קיר?",
    a: "כל שינוי פנימי שעלול להשפיע על אלמנט קונסטרוקטיבי — קיר נושא, קיר גזירה, קורה או עמוד — מחייב בדיקה הנדסית לפני ביצוע. אם לא ברור בוודאות שמדובר במחיצת גבס או מחיצה קלה שאינה נושאת עומס, יש לבדוק לפני כל פתיחה או הריסה.",
  },
  {
    q: "איך יודעים אם קיר הוא קיר נושא?",
    a: "סיווג נעשה לפי שילוב של תכניות הבניין המקוריות, סוג החומר ועוביו, מיקום ביחס לעמודים וקורות, וסקירה הנדסית במקום. אין להסתמך על דפיקה על הקיר או על מראה חיצוני — קירות בלוקים ובטון יכולים להיות נושאים גם כשהם נראים כמחיצה רגילה.",
  },
  {
    q: "האם בכלל מותר להרוס קיר נושא?",
    a: "במקרים רבים ניתן לפתוח קיר נושא או להרוס אותו חלקית, בתנאי שמתוכנן פתרון הנדסי להעברת העומסים — בדרך כלל קורה מבטון או מסגרת פלדה. כל מקרה דורש תכנון פרטני, ולעיתים גם היתר מהרשות המקומית, בהתאם להיקף השינוי ולתקנון הבניין.",
  },
  {
    q: "מה ההבדל בין פתיחת פתח להריסה מלאה של קיר?",
    a: "פתיחת פתח שומרת חלק מהקיר ומפעילה עומסים מקומיים סביב הפתח — בדרך כלל פותרים זאת בקורת תמיכה. הריסה מלאה מעבירה את כל העומס לאזורים אחרים של המבנה ומחייבת תכנון רחב יותר של חיזוקים.",
  },
  {
    q: "מה התהליך מול ועד הבית והשכנים?",
    a: "בבניינים משותפים מקובל להציג לוועד הבית ולשכנים מסמך הנדסי חתום על ידי מהנדס מבנים, המאשר שהשינוי אינו פוגע במבנה המשותף. במקרים מסוימים נדרש גם אישור אסיפת דיירים ולעיתים אף היתר בנייה.",
  },
  {
    q: "האם נדרש היתר בנייה לשינויים פנימיים?",
    a: "תלוי בהיקף השינוי. שינוי קל במחיצות שאינן נושאות לרוב פטור מהיתר. שינוי בקירות נושאים, איחוד יחידות, שינוי חזיתות או הוספת פתחים חיצוניים — לרוב מחייבים היתר או הגשה לרשות. בכל מקרה נדרשת אחריות הנדסית.",
  },
  {
    q: "מה כדאי לשלוח לפני הבדיקה?",
    a: "תמונות של הקיר משני צידיו, מידות באורך וגובה, תכניות בניין קיימות אם יש, ותיאור קצר של השינוי המבוקש. ככל שיש יותר מידע מראש, ניתן לחזור עם תשובה ראשונית מהירה יותר.",
  },
];


export default function InteriorChanges() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    track("service_page_view", { page: "interior_changes" });
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

  // Service + BreadcrumbList to match the sibling service pages (Mamad,
  // BuildingReinforcement, PergolaApproval) which all carry these nodes.
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "פתיחת פתח והסרת קיר נושא",
    name: "אישור מהנדס לפתיחת פתח והסרת קיר נושא",
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
      {
        "@type": "ListItem",
        position: 2,
        name: "פתיחת פתח והסרת קיר",
        item: "https://sade-il.com/services/interior-changes",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={META.title}
        description={META.description}
        path="/services/interior-changes"
        ogType="article"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(serviceJsonLd)}</script>
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
                <li className="text-accent" aria-current="page">שינויים פנימיים והריסת קירות</li>
              </ol>
            </nav>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur px-3 py-1.5 mb-5 text-xs sm:text-sm">
                <Eye className="w-4 h-4 text-teal" />
                <span className="text-primary-foreground/90">שירות הנדסי ייעודי</span>
              </div>
              <h1 className="t-h1 text-primary-foreground leading-tight">
                שינויים פנימיים בדירה והריסת קירות
              </h1>
              <p className="mt-4 t-h3 text-primary-foreground/85 font-normal">
                הריסת קיר נושא, פתיחת פתחים, איחוד חדרים והעתקת מטבח — בדיקה ותכנון הנדסי חתום
              </p>
              <p className="mt-5 t-lead text-primary-foreground/80 max-w-2xl">
                בדיקה הנדסית, סיווג הקיר, תכנון חיזוקים ומסמך הנדסי חתום לשינויים פנימיים בדירה
                או במבנה קיים. שירות בראשון לציון ובאזור המרכז.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="xl">
                  <a href="/#contact" onClick={() => track("service_cta_click", { page: "interior_changes", cta: "primary_contact" })}>
                    שליחת פרטים לבדיקה <ArrowLeft className="w-5 h-5" />
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="xl">
                  <a
                    href={waLink(WA_TEXT)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      track("service_cta_click", { page: "interior_changes", cta: "whatsapp" });
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

        <section className="py-20 lg:py-24" aria-labelledby="when-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">מתי נדרש</span>
              <h2 id="when-title" className="mt-3 t-h2">מתי נדרשת בדיקה הנדסית לשינוי פנימי?</h2>
              <p className="mt-4 t-lead">
                כל שינוי שמערב הריסת קיר, פתיחת פתח או שינוי בעומסים על המבנה דורש בדיקה הנדסית
                לפני ביצוע — בין אם נדרש היתר ובין אם לאו.
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
              <h2 id="included-title" className="mt-3 t-h2">בדיקה הנדסית מלאה לשינוי פנימי</h2>
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
              <h2 id="process-title" className="mt-3 t-h2">איך מבצעים שינוי פנימי בבטחה?</h2>
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

        <section id="interior-faq" className="py-20 lg:py-24 bg-muted/30 border-y border-border" aria-labelledby="interior-faq-title">
          <div className="container mx-auto max-w-4xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">שאלות נפוצות</span>
              <h2 id="interior-faq-title" className="mt-3 t-h2">שינויים פנימיים בדירה — שאלות נפוצות</h2>
              <p className="mt-4 t-lead">
                הריסת קיר, פתיחת פתח, איחוד חדרים — מתי באמת נדרשת בדיקה הנדסית ומה התהליך.
              </p>
            </div>
            <ul className="space-y-3">
              {faqs.map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <li key={f.q} className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`interior-faq-panel-${i}`}
                      id={`interior-faq-trigger-${i}`}
                      onClick={() => {
                        const next = isOpen ? null : i;
                        setOpenFaq(next);
                        if (next !== null) track("faq_open", { page: "interior_changes", index: i, question: f.q });
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
                        id={`interior-faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`interior-faq-trigger-${i}`}
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
                <h2 id="cta-title" className="t-h2">לפני שמתחילים — בדיקה הנדסית קצרה</h2>
                <p className="mt-3 t-lead text-primary-foreground/85 max-w-xl">
                  שליחת תמונות ומידות בסיסיות — מענה תוך 24 שעות עם הערכת מצב ראשונית ולוח זמנים.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button asChild variant="hero" size="lg">
                  <a href="/#contact" onClick={() => track("service_cta_click", { page: "interior_changes", cta: "bottom_contact" })}>
                    שליחת פרטים <ArrowLeft className="w-5 h-5" />
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="lg">
                  <a
                    href={waLink(WA_TEXT)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      track("service_cta_click", { page: "interior_changes", cta: "bottom_whatsapp" });
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
                    התוכן בעמוד זה הינו מידע כללי ואינו מהווה תכנון פרטני, אישור ביצוע או ייעוץ משפטי.
                    כל מקרה דורש בדיקה הנדסית פרטנית במקום, בליווי מסמכים ותכניות רלוונטיים,
                    וכל ביצוע יעשה לאחר קבלת חוות דעת מקצועית מבעל רישיון מתאים.
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
