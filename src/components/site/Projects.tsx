import { useState } from "react";
import steel from "@/assets/proj-steel.jpg";
import publicBuild from "@/assets/proj-public.jpg";
import underground from "@/assets/proj-underground.jpg";
import pergola from "@/assets/proj-pergola.jpg";
import assessment from "@/assets/proj-assessment.jpg";
import court from "@/assets/proj-court.jpg";
import pool from "@/assets/proj-pool.jpg";
import villa from "@/assets/proj-villa.jpg";
import renovation from "@/assets/proj-renovation.jpg";
import shoring from "@/assets/proj-shoring-v3.jpg";
import approvalPergola1 from "@/assets/approval-pergola-1.jpg";
import approvalPergola2 from "@/assets/approval-pergola-2.jpg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { track, setAttribution } from "@/lib/analytics";

const projects = [
  { id: "pre_renovation", img: renovation, tag: "שיפוץ", title: "ייעוץ לפני שיפוץ", desc: "ביקור באתר ובחינת הקירות הנושאים והתשתיות לפני התחלת שיפוץ — מונע טעויות יקרות בהמשך." },
  { id: "structural_design", img: publicBuild, tag: "תכנון", title: "תכנון קונסטרוקציה לבתים פרטיים ובנייה ציבורית", desc: "ליווי הנדסי מקצה לקצה — מהיסודות ועד הגג, יחד עם האדריכל והקבלן. מבתים פרטיים יוקרתיים ועד מבני ציבור, בהתאם לתקני ישראל." },
  { id: "pergola", img: pergola, tag: "פרגולה", title: "פרגולות מודרניות", desc: "תכנון קורות עץ ופלדה לפרגולות בהתאם לתקנות הפטור." },
  { id: "dangerous_buildings", img: assessment, tag: "מבנים מסוכנים", title: "מבנים מסוכנים, חוות דעת וליווי הסרת צו", desc: "אבחון סדקים, בדיקת יציבות וחוות דעת לרשויות ובתי משפט. טיפול מלא מול הרשות: בדיקה הנדסית, תכנון חיזוק וביצוע עד הסרת צו מבנה מסוכן והוצאת אישור." },
  { id: "wall_demo", img: shoring, tag: "תימוך וחיזוק", title: "תימוך קבוע וחיזוק מבנים קיימים", desc: "תכנון קונסטרוקציית פרופילי פלדה לאחר הסרת עמוד או קיר נושא — אלמנט עיצובי שחור מט המשולב בסלון/מטבח. כולל פתרונות חיזוק במבנים קיימים: עיטופי FRP, סיבי פחמן ופלטות פלדה לעמודים וקורות." },
  { id: "pool_permit", img: pool, tag: "בריכה", title: "אישור הצבת בריכה במרפסת/גינה", desc: "תכנון ואישור הנדסי להצבת בריכת שחייה או ספא על מרפסת, גג או בגינה — כולל בדיקת עומסים." },
  { id: "court_expert", img: court, tag: "חוות דעת", title: "חוות דעת הנדסית ומומחה לבית משפט", desc: "חוות דעת הנדסיות מקצועיות, מנומקות ומוכרות בבתי משפט — לסכסוכי שכנים, ליקויי בנייה ותביעות." },
  { id: "mikveh", img: underground, tag: "מקוואות", title: "תכנון מקוואות ואלמנטים תת-קרקעיים", desc: "תכנון קירות איטום, איזון מי תהום ועיגון יסודות — לפי דרישות הלכתיות ותקניות." },
  { id: "steel_frame", img: steel, tag: "פלדה", title: "תכנון קונסטרוקציות פלדה", desc: "תכנון מבנה תעשייתי קל עם קירוי פח וקורות פלדה." },
];

type Project = (typeof projects)[number];

