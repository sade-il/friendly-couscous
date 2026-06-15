import type { MouseEvent } from "react";

export const WHATSAPP_PHONE = "972524209183";

/**
 * Universal WhatsApp link. wa.me opens the native app on mobile when
 * installed, and falls back to WhatsApp Web on desktop — unlike the
 * `whatsapp://` URI scheme which silently fails when the app is missing.
 */
export const waLink = (text?: string) =>
  `https://wa.me/${WHATSAPP_PHONE}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/**
 * Opens WhatsApp in a new tab so the current site is preserved.
 */
export const openWhatsApp = (e: MouseEvent<HTMLAnchorElement>, text?: string) => {
  e.preventDefault();
  const url = waLink(text);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    // Popup blocked — fall back to same-tab navigation.
    window.location.href = url;
  }
};
