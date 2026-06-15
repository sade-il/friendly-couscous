/**
 * Unicode-normalization coverage for redirect-vs-sitemap collision logic.
 *
 * Two URLs that LOOK identical can be byte-different when one uses NFC
 * (precomposed) and the other NFD (decomposed). Crawlers treat them as
 * distinct URLs → duplicate content. Same hazard with typographic
 * lookalikes: ASCII hyphen `-` vs en-dash `–` vs minus `−`, straight
 * apostrophe `'` vs curly `’`, Hebrew geresh `׳` vs apostrophe `'`.
 *
 * Policy (matches what the prerender/sitemap pipeline should enforce):
 *   1. Normalize every path to NFC before comparison.
 *   2. Treat lookalike punctuation as DIFFERENT codepoints (do NOT fold
 *      `–` → `-`). The sitemap is the canonical source of truth; if a
 *      redirect uses a different glyph it MUST be flagged.
 *
 * Mirrors the decode-then-compare step in scripts/validate-sitemap-structure.ts
 * and extends src/test/redirect-percent-encoding-collision.test.ts with the
 * Unicode-normalization axis.
 */
import { describe, expect, it } from "vitest";

const trailingVariant = (p: string) =>
  p === "/" ? "/" : p.endsWith("/") ? p.slice(0, -1) : `${p}/`;

const stripQueryHash = (p: string) => p.split("#")[0].split("?")[0];

const safeDecode = (p: string) => {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
};

/** Decode percent-escapes, strip ?/#, then NFC-normalize. */
const normalize = (p: string) => safeDecode(stripQueryHash(p)).normalize("NFC");

export type RedirectIssue =
  | "source-in-sitemap"
  | "source-trailing-variant-in-sitemap"
  | "target-missing-from-sitemap"
  | "target-trailing-duplicate-in-sitemap"
  | "source-non-nfc"
  | "target-non-nfc";