export const Projects = () => {
  const [active, setActive] = useState<Project | null>(null);

  const openProject = (p: Project, index: number) => {
    track("project_card_click", { project_id: p.id, project_title: p.title, project_tag: p.tag, position: index });
    setAttribution("last_project_id", p.id);
    setAttribution("last_project_title", p.title);
    setActive(p);
  };

  const onCtaClick = () => {
    if (!active) return;
    track("project_modal_cta_click", { project_id: active.id, project_title: active.title });
  };

  return (
    <section id="projects" className="py-24 lg:py-32 bg-gradient-card">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-gradient-to-l from-accent to-transparent" />
              <span className="t-eyebrow">פרויקטים נבחרים</span>
              <span className="t-mono text-muted-foreground/70">// {String(projects.length).padStart(2, "0")}</span>
            </div>
            <h2 className="mt-4 t-h1">
              מקרים אמיתיים <span className="t-serif text-accent">שנפתרו</span> בהצלחה
            </h2>
            <div className="mt-5 flex items-start gap-4">
              <span className="mt-3 h-px w-8 shrink-0 bg-foreground/20" />
              <p className="t-lead">
                דוגמאות אנונימיות של פרויקטים שתוכננו וליווי הנדסית — ללא פרטי לקוחות וכתובות.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {projects.map((p, i) => (
            <article
              key={p.title}
              className="group relative rounded-2xl overflow-hidden bg-card shadow-card hover:shadow-elevated transition-smooth cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => openProject(p, i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openProject(p, i);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`פתח פרטים: ${p.title}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={p.img}
                  alt={p.title}
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="w-full h-full object-cover transition-smooth duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                  {p.tag}
                </span>
              </div>
              <div className="p-5 sm:p-6 text-right">
                <div className="flex items-center gap-3 mb-3">
                  <span className="t-mono text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <span className="h-px flex-1 bg-gradient-to-l from-border via-border to-transparent" />
                </div>
                <h3 className="t-h3 mb-2 leading-snug">{p.title}</h3>
                <span className="block h-px w-10 bg-accent/60 mb-3" />
                <p className="t-small leading-relaxed">{p.desc}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Approvals gallery — social proof */}
        <div className="mt-20 lg:mt-24">
          <div className="max-w-2xl mb-8">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-gradient-to-l from-accent to-transparent" />
              <span className="t-eyebrow">אישורים לדוגמה</span>
            </div>
            <h3 className="mt-4 t-h2">
              דוגמאות לאישורי פרגולה <span className="t-serif text-accent">חתומים</span>
            </h3>
            <p className="mt-4 t-small leading-relaxed">
              מסמך הנדסי חתום — מוכן להגשה לרשות לפי הצורך. פרטי הלקוחות הוסתרו לשמירה על פרטיות.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            {[
              { img: approvalPergola1, alt: "אישור קונסטרוקציה לפרגולה — עמוד 1" },
              { img: approvalPergola2, alt: "אישור קונסטרוקציה לפרגולה — עמוד 2" },
            ].map((doc) => (
              <div
                key={doc.alt}
                className="rounded-2xl overflow-hidden bg-card shadow-card hover:shadow-elevated transition-smooth border border-border"
              >
                <img
                  src={doc.img}
                  alt={doc.alt}
                  loading="lazy"
                  width={1320}
                  height={1894}
                  className="w-full h-auto block"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {active && (
            <>
              <div className="relative aspect-[16/9] overflow-hidden">
                <img src={active.img} alt={active.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                  {active.tag}
                </span>
              </div>
              <div className="p-6 sm:p-8">
                <DialogHeader>
                  <DialogTitle className="t-h2 text-right">{active.title}</DialogTitle>
                  <DialogDescription className="t-body text-right pt-2">{active.desc}</DialogDescription>
                </DialogHeader>
                <div className="mt-6 flex flex-wrap gap-3 justify-end">
                  <Button asChild variant="hero" size="lg" onClick={onCtaClick}>
                    <a href="/#contact" onClick={() => setActive(null)}>
                      לפנייה דומה <ArrowLeft className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
