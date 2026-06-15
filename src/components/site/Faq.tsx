import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { track } from "@/lib/analytics";

// eslint-disable-next-line react-refresh/only-export-components
export const faqs = [
  {
    q: "מתי צריך קונסטרוקטור?",
    a: "כאשר מבצעים שינוי במבנה, פתיחת קיר, הקמת פרגולה, תוספת בנייה, ממ״ד, בדיקת מבנה מסוכן או כאשר נדרש אישור הנדסי לרשות או לקבלן.",
  },
  {
    q: "האם צריך אישור מהנדס לפרגולה?",
    a: "במקרים רבים נדרש אישור הנדסי לבדיקת עומסים, עיגונים וחיבור למבנה, במיוחד כאשר מדובר בפרגולה המחוברת למבנה קיים או מוגשת לרשות.",
  },
  {
    q: "האם מותר לפתוח קיר נושא?",
    a: "פתיחת קיר נושא מחייבת בדיקה קונסטרוקטיבית ותכנון פתרון להעברת עומסים. אין לבצע פתיחה או הריסה לפני בדיקה ותכנון פרטני.",
  },
  {
    q: "מה עושים כשמקבלים צו מבנה מסוכן?",
    a: "יש לבצע בדיקה הנדסית, לתעד את הליקויים, להכין המלצות לתיקון ולפעול מול הרשות בהתאם לדרישותיה עד להסדרת המצב.",
  },
  {
    q: "האם מחשבון באתר מחליף תכנון?",
    a: "לא. המחשבונים באתר מיועדים לבדיקה ראשונית בלבד ואינם מחליפים תכנון הנדסי פרטני, חוות דעת או אישור חתום.",
  },
  {
    q: "אילו מסמכים כדאי לשלוח לפני בדיקה?",
    a: "רצוי לשלוח תמונות, תכניות קיימות, מכתב מהרשות אם קיים, חוות דעת קודמת, מידות בסיסיות ותיאור קצר של הבעיה או העבודה המבוקשת.",
  },
  {
    q: "האם ניתן לקבל שירות באזור המרכז?",
    a: "כן. השירות ניתן בראשון לציון, פתח תקווה, תל אביב, חולון, בת ים, רחובות, נס ציונה, רמת גן, גבעתיים ובאזור המרכז, וכן בפרויקטים נוספים לפי היקף וסוג העבודה.",
  },
];

export const Faq = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 lg:py-32 bg-muted/30 border-t border-border" aria-labelledby="faq-title">
      <div className="container mx-auto max-w-4xl">
        <div className="max-w-2xl mb-10">
          <span className="t-eyebrow">שאלות נפוצות</span>
          <h2 id="faq-title" className="mt-4 t-h1">שאלות נפוצות על שירותי קונסטרוקטור ואישורי מהנדס</h2>
          <p className="mt-5 t-lead">
            תשובות קצרות לשאלות שאנחנו מקבלים בכל יום — פרגולות, פתיחת קיר נושא, מבנים מסוכנים, חוות דעת ותכנון שלד.
          </p>
        </div>

        <ul className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q} className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-trigger-${i}`}
                  onClick={() => {
                    const next = isOpen ? null : i;
                    setOpen(next);
                    if (next !== null) track("faq_open", { index: i, question: f.q });
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
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${i}`}
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
  );
};
