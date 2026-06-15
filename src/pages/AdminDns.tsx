import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw, Copy, Check, History as HistoryIcon, Trash2, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Status = "idle" | "checking" | "pass" | "fail" | "warn";

interface ExternalLink {
  label: string;
  url: string;
}

type MetricTone = "pass" | "fail" | "neutral";
interface Metric {
  label: string;
  value: string;
  tone?: MetricTone;
}

interface CheckResult {
  id: string;
  label: string;
  expected: string;
  actual?: string;
  status: Status;
  hint?: string;
  links?: ExternalLink[];
  metrics?: Metric[];
}

const dnsCheckerLink = (host: string, type: "A" | "TXT" | "CNAME"): ExternalLink => ({
  label: `dnschecker.org · ${type}`,
  url: `https://dnschecker.org/#${type},${encodeURIComponent(host)}`,
});

const sslLink = (host: string): ExternalLink => ({
  label: "SSL Labs",
  url: `https://www.ssllabs.com/ssltest/analyze.html?d=${encodeURIComponent(host)}&hideResults=on&latest`,
});

const sslShallowLink = (host: string): ExternalLink => ({
  label: "פתח באתר",
  url: `https://${host}/`,
});

const LOVABLE_IP = "185.158.133.1";
const ROOT = "sade-il.com";
const WWW = "www.sade-il.com";

const httpStatusLink = (url: string): ExternalLink => ({
  label: "httpstatus.io",
  url: `https://httpstatus.io/?url=${encodeURIComponent(url)}`,
});

const initialChecks: CheckResult[] = [
  { id: "dns-root-a", label: `רשומת A עבור ${ROOT}`, expected: LOVABLE_IP, status: "idle", links: [dnsCheckerLink(ROOT, "A")] },
  { id: "dns-www-a", label: `רשומת A עבור ${WWW}`, expected: LOVABLE_IP, status: "idle", links: [dnsCheckerLink(WWW, "A"), dnsCheckerLink(WWW, "CNAME")] },
  { id: "dns-txt-lovable", label: `רשומת TXT עבור _lovable.${ROOT}`, expected: "מתחיל ב-lovable_verify=", status: "idle", links: [dnsCheckerLink(`_lovable.${ROOT}`, "TXT")] },
  { id: "ssl-root", label: `SSL/HTTPS עבור ${ROOT}`, expected: "200/3xx ללא שגיאת SSL", status: "idle", links: [sslLink(ROOT), sslShallowLink(ROOT)] },
  { id: "ssl-www", label: `SSL/HTTPS עבור ${WWW}`, expected: "200/3xx ללא שגיאת SSL", status: "idle", links: [sslLink(WWW), sslShallowLink(WWW)] },
  { id: "llms-root", label: `llms.txt עבור ${ROOT}`, expected: "200, SSL פעיל, ללא הפניות", status: "idle", links: [httpStatusLink(`https://${ROOT}/llms.txt`), { label: "פתח קובץ", url: `https://${ROOT}/llms.txt` }] },
  { id: "llms-www", label: `llms.txt עבור ${WWW}`, expected: "200, SSL פעיל, ללא הפניות", status: "idle", links: [httpStatusLink(`https://${WWW}/llms.txt`), { label: "פתח קובץ", url: `https://${WWW}/llms.txt` }] },
];

async function dohQuery(name: string, type: "A" | "TXT"): Promise<string[]> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`DoH ${res.status}`);
  const data = await res.json();
  if (!data.Answer) return [];
  return data.Answer.map((a: { data: string }) => a.data.replace(/^"|"$/g, ""));
}

async function checkSsl(host: string): Promise<{ ok: boolean; detail: string }> {
  try {
    await fetch(`https://${host}/?_ssl_probe=${Date.now()}`, {
      mode: "no-cors",
      cache: "no-store",
      redirect: "follow",
    });
    return { ok: true, detail: "החיבור HTTPS הצליח" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: `נכשל: ${msg}` };
  }
}

type LlmsStatus = "pass" | "fail" | "warn";
interface LlmsReport {
  status: LlmsStatus;
  detail: string;
  hint?: string;
  metrics: Metric[];
}

