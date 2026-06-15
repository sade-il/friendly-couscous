import { useEffect, useState } from "react";

export const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="fixed top-0 inset-x-0 h-[2px] z-[60] pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-l from-gold via-gold to-accent transition-[width] duration-150 ease-out shadow-[0_0_8px_hsl(var(--gold)/0.7)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
