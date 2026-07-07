import { Facebook, Instagram, MessageCircle, Mail, Phone, Shield } from "lucide-react";
import { waLink, openWhatsApp } from "@/lib/whatsapp";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, FACEBOOK_URL, INSTAGRAM_URL, mailtoLink, openFacebook, phoneLink } from "@/lib/contact";
import { scrollToHash } from "@/lib/scroll";
import { LogoBadge } from "./LogoBadge";

export const Footer = () => (
  <footer className="bg-primary text-primary-foreground">
    <div className="container mx-auto py-14 grid gap-10 md:grid-cols-5">
      <div className="md:col-span-2">
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          <LogoBadge variant="header" className="shrink-0" />
          <div className="flex flex-col justify-center min-w-0 px-2 sm:px-3 xl:px-4 py-1 sm:py-1.5 xl:py-2 border-y border-gold/50">
            <div className="t-h3 text-[13px] sm:text-base lg:text-lg xl:text-2xl tracking-[0.04em] sm:tracking-[0.06em] leading-[1.1] truncate bg-gradient-to-l from-primary-foreground via-primary-foreground to-gold/90 bg-clip-text text-transparent">
              א. סדצקי הנדסה וייעוץ
            </div>
            <div className="hidden sm:block t-mono text-[9px] xl:text-[10px] tracking-[0.22em] mt-1 xl:mt-1.5 leading-none truncate text-gold" style={{ textShadow: "0 0 6px hsl(var(--gold) / 0.9), 0 0 14px hsl(var(--gold) / 0.55)" }}>
              <span className="text-primary-foreground" style={{ textShadow: "0 0 6px hsl(var(--teal) / 0.85), 0 0 14px hsl(var(--teal) / 0.55)" }}>STRUCTURAL</span> <span className="text-gold">·</span> <span className="text-primary-foreground" style={{ textShadow: "0 0 6px hsl(var(--teal) / 0.85), 0 0 14px hsl(var(--teal) / 0.55)" }}>EST. 2018</span> <span className="text-gold">Reg.no. 35825</span>
            </div>
          </div>
        </div>
        <p className="text-primary-foreground/75 leading-relaxed max-w-md">
          תכנון קונסטרוקציה, חוות דעת הנדסיות ופיקוח עליון – בשפה ברורה, מקצועית וישימה.
        </p>
        <div className="flex items-center gap-2 mt-6">
          <a href={waLink()} onClick={(e) => openWhatsApp(e)} aria-label="WhatsApp"
            target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 grid place-items-center rounded-full bg-primary-foreground/10 hover:bg-whatsapp transition-smooth">
            <MessageCircle className="w-4 h-4" />
          </a>
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer"
            onClick={(e) => openFacebook(e)} aria-label="Facebook"
            className="w-10 h-10 grid place-items-center rounded-full bg-primary-foreground/10 hover:bg-accent transition-smooth">
            <Facebook className="w-4 h-4" />
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
            className="w-10 h-10 grid place-items-center rounded-full bg-primary-foreground/10 hover:bg-accent transition-smooth">
            <Instagram className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div>
        <h3 className="t-h3 mb-4 text-accent">ניווט</h3>
        <ul className="space-y-2 text-sm text-primary-foreground/80">
          <li><a className="hover:text-accent transition-smooth" href="#services" onClick={(e) => scrollToHash(e, "#services")}>שירותים</a></li>
          <li><a className="hover:text-accent transition-smooth" href="/projects">פרויקטים</a></li>
          <li><a className="hover:text-accent transition-smooth" href="#calculators" onClick={(e) => scrollToHash(e, "#calculators")}>מחשבונים</a></li>
          <li><a className="hover:text-accent transition-smooth" href="#about" onClick={(e) => scrollToHash(e, "#about")}>אודות</a></li>
          <li><a className="hover:text-accent transition-smooth" href="#testimonials" onClick={(e) => scrollToHash(e, "#testimonials")}>המלצות</a></li>
          <li><a className="hover:text-accent transition-smooth" href="#disclaimer" onClick={(e) => scrollToHash(e, "#disclaimer")}>הצהרת אחריות</a></li>
        </ul>
      </div>

      <div>
        <h3 className="t-h3 mb-4 text-accent">שירותים</h3>
        <ul className="space-y-2 text-sm text-primary-foreground/80">
          <li><a className="hover:text-accent transition-smooth" href="/services/pergola-approval">אישור פרגולה</a></li>
          <li><a className="hover:text-accent transition-smooth" href="/services/interior-changes">שינויים פנימיים</a></li>
          <li><a className="hover:text-accent transition-smooth" href="/services/building-reinforcement">חיזוק מבנים · תמ״א 38</a></li>
          <li><a className="hover:text-accent transition-smooth" href="/services/mamad">תכנון ממ״ד</a></li>
          <li><a className="hover:text-accent transition-smooth" href="/projects">פרויקטים</a></li>
        </ul>
      </div>


      <div>
        <h3 className="t-h3 mb-4 text-accent">יצירת קשר</h3>
        <ul className="space-y-3 text-sm text-primary-foreground/85">
          <li className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-teal" />
            <a href={phoneLink()} className="hover:text-accent transition-smooth" dir="ltr">{CONTACT_PHONE_DISPLAY}</a>
          </li>
          <li className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-teal" />
            <a href={mailtoLink()} className="hover:text-accent transition-smooth" dir="ltr">{CONTACT_EMAIL}</a>
          </li>
          <li className="flex items-center gap-2 text-primary-foreground/85"><Shield className="w-4 h-4" /> מ.ר. הנדסאי בניין 35825</li>
        </ul>
      </div>
    </div>

    <div className="border-t border-primary-foreground/10">
      <div className="container mx-auto py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-primary-foreground/85">
        <span>© {new Date().getFullYear()} א. סדצקי – הנדסה וייעוץ. כל הזכויות שמורות.</span>
        <span>אתר תדמית — אב טיפוס לעיצוב</span>
      </div>
    </div>
  </footer>
);
