import { ShieldCheck, Eye, Wrench, Building2, Briefcase, Lightbulb, FileCheck2, MessageSquare, Compass, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { waLink, openWhatsApp } from "@/lib/whatsapp";

const WA_TEXT = "היי איליה, ראיתי את אמנת השירות באתר וארצה להתייעץ על פרויקט.";

const principles = [
  { icon: ShieldCheck, title: "אחריות הנדסית לפני הכול", desc: "כל פתרון נבחן לפי בטיחות, יציבות, תקנים ומסלול כוחות ברור." },
  { icon: Eye, title: "שקיפות מלאה", desc: "מוסבר מה נבדק, מה ההנחות, מה המסקנה ומה התנאים להמשך." },
  { icon: Wrench, title: "פתרון מעשי, לא רק תיאורטי", desc: "פרטים ברורים, שלבי עבודה הגיוניים והתאמה לאנשי הביצוע." },
  { icon: Building2, title: "כבוד לתכנון האדריכלי", desc: "הקונסטרוקציה נבנית סביב המראה, החלל והכוונה האדריכלית." },
  { icon: Briefcase, title: "יחס מקצועי לכל פרויקט", desc: "אישור פרגולה או מבנה ציבור — אותה רצינות, אותו תהליך מסודר." },
  { icon: Lightbulb, title: "חשיבה יצירתית", desc: "כשיש מגבלה תכנונית או ביצועית — נבחנות חלופות עד פתרון נכון." },
  { icon: FileCheck2, title: "עמידה בתקנים ובדרישות הרשויות", desc: "תכנון, אישורים וחוות דעת מבוססי תקנים ודרישות תכן רלוונטיות." },
  { icon: MessageSquare, title: "שפה ברורה ונגישה", desc: "הסבר שמאפשר ללקוח להבין את הסיכון, את הפתרון ואת הדרך." },
  { icon: Compass, title: "ליווי עד השלמת המטרה", desc: "לא רק מסמך — מענה שמאפשר החלטה, אישור או ביצוע נכון." },
];

export const Charter = () => (
  <section id="charter" className="py-24 lg:py-32 bg-muted/30">
    <div className="container mx-auto">
      <div className="max-w-2xl mb-14">
        <span className="t-eyebrow">אמנת שירות</span>
        <h2 className="mt-4 t-h1">איך אני עובד</h2>
        <p className="mt-5 t-lead">
          תשעה עקרונות שמלווים כל עבודה — מאישור נקודתי ועד פרויקט מורכב.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {principles.map((p, i) => (
          <div
            key={p.title}
            className="group bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-elevated hover:border-accent/40 transition-smooth flex gap-4"
          >
            <div className="shrink-0 w-11 h-11 rounded-xl bg-secondary/10 grid place-items-center text-secondary group-hover:bg-gradient-accent group-hover:text-accent-foreground transition-smooth">
              <p.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="t-mono text-[10px] font-black text-gold tracking-[0.18em]">0{i + 1}</span>
              </div>
              <h3 className="t-h3 leading-snug mb-1.5">{p.title}</h3>
              <p className="t-small leading-relaxed">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  </section>
);
