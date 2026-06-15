import { useMemo, useState } from "react";
import { ArrowLeft, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { openWhatsApp, waLink } from "@/lib/whatsapp";
import {
  computeLightStructureReport,
  type LightStructureInput,
} from "@/calculators/lightStructure";

/**
 * Real standards-based pergola element calculator (ת"י 414 wind / ת"י 412 loads
 * / EC3 members + buckling). Sizes rafter, main beam and post, computes wind
 * uplift, and refers genuinely risky cases to an engineer. NOT a rule of thumb.
 */

const DEFAULTS: LightStructureInput = {
  kind: "pergola",
  location: "ראשון לציון",
  installationHeightM: 2.5,
  floorLevel: 0,
  distanceFromSea: "over_2km",
  exposureCategory: "urban",
  topography: "flat",
  material: "aluminum",
  roofingType: "open_slats",
  roofSlopeDeg: 5,
  sidesCondition: "all_open",
  mainSpanM: 3,
  secondarySpanM: 3,
  secondarySpacingM: 0.6,
  tributaryWidthM: null,
  staticScheme: "simple",
  supportConnectionType: "pinned",
  anchorBaseType: "structural_concrete",
  anchorCheckAvailable: "no",
};

const WHATSAPP_TEXT =
  "שלום, חישבתי פרגולה במחשבון ההנדסי ואשמח לבדיקה הנדסית חתומה.";

const num = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

const NumField = ({
  label,
  value,
  onChange,
  step = "0.1",
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: string;
}) => (
  <div>
    <Label className="text-sm">{label}</Label>
    <Input
      type="number"
      inputMode="decimal"
      step={step}
      dir="ltr"
      className="mt-1.5"
      value={value ?? ""}
      onChange={(e) => onChange(num(e.target.value))}
    />
  </div>
);

const SelectField = <T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) => (
  <div>
    <Label className="text-sm">{label}</Label>
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="mt-1.5" dir="rtl">
        <SelectValue />
      </SelectTrigger>
      <SelectContent dir="rtl">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const STATUS_META = {
  hard_stop: {
    icon: ShieldAlert,
    title: "עצירה — נדרשת בדיקת מהנדס",
    cls: "bg-destructive/10 text-destructive border-destructive/30",
  },
  insufficient_data: {
    icon: AlertTriangle,
    title: "חסר מידע להשלמה",
    cls: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  indicative_screening: {
    icon: CheckCircle2,
    title: "אומדן ראשוני לפי תקן",
    cls: "bg-teal/10 text-teal border-teal/30",
  },
  quantity_only: {
    icon: CheckCircle2,
    title: "חישוב כמויות",
    cls: "bg-teal/10 text-teal border-teal/30",
  },
} as const;

export const PergolaEngineCalculator = () => {
  const [s, setS] = useState<LightStructureInput>(DEFAULTS);
  const report = useMemo(() => computeLightStructureReport(s), [s]);
  const set = (patch: Partial<LightStructureInput>) =>
    setS((p) => ({ ...p, ...patch }));

  const meta = STATUS_META[report.status];
  const StatusIcon = meta.icon;
  const step = (id: string) => report.formulaSteps.find((x) => x.id === id)?.result;
  const qp = step("wind_qp");
  const uplift = step("sizing_uplift_tension");

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── inputs ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="חומר"
            value={s.material === "unknown" ? "aluminum" : s.material}
            onChange={(v) => set({ material: v })}
            options={[
              { value: "aluminum", label: "אלומיניום" },
              { value: "steel", label: "פלדה" },
              { value: "timber", label: "עץ" },
            ]}
          />
          <SelectField
            label="סוג קירוי"
            value={s.roofingType === "unknown" ? "open_slats" : s.roofingType}
            onChange={(v) => set({ roofingType: v })}
            options={[
              { value: "open_slats", label: "שלבי הצללה" },
              { value: "polycarbonate", label: "פוליקרבונט" },
              { value: "metal_panel", label: "פאנל מתכת" },
              { value: "fabric", label: "בד מתוח" },
              { value: "glass", label: "זכוכית" },
            ]}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <NumField label="מפתח ראשי (מ׳)" value={s.mainSpanM} onChange={(v) => set({ mainSpanM: v })} />
          <NumField label="עומק (מ׳)" value={s.secondarySpanM} onChange={(v) => set({ secondarySpanM: v })} />
          <NumField label="גובה (מ׳)" value={s.installationHeightM} onChange={(v) => set({ installationHeightM: v })} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <NumField label="מרווח קורות (מ׳)" step="0.05" value={s.secondarySpacingM} onChange={(v) => set({ secondarySpacingM: v })} />
          <NumField label="שיפוע (°)" step="1" value={s.roofSlopeDeg} onChange={(v) => set({ roofSlopeDeg: v })} />
          <SelectField
            label="חשיפת רוח"
            value={s.exposureCategory === "unknown" ? "urban" : s.exposureCategory}
            onChange={(v) => set({ exposureCategory: v })}
            options={[
              { value: "sheltered", label: "מוגן" },
              { value: "urban", label: "עירוני" },
              { value: "open", label: "פתוח" },
              { value: "coast", label: "חוף" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="מרחק מהים"
            value={s.distanceFromSea === "unknown" ? "over_2km" : s.distanceFromSea}
            onChange={(v) => set({ distanceFromSea: v })}
            options={[
              { value: "over_2km", label: "מעל 2 ק״מ" },
              { value: "500m_2km", label: "500 מ׳–2 ק״מ" },
              { value: "under_500m", label: "פחות מ-500 מ׳" },
            ]}
          />
          <SelectField
            label="בסיס עיגון"
            value={s.anchorBaseType === "unknown" ? "structural_concrete" : s.anchorBaseType}
            onChange={(v) => set({ anchorBaseType: v })}
            options={[
              { value: "structural_concrete", label: "בטון מבני" },
              { value: "existing_wall", label: "קיר קיים" },
              { value: "steel_plate", label: "פלטת פלדה" },
              { value: "pavers_over_waterproofing", label: "ריצוף מעל איטום" },
            ]}
          />
        </div>
      </div>

      {/* ── status banner ── */}
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${meta.cls}`}>
        <StatusIcon className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">{meta.title}</div>
          <p className="t-small mt-1 opacity-90">{report.publicMessageHe}</p>
        </div>
      </div>

      {/* ── hard stops / missing ── */}
      {report.hardStops.length > 0 && (
        <ul className="space-y-1.5">
          {report.hardStops.map((h) => (
            <li key={h.code} className="t-small text-muted-foreground">
              <span className="font-semibold text-foreground">{h.labelHe}</span> — {h.explanationHe}
            </li>
          ))}
        </ul>
      )}
      {report.missingInputs.length > 0 && (
        <ul className="space-y-1 text-right">
          {report.missingInputs.slice(0, 6).map((m) => (
            <li key={m.field} className="t-small text-muted-foreground">• {m.labelHe}</li>
          ))}
        </ul>
      )}

      {/* ── candidate elements ── */}
      {report.candidateSections.length > 0 && (
        <div className="space-y-3">
          <div className="grid gap-2.5">
            {report.candidateSections.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{c.label}</span>
                  {typeof c.utilization === "number" && (
                    <span className="t-small text-muted-foreground shrink-0">ניצול ~{Math.round(c.utilization * 100)}%</span>
                  )}
                </div>
                {typeof c.utilization === "number" && (
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal"
                      style={{ width: `${Math.min(100, Math.round(c.utilization * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {(qp != null || uplift != null) && (
            <div className="grid grid-cols-2 gap-2.5">
              {qp != null && (
                <div className="rounded-xl bg-muted/60 p-3 text-center">
                  <div className="t-small text-muted-foreground">לחץ רוח שיא</div>
                  <div className="font-bold text-foreground">{qp} kN/m²</div>
                </div>
              )}
              {uplift != null && (
                <div className="rounded-xl bg-muted/60 p-3 text-center">
                  <div className="t-small text-muted-foreground">מתיחת עוגן (יניקה)</div>
                  <div className="font-bold text-foreground">{uplift} kN</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── disclaimer ── */}
      <p className="t-small text-muted-foreground leading-relaxed">{report.disclaimerHe}</p>

      {/* ── CTA ── */}
      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="accent" size="sm">
          <a href="#contact">לבדיקה הנדסית חתומה <ArrowLeft className="w-4 h-4" /></a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a
            href={waLink(WHATSAPP_TEXT)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openWhatsApp(e, WHATSAPP_TEXT)}
          >
            WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
};
