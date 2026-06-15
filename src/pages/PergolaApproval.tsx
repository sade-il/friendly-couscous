import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  FileText,
  HelpCircle,
  MessageCircle,
  ShieldCheck,
  TreePine,
  AlertTriangle,
  Info,
  RotateCcw,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";
import { EngineeringGridBackground } from "@/components/site/EngineeringGridBackground";
import { Seo } from "@/components/site/Seo";
import { PergolaEngineCalculator } from "@/components/site/PergolaEngineCalculator";
import { Button } from "@/components/ui/button";
import { waLink, openWhatsApp } from "@/lib/whatsapp";
import { track } from "@/lib/analytics";

const PATH = "/services/pergola-approval";
const CANONICAL = "https://sade-il.com/services/pergola-approval";

const WA_TEXT =
  "שלום, ראיתי את העמוד אישור קונסטרוקטור לפרגולה. אצרף תמונות ומידות לבדיקה.";

const META = {
  title: "אישור קונסטרוקטור לפרגולה — יציבות, עיגון ודיווח לרשות",
  description:
    "פרגולה עד 50 מ״ר פטורה מהיתר — אך החוק מחייב דיווח לרשות תוך 45 יום ואישור מהנדס על עיגון ויציבות; בדיקת עומסים לפי ת״י 414, אישור חתום; ראשל״צ והמרכז.",
};

const faqs = [
  {
    q: "האם פרגולה פטורה מהיתר?",
    a: "עד 50 מ״ר או רבע מהשטח הפנוי במגרש (הגדול מבין השניים), ללא קירות, חומרים קלים ושיעור פתחים בגג של 40% לפחות — הפרגולה פטורה מהיתר; אך חובה דיווח לרשות הרישוי תוך 45 יום וצירוף אישור מהנדס על עיגון ויציבות.",
  },
  {
    q: "מי חותם על אישור היציבות?",
    a: "לפי תקנה 12, בפרגולה על קרקע או על מבנה פשוט (מפתח עד 6 מ׳, עד 4 קומות) — האישור יכול להיחתם בידי הנדסאי בניין רשום (מ.ר. 35825), ולכן ברוב הפרגולות הפרטיות אנחנו חותמים ישירות. מהנדס מבנים נדרש רק כאשר המבנה אינו פשוט.",
  },
  {
    q: "פרגולה על מרפסת או על גג — מה צריך?",
    a: "יש לוודא שהמבנה נושא את העומס הנוסף (עומס עצמי, רוח ושלג). נדרשת בדיקת קונסטרוקטור של האלמנט הנושא, פרט עיגון מתאים, ולעיתים חיזוקים נקודתיים.",
  },
  {
    q: "פרגולה במרפסת זיזית (קונסולית) — מה הסיכון?",
    a: "הצבת עמודים על קצה הזיז מוסיפה עומס נקודתי מסוכן במקום הרגיש ביותר של המרפסת. בדרך כלל מעגנים את הפרגולה לקיר המבנה במקום להעמיד עמודים על הזיז. חובה בדיקת קונסטרוקטור לפני הקמה.",
  },
  {
    q: "קירוי מפני גשם או סנטף — מותר?",
    a: "מותר אם הקירוי קל: אריג/סככת צל עד 3.5 ק״ג/מ״ר (בגובה עד 3 מ׳ ובמפתח עד 5 מ׳), או קירוי שקוף (סנטף/פוליקרבונט) בהתאם להנחיות המרחביות של הוועדה המקומית. קירוי כבד מוציא את הפרגולה מהפטור.",
  },
  {
    q: "מעל 50 מ״ר או חריגה מקו בניין — מה עושים?",
    a: "כאשר הפרגולה חורגת מתנאי הפטור (שטח, קווי בניין, קירות וכדומה) נדרש היתר בנייה — לעיתים במסלול רישוי מקוצר של 25 יום (שתיקת הוועדה כאישור). אנחנו מלווים את ההגשה ומכינים את המסמכים ההנדסיים.",
  },
  {
    q: "האם הפטור פוטר גם מארנונה?",
    a: "לא. חיוב הארנונה נקבע ע״י הרשות המקומית בנפרד מדיני הרישוי, וייתכן שתסווג הפרגולה כשטח עיקרי/שירות לצורכי ארנונה גם כשהיא פטורה מהיתר.",
  },
];

