import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "לקוח פרטי · ראשון לציון",
    project: "פתיחת פתח בקיר ותכנון חיזוק",
    text: "קיבלנו הסבר ברור, בדיקה יסודית ופתרון שאפשר לקבלן לעבוד בלי ניחושים. הכול היה מסודר, מדויק וברור לביצוע.",
  },
  {
    name: "אדריכלית · מרכז הארץ",
    project: "תוספת בנייה ותיאום מול תכנון אדריכלי",
    text: "הגישה הייתה מקצועית ומעשית. הפתרון שמר על התכנון האדריכלי, ובמקביל נתן מענה קונסטרוקטיבי בטוח ותקני.",
  },
  {
    name: "יזם פרטי · השפלה",
    project: "חוות דעת הנדסית ובדיקת סדקים",
    text: "המסמך היה מנומק, קריא ומדויק. היה ברור מה הבעיה, מה הסיכון ומה צריך לעשות כדי להתקדם בצורה אחראית.",
  },
];

export const Testimonials = () => (
  <section id="testimonials" className="py-24 lg:py-32 bg-muted/50">
    <div className="container mx-auto">
      <div className="max-w-3xl">
        <span className="t-eyebrow">המלצות לקוחות</span>
        <h2 className="mt-4 t-h1">לקוחות שמספרים על תהליך ברור ובטוח</h2>
        <p className="mt-5 t-lead">
          עבודות תכנון, בדיקה וחוות דעת דורשות לא רק חישוב נכון — אלא גם תקשורת ברורה,
          אחריות מקצועית ופתרון שאפשר לבצע בשטח.
        </p>
      </div>

      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {testimonials.map((item) => (
          <article key={item.project} className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between gap-4 mb-5">
              <Quote className="w-8 h-8 text-accent" />
              <div className="flex items-center gap-1 text-gold" role="img" aria-label="דירוג 5 כוכבים">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="w-4 h-4 fill-current" />
                ))}
              </div>
            </div>
            <p className="t-body text-foreground/90">“{item.text}”</p>
            <div className="mt-6 pt-5 border-t border-border">
              <h3 className="t-h3">{item.name}</h3>
              <p className="t-small mt-1">{item.project}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);