import { useEffect } from "react";
import { track, setAttribution } from "@/lib/analytics";

/**
 * Tracks two scroll-depth signals across the page:
 *
 * 1. Page depth thresholds — fires `scroll_depth` once per session at
 *    25 / 50 / 75 / 100 % of document height.
 * 2. Section visibility — fires `section_view` the first time each
 *    `<section[id]>` enters the viewport (≥50%), and `section_dwell` when
 *    it leaves, with the time spent in view (seconds).
 *
 * Also writes `deepest_section_id` + `deepest_scroll_pct` to attribution
 * so contact_submit can be correlated with how far the user scrolled.
 */
export const useScrollDepthTracking = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // ───── 1. Page depth thresholds ─────
    const thresholds = [25, 50, 75, 100];
    const fired = new Set<number>();
    let maxPct = 0;

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.min(100, Math.round((scrollTop / docHeight) * 100));
      if (pct > maxPct) {
        maxPct = pct;
        setAttribution("deepest_scroll_pct", maxPct);
      }
      for (const t of thresholds) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          track("scroll_depth", { threshold: t, pct });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // ───── 2. Section visibility + dwell ─────
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main section[id]"));
    const seen = new Set<string>();
    const enteredAt = new Map<string, number>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (!id) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!seen.has(id)) {
              seen.add(id);
              track("section_view", { section_id: id });
            }
            enteredAt.set(id, performance.now());
            setAttribution("deepest_section_id", id);
          } else if (enteredAt.has(id)) {
            const ms = performance.now() - (enteredAt.get(id) ?? 0);
            enteredAt.delete(id);
            const seconds = Math.round(ms / 100) / 10;
            if (seconds >= 1) {
              track("section_dwell", { section_id: id, seconds });
            }
          }
        }
      },
      { threshold: [0, 0.5, 1] }
    );

    sections.forEach((s) => io.observe(s));

    // Flush dwell for the currently visible section on unload
    const flushDwell = () => {
      const now = performance.now();
      enteredAt.forEach((startedAt, id) => {
        const seconds = Math.round((now - startedAt) / 100) / 10;
        if (seconds >= 1) track("section_dwell", { section_id: id, seconds, reason: "unload" });
      });
      enteredAt.clear();
    };
    window.addEventListener("pagehide", flushDwell);
    window.addEventListener("beforeunload", flushDwell);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flushDwell);
      window.removeEventListener("beforeunload", flushDwell);
      io.disconnect();
    };
  }, []);
};
