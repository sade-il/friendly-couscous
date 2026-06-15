interface LogoProps {
  className?: string;
  variant?: "light" | "dark";
}

/**
 * Sadetsky monogram — brutalist remix.
 * Knockout SI on a shifted accent block, sharp ticks, off-grid construction marks.
 */
export const Logo = ({ className, variant = "light" }: LogoProps) => {
  const ink = variant === "light" ? "hsl(0 0% 100%)" : "hsl(var(--primary))";
  const ghost = variant === "light" ? "hsl(0 0% 100% / 0.4)" : "hsl(var(--primary) / 0.4)";
  const accent = "hsl(var(--accent))";
  const teal = "hsl(var(--teal))";

  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="א. סדצקי הנדסה וייעוץ"
      role="img"
    >
      {/* shifted accent block (no rounded corners — brutalist) */}
      <rect x="14" y="10" width="40" height="40" fill={accent} />

      {/* off-set teal outline block, peeking */}
      <rect x="10" y="14" width="40" height="40" fill="none" stroke={teal} strokeWidth="1.4" />

      {/* engineering ticks — asymmetric, not in every corner */}
      <g stroke={ghost} strokeWidth="0.8" fill="none">
        <path d="M2 6 H10 M6 2 V10" />
        <path d="M62 58 H54 M58 62 V54" />
        <line x1="2" y1="32" x2="8" y2="32" />
        <line x1="56" y1="32" x2="62" y2="32" />
      </g>

      {/* coordinate label */}
      <text x="2" y="62" fontFamily="ui-monospace, monospace" fontSize="3.6" fill={ghost}>1.618</text>

      {/* SI — knockout, slab serif vibe via condensed bold */}
      <text
        x="34"
        y="42"
        textAnchor="middle"
        fontFamily="'Heebo', 'Arial Black', system-ui, sans-serif"
        fontWeight={900}
        fontSize="32"
        fill={ink}
        letterSpacing="-2"
        style={{ paintOrder: "stroke" }}
      >
        SI
      </text>

      {/* slash — the rebellion */}
      <line x1="50" y1="6" x2="6" y2="58" stroke={ink} strokeWidth="1.6" />
      <circle cx="50" cy="6" r="1.8" fill={ink} />
    </svg>
  );
};
