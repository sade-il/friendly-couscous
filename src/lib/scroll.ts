import type { MouseEvent } from "react";

// Height of the sticky header we must clear so a section heading lands flush
// just below it (kept in sync with the visual header height).
const HEADER_OFFSET = 96;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Scroll a section (`#id`) flush below the sticky header. Shared by the nav
 * click handler and the deep-link / hashchange handler so both paths use the
 * exact same offset and easing. Returns true if the target existed.
 */
export const scrollToId = (
  id: string,
  behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth"
): boolean => {
  const target = document.getElementById(id);
  if (!target) return false;
  const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top: Math.max(top, 0), behavior });
  return true;
};

export const scrollToHash = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
  if (!href.startsWith("#")) return;

  e.preventDefault();
  const id = href.slice(1);

  if (!document.getElementById(id)) {
    window.location.hash = href;
    return;
  }

  window.history.pushState(null, "", href);
  scrollToId(id);
};

/**
 * Align the section named by `window.location.hash` below the sticky header.
 * Used for direct hash entry from the address bar, deep links and reloads —
 * cases where there is no nav click, so `scrollToHash` never runs. SPA sections
 * mount after the initial paint, so the browser's native hash jump finds no
 * target and does nothing; this restores the expected alignment.
 *
 * Retries briefly because late layout (fonts/lazy content above the target) can
 * shift offsets just after mount.
 */
export const alignToCurrentHash = (): (() => void) => {
  const id = window.location.hash.replace(/^#/, "");
  if (!id) return () => {};

  let cancelled = false;
  let tries = 0;
  const run = () => {
    if (cancelled) return;
    // Land instantly (deep links shouldn't animate the whole page) and re-align
    // a few times to absorb post-mount layout shifts from fonts / lazy content
    // above the target. Once offsets are stable these passes are no-ops.
    scrollToId(id, "auto");
    if (++tries < 5) setTimeout(run, 120);
  };
  // Defer a frame so the target's mounted layout is measured, not its initial.
  requestAnimationFrame(run);
  return () => {
    cancelled = true;
  };
};