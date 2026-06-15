
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator, Building2, Clock, BadgeCheck, Gauge, FileCheck2, TreePine, Eye, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { track, setAttribution } from "@/lib/analytics";
import { HeroGoldenRatioGrid } from "@/components/site/HeroGoldenRatioGrid";
import heroStructuralBw from "@/assets/hero-structural-bw.jpg";

const heroSlides = [
  { id: "engineering_approval", icon: BadgeCheck, kicker: "אישור הנדסי חתום", text: "אישור מהנדס וחתימה הנדסית לכל תכנון, חוות דעת ובדיקת מבנה — מוכן להגשה לרשות." },
  { id: "fast_response", icon: Clock, kicker: "מענה תוך 24 שעות", text: "פנייה ישירה למשרד — בלי מתווכים, בלי המתנות." },
  { id: "cost_efficient", icon: Gauge, kicker: "תכנון יעיל וחסכוני", text: "פתרונות קונסטרוקטיביים שמורידים עלויות בשטח." },
  { id: "approved_by_authorities", icon: FileCheck2, kicker: "תיקים מאושרים בוועדות", text: "ניסיון מוכח עם רשויות, יזמים וקבלנים בכל הארץ." },
];

const headlineGlyphs = [
  { char: "ה", x: 506 },
  { char: "נ", x: 405 },
  { char: "ד", x: 305 },
  { char: "ס", x: 205 },
  { char: "ה", x: 104 },
];

const promiseGlyphs = [
  { char: "ב", x: 500 },
  { char: "ל", x: 446 },
  { char: "י", x: 397 },
  { char: "פ", x: 318 },
  { char: "ש", x: 258 },
  { char: "ר", x: 198 },
  { char: "ו", x: 143 },
  { char: "ת", x: 94 },
];

const SvgLetterRun = ({
  glyphs,
  y,
  fontSize,
  fontWeight,
  fill,
  scaleX = 1.18,
  fillOverrides,
}: {
  glyphs: typeof headlineGlyphs;
  y: number;
  fontSize: number;
  fontWeight: number;
  fill: string;
  scaleX?: number;
  fillOverrides?: Record<number, string>;
}) => (
  <g
    transform={`translate(310 0) scale(${scaleX} 1) translate(-310 0)`}
    style={{ paintOrder: "stroke fill" }}
  >
    {glyphs.map((glyph, index) => {
      const overridden = fillOverrides?.[index];
      return (
        <text
          key={`${glyph.char}-${index}`}
          x={glyph.x}
          y={y}
          textAnchor="middle"
          dominantBaseline="alphabetic"
          fontFamily="Heebo, Assistant, 'Arial Hebrew', Arial, system-ui, sans-serif"
          fontWeight={fontWeight}
          fontSize={fontSize}
          fill={overridden ?? fill}
          className={overridden ? "hero-accent-letter" : undefined}
          style={overridden ? { transformBox: "fill-box", transformOrigin: "center" } : undefined}
        >
          {glyph.char}
        </text>
      );
    })}
  </g>
);

