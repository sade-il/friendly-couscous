import { Camera, FileText, Mail, FileCheck2 } from "lucide-react";

const items = [
  { icon: Camera, title: "תמונות מצב קיים", desc: "צילומים של אזור הבדיקה, סדקים, חיבורים ופרטים מהותיים." },
  { icon: FileText, title: "תכניות קיימות", desc: "תכניות אדריכלות וקונסטרוקציה אם זמינות, בכל פורמט." },
  { icon: Mail, title: "מכתב רשות / פנייה רשמית", desc: "אם הבדיקה מבוקשת לטובת ועד בית, רשות מקומית או בית משפט." },
  { icon: FileCheck2, title: "חוות דעת קודמת", desc: "כל מסמך הנדסי קודם רלוונטי — לחיסכון בזמן ועקביות מקצועית." },
];

export const Prepare = () => (
  <section id="prepare" className="py-24 lg:py-32 bg-gradient-hero text-primary-foreground relative overflow-hidden">
    <div className="absolute inset-0 opacity-10 pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(hsl(var(--primary-foreground)/0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)/0.15) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
    <div className="container mx-auto relative">
      <div className="max-w-2xl mb-12">
        <span className="t-eyebrow">לפני שמתחילים</span>
        <h2 className="mt-4 t-h1">
          מה שולחים לפני בדיקה
        </h2>
        <p className="mt-4 t-lead text-primary-foreground/80">
          איסוף נכון של חומרים מקצר תהליכים, חוסך פגישות חוזרות ומאפשר חוות דעת מדויקת ומהירה.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((it, i) => (
          <div key={it.title} className="rounded-2xl bg-primary-foreground/5 backdrop-blur border border-primary-foreground/10 p-6 hover:bg-primary-foreground/10 transition-smooth">
            <div className="w-12 h-12 rounded-xl bg-accent text-accent-foreground grid place-items-center mb-5 shadow-accent">
              <it.icon className="w-6 h-6" />
            </div>
            <div className="t-mono text-sm text-accent mb-1">0{i + 1}</div>
            <h3 className="t-h3 mb-2">{it.title}</h3>
            <p className="t-small text-primary-foreground/75">{it.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
