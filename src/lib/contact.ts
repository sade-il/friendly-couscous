import type { MouseEvent } from "react";

export const CONTACT_PHONE_E164 = "+972524209183";
export const CONTACT_PHONE_DISPLAY = "052-4209183";
export const CONTACT_EMAIL = "ilya@sade-il.pro";
export const OFFICE_ADDRESS = "נים 2, ראשון לציון";
export const FACEBOOK_URL = "https://www.facebook.com/people/%D7%A1%D7%93%D7%A6%D7%A7%D7%99-%D7%9E%D7%94%D7%A0%D7%93%D7%A1-%D7%91%D7%A0%D7%99%D7%99%D7%9F/100063612424298/";
export const FACEBOOK_APP_URL = "fb://profile/100063612424298";
export const INSTAGRAM_URL = "https://www.instagram.com/";

export const phoneLink = () => `tel:${CONTACT_PHONE_E164}`;

export const mailtoLink = (subject?: string, body?: string) => {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);

  return `mailto:${CONTACT_EMAIL}${params.toString() ? `?${params.toString()}` : ""}`;
};

export const mapsLink = () =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS)}`;

export const wazeLink = () =>
  `https://waze.com/ul?q=${encodeURIComponent(OFFICE_ADDRESS)}&navigate=yes`;

const isEmbeddedPreview = () => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
};

const openInNewTab = (url: string) => {
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (win && !win.closed) return;
  window.location.href = url;
};

export const openExternal = (e: MouseEvent<HTMLAnchorElement>, url: string) => {
  e.preventDefault();
  openInNewTab(url);
};

export const openMaps = (e: MouseEvent<HTMLAnchorElement>) => openExternal(e, mapsLink());

export const openWaze = (e: MouseEvent<HTMLAnchorElement>) => openExternal(e, wazeLink());

export const openFacebook = (e: MouseEvent<HTMLAnchorElement>) => {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // In the embedded preview iframe and on desktop, let the native anchor's
  // target="_blank" open Facebook in a new tab (escapes the preview frame).
  if (!isMobile || isEmbeddedPreview()) {
    return;
  }

  // On real mobile devices, try the Facebook app first, then fall back to web.
  e.preventDefault();
  window.location.href = FACEBOOK_APP_URL;
  window.setTimeout(() => {
    openInNewTab(FACEBOOK_URL);
  }, 900);
};