import { useEffect, useState, useCallback } from "react";
import {
  Accessibility,
  X,
  Plus,
  Minus,
  Contrast,
  Droplet,
  Link2,
  Type,
  RotateCcw,
  PauseCircle,
} from "lucide-react";

type Settings = {
  fontScale: number; // 1.0 = default
  highContrast: boolean;
  grayscale: boolean;
  underlineLinks: boolean;
  readableFont: boolean;
  pauseAnimations: boolean;
};

const DEFAULTS: Settings = {
  fontScale: 1,
  highContrast: false,
  grayscale: false,
  underlineLinks: false,
  readableFont: false,
  pauseAnimations: false,
};

const STORAGE_KEY = "a11y-settings-v1";

const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
};

const applySettings = (s: Settings) => {
  const root = document.documentElement;
  root.style.fontSize = `${Math.round(s.fontScale * 100)}%`;
  root.classList.toggle("a11y-high-contrast", s.highContrast);
  root.classList.toggle("a11y-grayscale", s.grayscale);
  root.classList.toggle("a11y-underline-links", s.underlineLinks);
  root.classList.toggle("a11y-readable-font", s.readableFont);
  root.classList.toggle("a11y-pause-animations", s.pauseAnimations);
};

export const AccessibilityWidget = () => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    applySettings(s);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      applySettings(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = () => update(DEFAULTS);

  return (
    <>
      {/* Trigger button — bottom-right (WhatsApp lives bottom-left) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="פתיחת תפריט נגישות"
        aria-expanded={open}
        aria-controls="a11y-panel"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-elevated flex items-center justify-center hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/60 transition-smooth"
      >
        <Accessibility className="w-7 h-7" aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 bg-foreground/30 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="a11y-panel"
            role="dialog"
            aria-label="תפריט נגישות"
            dir="rtl"
            className="fixed bottom-24 right-6 z-50 w-[min(92vw,340px)] bg-card text-card-foreground border border-border rounded-2xl shadow-elevated overflow-hidden"
          >
            <header className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <Accessibility className="w-5 h-5" aria-hidden="true" />
                <span className="t-body font-bold">נגישות</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירה"
                className="p-1 rounded-md hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </header>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Font size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="t-small font-semibold text-foreground">גודל טקסט</span>
                  <span className="t-small text-muted-foreground" aria-live="polite">
                    {Math.round(settings.fontScale * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => update({ fontScale: Math.max(0.8, +(settings.fontScale - 0.1).toFixed(2)) })}
                    aria-label="הקטנת טקסט"
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Minus className="w-4 h-4" aria-hidden="true" />
                    <span className="t-small">הקטן</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ fontScale: Math.min(1.6, +(settings.fontScale + 0.1).toFixed(2)) })}
                    aria-label="הגדלת טקסט"
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span className="t-small">הגדל</span>
                  </button>
                </div>
              </div>

              <ToggleRow
                icon={<Contrast className="w-5 h-5" aria-hidden="true" />}
                label="ניגודיות גבוהה"
                checked={settings.highContrast}
                onChange={(v) => update({ highContrast: v })}
              />
              <ToggleRow
                icon={<Droplet className="w-5 h-5" aria-hidden="true" />}
                label="גווני אפור"
                checked={settings.grayscale}
                onChange={(v) => update({ grayscale: v })}
              />
              <ToggleRow
                icon={<Link2 className="w-5 h-5" aria-hidden="true" />}
                label="הדגשת קישורים"
                checked={settings.underlineLinks}
                onChange={(v) => update({ underlineLinks: v })}
              />
              <ToggleRow
                icon={<Type className="w-5 h-5" aria-hidden="true" />}
                label="גופן קריא"
                checked={settings.readableFont}
                onChange={(v) => update({ readableFont: v })}
              />
              <ToggleRow
                icon={<PauseCircle className="w-5 h-5" aria-hidden="true" />}
                label="עצירת אנימציות"
                checked={settings.pauseAnimations}
                onChange={(v) => update({ pauseAnimations: v })}
              />

              <button
                type="button"
                onClick={reset}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span className="t-small font-semibold">איפוס הגדרות</span>
              </button>

              <p className="t-small text-muted-foreground text-center pt-1">
                ההגדרות נשמרות במכשיר שלך
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
};

const ToggleRow = ({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
      checked ? "border-accent bg-accent/10" : "border-border hover:bg-muted"
    }`}
  >
    <span className="flex items-center gap-3">
      <span className={checked ? "text-accent" : "text-muted-foreground"}>{icon}</span>
      <span className="t-small font-semibold text-foreground">{label}</span>
    </span>
    <span
      className={`relative w-10 h-6 rounded-full transition-smooth ${
        checked ? "bg-accent" : "bg-muted-foreground/30"
      }`}
      aria-hidden="true"
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-all ${
          checked ? "right-0.5" : "right-[1.125rem]"
        }`}
      />
    </span>
  </button>
);

export default AccessibilityWidget;
