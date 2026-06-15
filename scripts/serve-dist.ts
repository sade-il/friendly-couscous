/**
 * Tiny static server that mimics production hosting (Lovable, Vercel,
 * Netlify, Cloudflare Pages) clean-URL semantics for verifying the
 * prerendered `dist/` output locally and in CI.
 *
 * Resolution order for an incoming path `/p`:
 *   1. dist/p                (exact file)
 *   2. dist/p/index.html     (directory index)
 *   3. dist/p.html           (flat fallback)
 *   4. dist/index.html       (SPA fallback)
 *
 * Unlike `vite preview`, step 2 fires for `/projects` (no trailing slash).
 * That matches how every real host serves the prerendered files.
 *
 * Usage: bunx tsx scripts/serve-dist.ts [port]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

const PORT = Number(process.argv[2] ?? 4319);
const DIST = resolve("dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function isFile(p: string) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

async function resolveFile(urlPath: string): Promise<string | null> {
  // Decode percent-encoded paths so Hebrew routes (`/אישור-פרגולה`) resolve.
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    decoded = urlPath;
  }
  const clean = decoded.split("?")[0].split("#")[0];
  // Strip leading slash, prevent traversal
  const rel = clean.replace(/^\/+/, "").replace(/\.\.(\/|\\|$)/g, "");
  const candidates = [
    resolve(DIST, rel),
    resolve(DIST, rel, "index.html"),
    resolve(DIST, `${rel}.html`),
    resolve(DIST, "index.html"),
  ];
  for (const c of candidates) {
    if (c === resolve(DIST) || c === resolve(DIST) + "/") continue;
    if (await isFile(c)) return c;
  }
  return null;
}

const server = createServer(async (req, res) => {
  const url = req.url ?? "/";
  const file =
    url === "/" || url === ""
      ? resolve(DIST, "index.html")
      : await resolveFile(url);
  if (!file) {
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }
  try {
    const body = await readFile(file);
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[extname(file).toLowerCase()] ?? "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.end(body);
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`serve-dist: http://127.0.0.1:${PORT} (root=${DIST})`);
});
