import { useState, useMemo } from "react";
import { Calculator, Box, Grid3x3, TrendingUp, Square, TreePine, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openWhatsApp, waLink } from "@/lib/whatsapp";
import { PergolaEngineCalculator } from "@/components/site/PergolaEngineCalculator";

const WHATSAPP_TEXT = "שלום, אשמח לשלוח נתוני חישוב לבדיקה הנדסית.";

type CalcKey = "concrete" | "rebar" | "slope" | "tiles" | "pergola";

const calcs: { key: CalcKey | "more"; icon: any; title: string; desc: string }[] = [
  { key: "concrete", icon: Box, title: "מחשבון בטון", desc: "כמות בטון נדרשת ליציקה לפי נפח ועובי." },
  { key: "rebar", icon: Grid3x3, title: "מחשבון ברזל זיון", desc: "כמות ומשקל ברזל לפי קוטר, מרווח ושטח." },
  { key: "slope", icon: TrendingUp, title: "מחשבון שיפוע", desc: "חישוב שיפוע גגות, מרפסות ורצפות ניקוז." },
  { key: "tiles", icon: Square, title: "מחשבון אריחים", desc: "כמות אריחים נדרשת לפי שטח, פחת והפסד חיתוך." },
  { key: "pergola", icon: TreePine, title: "מחשבון פרגולה לפי תקן", desc: "חתך לקורות ולעמודים לפי ת״י 414/412 — כולל רוח, יניקה ועיגון." },
  { key: "more", icon: Calculator, title: "כלים נוספים", desc: "מחשבונים נוספים בפיתוח — חזרו בקרוב." },
];

const num = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const ConcreteCalc = () => {
  const [l, setL] = useState(""); const [w, setW] = useState(""); const [t, setT] = useState(""); const [waste, setWaste] = useState("5");
  const vol = useMemo(() => num(l) * num(w) * (num(t) / 100), [l, w, t]);
  const total = vol * (1 + num(waste) / 100);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="אורך (מ׳)" value={l} onChange={setL} />
        <Field label="רוחב (מ׳)" value={w} onChange={setW} />
        <Field label="עובי (ס״מ)" value={t} onChange={setT} />
        <Field label="פחת (%)" value={waste} onChange={setWaste} />
      </div>
      <Result label="נפח בטון נדרש" value={`${total.toFixed(2)} מ״ק`} sub={`נטו: ${vol.toFixed(2)} מ״ק`} />
    </div>
  );
};

const RebarCalc = () => {
  const [area, setArea] = useState(""); const [d, setD] = useState("12"); const [s, setS] = useState("20");
  // bars in two directions, simplified
  const weightPerM = (num(d) ** 2) * 0.00617; // kg/m
  const barsPerM = num(s) > 0 ? 100 / num(s) : 0;
  const totalLength = num(area) * barsPerM * 2; // both directions
  const totalWeight = totalLength * weightPerM;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="שטח (מ״ר)" value={area} onChange={setArea} />
        <Field label="קוטר מוט (מ״מ)" value={d} onChange={setD} />
        <Field label="מרווח בין מוטות (ס״מ)" value={s} onChange={setS} />
      </div>
      <Result label="משקל ברזל כולל" value={`${totalWeight.toFixed(1)} ק״ג`} sub={`אורך כולל: ${totalLength.toFixed(1)} מ׳ · רשת דו-כיוונית`} />
    </div>
  );
};

const SlopeCalc = () => {
  const [mode, setMode] = useState<"pct2deg" | "deg2pct" | "len">("pct2deg");
  const [pctIn, setPctIn] = useState("");
  const [degIn, setDegIn] = useState("");
  const [lenLen, setLenLen] = useState("");
  const [lenPct, setLenPct] = useState("");

  const deg = useMemo(() => Math.atan(num(pctIn) / 100) * (180 / Math.PI), [pctIn]);
  const pct = useMemo(() => Math.tan((num(degIn) * Math.PI) / 180) * 100, [degIn]);
  const dh = useMemo(() => num(lenLen) * (num(lenPct) / 100) * 100, [lenLen, lenPct]); // cm

  const tabs = [
    { k: "pct2deg", t: "אחוזים → מעלות" },
    { k: "deg2pct", t: "מעלות → אחוזים" },
    { k: "len", t: "אורך + שיפוע" },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-xl">
        {tabs.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setMode(t.k)}
            className={`t-small py-2 rounded-lg transition-smooth ${
              mode === t.k ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
            }`}
          >
            {t.t}
          </button>
        ))}
      </div>

      {mode === "pct2deg" && (
        <>
          <Field label="שיפוע באחוזים (%)" value={pctIn} onChange={setPctIn} />
          <Result label="זווית השיפוע" value={`${(isFinite(deg) ? deg : 0).toFixed(2)}°`} sub={`נוסחה: atan(% / 100) × 180 / π`} />
        </>
      )}

      {mode === "deg2pct" && (
        <>
          <Field label="זווית במעלות (°)" value={degIn} onChange={setDegIn} />
          <Result label="שיפוע באחוזים" value={`${(isFinite(pct) ? pct : 0).toFixed(2)}%`} sub={`נוסחה: tan(° × π / 180) × 100`} />
        </>
      )}

      {mode === "len" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="אורך אופקי (מ׳)" value={lenLen} onChange={setLenLen} />
            <Field label="שיפוע (%)" value={lenPct} onChange={setLenPct} />
          </div>
          <Result label="הפרש גובה" value={`${dh.toFixed(1)} ס״מ`} sub={`כלל אצבע: 1% = 1 ס״מ לכל מטר`} />
        </>
      )}

      <div className="rounded-xl bg-muted/60 p-4 text-xs text-muted-foreground space-y-2">
        <div className="font-semibold text-foreground">דוגמאות מהירות</div>
        <div className="grid grid-cols-2 gap-1.5">
          <span>1% ≈ 0.57°</span>
          <span>2% ≈ 1.15°</span>
          <span>5% ≈ 2.86°</span>
          <span>10% ≈ 5.71°</span>
        </div>
        <p className="t-body pt-1">
          ההמרה בין אחוזים למעלות היא טריגונומטרית. החישוב מיועד לבדיקה ראשונית בלבד ואינו תחליף לתכנון פרטני.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="accent" size="sm">
          <a href="#contact">שלח נתוני שיפוע לבדיקה</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={waLink(WHATSAPP_TEXT)} target="_blank" rel="noopener noreferrer" onClick={(e) => openWhatsApp(e, WHATSAPP_TEXT)}>WhatsApp</a>
        </Button>
      </div>
    </div>
  );
};