function readPerfMetrics(url: string): { totalMs?: number; tlsMs?: number } {
  try {
    const entries = performance.getEntriesByName(url) as PerformanceResourceTiming[];
    const e = entries[entries.length - 1];
    if (!e) return {};
    const total = e.responseEnd - e.startTime;
    const tls =
      e.secureConnectionStart && e.connectEnd
        ? Math.max(0, e.connectEnd - e.secureConnectionStart)
        : undefined;
    return {
      totalMs: total > 0 ? Math.round(total) : undefined,
      tlsMs: tls !== undefined ? Math.round(tls) : undefined,
    };
  } catch {
    return {};
  }
}

async function checkLlmsTxt(host: string): Promise<LlmsReport> {
  const url = `https://${host}/llms.txt?_probe=${Date.now()}`;
  const metrics: Metric[] = [];
  const t0 = performance.now();

  // Step 1 — TLS handshake probe. Failure here = SSL/cert problem
  // (e.g. ERR_SSL_VERSION_OR_CIPHER_MISMATCH) since the browser never gets an HTTP response.
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store", redirect: "follow" });
  } catch (e) {
    const elapsed = Math.round(performance.now() - t0);
    const msg = e instanceof Error ? e.message : String(e);
    metrics.push({ label: "SSL", value: "שגיאת SSL", tone: "fail" });
    metrics.push({ label: "סטטוס HTTP", value: "—", tone: "neutral" });
    metrics.push({ label: "Redirect", value: "—", tone: "neutral" });
    metrics.push({ label: "זמן תגובה", value: `${elapsed} ms`, tone: "neutral" });
    metrics.push({ label: "TLS", value: "לא נחשף לדפדפן", tone: "neutral" });
    return {
      status: "fail",
      detail: `כשל TLS/רשת: ${msg}`,
      hint: "תעודת SSL לא פעילה (סביר ERR_SSL_VERSION_OR_CIPHER_MISMATCH). בדוק Project Settings → Domains; הסטטוס צריך להיות Active.",
      metrics,
    };
  }

  // TLS handshake succeeded
  metrics.push({ label: "SSL", value: "פעיל", tone: "pass" });
  const perf1 = readPerfMetrics(url);

  // Step 2 — read status + redirect via CORS. If CORS blocks, fall back to no-cors redirect detection.
  let httpStatus: string = "—";
  let httpTone: MetricTone = "neutral";
  let redirected = false;
  let redirectTone: MetricTone = "neutral";
  let outcome: LlmsStatus = "warn";
  let detail = "SSL פעיל, סטטוס לא קריא (CORS) — בדוק ידנית";
  let hint: string | undefined = "השתמש בקישור httpstatus.io למטה כדי לאמת 200 ללא הפניות";

  try {
    const res = await fetch(url, { mode: "cors", cache: "no-store", redirect: "manual" });
    if (res.type === "opaqueredirect") {
      redirected = true;
      redirectTone = "fail";
      httpStatus = "3xx";
      httpTone = "fail";
      outcome = "fail";
      detail = "SSL פעיל אך התקבלה הפניה (redirect) במקום 200";
      hint = "ודא ש-/llms.txt מוגש ישירות מ-public/ ללא rewrite/redirect";
    } else if (res.status === 200) {
      httpStatus = "200";
      httpTone = "pass";
      redirectTone = "pass";
      outcome = "pass";
      detail = "SSL פעיל, 200 OK, ללא הפניות";
      hint = undefined;
    } else {
      httpStatus = String(res.status);
      httpTone = "fail";
      outcome = "fail";
      detail = `SSL פעיל אך סטטוס ${res.status}`;
      hint = "הקובץ לא זמין — ודא ש-public/llms.txt קיים ופורסם";
    }
  } catch {
    try {
      const res = await fetch(url, { mode: "no-cors", cache: "no-store", redirect: "manual" });
      if (res.type === "opaqueredirect") {
        redirected = true;
        redirectTone = "fail";
        httpStatus = "3xx";
        httpTone = "fail";
        outcome = "fail";
        detail = "SSL פעיל אך התקבלה הפניה (redirect) במקום 200";
        hint = "ודא ש-/llms.txt מוגש ישירות מ-public/ ללא rewrite/redirect";
      }
    } catch {
      /* keep CORS-warn default */
    }
  }

  const perf2 = readPerfMetrics(url);
  const totalMs = perf2.totalMs ?? perf1.totalMs ?? Math.round(performance.now() - t0);
  const tlsMs = perf2.tlsMs ?? perf1.tlsMs;

  metrics.push({ label: "סטטוס HTTP", value: httpStatus, tone: httpTone });
  metrics.push({ label: "Redirect", value: redirected ? "כן" : "לא", tone: redirectTone });
  metrics.push({ label: "זמן תגובה", value: `${totalMs} ms`, tone: "neutral" });
  metrics.push({
    label: "TLS handshake",
    value: tlsMs !== undefined ? `${tlsMs} ms` : "לא נמדד",
    tone: "neutral",
  });
  metrics.push({ label: "פרוטוקול TLS", value: "לא נחשף בדפדפן · ראה SSL Labs", tone: "neutral" });

  return { status: outcome, detail, hint, metrics };
}

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "checking") return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (status === "pass") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (status === "fail") return <XCircle className="h-5 w-5 text-destructive" />;
  if (status === "warn") return <AlertCircle className="h-5 w-5 text-amber-500" />;
  return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
};

