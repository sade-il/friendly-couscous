import { Link } from "react-router-dom";
import { ChevronLeft, MapPin, ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";
import { EngineeringGridBackground } from "@/components/site/EngineeringGridBackground";
import { Seo } from "@/components/site/Seo";
import { AREAS } from "@/data/areas";

export default function AreasIndex() {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="אזורי שירות — קונסטרוקטור במרכז הארץ | א. סדצקי הנדסה"
        description="קונסטרוקטור ומהנדס מבנים במרכז הארץ: ראשון לציון, תל אביב, חולון, בת ים, רחובות, נס ציונה, פתח תקווה, רמת גן, גבעתיים ועוד. ליווי מול הוועדה המקומית."
        path="/areas"
      />
      <EngineeringGridBackground />
      <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
      <Header />

      <main id="main-content" tabIndex={-1}>
        <section className="relative bg-gradient-hero text-primary-foreground overflow-hidden">
          <div className="container mx-auto py-16 sm:py-24 relative">
            <nav aria-label="פירורי לחם" className="mb-6 text-sm text-primary-foreground/75">
              <ol className="flex items-center gap-2 flex-wrap">
                <li><Link to="/" className="hover:text-accent transition-smooth">דף הבית</Link></li>
                <li aria-hidden><ChevronLeft className="w-3.5 h-3.5" /></li>
                <li className="text-accent" aria-current="page">אזורי שירות</li>
              </ol>
            </nav>
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur px-3 py-1.5 mb-5 text-xs sm:text-sm">
                <MapPin className="w-4 h-4 text-teal" />
                <span className="text-primary-foreground/90">פעילות במרכז הארץ</span>
              </div>
              <h1 className="t-h1 text-primary-foreground leading-tight">אזורי שירות</h1>
              <p className="mt-5 t-lead text-primary-foreground/80 max-w-2xl">
                המשרד נותן שירותי קונסטרוקטור, חוות דעת הנדסיות, חיזוק מבנים, ממ״ד ופרגולות בכל
                מרכז הארץ. בכל עמוד אזור ניתן לקרוא על סוגי הפניות הנפוצים שם, על הוועדה המקומית
                ועל אופן הליווי שלנו.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-24" aria-labelledby="areas-list">
          <div className="container mx-auto max-w-5xl">
            <h2 id="areas-list" className="sr-only">רשימת אזורי שירות</h2>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AREAS.map((a) => (
                <li key={a.slug}>
                  <Link
                    to={`/areas/${a.slug}`}
                    className="block h-full rounded-2xl bg-card border border-border shadow-card p-6 hover:shadow-elevated transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal grid place-items-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <h3 className="t-h3 leading-snug">קונסטרוקטור {a.cityInTitle}</h3>
                    </div>
                    <p className="t-body text-foreground/75 leading-relaxed line-clamp-3">{a.intro}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-accent text-sm">
                      קראו עוד <ArrowLeft className="w-4 h-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
      <AccessibilityWidget />
    </div>
  );
}
