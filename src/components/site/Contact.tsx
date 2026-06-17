import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Phone, Mail, MapPin, Navigation, Paperclip, Send, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { track, getAttribution } from "@/lib/analytics";
import { openWhatsApp, waLink } from "@/lib/whatsapp";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, mailtoLink, mapsLink, OFFICE_ADDRESS, openMaps, openWaze, phoneLink, wazeLink } from "@/lib/contact";

const WHATSAPP_TEXT = "שלום איליה, אשמח להתייעץ לגבי פרויקט הנדסי.";

const contactSchema = z.object({
  name: z.string().trim().min(2, "יש להזין שם מלא (לפחות 2 תווים)").max(100, "השם ארוך מדי"),
  phone: z
    .string()
    .trim()
    .min(7, "יש להזין מספר טלפון תקין")
    .max(20, "מספר הטלפון ארוך מדי")
    .regex(/^[0-9+\-\s()]+$/, "מספר הטלפון מכיל תווים לא חוקיים"),
  email: z
    .string()
    .trim()
    .max(255, "כתובת הדוא״ל ארוכה מדי")
    .email("כתובת דוא״ל לא תקינה")
    .or(z.literal("")),
  address: z.string().trim().max(200, "הכתובת ארוכה מדי").optional(),
  type: z.string().min(1, "יש לבחור את סוג הפנייה"),
  desc: z
    .string()
    .trim()
    .min(10, "נא לפרט לפחות 10 תווים על הפנייה")
    .max(1500, "התיאור ארוך מדי"),
});

type FieldKey = "name" | "phone" | "email" | "address" | "type" | "desc" | "files";
type Errors = Partial<Record<FieldKey, string>>;

const FIELD_LABELS: Record<FieldKey, string> = {
  name: "שם מלא",
  phone: "טלפון",
  email: "דוא״ל",
  address: "כתובת הנכס",
  type: "סוג פנייה",
  desc: "תיאור הפנייה",
  files: "צירוף קבצים",
};

const FIELD_ORDER: FieldKey[] = ["name", "phone", "email", "address", "type", "desc", "files"];

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const ALLOWED_EXT = /\.(jpe?g|png|webp|gif|pdf)$/i;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_BYTES = 30 * 1024 * 1024; // 30MB

const validateFiles = (files: FileList | null | undefined): string | undefined => {
  if (!files || files.length === 0) return undefined; // optional
  let total = 0;
  for (const f of Array.from(files)) {
    const okType = ALLOWED_FILE_TYPES.includes(f.type) || ALLOWED_EXT.test(f.name);
    if (!okType) return `סוג קובץ לא נתמך: ${f.name}. מותר רק תמונות או PDF.`;
    if (f.size > MAX_FILE_BYTES) return `הקובץ "${f.name}" חורג מ-10MB.`;
    total += f.size;
  }
  if (total > MAX_TOTAL_BYTES) return "סך כל הקבצים חורג מ-30MB.";
  return undefined;
};