const statusLabel: Record<Status, string> = {
  idle: "ממתין",
  checking: "בודק…",
  pass: "תקין",
  fail: "תקלה",
  warn: "אזהרה",
};

const TXT_STORAGE_KEY = "lovable_txt_value";
const LLMS_HISTORY_KEY_PREFIX = "llms_check_history:"; // + host
const LLMS_HISTORY_MAX = 25;

interface LlmsHistoryEntry {
  ts: number; // ms epoch
  status: LlmsStatus;
  detail: string;
  metrics: Metric[];
}

function loadLlmsHistory(host: string): LlmsHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LLMS_HISTORY_KEY_PREFIX + host);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LlmsHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendLlmsHistory(host: string, entry: LlmsHistoryEntry) {
  if (typeof window === "undefined") return;
  const prev = loadLlmsHistory(host);
  const next = [entry, ...prev].slice(0, LLMS_HISTORY_MAX);
  try {
    localStorage.setItem(LLMS_HISTORY_KEY_PREFIX + host, JSON.stringify(next));
  } catch {
    /* quota — ignore */
  }
}

function clearLlmsHistory(host: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LLMS_HISTORY_KEY_PREFIX + host);
}

function pickMetric(metrics: Metric[], label: string): string | undefined {
  return metrics.find((m) => m.label === label)?.value;
}

