import { waLink, openWhatsApp } from "@/lib/whatsapp";

const TEXT = "שלום, אשמח לקבל פרטים על בדיקה הנדסית";

const WhatsAppGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
    <path d="M16 .4C7.4.4.4 7.4.4 16c0 2.8.74 5.5 2.14 7.9L.2 31.6l7.94-2.28A15.6 15.6 0 0 0 16 31.6C24.6 31.6 31.6 24.6 31.6 16S24.6.4 16 .4Zm0 28.4a13 13 0 0 1-6.65-1.82l-.48-.28-4.71 1.35 1.37-4.59-.31-.5A13 13 0 1 1 16 28.8Zm7.18-9.7c-.39-.2-2.32-1.14-2.68-1.27-.36-.13-.62-.2-.88.2-.26.39-1 1.27-1.23 1.53-.23.26-.45.29-.84.1-.39-.2-1.65-.61-3.14-1.94-1.16-1.04-1.94-2.32-2.17-2.71-.23-.39-.02-.6.17-.8.18-.18.39-.45.58-.68.2-.23.26-.39.39-.65.13-.26.07-.49-.03-.68-.1-.2-.88-2.12-1.2-2.9-.32-.77-.64-.66-.88-.67h-.75c-.26 0-.68.1-1.04.49-.36.39-1.36 1.33-1.36 3.24 0 1.91 1.39 3.76 1.59 4.02.2.26 2.74 4.18 6.64 5.86.93.4 1.65.64 2.21.82.93.3 1.78.26 2.45.16.75-.11 2.32-.95 2.65-1.86.33-.91.33-1.69.23-1.86-.1-.16-.36-.26-.75-.45Z"/>
  </svg>
);

export const FloatingWhatsApp = () => (
  <div className="fixed t-fab-pos z-50">
    <a
      href={waLink(TEXT)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => openWhatsApp(e, TEXT)}
      aria-label="דברו איתנו ב-WhatsApp"
      className="relative group block rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background touch-manipulation"
    >
      <span className="absolute inset-0 rounded-full bg-whatsapp/25 animate-ping" aria-hidden />
      <span
        className="relative flex items-center justify-center t-fab-row bg-whatsapp text-whatsapp-foreground rounded-full transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-95"
        style={{
          boxShadow:
            "0 8px 24px -6px hsl(var(--whatsapp-glow) / 0.55), 0 2px 6px hsl(var(--whatsapp-glow) / 0.3)",
        }}
      >
        <WhatsAppGlyph className="t-fab-icon" />
        <span className="hidden sm:inline t-fab-label t-body font-medium">דברו איתנו</span>
      </span>
    </a>
  </div>
);
