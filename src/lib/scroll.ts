import type { MouseEvent } from "react";

// Height of the sticky header we must clear so a section heading lands flush
// just below it (kept in sync with the visual header height).
const HEADER_OFFSET = 96;
const ALIGNMENT_TOLERANCE_PX = { min: 0, max: 2 } as const;
const ALIGNMENT_RETRY_DELAY_MS = 120;
const MAX_ALIGNMENT_RETRIES = 3;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const getScrollTarget = (id: string) => {
  const section = document.getElementById(id);
  if (!section) return null;
  return section.querySelector<HTMLElement>("h1, h2, h3") ?? section;
};

const getHeaderOffset = () => {
  const header = document.querySelector("header");
  const stickyBar = header?.querySelector(":scope > .container");
  if (stickyBar instanceof HTMLElement) return stickyBar.getBoundingClientRect().bottom;
  return header instanceof HTMLElement ? header.getBoundingClientRect().bottom : HEADER_OFFSET;
};

const isTargetAligned = (id: string) => {
  const target = getScrollTarget(id);
  if (!target) return false;
  const delta = target.getBoundingClientRect().top - getHeaderOffset();
  return delta >= ALIGNMENT_TOLERANCE_PX.min && delta <= ALIGNMENT_TOLERANCE_PX.max;
};

/**
 * Scroll a section (`#id`) flush below the sticky header. Shared by the nav
 * click handler and the deep-link / hashchange handler so both paths use the
 * exact same offset and easing. Returns true if the target existed.
 */
export const scrollToId = (
  id: string,
  behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth"
): boolean => {
  const target = getScrollTarget(id);
  if (!target) return false;
  const top = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
  const nextTop = Math.max(top, 0);
  if (behavior === "smooth") {
    window.scrollTo({ top: nextTop, behavior });
  } else {
    window.scrollTo(0, nextTop);
  }
  return true;
};

export const scrollToHash = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
  if (!href.startsWith("#")) return;

  e.preventDefault();
  const id = href.slice(1);

  if (!getScrollTarget(id)) {
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
  const timeoutIds = new Set<number>();
  const run = () => {
    if (cancelled) return;
    // Land instantly (deep links shouldn't animate the whole page) and re-align
    // a few times to absorb post-mount layout shifts from fonts / lazy content
    // above the target. Once offsets are stable these passes are no-ops.
    const aligned = scrollToId(id, "auto") && isTargetAligned(id);
    const shouldContinue = tries === 0 || !aligned;
    tries += 1;
    if (shouldContinue && tries < MAX_ALIGNMENT_RETRIES) {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        run();
      }, ALIGNMENT_RETRY_DELAY_MS);
      timeoutIds.add(timeoutId);
    }
  };
  run();
  return () => {
    cancelled = true;
    for (const timeoutId of timeoutIds) clearTimeout(timeoutId);
    timeoutIds.clear();
  };
};