function LlmsHistoryPanel({
  host,
  version,
  onClear,
}: {
  host: string;
  version: number;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const entries = loadLlmsHistory(host);
  // re-read on version bump (parent forces remount via key isn't needed because
  // we read on every render; version is in deps below to keep React aware).
  void version;

  if (entries.length === 0) {
    return (
      <p className="mt-3 text-[11px] text-muted-foreground">
        אין עדיין היסטוריה לבדיקות {host} (נשמר אחרי הריצה הראשונה).
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/20">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 text-xs font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-expanded={open}
        >
          <HistoryIcon className="h-3.5 w-3.5" />
          היסטוריית בדיקות ({entries.length})
          <span className="text-muted-foreground font-normal">
            {open ? "▴" : "▾"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            clearLlmsHistory(host);
            onClear();
          }}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
          aria-label={`נקה היסטוריה עבור ${host}`}
        >
          <Trash2 className="h-3 w-3" />
          נקה
        </button>
      </div>
      {open && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-[11px]" dir="rtl">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-right font-medium">זמן</th>
                <th className="px-2 py-1 text-right font-medium">תוצאה</th>
                <th className="px-2 py-1 text-right font-medium">SSL</th>
                <th className="px-2 py-1 text-right font-medium">HTTP</th>
                <th className="px-2 py-1 text-right font-medium">Redirect</th>
                <th className="px-2 py-1 text-right font-medium">זמן תגובה</th>
                <th className="px-2 py-1 text-right font-medium">TLS HS</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const prev = entries[i + 1];
                const responseMs = pickMetric(e.metrics, "זמן תגובה") ?? "—";
                const prevResponseMs = prev ? pickMetric(prev.metrics, "זמן תגובה") : undefined;
                const changed = prev && prev.status !== e.status;
                const rowTone =
                  e.status === "pass"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : e.status === "fail"
                    ? "text-destructive"
                    : "text-amber-600 dark:text-amber-400";
                return (
                  <tr
                    key={e.ts}
                    className={`border-t border-border/60 ${changed ? "bg-amber-500/5" : ""}`}
                  >
                    <td className="px-2 py-1 whitespace-nowrap text-foreground/80" dir="ltr">
                      {new Date(e.ts).toLocaleString("he-IL")}
                    </td>
                    <td className={`px-2 py-1 font-medium ${rowTone}`}>
                      {statusLabel[e.status]}
                      {changed && <span className="mr-1 text-[10px]">⇄</span>}
                    </td>
                    <td className="px-2 py-1">{pickMetric(e.metrics, "SSL") ?? "—"}</td>
                    <td className="px-2 py-1">{pickMetric(e.metrics, "סטטוס HTTP") ?? "—"}</td>
                    <td className="px-2 py-1">{pickMetric(e.metrics, "Redirect") ?? "—"}</td>
                    <td className="px-2 py-1" dir="ltr">
                      {responseMs}
                      {prevResponseMs && prevResponseMs !== responseMs && (
                        <span className="text-muted-foreground"> (prev {prevResponseMs})</span>
                      )}
                    </td>
                    <td className="px-2 py-1" dir="ltr">
                      {pickMetric(e.metrics, "TLS handshake") ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


interface DomainSummary {
  host: string;
  dns: CheckResult | undefined;
  ssl: CheckResult | undefined;
  llms: CheckResult | undefined;
}

function verdictFor(s: DomainSummary): { label: string; tone: "pass" | "fail" | "warn" | "idle" } {
  const all = [s.dns, s.ssl, s.llms].filter(Boolean) as CheckResult[];
  if (all.length === 0) return { label: "—", tone: "idle" };
  if (all.some((c) => c.status === "checking")) return { label: "בודק…", tone: "idle" };
  if (all.some((c) => c.status === "fail")) return { label: "Failed", tone: "fail" };
  if (all.some((c) => c.status === "warn")) return { label: "Warning", tone: "warn" };
  if (all.every((c) => c.status === "pass")) return { label: "Active", tone: "pass" };
  return { label: "ממתין", tone: "idle" };
}

function DomainStatusOverview({ checks, running, onRetry, retrying }: { checks: CheckResult[]; running: boolean; onRetry: (host: string) => void; retrying: string | null }) {
  const byId = (id: string) => checks.find((c) => c.id === id);
  const summaries: DomainSummary[] = [
    { host: ROOT, dns: byId("dns-root-a"), ssl: byId("ssl-root"), llms: byId("llms-root") },
    { host: WWW, dns: byId("dns-www-a"), ssl: byId("ssl-www"), llms: byId("llms-www") },
  ];

  const toneClasses: Record<"pass" | "fail" | "warn" | "idle", string> = {
    pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    fail: "border-destructive/40 bg-destructive/10 text-destructive",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    idle: "border-border bg-muted/40 text-muted-foreground",
  };

  return (
    <Card className="mb-6 p-4 border-primary/40">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-semibold text-foreground">סטטוס חיבור דומיינים</h2>
        {running && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {summaries.map((s) => {
          const v = verdictFor(s);
          const httpMetric = s.llms?.metrics?.find((m) => m.label === "סטטוס HTTP");
          const sslMetric = s.llms?.metrics?.find((m) => m.label === "SSL");
          const redirectMetric = s.llms?.metrics?.find((m) => m.label === "Redirect");
          const responseMetric = s.llms?.metrics?.find((m) => m.label === "זמן תגובה");
          return (
            <div key={s.host} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-foreground/80" dir="ltr">{s.host}</span>
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneClasses[v.tone]}`}>
                  <StatusIcon status={v.tone === "idle" ? "checking" : v.tone} />
                  {v.label}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px]">
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">DNS A</span>
                  <span className="flex items-center gap-1"><StatusIcon status={s.dns?.status ?? "idle"} />{statusLabel[s.dns?.status ?? "idle"]}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">SSL</span>
                  <span className="flex items-center gap-1">
                    <StatusIcon status={s.ssl?.status ?? "idle"} />
                    {sslMetric?.value ?? statusLabel[s.ssl?.status ?? "idle"]}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">HTTP /llms.txt</span>
                  <span className="flex items-center gap-1">
                    <StatusIcon status={s.llms?.status ?? "idle"} />
                    {httpMetric?.value ?? "—"}
                    {redirectMetric?.value === "כן" && <span className="text-destructive">· redirect</span>}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">זמן תגובה</span>
                  <span dir="ltr">{responseMetric?.value ?? "—"}</span>
                </li>
              </ul>
              {s.llms?.hint && (
                <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">💡 {s.llms.hint}</p>
              )}
              {(v.tone === "fail" || v.tone === "warn") && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={v.tone === "fail" ? "default" : "outline"}
                    onClick={() => onRetry(s.host)}
                    disabled={running || retrying === s.host}
                    aria-label={`נסה שוב הנפקת SSL עבור ${s.host}`}
                  >
                    <RefreshCw className={`ml-1 h-3.5 w-3.5 ${retrying === s.host ? "animate-spin" : ""}`} />
                    {retrying === s.host ? "בודק מחדש…" : "Retry SSL"}
                  </Button>
                  <a
                    href="https://docs.lovable.dev/features/custom-domain"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    <ExternalLinkIcon className="h-3 w-3" />
                    Project Settings → Domains
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function AdminDns() {

  const [checks, setChecks] = useState<CheckResult[]>(initialChecks);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [txtValue, setTxtValue] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(TXT_STORAGE_KEY) ?? "";
  });
  const [copied, setCopied] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [retrying, setRetrying] = useState<string | null>(null);
  const checksRef = useRef<CheckResult[]>(initialChecks);
  useEffect(() => {
    checksRef.current = checks;
  }, [checks]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TXT_STORAGE_KEY, txtValue);
    }
  }, [txtValue]);

  const copyTxt = async () => {
    if (!txtValue) return;
    try {
      await navigator.clipboard.writeText(txtValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const update = (id: string, patch: Partial<CheckResult>) =>
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const dnsTask = useCallback(async (id: string, host: string) => {
    try {
      const records = await dohQuery(host, "A");
      if (records.length === 0) {
        update(id, { status: "fail", actual: "אין רשומה", hint: `הוסף רשומת A ל-${host} שמצביעה ל-${LOVABLE_IP}` });
        return;
      }
      const ok = records.includes(LOVABLE_IP);
      update(id, {
        status: ok ? "pass" : "fail",
        actual: records.join(", "),
        hint: ok ? undefined : `הסר רשומות ישנות והגדר A=${LOVABLE_IP}`,
      });
    } catch (e) {
      update(id, { status: "warn", actual: "שאילתת DNS נכשלה", hint: String(e) });
    }
  }, []);

  const txtTask = useCallback(async () => {
    try {
      const records = await dohQuery(`_lovable.${ROOT}`, "TXT");
      if (records.length === 0) {
        update("dns-txt-lovable", { status: "fail", actual: "אין רשומה", hint: "הוסף TXT _lovable עם הערך מ-Lovable" });
        return;
      }
      const expected = txtValue.trim();
      const ok = expected
        ? records.some((r) => r.trim() === expected)
        : records.some((r) => r.toLowerCase().includes("lovable_verify"));
      update("dns-txt-lovable", {
        status: ok ? "pass" : "warn",
        actual: records.join(" | "),
        hint: ok ? undefined : (expected ? "אף רשומה לא תואמת בדיוק לערך הצפוי שהזנת" : "ודא שהערך תואם בדיוק למה ש-Lovable מציג"),
      });
    } catch (e) {
      update("dns-txt-lovable", { status: "warn", actual: "שאילתת DNS נכשלה", hint: String(e) });
    }
  }, [txtValue]);

  const sslTask = useCallback(async (id: string, host: string) => {
    const { ok, detail } = await checkSsl(host);
    update(id, {
      status: ok ? "pass" : "fail",
      actual: detail,
      hint: ok ? undefined : "תעודת SSL לא הונפקה / DNS לא מצביע נכון. בדוק ב-Project Settings → Domains",
    });
  }, []);

  const llmsTask = useCallback(async (id: string, host: string) => {
    const { status, detail, hint, metrics } = await checkLlmsTxt(host);
    update(id, { status, actual: detail, hint, metrics });
    appendLlmsHistory(host, { ts: Date.now(), status, detail, metrics });
    setHistoryVersion((v) => v + 1);
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    setChecks(initialChecks.map((c) => ({ ...c, status: "checking", actual: undefined, hint: undefined, metrics: undefined })));

    await Promise.all([
      dnsTask("dns-root-a", ROOT),
      dnsTask("dns-www-a", WWW),
      txtTask(),
      sslTask("ssl-root", ROOT),
      sslTask("ssl-www", WWW),
      llmsTask("llms-root", ROOT),
      llmsTask("llms-www", WWW),
    ]);

    setLastRun(new Date().toLocaleString("he-IL"));
    setRunning(false);
  }, [dnsTask, txtTask, sslTask, llmsTask]);

  const retryDomain = useCallback(async (host: string) => {
    const isRoot = host === ROOT;
    const dnsId = isRoot ? "dns-root-a" : "dns-www-a";
    const sslId = isRoot ? "ssl-root" : "ssl-www";
    const llmsId = isRoot ? "llms-root" : "llms-www";

    setRetrying(host);
    [dnsId, sslId, llmsId].forEach((id) =>
      update(id, { status: "checking", actual: undefined, hint: undefined, metrics: undefined }),
    );

    toast({
      title: `מנסה שוב עבור ${host}`,
      description:
        "מריץ DNS + SSL + llms.txt מחדש ונמשיך לרענן אוטומטית עד שהסטטוס יתעדכן (עד דקה).",
    });

    const ids = [dnsId, sslId, llmsId];
    const readResults = (): CheckResult[] =>
      checksRef.current.filter((c) => ids.includes(c.id));

    const runOnce = async () => {
      await Promise.all([
        dnsTask(dnsId, host),
        sslTask(sslId, host),
        llmsTask(llmsId, host),
      ]);
      setLastRun(new Date().toLocaleString("he-IL"));
      return readResults();
    };

    let results = await runOnce();

    // Auto-poll: keep re-checking every 10s for up to 60s until all pass
    // or any hard failure persists. Stops early once status flips to "pass".
    const POLL_INTERVAL_MS = 10_000;
    const MAX_ATTEMPTS = 6;
    let attempts = 0;
    while (attempts < MAX_ATTEMPTS) {
      const allPass = results.every((r) => r.status === "pass");
      if (allPass) break;
      await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
      [dnsId, sslId, llmsId].forEach((id) =>
        update(id, { status: "checking", actual: undefined, hint: undefined, metrics: undefined }),
      );
      results = await runOnce();
      attempts += 1;
    }

    const finalPass = results.every((r) => r.status === "pass");
    toast({
      title: finalPass ? `✅ ${host} פעיל` : `⚠️ ${host} עדיין לא מאומת`,
      description: finalPass
        ? "DNS + SSL + llms.txt עברו בהצלחה."
        : "נסה Retry שוב או פתח Project Settings → Domains להנפקת תעודה ידנית.",
    });

    setRetrying(null);
  }, [dnsTask, sslTask, llmsTask]);

  useEffect(() => {
    runAll();
  }, [runAll]);

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  return (
    <main dir="rtl" className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">בדיקת DNS &amp; SSL</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              צ׳קליסט חי עבור {ROOT} ו-{WWW}
            </p>
            {lastRun && (
              <p className="mt-1 text-xs text-muted-foreground">בדיקה אחרונה: {lastRun}</p>
            )}
          </div>
          <Button onClick={runAll} disabled={running} variant="default">
            <RefreshCw className={`ml-2 h-4 w-4 ${running ? "animate-spin" : ""}`} />
            בדוק שוב
          </Button>
        </header>

        <div className="mb-6 flex gap-2">
          <Badge variant="outline" className="text-emerald-600">
            ✓ {passCount} תקין
          </Badge>
          {failCount > 0 && (
            <Badge variant="destructive">✗ {failCount} תקלות</Badge>
          )}
        </div>

        <DomainStatusOverview checks={checks} running={running} onRetry={retryDomain} retrying={retrying} />



        <Card className="mb-6 p-4 border-primary/40">
          <h2 className="font-semibold text-foreground mb-1">ערך TXT צפוי עבור _lovable.{ROOT}</h2>
          <p className="text-xs text-muted-foreground mb-3">
            הדבק כאן פעם אחת את הערך המדויק מ-Project Settings → Domains (מתחיל ב-<code>lovable_verify=</code>).
            הערך יישמר מקומית בדפדפן, יוצג כאן להעתקה ויושווה אוטומטית מול ה-DNS.
          </p>
          <div className="flex gap-2">
            <Input
              dir="ltr"
              placeholder="lovable_verify=..."
              value={txtValue}
              onChange={(e) => setTxtValue(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyTxt}
              disabled={!txtValue}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="mr-1">{copied ? "הועתק" : "העתק"}</span>
            </Button>
          </div>
          {txtValue && (
            <div className="mt-3 rounded-md bg-muted/40 p-2 text-xs font-mono break-all text-foreground" dir="ltr">
              {txtValue}
            </div>
          )}
        </Card>


        <div className="space-y-3">
          {checks.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <StatusIcon status={c.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{c.label}</h3>
                    <span className="text-xs text-muted-foreground">{statusLabel[c.status]}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium">צפוי:</span> {c.expected}
                  </p>
                  {c.actual && (
                    <p className="mt-1 text-xs text-foreground/80 break-all">
                      <span className="font-medium">בפועל:</span> {c.actual}
                    </p>
                  )}
                  {c.metrics && c.metrics.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.metrics.map((m) => {
                        const tone =
                          m.tone === "pass"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : m.tone === "fail"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border bg-muted/40 text-foreground/80";
                        return (
                          <span
                            key={m.label}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${tone}`}
                          >
                            <span className="text-muted-foreground font-normal">{m.label}:</span>
                            <span>{m.value}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {c.hint && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      💡 {c.hint}
                    </p>
                  )}
                  {c.links && c.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.links.map((l) => (
                        <a
                          key={l.url}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground hover:bg-muted transition"
                        >
                          🔗 {l.label}
                        </a>
                      ))}
                    </div>
                  )}
                  {c.id === "llms-root" && (
                    <LlmsHistoryPanel
                      host={ROOT}
                      version={historyVersion}
                      onClear={() => setHistoryVersion((v) => v + 1)}
                    />
                  )}
                  {c.id === "llms-www" && (
                    <LlmsHistoryPanel
                      host={WWW}
                      version={historyVersion}
                      onClear={() => setHistoryVersion((v) => v + 1)}
                    />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-8 p-4 bg-muted/30">
          <h2 className="font-semibold mb-2 text-foreground">הערות</h2>
          <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
            <li>בדיקות ה-DNS משתמשות ב-Google Public DNS (DoH) — הן עוקפות מטמון מקומי.</li>
            <li>
              בדיקת SSL מתבצעת מצד הדפדפן עם <code>mode: "no-cors"</code> — שגיאת SSL תגרום ל-fetch ליפול.
            </li>
            <li>
              לתיקון: Project Settings → Domains, או אצל רשם הדומיין (הסר רשומות A ישנות, הוסף A → {LOVABLE_IP}).
            </li>
            <li>אם הסטטוס תקין כאן אבל הדפדפן עדיין נכשל — נקה DNS cache מקומי או נסה גלישה פרטית.</li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