export const Contact = () => {
  const { toast } = useToast();
  const [type, setType] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [liveMsg, setLiveMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  // Track the validation toast so we can dismiss/update it as errors change
  const errorToastRef = useRef<{ id: string; dismiss: () => void; update: (props: { id: string; title?: string; description?: string; variant?: "default" | "destructive" }) => void } | null>(null);

  const announce = (msg: string) => {
    setLiveMsg("");
    // Re-set on next tick so SR re-announces even if msg is identical
    setTimeout(() => setLiveMsg(msg), 50);
  };

  const focusField = (field: FieldKey) => {
    const form = formRef.current;
    if (!form) return;
    const el =
      field === "type"
        ? form.querySelector<HTMLElement>("#type")
        : field === "files"
          ? form.querySelector<HTMLElement>("#files")
          : form.querySelector<HTMLElement>(`[name="${field}"]`);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Keep the validation toast in sync with the live errors state.
  // - dismiss it once all errors are cleared
  // - update its description when the count changes (without resubmit)
  useEffect(() => {
    const handle = errorToastRef.current;
    if (!handle) return;
    const count = Object.keys(errors).length;
    if (count === 0) {
      handle.dismiss();
      errorToastRef.current = null;
    } else {
      handle.update({
        id: handle.id,
        title: "יש לתקן שדות בטופס",
        description: `${count} שדות דורשים תיקון`,
        variant: "destructive",
      });
    }
  }, [errors]);

  // Listen for the skip-link event: jump to summary + first invalid field
  useEffect(() => {
    const handler = () => {
      const firstInvalid = FIELD_ORDER.find((f) => errors[f]);
      if (firstInvalid && summaryRef.current) {
        summaryRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        summaryRef.current.focus();
        announce(
          `מעבר לסיכום השגיאות. ${Object.keys(errors).length} שדות דורשים תיקון. הפוקוס עובר לשדה הראשון הלא תקין: ${FIELD_LABELS[firstInvalid]}.`
        );
        setTimeout(() => focusField(firstInvalid), 600);
      } else {
        const first = formRef.current?.querySelector<HTMLElement>('[name="name"]');
        first?.focus();
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        announce("מעבר לטופס יצירת קשר. הפוקוס על השדה הראשון: שם מלא.");
      }
    };
    window.addEventListener("a11y:jump-to-form", handler);
    return () => window.removeEventListener("a11y:jump-to-form", handler);
  }, [errors]);
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);

    const parsed = contactSchema.safeParse({
      name: String(data.get("name") || ""),
      phone: String(data.get("phone") || ""),
      email: String(data.get("email") || ""),
      address: String(data.get("address") || ""),
      type,
      desc: String(data.get("desc") || ""),
    });

    const newErrors: Errors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as FieldKey;
        if (key && !newErrors[key]) newErrors[key] = issue.message;
      }
    }
    // Validate the file input separately (not part of zod schema)
    const fileInput = form.querySelector<HTMLInputElement>("#files");
    const fileError = validateFiles(fileInput?.files);
    if (fileError) newErrors.files = fileError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstInvalid = FIELD_ORDER.find((f) => newErrors[f]);
      if (firstInvalid) {
        // Move focus to the summary so screen readers announce the full list
        requestAnimationFrame(() => {
          summaryRef.current?.focus();
          summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        // Dismiss any previous validation toast, then show a fresh one we can track
        errorToastRef.current?.dismiss();
        errorToastRef.current = toast({
          title: "יש לתקן שדות בטופס",
          description: `${Object.keys(newErrors).length} שדות דורשים תיקון`,
          variant: "destructive",
          action: (
            <ToastAction
              altText="עבור לסיכום השגיאות"
              onClick={() => {
                summaryRef.current?.focus();
                summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              עבור לסיכום
            </ToastAction>
          ),
        });
      }
      return;
    }

    if (!parsed.success) return; // narrowing — already handled above
    setErrors({});
    const v = parsed.data;
    const subject = `פנייה מהאתר - ${v.type || "כללי"}`;
    const body = [
      `שם: ${v.name}`,
      `טלפון: ${v.phone}`,
      `דוא״ל: ${v.email || ""}`,
      `כתובת הנכס: ${v.address || ""}`,
      `סוג פנייה: ${v.type}`,
      "",
      `תיאור: ${v.desc}`,
    ].join("\n");
    const attr = getAttribution();
    track("contact_submit", {
      inquiry_type: v.type,
      last_hero_slide_id: String(attr.last_hero_slide_id ?? "none"),
      last_hero_slide_kicker: String(attr.last_hero_slide_kicker ?? "none"),
      last_service_id: String(attr.last_service_id ?? "none"),
      last_service_title: String(attr.last_service_title ?? "none"),
      last_project_id: String(attr.last_project_id ?? "none"),
      last_project_title: String(attr.last_project_title ?? "none"),
      deepest_section_id: String(attr.deepest_section_id ?? "none"),
      deepest_scroll_pct: Number(attr.deepest_scroll_pct ?? 0),
    });
    toast({
      title: "פתיחת דוא״ל לשליחת הפנייה",
      description: `הפנייה מוכנה לשליחה אל ${CONTACT_EMAIL}`,
    });
    window.location.href = mailtoLink(subject, body);
    form.reset();
    setType("");
  };

  // Clear a field's error as the user edits it
  const clearError = (field: FieldKey) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const errClass = (field: FieldKey) =>
    errors[field] ? "border-destructive focus-visible:ring-destructive" : "";

  const FieldError = ({ field }: { field: FieldKey }) =>
    errors[field] ? (
      <p
        id={`${field}-error`}
        role="alert"
        className="t-small mt-1.5 flex items-center gap-1.5 text-destructive"
      >
        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
        {errors[field]}
      </p>
    ) : null;

  return (
    <section id="contact" className="py-24 lg:py-32 bg-gradient-card">
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {liveMsg}
      </div>
      <div className="container mx-auto grid lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          <span className="t-eyebrow">יצירת קשר</span>
          <h2 className="mt-4 t-h1">
            נשמח לשמוע על הפרויקט
          </h2>
          <p className="mt-5 t-lead">
            השאירו פרטים ונחזור אליכם בהקדם. לפניות דחופות — מומלץ דרך WhatsApp.
          </p>

          <a
            href={waLink(WHATSAPP_TEXT)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openWhatsApp(e, WHATSAPP_TEXT)}
            className="mt-8 flex items-center gap-4 p-5 rounded-2xl bg-whatsapp text-whatsapp-foreground shadow-card hover:shadow-elevated transition-smooth group"
          >
            <div className="w-12 h-12 rounded-xl bg-whatsapp-foreground/15 grid place-items-center group-hover:scale-110 transition-smooth">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="t-h3">פנייה ב-WhatsApp</div>
              <div className="t-small text-whatsapp-foreground/90">המהיר ביותר — תוך שעות</div>
            </div>
          </a>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 text-foreground/85">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary grid place-items-center"><Phone className="w-4 h-4" /></div>
              <a href={phoneLink()} className="hover:text-accent transition-smooth" dir="ltr">{CONTACT_PHONE_DISPLAY}</a>
            </div>
            <div className="flex items-center gap-3 text-foreground/85">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary grid place-items-center"><Mail className="w-4 h-4" /></div>
              <a href={mailtoLink()} className="hover:text-accent transition-smooth" dir="ltr">{CONTACT_EMAIL}</a>
            </div>
            <div className="flex items-center gap-3 text-foreground/85">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary grid place-items-center"><MapPin className="w-4 h-4" /></div>
              <a href={mapsLink()} target="_blank" rel="noopener noreferrer" onClick={openMaps} className="hover:text-accent transition-smooth">
                {OFFICE_ADDRESS} · שירות בכל הארץ
              </a>
            </div>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <Button asChild variant="outline" size="lg" className="w-full justify-center">
              <a href={mapsLink()} target="_blank" rel="noopener noreferrer" onClick={openMaps}>
                <Navigation className="w-5 h-5" /> Google Maps
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full justify-center">
              <a href={wazeLink()} target="_blank" rel="noopener noreferrer" onClick={openWaze}>
                <Navigation className="w-5 h-5" /> Waze
              </a>
            </Button>
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={onSubmit}
          noValidate
          aria-describedby="form-instructions"
          className="lg:col-span-3 bg-card rounded-3xl p-6 sm:p-10 shadow-elevated border border-border"
        >
          {Object.keys(errors).length > 0 && (
            <div
              ref={summaryRef}
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
              aria-labelledby="error-summary-title"
              className="mb-6 rounded-2xl border-2 border-destructive bg-destructive/5 p-5 focus:outline-none focus-visible:ring-4 focus-visible:ring-destructive/40"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <h3 id="error-summary-title" className="t-h3 text-destructive mb-2">
                    יש לתקן {Object.keys(errors).length} שדות בטופס
                  </h3>
                  <ul className="space-y-1.5 list-disc pr-5">
                    {FIELD_ORDER
                      .filter((f) => errors[f])
                      .map((f) => (
                        <li key={f}>
                          <button
                            type="button"
                            onClick={() => focusField(f)}
                            className="t-small text-destructive underline underline-offset-2 hover:text-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded text-right"
                          >
                            <span className="font-bold">{FIELD_LABELS[f]}:</span> {errors[f]}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="name">שם מלא *</Label>
              <Input
                id="name" name="name" maxLength={100} className={`mt-2 ${errClass("name")}`}
                placeholder="ישראל ישראלי"
                aria-required
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                onChange={() => clearError("name")}
              />
              <FieldError field="name" />
            </div>
            <div>
              <Label htmlFor="phone">טלפון *</Label>
              <Input
                id="phone" name="phone" type="tel" maxLength={20} className={`mt-2 ${errClass("phone")}`}
                placeholder="050-0000000" dir="ltr"
                aria-required
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                onChange={() => clearError("phone")}
              />
              <FieldError field="phone" />
            </div>
            <div>
              <Label htmlFor="email">דוא״ל</Label>
              <Input
                id="email" name="email" type="email" maxLength={255} className={`mt-2 ${errClass("email")}`}
                placeholder="name@example.com" dir="ltr"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                onChange={() => clearError("email")}
              />
              <FieldError field="email" />
            </div>
            <div>
              <Label htmlFor="address">כתובת הנכס</Label>
              <Input
                id="address" name="address" maxLength={200} className={`mt-2 ${errClass("address")}`}
                placeholder="עיר, רחוב ומספר"
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? "address-error" : undefined}
                onChange={() => clearError("address")}
              />
              <FieldError field="address" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="type">סוג פנייה *</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v);
                  clearError("type");
                  // After a selection, advance focus to the description field
                  // so keyboard users continue naturally instead of returning to trigger.
                  requestAnimationFrame(() => {
                    const el = formRef.current?.querySelector<HTMLElement>('textarea[name="desc"]');
                    el?.focus();
                  });
                }}
              >
                <SelectTrigger
                  id="type"
                  className={`mt-2 ${errClass("type")}`}
                  aria-required
                  aria-invalid={!!errors.type}
                  aria-describedby={errors.type ? "type-error" : undefined}
                >
                  <SelectValue placeholder="בחרו את סוג הפנייה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">תכנון קונסטרוקציה</SelectItem>
                  <SelectItem value="opinion">חוות דעת הנדסית</SelectItem>
                  <SelectItem value="dangerous">מבנה מסוכן</SelectItem>
                  <SelectItem value="pergola">פרגולה / עבודה פטורה</SelectItem>
                  <SelectItem value="mamad">תכנון ממ״ד</SelectItem>
                  <SelectItem value="supervision">פיקוח עליון</SelectItem>
                  <SelectItem value="opening">פתיחת פתחים / חיזוקים</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
              <FieldError field="type" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="desc">תיאור הפנייה *</Label>
              <Textarea
                id="desc" name="desc" maxLength={1500} rows={5} className={`mt-2 ${errClass("desc")}`}
                placeholder="ספרו על הנכס, מה נדרש ומה דחיפות הפנייה..."
                aria-required
                aria-invalid={!!errors.desc}
                aria-describedby={errors.desc ? "desc-error" : undefined}
                onChange={() => clearError("desc")}
              />
              <FieldError field="desc" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="files" className="flex items-center gap-2 cursor-pointer">
                <Paperclip className="w-4 h-4" /> צירוף קבצים (תמונות / תכניות)
              </Label>
              <Input
                id="files"
                name="files"
                type="file"
                multiple
                accept="image/*,application/pdf"
                className={`mt-2 file:text-foreground ${errClass("files")}`}
                aria-invalid={!!errors.files}
                aria-describedby={errors.files ? "files-error" : undefined}
                onChange={() => clearError("files")}
              />
              <FieldError field="files" />
            </div>
          </div>

          <Button type="submit" variant="accent" size="lg" className="mt-6 w-full sm:w-auto">
            <Send className="w-5 h-5" /> שליחת פנייה
          </Button>

          <p id="form-instructions" className="t-small mt-4">
            * שליחת הפנייה אינה מהווה התחייבות לקבלת השירות. נחזור אליכם לתיאום בדיקה פרטנית.
          </p>
        </form>
      </div>
    </section>
  );
};
