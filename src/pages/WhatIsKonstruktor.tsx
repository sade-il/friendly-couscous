import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  ChevronLeft,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
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

const PATH = "/articles/what-is-konstruktor";
const SITE = "https://sade-il.com";

const WA_TEXT = "שלום, אשמח לבדוק האם נדרש אישור קונסטרוקטור לפרויקט שלי.";

const META = {
  title: "מה זה קונסטרוקטור ומתי נדרש אישור מהנדס מבנים? | א. סדצקי",
  description:
    "מדריך קצר: מה תפקיד הקונסטרוקטור, מתי החוק מחייב אישור מהנדס מבנים, באיזה שלב פונים אליו וכמה זה עולה. כתוב על ידי מהנדס פעיל במרכז הארץ.",
};

const whenNeeded = [
  "פתיחת פתח או הריסת קיר נושא בדירה",
  "תוספת בנייה — חדר, מרפסת, יחידת דיור, פרגולה גדולה או סככה",
  "תוספת ממ״ד דירתי או קומתי",
  "חיזוק מבנה קיים, ליווי תמ״א 38 או תוספת קומה",
  "סדיקה, רטיבות מבנית, חשד למבנה מסוכן",
  "רכישת דירה או בית — לפני חתימה על חוזה",
  "ליקויי בנייה בדירה חדשה מקבלן",
];

const myths = [
  {
    q: '"קבלן יכול להחליט לבד מה לעשות"',
    a: "קבלן הוא מבצע, לא מאשר. כל שינוי באלמנט נושא — קיר, קורה, עמוד או יסוד — מחייב חישוב סטטי וחתימת מהנדס מבנים, ללא קשר לניסיון של הקבלן.",
  },
  {
    q: '"אם זה פטור מהיתר אז לא צריך מהנדס"',
    a: "פטור מהיתר (למשל פרגולה לפי תיקון 12 לתקנה 101) הוא פטור מהליך מול הוועדה — לא פטור מאחריות הנדסית. עיגון, עומסי רוח ויציבות עדיין דורשים אישור מהנדס.",
  },
  {
    q: '"מספיק שאדריכל יחתום"',
    a: "אדריכל אחראי על תכנון פנים ועל הגשת היתר, אך לא על חישובים סטטיים של עומסים. בכל שינוי באלמנט נושא נדרשת חתימה נפרדת של מהנדס מבנים (קונסטרוקטור).",
  },
];

const faqs = [
  {
    q: "מה ההבדל בין קונסטרוקטור, מהנדס מבנים ואדריכל?",
    a: "אדריכל מתכנן את הצורה והשימוש בחלל. מהנדס מבנים (המכונה גם קונסטרוקטור) מתכנן את השלד — הקירות הנושאים, הקורות, העמודים והיסודות — ומבצע את החישובים הסטטיים שמבטיחים שהמבנה יעמוד בעומסים. בישראל זו התמחות נפרדת המחייבת רישום בפנקס המהנדסים והאדריכלים.",
  },
  {
    q: "מתי חייבים אישור מהנדס מבנים על פי חוק?",
    a: "כל הוצאת היתר בנייה דורשת חתימת קונסטרוקטור על חישוב סטטי. גם עבודות פטורות מהיתר (כמו פרגולה לפי תיקון 12) מחייבות אחריות הנדסית. בעבודות פנים — פתיחת פתח בקיר נושא, הריסת קיר או תוספת עומסים — אסור לבצע ללא תכנון וחתימה של מהנדס מבנים. הפרת חוק התכנון והבנייה היא עבירה פלילית.",
  },
  {
    q: "באיזה שלב פונים לקונסטרוקטור?",
    a: "כמה שיותר מוקדם. אם יש לכם רעיון לתוספת בנייה, לשינוי פנימי או לפרגולה — שיחת ייעוץ קצרה מאפשרת לבדוק היתכנות לפני שהוצאתם הצעות מחיר מקבלנים, וחוסכת שינויים יקרים בהמשך.",
  },
  {
    q: "כמה עולה אישור קונסטרוקטור?",
    a: "המחיר תלוי בסוג העבודה ובמורכבותה. אישור פרגולה לבית פרטי הוא לרוב פרויקט קצר; תכנון ממ״ד או תמ״א 38 — פרויקט גדול יותר. אנחנו נותנים הצעת מחיר חתומה מראש, ללא הפתעות, לאחר שיחה קצרה ובחינת תמונות ומסמכים.",
  },
  {
    q: "מה קורה אם בונים בלי אישור מהנדס?",
    a: "מעבר לסכנת נפשות אמיתית במקרה של קריסה: הרשות יכולה להוציא צו הפסקת עבודה או צו הריסה, חברת הביטוח רשאית לדחות כל תביעה הקשורה לעבודה, ובמכירת הנכס עורכי הדין יסרבו להעביר זכויות ללא תיעוד הנדסי. בנוסף — האחריות האישית של בעל הנכס היא מלאה.",
  },
];

