import { AlertCircle } from "lucide-react";

export const Disclaimer = () => (
  <section id="disclaimer" className="t-disc-section bg-muted/40 border-t border-border">
    <div className="container mx-auto max-w-4xl">
      <div className="rounded-2xl bg-card border border-border t-disc-card shadow-card">
        <div className="flex items-start t-disc-row">
          <div className="t-disc-icon-wrap rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0">
            <AlertCircle className="t-disc-icon" />
          </div>
          <div>
            <h2 className="t-h2 t-disc-title">הצהרת אחריות מקצועית</h2>
            <p className="t-disc-body text-muted-foreground">
              התוכן והכלים באתר זה הינם מידע כללי ואינם מהווים תכנון פרטני, אישור ביצוע או ייעוץ משפטי.
              התוצאות מהוות אומדן ראשוני בלבד ואינן מחליפות תכנון הנדסי פרטני.
              כל מקרה דורש בדיקה הנדסית פרטנית במקום, בליווי מסמכים, תכניות והיתרים רלוונטיים,
              וכל ביצוע יעשה לאחר קבלת חוות דעת מקצועית מבעל רישיון מתאים.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
);
