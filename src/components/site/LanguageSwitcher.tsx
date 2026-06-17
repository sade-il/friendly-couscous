import { Link, useLocation } from "react-router-dom";
import { Globe } from "lucide-react";
import { track } from "@/lib/analytics";

const langs = [
  { code: "he", label: "HE", path: "/" },
  { code: "ru", label: "RU", path: "/ru" },
  { code: "en", label: "EN", path: "/en" },
  { code: "fr", label: "FR", path: "/fr" },
];

export const LanguageSwitcher = ({ variant = "header" }: { variant?: "header" | "mobile" }) => {
  const location = useLocation();
  const current = langs.find((l) => l.path === location.pathname)?.code ?? "he";

  return (
    <div
      className={`flex items-center gap-1 ${
        variant === "header" ? "" : "px-3 py-2"
      }`}
      role="group"
      aria-label="בחירת שפה"
    >
      <Globe className="w-3.5 h-3.5 text-gold/70 shrink-0" aria-hidden />
      {langs.map((l) => {
        const isActive = l.code === current;
        return (
          <Link
            key={l.code}
            to={l.path}
            onClick={() => track("language_switch", { from: current, to: l.code })}
            aria-current={isActive ? "page" : undefined}
            className={`t-mono text-[10px] tracking-[0.18em] px-1.5 py-1 inline-flex items-center justify-center min-w-[44px] min-h-[44px] transition-smooth ${
              isActive
                ? "text-gold border-b border-gold"
                : "text-primary-foreground/60 hover:text-gold border-b border-transparent"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
};