export default function WhatIsKonstruktor() {
  useEffect(() => {
    track("article_view", { article: "what-is-konstruktor" });
  }, []);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "מה זה קונסטרוקטור ומתי נדרש אישור מהנדס מבנים?",
    description: META.description,
    author: {
      "@type": "Person",
      name: "איליה סדצקי",
      jobTitle: "הנדסאי בניין רשום (מ.ר. 35825)",
    },
    publisher: {
      "@type": "Organization",
      name: "א. סדצקי הנדסה וייעוץ",
      logo: { "@type": "ImageObject", url: `${SITE}/logo.jpg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}${PATH}` },
    inLanguage: "he-IL",
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "מאמרים", item: `${SITE}/articles/what-is-konstruktor` },
      { "@type": "ListItem", position: 3, name: "מה זה קונסטרוקטור", item: `${SITE}${PATH}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title={META.title} description={META.description} path={PATH} ogType="article" />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>
      <EngineeringGridBackground />
      <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
      <Header />

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section className="relative bg-gradient-hero text-primary-foreground overflow-hidden">
          <div className="container mx-auto py-16 sm:py-24 lg:py-28 relative">
            <nav aria-label="פירורי לחם" className="mb-6 text-sm text-primary-foreground/75">
              <ol className="flex items-center gap-2 flex-wrap">
                <li><Link to="/" className="hover:text-accent transition-smooth">דף הבית</Link></li>
                <li aria-hidden><ChevronLeft className="w-3.5 h-3.5" /></li>
                <li className="text-accent" aria-current="page">מה זה קונסטרוקטור</li>
              </ol>
            </nav>
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur px-3 py-1.5 mb-5 text-xs sm:text-sm">
                <BookOpen className="w-4 h-4 text-teal" />
                <span className="text-primary-foreground/90">מדריך הסבר</span>
              </div>
              <h1 className="t-h1 text-primary-foreground leading-tight">
                מה זה קונסטרוקטור ומתי נדרש אישור מהנדס מבנים?
              </h1>
              <p className="mt-5 t-lead text-primary-foreground/80 max-w-2xl">
                מדריך קצר ומעשי לכל מי ששוקל שינוי בדירה, תוספת בנייה, פרגולה או רכישת נכס — מה
                תפקידו של הקונסטרוקטור, מתי החוק מחייב אישור, ולמה לא כדאי לוותר עליו גם כשנדמה
                שאפשר.
              </p>
            </div>
          </div>
        </section>

        {/* Definition */}
        <section className="py-20 lg:py-24" aria-labelledby="definition-title">
          <div className="container mx-auto max-w-3xl">
            <span className="t-eyebrow">הגדרה</span>
            <h2 id="definition-title" className="mt-3 t-h2">מה זה קונסטרוקטור?</h2>
            <p className="mt-4 t-lead">
              קונסטרוקטור הוא <strong>מהנדס מבנים</strong> — בעל הסמכה ורישום בפנקס המהנדסים
              והאדריכלים — שתפקידו לתכנן ולחשב את <strong>השלד הנושא</strong> של המבנה: יסודות,
              עמודים, קורות, קירות נושאים ותקרות. בכל פרויקט בנייה בישראל, מבית פרטי ועד מגדל,
              הקונסטרוקטור הוא זה שמבטיח שהמבנה יעמוד בעומסים — משקל עצמי, רוח, רעידות אדמה
              ועומסי שימוש — לאורך עשרות שנים.
            </p>
            <p className="mt-4 t-body text-foreground/80 leading-relaxed">
              בניגוד לאדריכל — שמתכנן צורה, חלוקה ושימוש — הקונסטרוקטור מתעסק רק במה שמחזיק את
              הבניין. שניהם עובדים יחד, אבל אלו תפקידים שונים, עם רישיונות שונים ואחריות שונה
              בחוק.
            </p>
          </div>
        </section>

        {/* When needed */}
        <section
          className="py-20 lg:py-24 bg-muted/30 border-y border-border"
          aria-labelledby="when-title"
        >
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-2xl mb-10">
              <span className="t-eyebrow">מתי נדרש</span>
              <h2 id="when-title" className="mt-3 t-h2">מתי בכלל צריך קונסטרוקטור?</h2>
              <p className="mt-4 t-lead">
                לא כל פרויקט דורש מהנדס מבנים — אבל הרשימה הבאה כן. בכל אחד מהמקרים האלה החוק או
                בטיחות המבנה מחייבים תכנון ואישור חתום של קונסטרוקטור.
              </p>
            </div>
            <ul className="grid sm:grid-cols-2 gap-3">
              {whenNeeded.map((item) => (
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

        {/* Myths */}
        <section className="py-20 lg:py-24" aria-labelledby="myths-title">
          <div className="container mx-auto max-w-3xl">
            <span className="t-eyebrow">טעויות נפוצות</span>
            <h2 id="myths-title" className="mt-3 t-h2">מה לא לעשות — שלוש טעויות יקרות</h2>
            <div className="mt-8 space-y-4">
              {myths.map((m) => (
                <div
                  key={m.q}
                  className="rounded-2xl bg-card border border-border shadow-card p-6"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <h3 className="t-h3 leading-snug">{m.q}</h3>
                      <p className="t-body text-foreground/80 mt-2 leading-relaxed">{m.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="py-20 lg:py-24 bg-muted/30 border-y border-border"
          aria-labelledby="faq-title"
        >
          <div className="container mx-auto max-w-3xl">
            <span className="t-eyebrow">שאלות נפוצות</span>
            <h2 id="faq-title" className="mt-3 t-h2">שאלות שחוזרות על עצמן</h2>
            <div className="mt-8 space-y-4">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl bg-card border border-border shadow-card overflow-hidden"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 sm:px-6 sm:py-5 hover:bg-muted/40 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
                    <span className="t-h3 leading-snug">{f.q}</span>
                  </summary>
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 t-body text-foreground/85 leading-relaxed">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-20" aria-labelledby="cta-title">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-8 sm:p-12 shadow-elevated flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 id="cta-title" className="t-h2">לא בטוחים אם נדרש אישור?</h2>
                <p className="mt-3 t-lead text-primary-foreground/85 max-w-xl">
                  שיחה קצרה לרוב מספיקה כדי לדעת אם אתם חייבים מהנדס — ולקבל הצעת מחיר אם כן.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button asChild variant="hero" size="lg">
                  <a
                    href="/#contact"
                    onClick={() => track("article_cta_click", { article: "what-is-konstruktor", cta: "contact" })}
                  >
                    בדיקה חינם <ArrowLeft className="w-5 h-5" />
                  </a>
                </Button>
                <Button asChild variant="outlineHero" size="lg">
                  <a
                    href={waLink(WA_TEXT)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      track("article_cta_click", { article: "what-is-konstruktor", cta: "whatsapp" });
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
      </main>

      <Footer />
      <FloatingWhatsApp />
      <AccessibilityWidget />
    </div>
  );
}