const TilesCalc = () => {
  const [area, setArea] = useState(""); const [tw, setTw] = useState("60"); const [th, setTh] = useState("60"); const [waste, setWaste] = useState("10");
  const tileArea = (num(tw) / 100) * (num(th) / 100);
  const count = tileArea > 0 ? Math.ceil((num(area) / tileArea) * (1 + num(waste) / 100)) : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="שטח החדר (מ״ר)" value={area} onChange={setArea} />
        <Field label="פחת (%)" value={waste} onChange={setWaste} />
        <Field label="רוחב אריח (ס״מ)" value={tw} onChange={setTw} />
        <Field label="אורך אריח (ס״מ)" value={th} onChange={setTh} />
      </div>
      <Result label="כמות אריחים נדרשת" value={`${count} יחידות`} sub={`כולל פחת ${waste}%`} />
    </div>
  );
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <Label className="text-sm">{label}</Label>
    <Input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5" dir="ltr" />
  </div>
);

const Result = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-xl bg-gradient-accent p-5 text-accent-foreground shadow-accent">
    <div className="text-sm opacity-90">{label}</div>
    <div className="t-h2 mt-1">{value}</div>
    {sub && <div className="text-xs opacity-90 mt-1">{sub}</div>}
  </div>
);

const renderCalc = (key: CalcKey) => {
  switch (key) {
    case "concrete": return <ConcreteCalc />;
    case "rebar": return <RebarCalc />;
    case "slope": return <SlopeCalc />;
    case "tiles": return <TilesCalc />;
    case "pergola": return <PergolaEngineCalculator />;
  }
};

export const Calculators = () => {
  const [open, setOpen] = useState<CalcKey | null>(null);
  const active = calcs.find((c) => c.key === open);

  return (
    <section id="calculators" className="py-24 lg:py-32">
      <div className="container mx-auto">
        <div className="max-w-2xl mb-12">
          <span className="text-teal font-semibold text-sm tracking-wide">כלים חינמיים</span>
          <h2 className="mt-4 t-h1">
            מחשבונים הנדסיים לשימוש מהיר
          </h2>
          <p className="mt-5 t-lead">
            כלי עזר ראשוניים לבעלי מקצוע ולקוחות פרטיים. המחשבונים מספקים אומדן בלבד ואינם מהווים תכנון פרטני.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {calcs.map((c) => (
            <div key={c.title} className="group bg-card rounded-2xl p-5 sm:p-6 border border-border hover:border-teal/40 shadow-card hover:shadow-elevated transition-smooth flex flex-col text-right min-h-[220px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal/10 text-teal grid place-items-center group-hover:bg-teal group-hover:text-teal-foreground transition-smooth shrink-0">
                  <c.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="t-h3 leading-snug">{c.title}</h3>
              </div>
              <p className="t-small leading-relaxed mb-5 flex-1">{c.desc}</p>
              {c.key === "more" ? (
                <Button asChild variant="outline" size="sm" className="w-full justify-between">
                  <a href="#contact">בקשת חישוב <ArrowLeft className="w-4 h-4" /></a>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between group-hover:border-teal group-hover:text-teal"
                  onClick={() => setOpen(c.key as CalcKey)}
                >
                  פתח מחשבון <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

      </div>

      <div className="mt-16 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto py-12 sm:py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="t-h2 mb-2">צריכים תכנון פרטני?</h3>
            <p className="t-lead text-primary-foreground/80 max-w-xl">
              המחשבונים נותנים כיוון ראשוני. לתכנון מחייב — נדרשת בדיקה הנדסית בשטח עם מסמכים והיתרים.
            </p>
          </div>
          <Button asChild variant="hero" size="lg">
            <a href="#contact">בקשת בדיקה הנדסית <ArrowLeft className="w-5 h-5" /></a>
          </Button>
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent
          className={active?.key === "pergola" ? "max-w-2xl max-h-[88vh] overflow-y-auto" : "max-w-md"}
          dir="rtl"
        >
          {active && active.key !== "more" && (
            <>
              <DialogHeader>
                <DialogTitle className="t-h2 text-right">{active.title}</DialogTitle>
                <DialogDescription className="text-right">{active.desc}</DialogDescription>
              </DialogHeader>
              {renderCalc(active.key as CalcKey)}
              <p className="t-small mt-2">
                * התוצאות מהוות אומדן ראשוני בלבד ואינן מחליפות תכנון הנדסי פרטני.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
