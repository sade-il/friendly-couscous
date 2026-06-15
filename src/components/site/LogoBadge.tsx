import logoMonogram from "@/assets/logo-si-monogram.jpg";

interface LogoBadgeProps {
  /** Size + radius preset. `header` = responsive square w/ rounded-lg; `footer` = fixed 12 w/ rounded-xl */
  variant?: "header" | "footer";
  /** Enable hover scale + glow (Header only by default) */
  interactive?: boolean;
  className?: string;
}

/**
 * Shared SI monogram badge used in Header and Footer.
 * Encapsulates: image, copper border, grain texture (confined exactly to the 1px border strip),
 * and optional hover scale/glow. Keep all visual logic here to avoid drift between surfaces.
 */
export const LogoBadge = ({ variant = "header", interactive = variant === "header", className = "" }: LogoBadgeProps) => {
  const sizeClass =
    variant === "header"
      ? "w-10 h-10 sm:w-11 sm:h-11 xl:w-12 xl:h-12 rounded-lg"
      : "w-12 h-12 rounded-xl";

  const interactiveClass = interactive
    ? "transition-smooth group-hover:scale-105 group-hover:border-accent/75 group-hover:shadow-[0_0_10px_hsl(var(--accent)/0.35)]"
    : "";

  const grainOpacity = interactive ? "opacity-90 transition-opacity group-hover:opacity-100" : "opacity-90";

  return (
    <div
      className={`relative overflow-hidden border border-accent/45 box-border ${sizeClass} ${interactiveClass} ${className}`}
    >
      <img
        src={logoMonogram}
        alt="א. סדצקי הנדסה — מונוגרמה SI"
        className={`w-full h-full object-cover ${interactive ? "transition-smooth group-hover:brightness-110" : ""}`}
      />
      {/* premium copper grain — masked exactly to the 1px border strip */}
      <span
        aria-hidden="true"
        className={`absolute -inset-px pointer-events-none rounded-[inherit] mix-blend-overlay ${grainOpacity}`}
        style={{
          background:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.92  0 0 0 0 0.42  0 0 0 0 0.18  0 0 0 1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\") center / 60px 60px",
          padding: "1px",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          maskComposite: "exclude",
        }}
      />
    </div>
  );
};
