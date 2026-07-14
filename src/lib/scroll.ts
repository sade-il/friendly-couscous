import type { MouseEvent } from "react";

// Fallback height used if the sticky header is not mounted yet.
const HEADER_OFFSET = 96;
// Land the heading a few px BELOW the sticky header (not exactly at its edge):
// avoids sub-pixel occlusion and stops the realign loop from fighting
// integer-scroll rounding around a 1px boundary.
const HEADER_GAP = 8;
const ALIGN_TOLERANCE = 2;
const ALIGN_RETRIES = 40;
const MOUNT_RETRIES = 200;
const ALIGN_DELAY_MS = 30;

const headerOffset = () =>
  document.querySelector("header")?.getBoundingClientRect().bottom ?? HEADER_OFFSET;

const scrollAnchorForId = (id: string) => {
  const target = document.getElementById(id);
  if (!target) return null;
  return target.matches("h1, h2, h3") ? target : (target.querySelector("h1, h2, h3") ?? target);
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const applyScroll = (anchor: Element, behavior: ScrollBehavior) => {
  const top = anchor.getBoundingClientRect().top + window.scrollY - headerOffset() - HEADER_GAP;
  if (behavior === "auto") window.scrollTo(0, Math.max(top, 0));
  else window.scrollTo({ top: Math.max(top, 0), behavior });
};

/**
 * Scroll a section (`#id`) flush below the sticky header. Shared by the nav
 * click handler and the deep-link / hashchange handler so both paths use the
 * exact same offset and easing. Returns true if the target existed.
 *
 * When the target element is not yet in the DOM (e.g. a React.lazy section
 * that hasn't finished loading), the scroll is deferred and retried
 * automatically so that lazy-loaded sections land correctly.
 */
export const scrollToId = (
  id: string,
  behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth"
): boolean => {
  const anchor = scrollAnchorForId(id);
  if (!anchor) {
    // Section not mounted yet (lazy-loaded chunk). Retry until it appears.
    let mountRetries = MOUNT_RETRIES;
    const retry = () => {
      const a = scrollAnchorForId(id);
      if (!a) {
        if (--mountRetries > 0) setTimeout(retry, ALIGN_DELAY_MS);
        return;
      }
      applyScroll(a, behavior);
    };
    setTimeout(retry, ALIGN_DELAY_MS);
    return false;
  }
  applyScroll(anchor, behavior);
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
  alignToCurrentHash();
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
  let mountRetries = MOUNT_RETRIES;
  let tries = 0;
  const run = () => {
    if (cancelled) return;
    const anchor = scrollAnchorForId(id);
    if (!anchor) {
      // Lazy-loaded section not mounted yet; keep polling until it appears.
      if (--mountRetries > 0) setTimeout(run, ALIGN_DELAY_MS);
      return;
    }
    const delta = anchor.getBoundingClientRect().top - headerOffset() - HEADER_GAP;
    if (Math.abs(delta) <= ALIGN_TOLERANCE) return;

    // Land instantly (deep links shouldn't animate the whole page) and re-align
    // for a short period to absorb native hash jumps plus late layout shifts
    // above the target. Once offsets are stable these passes are no-ops.
    window.scrollTo(0, Math.max(window.scrollY + delta, 0));
    if (++tries < ALIGN_RETRIES) setTimeout(run, ALIGN_DELAY_MS);
  };
  // Let the browser/native hash jump happen first, then measure the settled DOM.
  requestAnimationFrame(() => setTimeout(run, 0));
  return () => {
    cancelled = true;
  };
};
