// Provider-agnostic analytics shim.
// Pushes to window.dataLayer (GA4 / GTM compatible) and dispatches a
// CustomEvent("lvbl:track") so any provider (PostHog, Plausible, Segment…)
// can subscribe later without changing call sites.

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

const STORAGE_KEY = "lvbl_attribution";

export function track(event: string, props: TrackProps = {}) {
  const payload = { event, ...props, ts: Date.now() };

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    if (typeof window.gtag === "function") {
      window.gtag("event", event, props);
    }
    window.dispatchEvent(new CustomEvent("lvbl:track", { detail: payload }));
    if (import.meta.env.DEV) console.debug("[analytics]", event, props);
  } catch {
    /* no-op */
  }
}

// Lightweight last-touch attribution so we know which Hero slide
// was on screen when a CTA / form submit happened.
export function setAttribution(key: string, value: string | number) {
  try {
    const cur = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    cur[key] = value;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
  } catch {
    /* no-op */
  }
}

export function getAttribution(): Record<string, string | number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