type Choice = { value: string; label: string; flag?: "permit" | "danger" | "info" };

const QUESTIONS: {
  id: string;
  label: string;
  help?: string;
  options: Choice[];
  conditional?: (a: Record<string, string>) => boolean;
}[] = [
  {
    id: "area",
    label: "שטח הפרגולה",
    options: [
      { value: "le50", label: "עד 50 מ״ר" },
      { value: "gt50_le_quarter", label: "מעל 50 מ״ר אך עד ¼ מהשטח הפנוי" },
      { value: "gt_both", label: "מעל 50 מ״ר וגם מעל ¼", flag: "permit" },
    ],
  },
  {
    id: "walls",
    label: "קירות",
    options: [
      { value: "none", label: "ללא קירות" },
      { value: "one", label: "קיר אחד נשען על המבנה" },
      { value: "full", label: "סגירה מלאה / יותר מקיר אחד", flag: "permit" },
    ],
  },
  {
    id: "roof",
    label: "פתיחה בתקרה",
    options: [
      { value: "open40", label: "פתוח 40% ומעלה" },
      { value: "closed", label: "אטום מעל 60%", flag: "permit" },
    ],
  },
  {
    id: "location",
    label: "מיקום ההקמה",
    options: [
      { value: "ground", label: "על קרקע" },
      { value: "roof", label: "על גג", flag: "info" },
      { value: "balcony", label: "מרפסת רגילה", flag: "info" },
      { value: "cantilever", label: "מרפסת זיזית (קונסולית)", flag: "info" },
    ],
  },
  {
    id: "cantilever",
    label: "במרפסת הזיזית — איך הפרגולה נתמכת?",
    help: "עמודים על קצה הזיז יוצרים עומס מסוכן.",
    conditional: (a) => a.location === "cantilever",
    options: [
      { value: "wall", label: "מעוגנת לקיר המבנה" },
      { value: "edge", label: "עמודים על קצה המרפסת", flag: "danger" },
      { value: "unknown", label: "לא בטוח/ה", flag: "info" },
    ],
  },
  {
    id: "lines",
    label: "קווי בניין",
    options: [
      { value: "inside", label: "בתוך קווי הבניין" },
      { value: "outside", label: "חורגת מקווי הבניין", flag: "permit" },
      { value: "unknown", label: "לא בטוח/ה", flag: "info" },
    ],
  },
  {
    id: "cover",
    label: "קירוי נוסף",
    options: [
      { value: "none", label: "אין קירוי" },
      { value: "light", label: "קל/שקוף (אריג עד 3.5 ק״ג/מ״ר או סנטף)" },
      { value: "heavy", label: "קירוי כבד/חורג", flag: "permit" },
    ],
  },
  {
    id: "area_type",
    label: "אזור גיאוגרפי/תכנוני",
    options: [
      { value: "regular", label: "אזור רגיל" },
      { value: "preserve", label: "אזור שימור", flag: "permit" },
      { value: "special", label: "שמורה / חוף / חקלאי", flag: "info" },
      { value: "unknown", label: "לא בטוח/ה", flag: "info" },
    ],
  },
  {
    id: "rights",
    label: "זכויות בנייה ותב״ע",
    options: [
      { value: "ok", label: "בעל זכות ותואם תב״ע" },
      { value: "no", label: "לא תואם תב״ע", flag: "permit" },
      { value: "unknown", label: "לא בדקתי" },
    ],
  },
];

type Verdict = "exempt" | "permit" | "danger";