export function checkRedirect(
  from: string,
  to: string,
  /** Sitemap paths — assumed already NFC-normalized at load time. */
  sitemapPaths: Set<string>,
): RedirectIssue[] {
  const issues: RedirectIssue[] = [];

  const fromRaw = safeDecode(stripQueryHash(from));
  const toRaw = safeDecode(stripQueryHash(to));

  if (fromRaw !== fromRaw.normalize("NFC")) issues.push("source-non-nfc");
  if (toRaw !== toRaw.normalize("NFC")) issues.push("target-non-nfc");

  const fromPath = normalize(from);
  if (sitemapPaths.has(fromPath)) issues.push("source-in-sitemap");
  if (sitemapPaths.has(trailingVariant(fromPath))) {
    issues.push("source-trailing-variant-in-sitemap");
  }

  const toPath = normalize(to);
  if (!sitemapPaths.has(toPath)) issues.push("target-missing-from-sitemap");
  if (
    toPath !== "/" &&
    sitemapPaths.has(toPath) &&
    sitemapPaths.has(trailingVariant(toPath))
  ) {
    issues.push("target-trailing-duplicate-in-sitemap");
  }

  return issues;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────
// Precomposed (NFC) Hebrew with niqqud — `שָׁלוֹם` uses combining marks but
// the base letters have NO precomposed form, so NFC == NFD here. We use
// Latin diacritics where NFC ≠ NFD is well-defined:
//   "café"  NFC = "caf\u00E9"       (single codepoint é)
//           NFD = "cafe\u0301"      (e + combining acute)
const CAFE_NFC = "/caf\u00E9";
const CAFE_NFD = "/cafe\u0301";

// Spanish ñ:
//   NFC = "espa\u00F1ol"
//   NFD = "espan\u0303ol"
const ESPANOL_NFC = "/men\u00FA/espa\u00F1ol";
const ESPANOL_NFD = "/menu\u0301/espan\u0303ol"; // also decomposes ú

const SITEMAP_NFC = new Set<string>([
  "/",
  CAFE_NFC,
  ESPANOL_NFC,
  // Typographic-punctuation canonical slugs:
  "/it-s-here",            // ASCII apostrophe folded to hyphen — canonical
  "/state-of-the-art",     // ASCII hyphen — canonical
  "/quote-\u2018word\u2019", // contains curly single quotes ‘word’
]);

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("checkRedirect() — Unicode NFC/NFD normalization", () => {
  describe("Latin diacritics (é, ñ, ú)", () => {
    it("NFC target matches NFC sitemap loc cleanly", () => {
      expect(checkRedirect("/old", CAFE_NFC, SITEMAP_NFC)).toEqual([]);
    });

    it("NFD target normalizes to NFC and matches sitemap (no `target-missing`)", () => {
      const issues = checkRedirect("/old", CAFE_NFD, SITEMAP_NFC);
      expect(issues).not.toContain("target-missing-from-sitemap");
    });

    it("NFD target is flagged `target-non-nfc` so authors fix the source", () => {
      expect(checkRedirect("/old", CAFE_NFD, SITEMAP_NFC)).toContain(
        "target-non-nfc",
      );
    });

    it("NFD source matching (via NFC) a sitemap loc is flagged as duplicate", () => {
      const issues = checkRedirect(CAFE_NFD, "/", SITEMAP_NFC);
      expect(issues).toContain("source-in-sitemap");
      expect(issues).toContain("source-non-nfc");
    });

    it("multi-diacritic NFD path (menú/español) normalizes to its NFC sitemap entry", () => {
      const issues = checkRedirect("/old", ESPANOL_NFD, SITEMAP_NFC);
      expect(issues).not.toContain("target-missing-from-sitemap");
      expect(issues).toContain("target-non-nfc");
    });

    it("percent-encoded NFD bytes also normalize (decode → NFC)", () => {
      // UTF-8 of "cafe\u0301" = 63 61 66 65 CC 81 → /caf%65%CC%81 (e + combining acute)
      const encodedNfd = "/cafe%CC%81";
      const issues = checkRedirect("/old", encodedNfd, SITEMAP_NFC);
      expect(issues).not.toContain("target-missing-from-sitemap");
      expect(issues).toContain("target-non-nfc");
    });
  });

  describe("typographic punctuation lookalikes", () => {
    // These are DIFFERENT codepoints — policy is to NOT auto-fold. They
    // must be flagged as missing so the author picks one canonical form.
    const EN_DASH = "\u2013";        // –
    const MINUS = "\u2212";          // −
    const HYPHEN_MINUS = "-";        // ASCII
    const HEBREW_MAQAF = "\u05BE";   // ־

    it("en-dash target does NOT match ASCII-hyphen sitemap loc", () => {
      const target = `/state${EN_DASH}of${EN_DASH}the${EN_DASH}art`;
      expect(checkRedirect("/old", target, SITEMAP_NFC)).toContain(
        "target-missing-from-sitemap",
      );
    });

    it("Unicode minus target does NOT match ASCII-hyphen sitemap loc", () => {
      const target = `/state${MINUS}of${MINUS}the${MINUS}art`;
      expect(checkRedirect("/old", target, SITEMAP_NFC)).toContain(
        "target-missing-from-sitemap",
      );
    });

    it("Hebrew maqaf target does NOT match ASCII-hyphen sitemap loc", () => {
      const target = `/state${HEBREW_MAQAF}of${HEBREW_MAQAF}the${HEBREW_MAQAF}art`;
      expect(checkRedirect("/old", target, SITEMAP_NFC)).toContain(
        "target-missing-from-sitemap",
      );
    });

    it("ASCII-hyphen target matches the canonical sitemap loc", () => {
      const target = `/state${HYPHEN_MINUS}of${HYPHEN_MINUS}the${HYPHEN_MINUS}art`;
      expect(checkRedirect("/old", target, SITEMAP_NFC)).toEqual([]);
    });

    it("curly-quote source matching curly-quote sitemap loc is flagged as duplicate", () => {
      // Sitemap has `/quote-‘word’` with U+2018 / U+2019.
      const issues = checkRedirect(
        "/quote-\u2018word\u2019",
        "/",
        SITEMAP_NFC,
      );
      expect(issues).toContain("source-in-sitemap");
    });

    it("straight-apostrophe target does NOT match curly-quote sitemap loc", () => {
      // Author wrote `'word'` (U+0027) but canonical uses `‘word’`.
      expect(
        checkRedirect("/old", "/quote-'word'", SITEMAP_NFC),
      ).toContain("target-missing-from-sitemap");
    });

    it("Hebrew geresh (U+05F3) does NOT match ASCII apostrophe", () => {
      // sitemap has none of these — just verify they're kept distinct.
      const ASCII = "/r-d-l-s-apostrophe-'-here";
      const GERESH = "/r-d-l-s-apostrophe-\u05F3-here";
      const map = new Set([...SITEMAP_NFC, ASCII]);
      expect(checkRedirect("/old", GERESH, map)).toContain(
        "target-missing-from-sitemap",
      );
      expect(checkRedirect("/old", ASCII, map)).toEqual([]);
    });
  });

  describe("trailing-slash × Unicode-normalization combinations", () => {
    it("NFD target + trailing slash still normalizes and is flagged for trailing dup if both forms exist", () => {
      const map = new Set<string>([...SITEMAP_NFC, `${CAFE_NFC}/`]);
      const issues = checkRedirect("/old", `${CAFE_NFD}/`, map);
      // Decoded → NFC → "/café", and both "/café" and "/café/" exist.
      expect(issues).toContain("target-trailing-duplicate-in-sitemap");
      expect(issues).toContain("target-non-nfc");
    });

    it("NFD source with trailing slash whose NFC twin is in sitemap is flagged", () => {
      // sitemap has "/café"; redirect FROM NFD "/café/" → both checks fire.
      const issues = checkRedirect(`${CAFE_NFD}/`, "/", SITEMAP_NFC);
      expect(issues).toContain("source-trailing-variant-in-sitemap");
      expect(issues).toContain("source-non-nfc");
    });

    it("NFD source without trailing slash matches NFC sitemap loc directly", () => {
      const issues = checkRedirect(CAFE_NFD, "/", SITEMAP_NFC);
      expect(issues).toContain("source-in-sitemap");
      expect(issues).not.toContain("source-trailing-variant-in-sitemap");
    });

    it("typographic-hyphen target with trailing slash still flagged missing (not folded)", () => {
      const target = "/state\u2013of\u2013the\u2013art/";
      expect(checkRedirect("/old", target, SITEMAP_NFC)).toContain(
        "target-missing-from-sitemap",
      );
    });

    it("ASCII-hyphen target with trailing slash on canonical loc is flagged trailing dup", () => {
      const map = new Set([...SITEMAP_NFC, "/state-of-the-art/"]);
      expect(
        checkRedirect("/old", "/state-of-the-art/", map),
      ).toContain("target-trailing-duplicate-in-sitemap");
    });
  });

  describe("sitemap hygiene — sitemap entries themselves must already be NFC", () => {
    it("if sitemap stores NFD, NFC redirect target appears missing (sitemap bug)", () => {
      const badSitemap = new Set<string>(["/", CAFE_NFD]);
      // This is the regression we want to PREVENT — surfaces as missing.
      expect(checkRedirect("/old", CAFE_NFC, badSitemap)).toContain(
        "target-missing-from-sitemap",
      );
    });
  });
});
