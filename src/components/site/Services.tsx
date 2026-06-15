import { Building2, FileSearch, AlertTriangle, TreePine, Eye, Wrench, Waves, Layers, ShieldCheck } from "lucide-react";
import { track, setAttribution } from "@/lib/analytics";

const services = [
  // עדיפות גבוהה — אישורי מהנדס
  { id: "pergolas_exempt", icon: TreePine, title: "אישור מהנדס לפרגולה", desc: "פטור מהיתר עד 50 מ״ר בכפוף לדיווח לרשות תוך 45 יום ואישור עיגון ויציבות חתום לפי ת״י 414 — כולל בודק אינטראקטיבי ומסמך הנדסי חתום להגשה.", href: "/services/pergola-approval" },
  { id: "pools", icon: Waves, title: "אישור קונסטרוקטור לבריכה במרפסת", desc: "בדיקת התאמה הנדסית להצבת בריכה, ג׳קוזי, אקווריום, כספת או עומסים חריגים במבנה קיים." },
  { id: "interior_structural_changes", icon: Eye, title: "שינויים פנימיים בדירה והריסת קירות", desc: "תכנון ואישור הנדסי לשינויים פנימיים בדירה או במבנה קיים — הריסת קיר נושא, פתיחת פתחים, איחוד חדרים והעתקת מטבח, כולל בחינת אלמנטים נושאים, חיזוקים והסדרת מעבר עומסים.", href: "/services/interior-changes" },

  // עדיפות גבוהה — חוות דעת ומבנים מסוכנים
  { id: "engineering_expert_opinion", icon: FileSearch, title: "חוות דעת הנדסית", desc: "בדיקה, ממצאים, מסקנות והמלצות לצרכים פרטיים, מסחריים ומשפטיים — כולל חוות דעת מומחה לבית משפט." },
  { id: "dangerous_buildings", icon: AlertTriangle, title: "מבנה מסוכן", desc: "בדיקת ליקויים, סדיקה, קורוזיה והתנתקויות, כולל מסמך הנדסי וליווי לטיפול מול הרשות." },

  // עדיפות בינונית-גבוהה — תכנון שלד ותוספות
  { id: "structural_design", icon: Building2, title: "תכנון שלד ותוספות בנייה", desc: "תכנון קונסטרוקציה למבנים פרטיים וציבוריים, תוספות בנייה, ממ״דים ושינויים במבנים קיימים." },
  { id: "concrete_steel", icon: Layers, title: "קונסטרוקציות בטון ופלדה", desc: "פתרונות שלד, חיבורים, פתחים, תמיכות ואלמנטים קונסטרוקטיביים מבטון ופלדה." },
  { id: "mamad_additions", icon: ShieldCheck, title: "תכנון ממ״ד ותוספות בנייה", desc: "בדיקת היתכנות ותכנון קונסטרוקטיבי לממ״דים לפי תקנות הג״א — דירתי, קומתי, תמ״א 38 והרחבות.", href: "/services/mamad" },

  // המשך — חיזוקים
  { id: "support_reinforcement", icon: Wrench, title: "חיזוק מבנים — תמ״א 38 ומבנים קיימים", desc: "תכנון חיזוקים ליסודות, עמודים וקורות, עמידות לרעידות אדמה ומבנים מסוכנים. פתרונות פלדה, בטון ופייבר קרבון.", href: "/services/building-reinforcement" },

];

export const Services = () => {
  const handleClick = (s: (typeof services)[number], index: number) => {
    track("service_card_click", { service_id: s.id, service_title: s.title, position: index });
    setAttribution("last_service_id", s.id);
    setAttribution("last_service_title", s.title);
  };

  return (
    <section id="services" className="t-svc-section">
      <div className="container mx-auto">
        <div className="t-svc-header" style={{ maxWidth: "48rem" }}>
          <span className="t-eyebrow">שירותי קונסטרוקטור ותכנון שלד</span>
          <h2 className="t-svc-title-gap t-h1">קונסטרוקטור לתכנון שלד וחוות דעת הנדסיות</h2>
          <p className="t-svc-lead-gap t-lead">
            שירותי קונסטרוקציה, אישור מהנדס לפרגולה, פתיחת קיר נושא, מבנים מסוכנים, ממ״דים,
            תוספות בנייה וחוות דעת הנדסיות — אישורים חתומים לרשויות, חוות דעת ותכנון קונסטרוקציה
            ללקוחות פרטיים, אדריכלים, קבלנים ויזמים. מענה תוך 24 שעות, ללא מתווכים.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 t-svc-grid">
          {services.map((s, i) => (
            <a
              key={s.title}
              href={(s as typeof services[number] & { href?: string }).href ?? "#contact"}
              onClick={() => handleClick(s, i)}
              className="group relative bg-card rounded-2xl t-svc-card shadow-card hover:shadow-elevated transition-smooth border border-border hover:border-accent/40 hover:-translate-y-1 flex flex-col text-right min-h-[200px]"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="t-svc-icon-wrap rounded-xl bg-secondary/10 grid place-items-center text-secondary group-hover:bg-gradient-accent group-hover:text-accent-foreground transition-smooth">
                <s.icon className="t-svc-icon" />
              </div>
              <h3 className="t-h3 t-svc-card-title">{s.title}</h3>
              <p className="t-small t-svc-card-body">{s.desc}</p>
              <div className="absolute bottom-0 t-svc-card-edge h-0.5 bg-gradient-accent scale-x-0 group-hover:scale-x-100 origin-right transition-transform duration-500" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
