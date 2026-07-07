import { MapPin, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { AREAS } from "@/data/areas";

export const ServiceAreas = () => (
  <section id="areas" className="py-20 lg:py-24" aria-labelledby="areas-title">
    <div className="container mx-auto max-w-4xl">
      <div className="rounded-2xl bg-card border border-border shadow-card p-6 sm:p-10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal/10 text-teal grid place-items-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="t-eyebrow">אזורי שירות</span>
            <h2 id="areas-title" className="mt-3 t-h2">קונסטרוקטור בראשון לציון ובמרכז הארץ</h2>
            <p className="mt-4 t-body text-foreground/85 leading-relaxed">
              המשרד מספק שירותי קונסטרוקטור, תכנון שלד, אישורי מהנדס וחוות דעת הנדסיות
              בראשון לציון, פתח תקווה, תל אביב, חולון, בת ים, רחובות, נס ציונה, רמת גן,
              גבעתיים ובאזור המרכז. לחצו על עיר כדי לעבור לעמוד הייעודי שלה — או צפו ב
              <Link to="/areas" className="text-teal underline underline-offset-2 hover:no-underline mx-1">כל אזורי השירות</Link>.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="ערים עיקריות באזור השירות">
              {AREAS.map((a) => (
                <li key={a.slug}>
                  <Link
                    to={`/areas/${a.slug}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted text-foreground/80 text-sm border border-border hover:bg-teal/10 hover:text-teal hover:border-teal/40 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    {a.city}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/areas"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm border border-primary hover:bg-primary/90 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  כל האזורים <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
);
