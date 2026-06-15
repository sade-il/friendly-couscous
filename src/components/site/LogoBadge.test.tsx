import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LogoBadge } from "./LogoBadge";

const source = readFileSync(resolve(__dirname, "LogoBadge.tsx"), "utf-8");

// Visual regression contract for LogoBadge.
// Locks in the structural properties that guarantee the grain texture and
// copper border stay confined to the 1px border strip — at rest, on hover,
// and across all viewports (mobile + desktop).
//
// We can't take real pixel snapshots here, but the following invariants
// are exactly what keep the grain from bleeding inside or outside the ring:
//   • container has `overflow-hidden` (clips any child past the rounded box)
//   • container uses `border` + `box-border` (1px ring, predictable geometry)
//   • grain <span> uses `-inset-px` (covers the border strip, not beyond)
//   • grain uses CSS mask with `content-box` + `xor`/`exclude` composite
//     so only the 1px padding band is painted
//   • grain inherits the container's border-radius via `rounded-[inherit]`
//   • hover only changes opacity/scale/glow — never geometry of the mask

const getBadge = (el: HTMLElement) => el.firstElementChild as HTMLElement;
const getGrain = (badge: HTMLElement) =>
  badge.querySelector('span[aria-hidden="true"]') as HTMLSpanElement;

describe("LogoBadge — grain & border containment contract", () => {
  describe("container", () => {
    it("clips children with overflow-hidden so nothing bleeds past rounded corners", () => {
      const { container } = render(<LogoBadge />);
      expect(getBadge(container).className).toContain("overflow-hidden");
    });

    it("uses a 1px border with box-border for predictable strip geometry", () => {
      const { container } = render(<LogoBadge />);
      const cls = getBadge(container).className;
      expect(cls).toContain("border");
      expect(cls).toContain("border-accent/45");
      expect(cls).toContain("box-border");
    });

    it("header variant is responsive across mobile → desktop without changing border width", () => {
      const { container } = render(<LogoBadge variant="header" />);
      const cls = getBadge(container).className;
      // Mobile, small, xl breakpoints — size scales but border stays 1px.
      expect(cls).toMatch(/w-10\s+h-10/);
      expect(cls).toMatch(/sm:w-11\s+sm:h-11/);
      expect(cls).toMatch(/xl:w-12\s+xl:h-12/);
      expect(cls).toContain("rounded-lg");
      // No border-2/border-[Npx] override sneaking in.
      expect(cls).not.toMatch(/border-(2|4|8|\[)/);
    });

    it("footer variant uses fixed size + larger radius, still 1px border", () => {
      const { container } = render(<LogoBadge variant="footer" />);
      const cls = getBadge(container).className;
      expect(cls).toMatch(/w-12\s+h-12/);
      expect(cls).toContain("rounded-xl");
      expect(cls).not.toMatch(/border-(2|4|8|\[)/);
    });
  });

  describe("grain layer", () => {
    it("exists and is decorative (aria-hidden, pointer-events-none)", () => {
      const { container } = render(<LogoBadge />);
      const grain = getGrain(getBadge(container));
      expect(grain).toBeTruthy();
      expect(grain.getAttribute("aria-hidden")).toBe("true");
      expect(grain.className).toContain("pointer-events-none");
    });

    it("uses -inset-px so it spans exactly the 1px border strip (not the inside, not beyond)", () => {
      const { container } = render(<LogoBadge />);
      const grain = getGrain(getBadge(container));
      expect(grain.className).toContain("-inset-px");
    });

    it("inherits the container's border-radius so the strip follows rounded corners", () => {
      const { container } = render(<LogoBadge />);
      const grain = getGrain(getBadge(container));
      expect(grain.className).toContain("rounded-[inherit]");
    });

    it("uses a content-box + exclude mask so only the 1px padding band is painted", () => {
      const { container } = render(<LogoBadge />);
      const grain = getGrain(getBadge(container));
      const style = grain.getAttribute("style") || "";
      // padding defines the band width — must be 1px to match the border.
      expect(style).toMatch(/padding:\s*1px/);
      // Mask geometry: content-box layer XOR'd with full-box layer = ring only.
      expect(style).toContain("content-box");
      // jsdom may serialize either WebKit or standard property — assert source.
      expect(source).toMatch(/WebkitMaskComposite:\s*["']xor["']/);
      expect(source).toMatch(/maskComposite:\s*["']exclude["']/);
    });

    it("uses mix-blend-overlay so it tints the copper without covering the image", () => {
      const { container } = render(<LogoBadge />);
      const grain = getGrain(getBadge(container));
      expect(grain.className).toContain("mix-blend-overlay");
    });
  });

  describe("hover behavior (interactive variant)", () => {
    it("hover only changes opacity/scale/glow — never the mask geometry", () => {
      const { container } = render(<LogoBadge variant="header" />);
      const badge = getBadge(container);
      const grain = getGrain(badge);

      // Container hover affordances (allowed: scale, border color, shadow).
      expect(badge.className).toContain("group-hover:scale-105");
      expect(badge.className).toContain("group-hover:border-accent/75");
      expect(badge.className).toMatch(/group-hover:shadow-\[/);

      // Grain hover affordance: opacity only.
      expect(grain.className).toContain("group-hover:opacity-100");

      // Forbidden: any hover rule that would resize the grain or break the mask.
      expect(grain.className).not.toMatch(/group-hover:(inset|p-|m-|scale|translate|rounded)/);
      // Forbidden: container hover that would change border width / overflow.
      expect(badge.className).not.toMatch(/group-hover:(border-(2|4|8|\[)|overflow-)/);
    });

    it("non-interactive (footer) variant has no hover transforms that could shift the strip", () => {
      const { container } = render(<LogoBadge variant="footer" />);
      const badge = getBadge(container);
      expect(badge.className).not.toContain("group-hover:scale");
      expect(badge.className).not.toContain("group-hover:border-accent/75");
    });
  });

  describe("source-level invariants", () => {
    it("does not introduce a border thicker than 1px anywhere in the component", () => {
      // Catches accidental Tailwind escalations like border-2 / border-[2px].
      expect(source).not.toMatch(/\bborder-(2|4|8)\b/);
      expect(source).not.toMatch(/border-\[\s*[2-9]px\s*\]/);
    });

    it("keeps grain padding === border width (1px) so the strip aligns perfectly", () => {
      // If the border ever grows, the padding here must grow to match —
      // this assertion forces that change to be deliberate.
      const paddingMatch = source.match(/padding:\s*["'](\d+)px["']/);
      expect(paddingMatch, "grain padding must be set explicitly in px").toBeTruthy();
      expect(paddingMatch![1]).toBe("1");
    });

    it("grain stays absolutely positioned (never flows out into layout)", () => {
      const { container } = render(<LogoBadge />);
      const grain = getGrain(getBadge(container));
      expect(grain.className).toContain("absolute");
    });
  });
});
