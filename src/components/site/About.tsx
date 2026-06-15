import { CheckCircle2, DraftingCompass, FileText, Hammer, ShieldCheck, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const points = [
  "הנדסאי בניין רשום מ.ר. 35825 — מאז 2003",
  "קורסים מתקדמים: מניעת ליקויי בנייה ובטיחות בבנייה הנדסית (2005)",
  "ניהול הקמת ה'דיפו' של הרכבת הקלה בירושלים (אשטרום)",
  "ניהול בנייה רוויה — מאות יחידות דיור בירושלים, ת״א, רמת גן, גבעתיים, רמת השרון ואלעזר",
  "מעל 20 מקוואות טהרה ברחבי הארץ — מצפון רמת הגולן ועד אילת",
  "תכנון קונסטרוקציה למרכז המסחרי ספיר — מרכז פילו, בצומת ספיר (ערבה תיכונה)",
];

const expertise = [
  { icon: Building2, title: "משרד הביטחון", desc: "תכנון קונסטרוקציות פלדה (סככות ומסבכים) למחסומי צה״ל, מעברים ביטחוניים ומעברי סחורות; מגורי חיילים ומבני משרדים בבסיסים, מתאם פעולות הממשלה בשטחים ומנהלות תיאום וקישור; הרחבות בתי עלמין צבאיים לאחר 7.10.23." },
  { icon: DraftingCompass, title: "משרד הדתות והחינוך", desc: "תכנון קונסטרוקציה למעל 20 מקוואות טהרה ובתי כנסת ברחבי הארץ — מצפון רמת הגולן ועד אילת; גני ילדים, בתי ספר ומגרשי ספורט מקורים עבור משרד החינוך." },
  { icon: Hammer, title: "מסחר, יזמות ורשויות", desc: "המרכז המסחרי ספיר — מרכז פילו, עבור פילו ובניו בצומת ספיר (ערבה תיכונה), מועדון ותיקים בחבל יבנה, אולם שמחות ובית כנסת בישוב מגרון, מבני עירייה בירושלים ובנתיבות וגשר להולכי רגל במערת המכפלה." },
  { icon: ShieldCheck, title: "חיזוקים וחוות דעת מומחה", desc: "שיקום וחיזוק מבנים מסוכנים, חוות דעת הנדסיות לרשויות וחוות דעת מומחה לבתי משפט, תכנון בתים פרטיים וייעוץ ללקוחות פרטיים." },
];

const process = ["בדיקה יסודית של המצב הקיים", "חישוב ותכנון לפי תקנים ועומסים", "פתרון ברור שניתן לבצע באתר"];

export const About = () => (
  <section id="about" className="t-about-section">
    <div className="bg-gradient-hero text-primary-foreground relative overflow-hidden t-about-banner-mb">
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary-foreground)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)/0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="container t-about-banner-pad relative grid md:grid-cols-[1fr_auto] items-center">
        <div>
          <div className="inline-flex items-center t-about-pill rounded-full bg-primary-foreground/10 backdrop-blur t-about-pill-text t-about-pill-mb">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            הנדסאי בניין מ.ר. 35825
          </div>
          <h2 className="t-h2 text-primary-foreground">אודותינו</h2>
          <p className="t-about-stack-tight text-primary-foreground/80 t-about-quote max-w-2xl">
            המשרד מספק תכנון קונסטרוקציה, ייעוץ הנדסי, אישורים וחוות דעת — משלב הרעיון ועד פתרון ביצועי בטוח בשטח.
          </p>
          <div className="t-about-stack-lg t-about-process-grid grid sm:grid-cols-3">
            {process.map((item) => (
              <div key={item} className="flex items-center t-about-process-pad rounded-xl bg-primary-foreground/5 border border-primary-foreground/10">
                <CheckCircle2 className="w-5 h-5 text-teal shrink-0" />
                <span className="t-about-stat">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow-elevated t-about-card-pad max-w-[280px] border border-border text-foreground">
          <div className="flex items-center t-about-card-row">
            <div className="t-h2 text-accent">15+</div>
            <div className="t-about-stat">שנות ניסיון בתכנון, חוות דעת ופיקוח</div>
          </div>
          <p className="t-about-card-foot t-about-card-foot-stack">
            כל עבודה — מאישור נקודתי ועד פרויקט מורכב — מתחילה בבדיקה יסודית ומסתיימת בפתרון הנדסי ברור.
          </p>
        </div>
      </div>
    </div>

    <div className="container t-about-container">
      <div>
        <span className="t-eyebrow">אודות</span>
        <h2 className="t-about-stack-sm t-h1">
          תכנון קונסטרוקציה וייעוץ הנדסי למבנים קיימים וחדשים
        </h2>
        <p className="t-about-stack-sm t-h3 text-secondary">
          מדויק בחישוב. יצירתי בפתרון. אחראי בביצוע.
        </p>
        <p className="t-about-stack-md t-about-prose">
          איליה סדצקי, הנדסאי בניין מ.ר. 35825 — בוגר לימודי הנדסאי בניין (2002), בעל קורסים מתקדמים במניעת ליקויי בנייה ובטיחות בבנייה הנדסית.
          מעל 20 שנות ניסיון: בשנת 2003 — תכנון קונסטרוקציה במשרד המהנדסים "גדליה אולשטיין".
          החל משנת 2004 — מהנדס ביצוע ומנהל פרויקטים של עשרות פרויקטי בנייה בהיקפים גדולים בחברת "אשטרום",
          ובכלל זה ניהול הקמת מתחם ה"דיפו" של הרכבת הקלה בירושלים, וניהול פרויקטים של בנייה רוויה ושימור מבנים
          בהיקף מצטבר של מאות יחידות דיור בירושלים, תל אביב, רמת גן, גבעתיים, רמת השרון ובישוב אלעזר.
        </p>
        <p className="t-about-stack-sm t-about-prose">
          החל משנת 2018 — בעלים של משרד עצמאי המספק שירותי הנדסה אזרחית ותכנון קונסטרוקציה למבנים ציבוריים ופרטיים.
          בין הלקוחות: משרד הביטחון (תכנון קונסטרוקציות פלדה למחסומי צה״ל, מעברים ביטחוניים ומעברי סחורות,
          מגורי חיילים ומבני משרדים בבסיסים, מתאם פעולות הממשלה בשטחים, מנהלות תיאום וקישור,
          וכן הרחבות בתי עלמין צבאיים לאחר 7.10.23); משרד הדתות (מעל 20 מקוואות טהרה ובתי כנסת מרמת הגולן ועד אילת);
          משרד החינוך (גני ילדים, בתי ספר ומגרשי ספורט מקורים); רשויות מקומיות — עיריות ירושלים, ראשון לציון ונתיבות,
          מועצה אזורית חבל יבנה והחברות הכלכליות של ראשון לציון ומודיעין מכבים רעות; וכן יזמים פרטיים —
          לרבות תכנון המרכז המסחרי ספיר — מרכז פילו, עבור פילו ובניו בצומת ספיר (ערבה תיכונה).
        </p>
        <p className="t-about-stack-sm t-about-prose">
          לצד התכנון — בקרת תכן וליווי מקצועי לתכנון ולביצוע, עריכת חוות דעת הנדסיות וחוות דעת מומחה לבתי משפט במגוון נושאים,
          שיקום וחיזוק מבנים מסוכנים, תכנון בתים פרטיים וייעוץ ללקוחות פרטיים.
          הגישה: דיוק הנדסי, חשיבה יצירתית והבנה עמוקה של הביצוע בשטח.
        </p>

        <div className="t-about-stack-xl t-about-grid grid sm:grid-cols-2">
          {expertise.map((item) => (
            <div key={item.title} className="rounded-2xl bg-card border border-border t-about-expertise-pad shadow-card">
              <div className="flex items-center t-about-expertise-head">
                <div className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary grid place-items-center shrink-0">
                  <item.icon className="w-4 h-4" />
                </div>
                <h3 className="t-h3">{item.title}</h3>
              </div>
              <p className="t-about-card-desc">{item.desc}</p>
            </div>
          ))}
        </div>

        <ul className="t-about-stack-xl t-about-list">
          {points.map((p) => (
            <li key={p} className="flex items-start t-about-list-row">
              <CheckCircle2 className="w-5 h-5 text-teal t-about-list-icon-offset shrink-0" />
              <span className="text-foreground/90">{p}</span>
            </li>
          ))}
        </ul>

        <div className="t-about-stack-2xl rounded-2xl border-r-4 border-accent bg-muted/40 t-about-quote-pad">
          <p className="text-foreground/90 t-about-quote">
            תכנון קונסטרוקציה נכון הוא השילוב בין חישוב מדויק, ניסיון מעשי, הבנה של הביצוע ויכולת למצוא פתרון גם כאשר התנאים מורכבים.
          </p>
          <p className="t-about-quote-stack text-foreground/90 t-about-quote">
            בין אם מדובר באישור קטן ללקוח פרטי ובין אם מדובר בפרויקט מורכב — כל עבודה מתחילה בבדיקה יסודית, ממשיכה בתכנון אחראי, ומסתיימת בפתרון הנדסי ברור שמחזיק לאורך זמן.
          </p>
        </div>

        <div className="t-about-stack-xl t-about-cta-row grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:flex sm:flex-wrap">
          <Button asChild variant="accent" size="lg" className="w-full sm:w-auto justify-center">
            <a href="#contact">דברו איתי</a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto justify-center">
            <a href="#services">לשירותים המלאים</a>
          </Button>
        </div>

      </div>
    </div>
  </section>
);
