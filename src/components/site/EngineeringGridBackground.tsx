/**
 * Site-wide engineering grid backdrop.
 * Hair-thin SVG grid (0.5px) at very low opacity, fixed behind all content.
 * Inspired by drafting paper / blueprint construction lines from the brand identity.
 *
 * Sits at z-0 with pointer-events-none so it never blocks interactions and
 * does not change any existing section background — sections with their own
 * solid bg simply cover it; sections that are transparent reveal it.
 */
export const EngineeringGridBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* fine 24px grid — hair-thin */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.06]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="eng-grid-fine" width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
          <pattern id="eng-grid-major" width="120" height="120" patternUnits="userSpaceOnUse">
            <path
              d="M 120 0 L 0 0 0 120"
              fill="none"
              stroke="hsl(var(--accent))"
              strokeWidth="0.6"
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#eng-grid-fine)" />
        <rect width="100%" height="100%" fill="url(#eng-grid-major)" opacity="0.55" />
      </svg>
    </div>
  );
};
