/**
 * Hero construction sketch — pencil-style guide lines like an artist's
 * preparatory study. Parallel but uneven; pressure fades toward line ends.
 * Lines are kept only in the top/bottom margins around the headline copy so
 * they never cross text. One horizontal and one vertical line carry a slow
 * light/shadow shimmer to feel alive.
 *
 * viewBox 1618×1000 is stretched (preserveAspectRatio="none").
 * Text-safe band approx: y 205–830 (headline + tagline + lead on mobile).
 */
export const HeroGoldenRatioGrid = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <style>{`
        @keyframes hero-grid-shimmer {
          0%, 100% { opacity: 0.25; filter: drop-shadow(0 0 1px hsl(42 70% 70% / 0.2)); }
          50%      { opacity: 1;    filter: drop-shadow(0 0 6px hsl(44 95% 80% / 0.55)); }
        }
        .hero-grid-shimmer-h { animation: hero-grid-shimmer 6.5s ease-in-out infinite; transform-origin: center; }
        .hero-grid-shimmer-v { animation: hero-grid-shimmer 7.8s ease-in-out infinite 1.4s; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .hero-grid-shimmer-h, .hero-grid-shimmer-v { animation: none; }
        }
      `}</style>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1618 1000"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* horizontal pencil — fades from left to right */}
          <linearGradient id="hgr-pencil-h" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="1700" y2="0">
            <stop offset="0%"   stopColor="hsl(40 40% 92%)" stopOpacity="0" />
            <stop offset="5%"   stopColor="hsl(42 70% 88%)" stopOpacity="0.7" />
            <stop offset="40%"  stopColor="hsl(44 90% 90%)" stopOpacity="0.9" />
            <stop offset="75%"  stopColor="hsl(42 80% 86%)" stopOpacity="0.75" />
            <stop offset="95%"  stopColor="hsl(38 60% 78%)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(38 50% 72%)" stopOpacity="0" />
          </linearGradient>

          {/* horizontal pencil — fades right to left */}
          <linearGradient id="hgr-pencil-h-rev" gradientUnits="userSpaceOnUse" x1="1700" y1="0" x2="320" y2="0">
            <stop offset="0%"   stopColor="hsl(40 40% 92%)" stopOpacity="0" />
            <stop offset="10%"  stopColor="hsl(42 70% 88%)" stopOpacity="0.7" />
            <stop offset="42%"  stopColor="hsl(44 90% 90%)" stopOpacity="0.9" />
            <stop offset="72%"  stopColor="hsl(42 80% 86%)" stopOpacity="0.65" />
            <stop offset="96%"  stopColor="hsl(38 60% 78%)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(38 50% 72%)" stopOpacity="0" />
          </linearGradient>

          {/* vertical pencil — fades top to bottom (short, top segment) */}
          <linearGradient id="hgr-pencil-v-top" gradientUnits="userSpaceOnUse" x1="0" y1="60" x2="0" y2="350">
            <stop offset="0%"   stopColor="hsl(40 40% 92%)" stopOpacity="0" />
            <stop offset="15%"  stopColor="hsl(42 70% 88%)" stopOpacity="0.7" />
            <stop offset="55%"  stopColor="hsl(44 90% 90%)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(38 60% 78%)" stopOpacity="0" />
          </linearGradient>

          {/* vertical pencil — fades bottom to top (short, bottom segment) */}
          <linearGradient id="hgr-pencil-v-bot" gradientUnits="userSpaceOnUse" x1="0" y1="940" x2="0" y2="730">
            <stop offset="0%"   stopColor="hsl(40 40% 92%)" stopOpacity="0" />
            <stop offset="25%"  stopColor="hsl(42 70% 88%)" stopOpacity="0.7" />
            <stop offset="70%"  stopColor="hsl(44 90% 90%)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(38 60% 78%)" stopOpacity="0" />
          </linearGradient>

          {/* full vertical for the far-left edge (outside text column) */}
          <linearGradient id="hgr-pencil-v-full" gradientUnits="userSpaceOnUse" x1="0" y1="80" x2="0" y2="930">
            <stop offset="0%"   stopColor="hsl(40 40% 92%)" stopOpacity="0" />
            <stop offset="10%"  stopColor="hsl(42 70% 88%)" stopOpacity="0.7" />
            <stop offset="50%"  stopColor="hsl(44 90% 90%)" stopOpacity="0.9" />
            <stop offset="90%"  stopColor="hsl(38 60% 78%)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(38 50% 72%)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
          style={{ mixBlendMode: "screen" }}
        >
          {/* ── horizontals: above & below the full mobile text band ── */}
          {/* top horizontal — shimmering, lowered below the second headline row
              "מאחורי כל קו", extends slightly past the leftmost vertical so they cross */}
          <line
            className="hero-grid-shimmer-h"
            x1="-40" y1="195" x2="1094" y2="195"
            stroke="url(#hgr-pencil-h)" strokeWidth="0.3" vectorEffect="non-scaling-stroke"
          />
          <line
            x1="760" y1="114" x2="1620" y2="114"
            stroke="url(#hgr-pencil-h-rev)" strokeWidth="0.21" vectorEffect="non-scaling-stroke"
          />

          {/* bottom horizontals — below the text band */}
          <line
            x1="1056" y1="735" x2="1316" y2="735"
            stroke="url(#hgr-pencil-h-rev)" strokeWidth="0.26" vectorEffect="non-scaling-stroke"
          />
          <line
            x1="420" y1="540" x2="760" y2="540"
            stroke="url(#hgr-pencil-h-rev)" strokeWidth="0.19" vectorEffect="non-scaling-stroke"
          />

          {/* ── verticals: all are broken before/after text, no full-height crossings ── */}
          <line
            x1="120" y1="86" x2="120" y2="346"
            stroke="url(#hgr-pencil-v-top)" strokeWidth="0.28" vectorEffect="non-scaling-stroke"
          />
          <line
            x1="148" y1="96" x2="148" y2="188"
            stroke="url(#hgr-pencil-v-top)" strokeWidth="0.19" vectorEffect="non-scaling-stroke"
          />

          {/* ── interior verticals: split around the text band (gap 200–730) ── */}
          {/* shimmering vertical (right-side, top segment) */}
          <line
            className="hero-grid-shimmer-v"
            x1="1560" y1="72" x2="1560" y2="252"
            stroke="url(#hgr-pencil-v-top)" strokeWidth="0.28" vectorEffect="non-scaling-stroke"
          />
          <line
            x1="1386" y1="838" x2="1386" y2="932"
            stroke="url(#hgr-pencil-v-bot)" strokeWidth="0.28" vectorEffect="non-scaling-stroke"
          />

          {/* mid vertical — only top + bottom slivers, dashed (φ guide) */}
          <line
            x1="987" y1="100" x2="987" y2="182"
            stroke="url(#hgr-pencil-v-top)" strokeWidth="0.17" vectorEffect="non-scaling-stroke"
            strokeDasharray="2 6"
          />
          <line
            x1="987" y1="846" x2="987" y2="920"
            stroke="url(#hgr-pencil-v-bot)" strokeWidth="0.17" vectorEffect="non-scaling-stroke"
            strokeDasharray="2 6"
          />
        </g>

        {/* tiny φ caption — like the "1.618" pencil mark on the logo */}
        <text
          x="120" y="928"
          fontFamily="ui-monospace, 'SF Mono', monospace"
          fontSize="9"
          fill="hsl(40 50% 75%)"
          opacity="0.35"
          letterSpacing="3"
        >
          φ 1.618
        </text>
      </svg>
    </div>
  );
};
