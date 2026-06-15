import type { MouseEvent } from "react";

export const scrollToHash = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
  if (!href.startsWith("#")) return;

  e.preventDefault();
  const target = document.getElementById(href.slice(1));

  if (!target) {
    window.location.hash = href;
    return;
  }

  const headerOffset = 96;
  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;

  window.history.pushState(null, "", href);
  window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
};