function evaluate(a: Record<string, string>): {
  verdict: Verdict;
  notes: string[];
} | null {
  const required = QUESTIONS.filter((q) => !q.conditional || q.conditional(a));
  for (const q of required) {
    if (!a[q.id]) return null;
  }

  const notes: string[] = [];

  // Danger first.
  if (a.location === "cantilever" && a.cantilever === "edge") {
    return {
      verdict: "danger",
      notes: [
        "עמודים על קצה מרפסת זיזית מסוכנים — חובה בדיקת קונסטרוקטור לפני כל הקמה.",
      ],
    };
  }

  // Hard permit triggers.
  const permitFlags = required.some(
    (q) => q.options.find((o) => o.value === a[q.id])?.flag === "permit",
  );
  if (permitFlags) {
    if (a.area === "gt_both") notes.push("שטח מעל 50 מ״ר וגם מעל ¼ מהשטח הפנוי — מחוץ לתנאי הפטור.");
    if (a.walls === "full") notes.push("פרגולה עם סגירת קירות אינה מצללה לפי תקנה 12.");
    if (a.roof === "closed") notes.push("קירוי אטום מעל 60% מוציא מהפטור — נדרש היתר.");
    if (a.lines === "outside") notes.push("חריגה מקווי הבניין מחייבת היתר או מסלול רישוי מקוצר.");
    if (a.cover === "heavy") notes.push("קירוי כבד/חורג — נדרש היתר ובדיקת עומסים מותאמת.");
    if (a.area_type === "preserve") notes.push("אזור שימור — נדרשים אישורים ייעודיים גם בפרגולה.");
    if (a.rights === "no") notes.push("חוסר תאימות תב״ע — יש להסדיר מול הוועדה לפני הקמה.");
    notes.push("ברוב המקרים אפשר מסלול רישוי מקוצר (25 יום, שתיקה=אישור). אנחנו מלווים את ההגשה.");
    return { verdict: "permit", notes };
  }

  // Conditional notes for exempt path.
  if (a.location === "balcony")
    notes.push("פרגולה על מרפסת בבניין מגורים — מחוץ לפטור כברירת מחדל; יש לאמת מול הוועדה.");
  if (a.location === "roof")
    notes.push("על גג — נדרשת בדיקת עומס של אלמנט הגג ופרט עיגון מתאים.");
  if (a.location === "cantilever" && a.cantilever === "wall")
    notes.push("מרפסת זיזית עם עיגון לקיר — נדרש פרט עיגון חתום ובדיקת חיבור.");
  if (a.cover === "light")
    notes.push("קירוי קל מותר — נוודא משקל ועמידה בהנחיות המרחביות.");
  if (a.area_type === "special")
    notes.push("שמורה/חוף/חקלאי — נדרשים אישורי גורם מוסמך מעבר לפטור.");
  if (a.area === "gt50_le_quarter")
    notes.push("שטח מעל 50 מ״ר במגרש גדול — נאמת חישוב ¼ מהשטח הפנוי בפועל.");
  if (a.lines === "unknown" || a.area_type === "unknown" || a.rights === "unknown")
    notes.push("יש פרטים שאינם ידועים — נאמת מול הוועדה המקומית כדי לסגור פינות.");

  return {
    verdict: "exempt",
    notes: [
      "כנראה פטורה מהיתר — אך מחייבת דיווח לרשות הרישוי תוך 45 יום וצירוף אישור עיגון ויציבות.",
      "על קרקע או מבנה פשוט — הנדסאי בניין רשום (מ.ר. 35825) חותם על האישור.",
      ...notes,
    ],
  };
}