export const Hero = () => {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 4500);
    return () => clearInterval(id);
  }, []);

  // Track each slide view + remember last-seen slide for attribution
  useEffect(() => {
    const s = heroSlides[slide];
    track("hero_slide_view", { slide_id: s.id, slide_index: slide, kicker: s.kicker });
    setAttribution("last_hero_slide_id", s.id);
    setAttribution("last_hero_slide_kicker", s.kicker);
  }, [slide]);

  const Active = heroSlides[slide].icon;

  return (
  <section
    id="home"
    className="relative min-h-[100svh] flex items-center overflow-hidden"
    style={{
      backgroundImage:
        "linear-gradient(135deg, hsl(220 38% 16%) 0%, hsl(218 32% 20%) 55%, hsl(200 28% 24%) 100%)",
    }}
  >
    {/* editorial B&W structural photo — sits above gradient, beneath overlays */}
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <img
        src={heroStructuralBw}
        alt=""
        loading="eager"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover grayscale contrast-110 opacity-60"
      />
      {/* navy wash to keep text contrast — RTL: darker on the right where Hebrew copy sits */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(270deg, hsl(220 40% 10% / 0.86) 0%, hsl(220 38% 14% / 0.70) 50%, hsl(220 32% 18% / 0.35) 100%)",
        }}
      />
    </div>

    {/* amber editorial side stripe — RTL right edge */}
    <div
      aria-hidden
      className="absolute top-0 bottom-0 right-0 w-[3px] sm:w-[5px] z-[8] pointer-events-none"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, hsl(24 95% 53%) 18%, hsl(24 95% 53%) 82%, transparent 100%)",
        boxShadow: "0 0 18px hsl(24 95% 53% / 0.35)",
      }}
    />

    {/* crisp dot grid — sharp, no blur, low contrast */}
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden
      style={{
        backgroundImage:
          "radial-gradient(hsl(var(--primary-foreground) / 0.10) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 12%, black 86%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 12%, black 86%, transparent 100%)",
      }}
    />

    {/* warm gold radial — top right corner light */}
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden
      style={{
        background:
          "radial-gradient(ellipse 900px 600px at 92% 0%, hsl(var(--gold) / 0.22), transparent 60%)",
      }}
    />
    {/* teal pool — bottom left */}
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden
      style={{
        background:
          "radial-gradient(ellipse 900px 600px at 0% 100%, hsl(var(--teal) / 0.18), transparent 65%)",
      }}
    />

    {/* sharp structural blueprint — concentric arcs + beams, top-left */}
    <svg
      className="absolute -top-24 -left-24 w-[640px] h-[640px] opacity-[0.08] pointer-events-none"
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden
    >
      <circle cx="200" cy="200" r="190" stroke="hsl(var(--teal))" strokeWidth="0.6" />
      <circle cx="200" cy="200" r="140" stroke="hsl(var(--teal))" strokeWidth="0.4" />
      <circle cx="200" cy="200" r="90" stroke="hsl(var(--teal))" strokeWidth="0.4" />
      <line x1="10" y1="200" x2="390" y2="200" stroke="hsl(var(--gold))" strokeWidth="0.4" strokeDasharray="4 6" />
      <line x1="200" y1="10" x2="200" y2="390" stroke="hsl(var(--gold))" strokeWidth="0.4" strokeDasharray="4 6" />
    </svg>

    {/* sharp structural skeleton — right side */}
    <svg
      className="absolute right-0 bottom-0 w-[55%] h-[78%] opacity-[0.10] pointer-events-none"
      viewBox="0 0 600 800"
      preserveAspectRatio="xMaxYMax slice"
      fill="none"
      aria-hidden
    >
      <path d="M60 800V120L540 180V800" stroke="hsl(var(--primary-foreground))" strokeWidth="0.6" />
      <path d="M60 260L540 320" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" />
      <path d="M60 400L540 460" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" />
      <path d="M60 540L540 600" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" />
      <path d="M60 680L540 740" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" />
      <path d="M300 150V800" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" />
      <circle cx="60" cy="120" r="3" fill="hsl(var(--gold))" />
      <circle cx="540" cy="180" r="3" fill="hsl(var(--gold))" />
      <circle cx="300" cy="150" r="3" fill="hsl(var(--accent))" />
    </svg>

    {/* sharp accent hairlines — top + bottom */}
    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-gold/60 to-transparent" />
    <div className="absolute bottom-24 inset-x-0 h-px bg-gradient-to-l from-transparent via-teal/40 to-transparent" />

    {/* corner registration marks — sharp, designed */}
    <div className="absolute top-6 right-6 flex flex-col items-end gap-1.5 pointer-events-none opacity-50" aria-hidden>
      <div className="w-10 h-px bg-gold" />
      <div className="w-px h-10 bg-gold" />
    </div>
    <div className="absolute bottom-32 left-6 flex flex-col items-start gap-1.5 pointer-events-none opacity-40" aria-hidden>
      <div className="w-px h-10 bg-teal" />
      <div className="w-10 h-px bg-teal" />
    </div>

    {/* Pencil-sketch construction grid — above visual overlays, behind the copy */}
    <div className="absolute inset-0 z-[7] pointer-events-none">
      <HeroGoldenRatioGrid />
    </div>


    <div className="container t-hero-container relative z-10">
      <div className="max-w-3xl ml-auto">
        <div className="t-hero-badge-row animate-fade-up flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-8 mb-4 px-2 sm:px-4 opacity-95">
          <span className="relative inline-flex items-center justify-center t-hero-chip-pad t-hero-chip py-0.5 leading-tight shrink-0 rounded-none">
            <span className="relative z-10 whitespace-nowrap tracking-[0.18em] font-mono text-[#a98756] text-xs sm:text-sm font-medium">· Reg.no. 35825 ·</span>
          </span>
          <span className="t-hero-brand whitespace-nowrap text-[#a98756] tracking-[0.16em] font-mono text-xs sm:text-sm font-medium">
            SADETSKY <span className="text-[#a98756]/50">/</span> EST. 2018
          </span>
        </div>

        <h1 className="text-primary-foreground animate-fade-up text-right" aria-label="קונסטרוקטור לתכנון שלד וחוות דעת הנדסיות — הנדסה שעומדת מאחורי כל קו">
          <span className="inline-block text-right align-top t-display-punk">
            <span className="relative inline-block pt-8 sm:pt-9">
              <span className="absolute left-2 top-0 sm:left-4 block t-hero-eyebrow font-mono font-extrabold text-white/85 text-left max-w-[calc(100%-8px)] whitespace-nowrap overflow-hidden" dir="ltr" style={{ fontSize: "clamp(9px, 1.45vw, 14px)", letterSpacing: "clamp(0.06em, 0.6vw, 0.22em)" }}>
                <span className="t-design-mark inline-block px-1.5 sm:px-2 py-0.5" style={{ backgroundColor: "hsl(24 95% 53%)", color: "#ffffff" }}>DESIGN</span> <span className="text-white/65">/</span> <span>STRUCTURAL</span> <span className="text-white/65">/</span> <span>ENGINEERING</span>
              </span>


              <span className="block t-punk-primary px-2 sm:px-4 my-2 leading-[1.05] whitespace-nowrap">
                <span className="hero-letter-shaded">ה</span><span className="hero-letter-shaded hero-letter-accent">נ</span><span className="hero-letter-shaded">דסה שעומדת</span>
              </span>
              <span
                className="px-2 sm:px-4 mt-1 mb-2 whitespace-nowrap"
                style={{
                  fontFamily: "Rubik, Heebo, Assistant, sans-serif",
                  fontWeight: 500,
                  fontSize: "clamp(1.4rem, 3.4vw, 2.4rem)",
                  lineHeight: 1,
                  color: "hsl(35 12% 88%)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  direction: "rtl",
                }}
              >
                <span style={{ letterSpacing: "0.08em" }}>מאחורי</span>
                <span style={{ letterSpacing: "0.08em" }}>כל</span>
                <span style={{ letterSpacing: "0.08em" }}>ק<span style={{ color: "hsl(24 95% 53%)" }}>ו</span></span>

              </span>




            </span>
          </span>
        </h1>

        <div className="t-hero-stack-tagline t-hero-row-tagline animate-fade-up text-white flex flex-row flex-wrap items-center justify-start gap-2 sm:gap-3 shadow pr-0 pb-[30px] pt-[38px]">
          <span className="hidden sm:block h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent via-gold to-accent" />
          <span className="t-hero-tagline text-white font-serif font-semibold tracking-wide text-[15px] sm:text-base leading-snug text-right" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.55)" }}>
            הקפדה ודיוק&nbsp;·&nbsp;ניסיון וידע מעמיק&nbsp;·&nbsp;פתרונות יצירתיים
          </span>
          <span className="hidden sm:block h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        </div>
        <p className="t-hero-stack-lead t-lead text-primary-foreground/80 max-w-2xl animate-fade-up">
          שירותי קונסטרוקציה, אישור מהנדס לפרגולה, פתיחת קיר נושא, מבנים מסוכנים, ממ״דים, תוספות בנייה וחוות דעת הנדסיות — משלב הבדיקה ועד מסמך הנדסי מוכן להגשה.
        </p>

        {/* Rotating benefits — increases dwell time before CTAs */}
        <div className="t-hero-stack-benefits max-w-2xl animate-fade-up">
          <div className="relative overflow-hidden rounded-xl bg-primary-foreground/[0.04] border border-gold/15 backdrop-blur-sm">
            <div className="absolute top-0 inset-x-0 h-px bg-primary-foreground/10">
              <div
                key={slide}
                className="h-full bg-gradient-to-l from-gold via-accent to-teal"
                style={{ animation: "hero-progress 4.5s linear forwards" }}
              />
            </div>

            <div key={slide} className="flex items-start t-hero-slide-pad animate-fade-up">
              <div className="shrink-0 w-11 h-11 grid place-items-center -skew-x-6 bg-accent/15 ring-1 ring-gold/40">
                <Active className="skew-x-6 w-5 h-5 text-gold" />
              </div>
              <div className="min-w-0">
                <div className="t-hero-kicker text-gold t-hero-stack-kicker">
                  {heroSlides[slide].kicker}
                </div>
                <p className="t-hero-slide-body text-primary-foreground/90">
                  {heroSlides[slide].text}
                </p>
              </div>
            </div>

            <div className="flex items-center t-hero-dots-row">
              {heroSlides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSlide(i);
                    track("hero_slide_manual_select", { slide_id: s.id, slide_index: i });
                  }}
                  aria-label={`שקופית ${i + 1}`}
                  className={`h-1 rounded-full transition-smooth ${
                    i === slide ? "w-6 bg-gold" : "w-1.5 bg-primary-foreground/25 hover:bg-primary-foreground/50"
                  }`}
                />
              ))}
            </div>
          </div>
          <style>{`
            @keyframes hero-progress { from { transform: translateX(100%); } to { transform: translateX(0); } }
            .hero-letter-shaded {
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
              color: transparent;
              background-image: linear-gradient(180deg, hsl(40 15% 96%) 0%, hsl(35 8% 82%) 50%, hsl(30 6% 68%) 100%);
              text-shadow: 0 1px 2px hsl(0 0% 0% / 0.2);
            }
            .hero-letter-gold {
              background-image: linear-gradient(180deg, hsl(42 70% 78%) 0%, hsl(38 55% 58%) 55%, hsl(34 50% 38%) 100%);
            }
            .hero-letter-blue {
              background-image: linear-gradient(180deg, hsl(210 55% 75%) 0%, hsl(210 45% 55%) 55%, hsl(212 40% 36%) 100%);
            }
            .hero-letter-accent {
              background-image: linear-gradient(180deg, hsl(24 95% 70%) 0%, hsl(24 95% 53%) 55%, hsl(20 85% 38%) 100%);
            }
            .hero-eyebrow-strip {
              background-image: linear-gradient(180deg, hsl(24 95% 70%) 0%, hsl(24 95% 53%) 55%, hsl(20 85% 38%) 100%);
              border-radius: 4px;
              box-shadow:
                inset 0 1px 0 hsl(28 100% 88% / 0.7),
                inset 0 -1px 0 hsl(18 70% 14% / 0.55),
                0 2px 6px hsl(0 0% 0% / 0.45),
                0 1px 0 hsl(0 0% 0% / 0.35);
            }
            .hero-eyebrow-strip-gold {
              background-image: linear-gradient(180deg, hsl(42 78% 62%) 0%, hsl(38 72% 48%) 55%, hsl(34 65% 32%) 100%);
              border-radius: 4px;
              box-shadow:
                inset 0 1px 0 hsl(42 90% 85% / 0.7),
                inset 0 -1px 0 hsl(28 60% 18% / 0.55),
                0 2px 6px hsl(0 0% 0% / 0.45),
                0 1px 0 hsl(0 0% 0% / 0.35);
            }
            .hero-eyebrow-text {
              -webkit-text-stroke: 0.4px hsl(0 0% 0% / 0.55);
              letter-spacing: 0.08em;
            }
            .hero-chrome-text {
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
              color: transparent;
              background-image: linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 92%) 40%, hsl(210 15% 78%) 55%, hsl(0 0% 98%) 75%, hsl(210 10% 70%) 100%);
              -webkit-text-stroke: 0.3px hsl(0 0% 0% / 0.35);
              text-shadow: 0 1px 0 hsl(0 0% 0% / 0.3);
              letter-spacing: 0.06em;
              font-weight: 600;
            }
            .t-punk-closer > span { display: inline-block; }
            @keyframes hero-accent-in {
              0%   { opacity: 0; transform: translateY(8px) scale(0.9); filter: blur(3px); }
              60%  { opacity: 1; filter: blur(0); }
              100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
            }
            .hero-accent-letter {
              opacity: 0;
              animation: hero-accent-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
              animation-delay: 0.15s;
            }
            text.hero-accent-letter:nth-of-type(2) { animation-delay: 0.3s; }
            @media (prefers-reduced-motion: reduce) {
              .hero-accent-letter { opacity: 1; animation: none; }
            }
          `}</style>
        </div>

        <div className="t-hero-stack-cta t-hero-row-cta animate-fade-up grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:flex sm:flex-row sm:flex-wrap sm:items-start sm:justify-start w-full max-w-2xl">
          <Button asChild variant="hero" size="xl" className="w-full sm:w-auto justify-center">
            <a
              href="#contact"
              onClick={() =>
                track("hero_cta_click", { cta: "primary_contact", last_hero_slide_id: heroSlides[slide].id })
              }
            >
              לקבלת בדיקה הנדסית <ArrowLeft className="w-5 h-5" />
            </a>
          </Button>
          <Button asChild variant="outlineHero" size="xl" className="w-full sm:w-auto justify-center">
            <a
              href="#calculators"
              onClick={() =>
                track("hero_cta_click", { cta: "secondary_calculators", last_hero_slide_id: heroSlides[slide].id })
              }
            >
              <Calculator className="w-5 h-5" /> מחשבונים וכלים
            </a>
          </Button>
        </div>


        <div className="t-hero-stack-chips t-hero-row-chips grid grid-cols-2 md:grid-cols-4 max-w-2xl">
          {[
            { icon: TreePine, label: "אישורי פרגולה" },
            { icon: Eye, label: "הריסת קיר פנים" },
            { icon: Waves, label: "אישורי בריכה" },
            { icon: Building2, label: "תכנון קונסטרוקציה" },
          ].map((s) => (
            <div key={s.label} className="flex items-center t-hero-chip-card-pad rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur text-primary-foreground/85 t-hero-chip-label">
              <s.icon className="w-4 h-4 text-teal" />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent" />
  </section>
  );
};
