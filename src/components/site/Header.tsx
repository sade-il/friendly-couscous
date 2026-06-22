import { Menu, X, Facebook, Instagram, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { LogoBadge } from "./LogoBadge";
import { waLink, openWhatsApp } from "@/lib/whatsapp";
import { FACEBOOK_URL, INSTAGRAM_URL, openFacebook } from "@/lib/contact";
import { scrollToHash } from "@/lib/scroll";
import { LanguageSwitcher } from "./LanguageSwitcher";

const links = [
  { href: "#home", label: "בית" },
  { href: "#services", label: "שירותים" },
  { href: "/projects", label: "פרויקטים" },
  { href: "/services/pergola-approval", label: "אישור פרגולה" },
  { href: "/areas", label: "אזורי שירות" },
  { href: "#calculators", label: "מחשבונים" },
  { href: "#prepare", label: "לפני בדיקה" },
  { href: "#about", label: "אודות" },
  { href: "#testimonials", label: "המלצות" },
  { href: "#charter", label: "אמנת שירות" },
  { href: "#contact", label: "צור קשר" },
];

const WHATSAPP_TEXT = "שלום, אשמח לקבל פרטים על בדיקה הנדסית";

export const Header = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("#home");
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // While the mobile menu is open:
  //  - Escape closes it and returns focus to the toggle button
  //  - Tab / Shift+Tab cycle focus between the toggle button and the menu links
  useEffect(() => {
    if (!open) return;
    const getFocusables = (): HTMLElement[] => {
      const nav = document.getElementById("mobile-nav");
      const links = nav ? Array.from(nav.querySelectorAll<HTMLElement>("a, button")) : [];
      return [menuButtonRef.current, ...links].filter((el): el is HTMLElement => !!el);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusables();
      if (items.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const idx = active ? items.indexOf(active) : -1;
      // Only trap when focus is already on the toggle or inside the menu;
      // otherwise let Tab behave normally elsewhere on the page.
      if (idx === -1) return;
      if (e.shiftKey && idx === 0) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && idx === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ids = links.map((l) => l.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-out border-b ${
        scrolled
          ? "backdrop-blur-xl bg-primary/40 border-gold/20 shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.4)]"
          : "backdrop-blur-sm bg-primary/5 border-gold/10"
      }`}
    >
      {/* seamless gradient — fades into Hero, no hard seam */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: scrolled
              ? "linear-gradient(to bottom, hsl(222 47% 7% / 0.3) 0%, hsl(222 47% 7% / 0.15) 100%)"
              : "linear-gradient(to bottom, hsl(222 47% 7% / 0.25) 0%, hsl(222 47% 7% / 0) 100%)",
          }}
        />
      </div>

      <div className="container mx-auto flex items-center justify-between gap-4 sm:gap-6 py-3 sm:py-4 xl:py-5 relative">
        <a href="#home" onClick={(e) => scrollToHash(e, "#home")} className="flex items-center gap-3 sm:gap-4 group shrink-0 min-w-0">
          <LogoBadge variant="header" className="shrink-0" />
          <div className="flex flex-col justify-center min-w-0 px-2 sm:px-3 xl:px-4 py-1 sm:py-1.5 xl:py-2 border-y border-gold/50">
            <div className="t-h3 text-[13px] sm:text-base lg:text-lg xl:text-2xl tracking-[0.04em] sm:tracking-[0.06em] leading-[1.1] truncate bg-gradient-to-l from-primary-foreground via-primary-foreground to-gold/90 bg-clip-text text-transparent">
              א. סדצקי הנדסה וייעוץ
            </div>
            <div className="hidden sm:block t-mono text-[9px] xl:text-[10px] tracking-[0.22em] mt-1 xl:mt-1.5 leading-none truncate text-gold" style={{ textShadow: "0 0 6px hsl(var(--gold) / 0.9), 0 0 14px hsl(var(--gold) / 0.55)" }}>
              <span className="text-primary-foreground" style={{ textShadow: "0 0 6px hsl(var(--teal) / 0.85), 0 0 14px hsl(var(--teal) / 0.55)" }}>STRUCTURAL</span> <span className="text-gold">·</span> <span className="text-primary-foreground" style={{ textShadow: "0 0 6px hsl(var(--teal) / 0.85), 0 0 14px hsl(var(--teal) / 0.55)" }}>EST. 2018</span> <span className="text-gold">Reg.no. 35825</span>
            </div>
          </div>
        </a>

        <nav className="hidden xl:flex items-center divide-x divide-gold/15 [direction:ltr]">
          {links.map((l, i) => {
            const isActive = active === l.href;
            return (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => scrollToHash(e, l.href)}
                aria-current={isActive ? "page" : undefined}
                className={`group relative px-2 2xl:px-3 py-2.5 t-small t-mono tracking-[0.18em] transition-smooth flex items-center gap-2 [direction:rtl] ${
                  isActive ? "text-gold" : "text-primary-foreground hover:text-gold"
                }`}
              >
                <span className={isActive ? "text-gold" : "text-gold/60 group-hover:text-gold"}>{String(i + 1).padStart(2, "0")}</span>
                <span>{l.label}</span>
                <span className={`pointer-events-none absolute inset-x-2 -bottom-px h-px bg-gold transition-all duration-300 ${isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}`} />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="hidden md:flex">
            <LanguageSwitcher />
          </div>
          <a href={waLink(WHATSAPP_TEXT)} onClick={(e) => openWhatsApp(e, WHATSAPP_TEXT)} aria-label="WhatsApp"
            target="_blank" rel="noopener noreferrer"
            className="hidden 2xl:grid w-9 h-9 xl:w-10 xl:h-10 place-items-center text-primary-foreground hover:text-whatsapp hover:bg-primary-foreground/10 transition-smooth">
            <MessageCircle className="w-4 h-4" />
          </a>
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" onClick={(e) => openFacebook(e)} aria-label="Facebook"
            className="hidden 2xl:grid w-9 h-9 xl:w-10 xl:h-10 place-items-center text-primary-foreground hover:text-accent hover:bg-primary-foreground/10 transition-smooth">
            <Facebook className="w-4 h-4" />
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
            className="hidden 2xl:grid w-9 h-9 xl:w-10 xl:h-10 place-items-center text-primary-foreground hover:text-accent hover:bg-primary-foreground/10 transition-smooth">
            <Instagram className="w-4 h-4" />
          </a>
          <Button asChild className="hidden md:inline-flex xl:hidden 2xl:inline-flex h-9 xl:h-10 px-4 xl:px-5 t-mono tracking-[0.18em] rounded-none bg-transparent ring-1 ring-gold/50 text-gold hover:bg-gold hover:text-primary hover:ring-gold">
            <a href="#contact" onClick={(e) => scrollToHash(e, "#contact")}>בדיקה הנדסית</a>
          </Button>
          <button
            ref={menuButtonRef}
            className="xl:hidden w-10 h-10 grid place-items-center rounded-md text-primary-foreground hover:bg-primary-foreground/10 transition-smooth"
            onClick={() => setOpen((v) => !v)}
            aria-label="תפריט"
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="xl:hidden bg-primary border-t border-primary-foreground/10 animate-fade-up">
          <nav className="container mx-auto max-h-[calc(100svh-5rem)] overflow-y-auto py-4 flex flex-col gap-1 overscroll-contain">
            {links.map((l) => {
              const isActive = active === l.href;
              return (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => {
                    scrollToHash(e, l.href);
                    setOpen(false);
                    // Closing the menu unmounts these links; return focus to the
                    // toggle so it lands somewhere predictable (not <body>).
                    menuButtonRef.current?.focus();
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`t-body px-3 py-3 rounded-md border-r-2 transition-smooth ${
                    isActive
                      ? "text-gold bg-primary-foreground/5 border-gold"
                      : "text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-accent border-transparent"
                  }`}
                >
                  {l.label}
                </a>
              );
            })}
            <div className="mt-3 pt-3 border-t border-primary-foreground/10 flex justify-center md:hidden">
              <LanguageSwitcher variant="mobile" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