export default function PergolaApproval() {
  useEffect(() => {
    track("service_page_view", { page: "pergola_exemption" });
  }, []);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const visibleQs = QUESTIONS.filter((q) => !q.conditional || q.conditional(answers));
  const result = useMemo(() => evaluate(answers), [answers]);
  const progress = Math.round(
    (visibleQs.filter((q) => answers[q.id]).length / visibleQs.length) * 100,
  );

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value };
      // Clear dependent answers if parent changes.
      if (id === "location" && value !== "cantilever") delete next.cantilever;
      return next;
    });
    track("pergola_checker_answer", { question: id, answer: value });
  };

  const reset = () => {
    setAnswers({});
    track("pergola_checker_reset", {});
  };

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
    serviceType: "אישור קונסטרוקטור לפרגולה",
    name: "אישור קונסטרוקטור לפרגולה — יציבות, עיגון ודיווח לרשות",
    description: META.description,
    areaServed: ["ראשון לציון", "מרכז", "ישראל"],
    provider: {
      "@type": "ProfessionalService",
      name: "א. סדצקי הנדסה וייעוץ",
      url: "https://sade-il.com",
      telephone: "+972524209183",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "ILS",
      price: "1000",
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: "ILS",
        minPrice: 1000,
        maxPrice: 2500,
      },
    },
  };

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://sade-il.com/" },
      { "@type": "ListItem", position: 2, name: "אישור פרגולה", item: CANONICAL },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={META.title}
        description={META.description}
        path={PATH}
        canonical={CANONICAL}
        ogType="article"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(serviceJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
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
                <li><Link to="/#services" className="hover:text-accent transition-smooth">שירותים</Link></li>
                <li aria-hidden><ChevronLeft className="w-3.5 h-3.5" /></li>
                <li className="text-accent" aria-current="page">אישור פרגולה</li>
              </ol>
            </nav>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur px-3 py-1.5 mb-5 text-xs sm:text-sm">
                <TreePine className="w-4 h-4 text-teal" />
                <span className="text-primary-foreground/90">פטור מהיתר + דיווח 45 יום</span>
              </div>
              <h1 className="t-h1 text-primary-foreground leading-tight">
                אישור קונסטרוקטור לפרגולה — חתום, יציב, מוכן לדיווח לרשות
              </h1>
              <p className="mt-5 t-lead text-primary-foreground/85 max-w-2xl">
                לפי תיקון 101 לחוק התכנון והבנייה, פרגולה עד 50 מ״ר פטורה מהיתר — אך הפטור מותנה
                בדיווח לרשות הרישוי תוך 45 יום ובצירוף אישור מהנדס על עיגון המצללה ויציבותה.
                אנחנו עושים בדיוק את זה: בדיקת עומסים לפי ת״י 414, אישור חתום ומוכן להגשה,
                מענה תוך 24 שעות, ראשון לציון והמרכז.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="xl">
                  <a
                    href={waLink(WA_TEXT)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      track("pergola_exemption_cta_click", { cta: "hero_whatsapp" });
                      openWhatsApp(e, WA_TEXT);
                    }}
                  >
                    <MessageCircle className="w-5 h-5" /> שליחה בוואטסאפ
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="xl">
                  <a
                    href="#checker"
                    onClick={() => track("pergola_exemption_cta_click", { cta: "hero_to_checker" })}
                  >
                    בדיקת פטור / היתר <ArrowLeft className="w-5 h-5" />
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="xl">
                  <a
                    href="#engineering-calculator"
                    onClick={() => track("pergola_exemption_cta_click", { cta: "hero_to_calculator" })}
                  >
                    מחשבון חתכים לפי תקן <ArrowLeft className="w-5 h-5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Knowledge — Regulation 12 */}
        <section className="py-20 lg:py-24" aria-labelledby="reg-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">מה אומר החוק</span>
              <h2 id="reg-title" className="mt-3 t-h2">תקנה 12 — מה זו מצללה ומתי היא פטורה</h2>
              <p className="mt-4 t-lead">
                מצללה היא מבנה ללא קירות, מחומרים קלים, עם תקרה פתוחה ב-40% לפחות (אטומה עד 60%).
                הפטור מותנה במספר תנאים מצטברים, וגם כשהוא מתקיים — נדרש דיווח לרשות תוך 45 יום
                בצירוף אישור עיגון ויציבות חתום.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: "שטח מותר", desc: "עד 50 מ״ר או רבע מהשטח הפנוי במגרש — הגדול מבין השניים." },
                { title: "מיקום", desc: "על קרקע או על גג בלבד — לא על מרפסת בבניין כברירת מחדל; הכל בתוך קווי הבניין." },
                { title: "ללא קירות", desc: "מצללה אינה כוללת קירות; קירוי קל בלבד עם פתיחה בגג של 40% ומעלה." },
                { title: "דיווח ואישור", desc: "דיווח לרשות תוך 45 יום + אישור מהנדס/הנדסאי על עיגון ויציבות." },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl bg-card border border-border shadow-card p-6">
                  <div className="w-11 h-11 rounded-xl bg-teal/10 text-teal grid place-items-center mb-4">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h3 className="t-h3 leading-snug">{c.title}</h3>
                  <p className="t-body text-foreground/80 mt-2 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-accent/10 border border-accent/30 p-5 sm:p-6 flex items-start gap-3">
              <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <p className="t-body text-foreground/90 leading-relaxed">
                חשוב לדעת: לפי תקנה 12, על קרקע או מבנה פשוט (מפתח עד 6 מ׳, עד 4 קומות) האישור
                יכול להיחתם בידי הנדסאי בניין רשום — <b>מ.ר. 35825</b> — ולכן ברוב הפרגולות
                הפרטיות אנחנו חותמים ישירות; מהנדס נדרש רק במבנה שאינו פשוט.
              </p>
            </div>
          </div>
        </section>

        {/* Roofing categories */}
        <section className="py-20 lg:py-24 bg-muted/30 border-y border-border" aria-labelledby="cover-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">קירוי מותר</span>
              <h2 id="cover-title" className="mt-3 t-h2">שלוש קטגוריות קירוי לפרגולה פטורה</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { title: "שלד חומרים קלים", desc: "עץ, אלומיניום או פלדה קלה — ללא קירוי כבד." },
                { title: "אריג / סככת צל", desc: "עד 3.5 ק״ג/מ״ר, גובה עד 3 מ׳, מפתח עד 5 מ׳." },
                { title: "קירוי שקוף (סנטף)", desc: "מותר ללא קירות, בהתאם להנחיות המרחביות של הוועדה." },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl bg-card border border-border shadow-card p-6">
                  <h3 className="t-h3 leading-snug">{c.title}</h3>
                  <p className="t-body text-foreground/80 mt-2 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* When exempt / engineer / permit */}
        <section className="py-20 lg:py-24" aria-labelledby="paths-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">מתי פטור, מתי היתר</span>
              <h2 id="paths-title" className="mt-3 t-h2">שלושה מסלולים אפשריים</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-card border border-border shadow-card p-6">
                <div className="text-teal font-mono text-xs tracking-widest">פטור</div>
                <h3 className="t-h3 mt-2 leading-snug">פטור מהיתר</h3>
                <p className="t-body text-foreground/80 mt-2 leading-relaxed">
                  עד 50 מ״ר / ¼, ללא קירות, 40% פתוח, על קרקע או גג, בתוך קווי הבניין —
                  בכפוף לדיווח 45 יום ואישור עיגון.
                </p>
              </div>
              <div className="rounded-2xl bg-card border border-accent/40 shadow-card p-6">
                <div className="text-accent font-mono text-xs tracking-widest">בדיקה</div>
                <h3 className="t-h3 mt-2 leading-snug">חובת בדיקת מהנדס</h3>
                <p className="t-body text-foreground/80 mt-2 leading-relaxed">
                  פרגולה על גג, מרפסת או מרפסת זיזית, וכן קירוי כבד — חייבים בדיקת קונסטרוקטור
                  של המבנה הנושא.
                </p>
              </div>
              <div className="rounded-2xl bg-card border border-border shadow-card p-6">
                <div className="text-gold font-mono text-xs tracking-widest">היתר</div>
                <h3 className="t-h3 mt-2 leading-snug">היתר / מסלול מקוצר</h3>
                <p className="t-body text-foreground/80 mt-2 leading-relaxed">
                  מעל 50 מ״ר וגם מעל ¼, חריגה מקווי בניין, סגירת קירות או פרגולה במרפסת בבניין —
                  נדרש היתר; לעיתים במסלול 25 יום.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="py-20 lg:py-24 bg-muted/30 border-y border-border" aria-labelledby="get-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">מה מקבלים</span>
              <h2 id="get-title" className="mt-3 t-h2">חבילת אישור הפרגולה</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: CheckCircle2, title: "בדיקת עומסים", desc: "לפי ת״י 414 — רוח, עומס עצמי ושימוש." },
                { icon: ShieldCheck, title: "אישור עיגון ויציבות", desc: "מסמך חתום, מוכן לדיווח לרשות." },
                { icon: FileText, title: "ליווי לטופס 45 יום", desc: "הכוונה למילוי טופס הדיווח לרשות הרישוי." },
                { icon: TreePine, title: "פרט חיזוק", desc: "במידה ונדרש — פרט הנדסי קצר וברור לביצוע." },
              ].map((c) => (
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

        {/* Process */}
        <section className="py-20 lg:py-24" aria-labelledby="process-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">תהליך העבודה</span>
              <h2 id="process-title" className="mt-3 t-h2">שלושה צעדים עד האישור</h2>
            </div>
            <ol className="grid md:grid-cols-3 gap-4">
              {[
                { step: "1", title: "תמונות + מידות בוואטסאפ", desc: "מענה תוך 24 שעות עם הערכה ראשונית והצעת מחיר." },
                { step: "2", title: "בדיקת עומסים ועיגון", desc: "ניתוח לפי ת״י 414 ופרטי עיגון מותאמים לאתר." },
                { step: "3", title: "אישור חתום + ליווי דיווח", desc: "מסמך חתום מוכן להגשה, וליווי בטופס 45 יום." },
              ].map((p) => (
                <li key={p.step} className="rounded-2xl bg-card border border-border shadow-card p-6">
                  <div className="text-accent font-mono text-sm tracking-widest">שלב {p.step}</div>
                  <h3 className="t-h3 mt-2 leading-snug">{p.title}</h3>
                  <p className="t-body text-foreground/80 mt-2 leading-relaxed">{p.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Price */}
        <section className="py-20 lg:py-24 bg-muted/30 border-y border-border" aria-labelledby="price-title">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-2xl bg-card border border-border shadow-card p-8 sm:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <span className="t-eyebrow">מחיר</span>
                <h2 id="price-title" className="mt-3 t-h2">כ-1,000 עד 2,500 ₪</h2>
                <p className="mt-3 t-body text-foreground/80 leading-relaxed max-w-xl">
                  המחיר נקבע לפי גודל, מיקום ומורכבות העיגון. הצעת מחיר שקופה מראש — ללא הפתעות.
                </p>
              </div>
              <Button asChild variant="hero" size="lg">
                <a
                  href={waLink(WA_TEXT)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    track("pergola_exemption_cta_click", { cta: "price_whatsapp" });
                    openWhatsApp(e, WA_TEXT);
                  }}
                >
                  <MessageCircle className="w-5 h-5" /> קבלת הצעה
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Why us */}
        <section className="py-20 lg:py-24" aria-labelledby="why-title">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">למה אנחנו</span>
              <h2 id="why-title" className="mt-3 t-h2">איליה סדצקי — הנדסאי בניין רשום</h2>
            </div>
            <ul className="grid sm:grid-cols-2 gap-3">
              {[
                "מעל 20 שנות ניסיון בהנדסה אזרחית וקונסטרוקציה",
                "ניהול ביצוע באשטרום — כולל הקמת הדיפו של הרכבת הקלה בירושלים",
                "הנדסאי בניין רשום — מ.ר. 35825, חותם ישירות בפרגולות פטורות",
                "מענה תוך 24 שעות, ראשון לציון והמרכז",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-card"
                >
                  <CheckCircle2 className="w-5 h-5 text-teal shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Interactive checker */}
        <section
          id="checker"
          className="py-20 lg:py-24 bg-primary text-primary-foreground scroll-mt-28"
          aria-labelledby="checker-title"
        >
          <div className="container mx-auto max-w-4xl">
            <div className="max-w-2xl mb-8">
              <span className="t-eyebrow text-accent">כלי אבחון</span>
              <h2 id="checker-title" className="mt-3 t-h2 text-primary-foreground">
                בודק פטור / אישור לפרגולה
              </h2>
              <p className="mt-4 t-lead text-primary-foreground/80">
                ענו על מספר שאלות קצרות כדי לקבל אומדן ראשוני: פטור עם דיווח, חובת בדיקה,
                או נתיב היתר.
              </p>
            </div>

            {/* Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs text-primary-foreground/70 mb-2 t-mono">
                <span>התקדמות</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-primary-foreground/10 overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="space-y-6">
              {visibleQs.map((q, qi) => (
                <fieldset
                  key={q.id}
                  className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/[0.03] p-5 sm:p-6"
                >
                  <legend className="px-2 t-h3 text-primary-foreground flex items-center gap-2">
                    <span className="text-accent font-mono text-sm">
                      {String(qi + 1).padStart(2, "0")}
                    </span>
                    {q.label}
                  </legend>
                  {q.help && (
                    <p className="mt-2 t-small text-primary-foreground/65">{q.help}</p>
                  )}
                  <div className="mt-4 grid sm:grid-cols-2 gap-2">
                    {q.options.map((o) => {
                      const selected = answers[q.id] === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setAnswer(q.id, o.value)}
                          aria-pressed={selected}
                          className={`text-right px-4 py-3 rounded-xl border transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary ${
                            selected
                              ? "bg-accent text-accent-foreground border-accent"
                              : "bg-primary-foreground/5 text-primary-foreground/90 border-primary-foreground/15 hover:border-accent/60 hover:bg-primary-foreground/10"
                          }`}
                        >
                          <span className="t-body">{o.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>

            {/* Result */}
            <div className="mt-8" aria-live="polite">
              {result ? (
                <div
                  className={`rounded-2xl p-6 sm:p-8 border ${
                    result.verdict === "danger"
                      ? "bg-destructive/15 border-destructive/50"
                      : result.verdict === "permit"
                        ? "bg-gold/10 border-gold/40"
                        : "bg-teal/15 border-teal/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.verdict === "danger" ? (
                      <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
                    ) : result.verdict === "permit" ? (
                      <FileText className="w-6 h-6 text-gold shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 text-teal shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h3 className="t-h3 text-primary-foreground">
                        {result.verdict === "danger"
                          ? "עצרו — נדרש קונסטרוקטור לפני הקמה"
                          : result.verdict === "permit"
                            ? "כנראה נדרש היתר"
                            : "כנראה פטורה — אך חובה דיווח 45 יום"}
                      </h3>
                      <ul className="mt-3 space-y-2 t-body text-primary-foreground/85 leading-relaxed">
                        {result.notes.map((n) => (
                          <li key={n} className="flex items-start gap-2">
                            <span className="text-accent mt-2 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button asChild variant="hero" size="lg">
                          <a
                            href={waLink(WA_TEXT)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              track("pergola_checker_result_cta", {
                                verdict: result.verdict,
                                cta: "whatsapp",
                              });
                              openWhatsApp(e, WA_TEXT);
                            }}
                          >
                            <MessageCircle className="w-5 h-5" /> שליחת תמונה ומידות
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="outlineHero"
                          size="lg"
                          onClick={reset}
                        >
                          <RotateCcw className="w-4 h-4" /> בדיקה מחדש
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="t-small text-primary-foreground/60">
                  השלימו את כל השאלות לקבלת תוצאה.
                </p>
              )}
            </div>

            <p className="mt-6 t-small text-primary-foreground/55 leading-relaxed">
              אומדן ראשוני בלבד — אינו ייעוץ משפטי, וכפוף להנחיות המרחביות של הוועדה המקומית
              ולתנאי הנכס בפועל.
            </p>
          </div>
        </section>

        {/* Engineering element calculator — real, standards-based */}
        <section
          id="engineering-calculator"
          className="py-20 lg:py-24 bg-muted/30 border-y border-border scroll-mt-28"
          aria-labelledby="eng-calc-title"
        >
          <div className="container mx-auto max-w-3xl">
            <div className="max-w-2xl mb-8">
              <span className="t-eyebrow">מחשבון הנדסי</span>
              <h2 id="eng-calc-title" className="mt-3 t-h2">
                מחשבון אלמנטים לפרגולה — לפי ת״י 414 / 412
              </h2>
              <p className="mt-4 t-lead">
                אומדן חתכים לקורות ולעמודים לפי עומסי רוח (ת״י 414), יניקה ועיגון — לא כלל
                אצבע, אלא חישוב לפי תקן. אומדן ראשוני בלבד; האישור הסופי נבדק ונחתם על ידינו.
              </p>
            </div>
            <div className="rounded-2xl bg-card border border-border shadow-card p-5 sm:p-7">
              <PergolaEngineCalculator />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="pergola-exempt-faq"
          className="py-20 lg:py-24"
          aria-labelledby="pergola-exempt-faq-title"
        >
          <div className="container mx-auto max-w-4xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">שאלות נפוצות</span>
              <h2 id="pergola-exempt-faq-title" className="mt-3 t-h2">
                פרגולה, פטור ודיווח — שאלות חוזרות
              </h2>
            </div>
            <ul className="space-y-3">
              {faqs.map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <li
                    key={f.q}
                    className="rounded-2xl bg-card border border-border shadow-card overflow-hidden"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`pgx-faq-panel-${i}`}
                      id={`pgx-faq-trigger-${i}`}
                      onClick={() => {
                        const next = isOpen ? null : i;
                        setOpenFaq(next);
                        if (next !== null)
                          track("faq_open", {
                            page: "pergola_exemption",
                            index: i,
                            question: f.q,
                          });
                      }}
                      className="w-full flex items-center justify-between gap-4 text-right px-5 py-4 sm:px-6 sm:py-5 hover:bg-muted/40 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <HelpCircle className="w-5 h-5 text-teal shrink-0" />
                        <span className="t-h3 leading-snug">{f.q}</span>
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div
                        id={`pgx-faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`pgx-faq-trigger-${i}`}
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

        {/* Bottom CTA */}
        <section className="py-16 lg:py-20" aria-labelledby="cta-title">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-8 sm:p-12 shadow-elevated flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 id="cta-title" className="t-h2">
                  מוכנים לקבל אישור פרגולה חתום?
                </h2>
                <p className="mt-3 t-lead text-primary-foreground/85 max-w-xl">
                  שלחו תמונות ומידות בוואטסאפ — מענה תוך 24 שעות עם הצעת מחיר, לוח זמנים
                  והכוונה לדיווח 45 יום.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button asChild variant="hero" size="lg">
                  <a
                    href={waLink(WA_TEXT)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      track("pergola_exemption_cta_click", { cta: "bottom_whatsapp" });
                      openWhatsApp(e, WA_TEXT);
                    }}
                  >
                    <MessageCircle className="w-5 h-5" /> WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="lg">
                  <Link
                    to="/#contact"
                    onClick={() =>
                      track("pergola_exemption_cta_click", { cta: "bottom_contact" })
                    }
                  >
                    טופס יצירת קשר <ArrowLeft className="w-4 h-4" />
                  </Link>
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
