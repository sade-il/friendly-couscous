import type { EngineeringPreset } from '@/engineering/engineeringKernel';

/**
 * Permanent (dead) loads — characteristic values, kN/m².
 *
 * All entries start as 'draft'. They cite Israeli standards and engineering
 * tables attached by the project owner (תקנים 412, 466 + חוברת תכן הנדסי ב').
 * A licensed engineer must mark each as 'approved' before public use.
 */

export const SLAB_SELF_WEIGHT_PRESETS: Record<string, EngineeringPreset> = {
  solid_slab_18cm: {
    id: 'G_slab_solid_18cm',
    labelHe: 'תקרה מקשית בעובי 18 ס"מ',
    value: 4.5,
    unit: 'kN/m2',
    source: 'SI 412 - עומסים במבנים, טבלאות צפיפויות; γ_concrete ≈ 25 kN/m³ × 0.18 m',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'משקל עצמי של תקרה מקשית בעובי 18 ס"מ. עובי בפועל יש למדוד.',
  },
  solid_slab_20cm: {
    id: 'G_slab_solid_20cm',
    labelHe: 'תקרה מקשית בעובי 20 ס"מ',
    value: 5.0,
    unit: 'kN/m2',
    source: 'SI 412 - עומסים במבנים; γ_concrete ≈ 25 kN/m³ × 0.20 m',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'משקל עצמי של תקרה מקשית בעובי 20 ס"מ.',
  },
  rib_slab_25cm: {
    id: 'G_slab_rib_25cm',
    labelHe: 'תקרת צלעות 25 ס"מ',
    value: 3.5,
    unit: 'kN/m2',
    source: 'חוברת תכן הנדסי ב\', טבלאות תקרת צלעות',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'תלוי בסוג הצלעות והבלוקים. דרושה אימות לפי תכניות.',
  },
  unknown_slab: {
    id: 'G_slab_unknown',
    labelHe: 'תקרה - סוג לא ידוע',
    value: NaN,
    unit: 'kN/m2',
    source: '—',
    approvedBy: null,
    approvedAt: null,
    status: 'rejected',
    notes: 'סוג תקרה לא ידוע - אסור לשמש לחישוב ציבורי. יש להחזיר hard_stop.',
  },
};

export const FINISHES_PRESETS: Record<string, EngineeringPreset> = {
  residential_finishes_standard: {
    id: 'G_finishes_residential',
    labelHe: 'גמרים תקניים למגורים (טיט, ריצוף, איטום, תקרה אקוסטית)',
    value: 1.5,
    unit: 'kN/m2',
    source: 'SI 412 - חלק 1, ערך אופייני לגמרים במבני מגורים',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'אם קיימים גמרים כבדים (אבן טבעית עבה, חיפוי שיש, מילוי הגבהה) - יש להגדיל.',
  },
  commercial_finishes_standard: {
    id: 'G_finishes_commercial',
    labelHe: 'גמרים תקניים למסחר',
    value: 2.0,
    unit: 'kN/m2',
    source: 'SI 412 - חלק 1',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'כולל מערכות מתחת לתקרה אקוסטית.',
  },
};

export const PARTITIONS_PRESETS: Record<string, EngineeringPreset> = {
  residential_partitions_standard: {
    id: 'G_partitions_residential',
    labelHe: 'מחיצות פנים סטנדרטיות',
    value: 1.0,
    unit: 'kN/m2',
    source: 'SI 412 - חלק 1, מקדם מחיצות במבני מגורים',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'ערך אופייני. במבנים עם מחיצות בלוק כבדות יש להגדיל.',
  },
};

/**
 * Live loads (Q_live), kN/m². From SI 412 chapter 1, table 1.
 */
export const LIVE_LOAD_PRESETS: Record<string, EngineeringPreset> = {
  residential_q: {
    id: 'Q_live_residential',
    labelHe: 'עומס שימושי - מגורים',
    value: 2.0,
    unit: 'kN/m2',
    source: 'SI 412 חלק 1, טבלה 1 - מגורים',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'ערך מוצא במגורים פרטיים. למרפסות/חדרי כושר יש ערכים שונים.',
  },
  office_q: {
    id: 'Q_live_office',
    labelHe: 'עומס שימושי - משרדים',
    value: 3.0,
    unit: 'kN/m2',
    source: 'SI 412 חלק 1, טבלה 1 - משרדים',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: '',
  },
  commercial_q: {
    id: 'Q_live_commercial',
    labelHe: 'עומס שימושי - מסחר',
    value: 4.0,
    unit: 'kN/m2',
    source: 'SI 412 חלק 1, טבלה 1 - מסחר',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: '',
  },
};

/**
 * Wall self-weight per length, kN/m² (then × wall height for kN/m).
 */
export const WALL_PRESETS: Record<string, EngineeringPreset> = {
  concrete_per_thickness: {
    id: 'G_wall_concrete_kN_per_m3',
    labelHe: 'בטון מזוין - צפיפות',
    value: 25,
    unit: 'kN/m3',
    source: 'SI 412 חלק 1 - צפיפויות חומרים',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'יוכפל ב-עובי × גובה לקבלת kN/m עומס קווי.',
  },
  hollow_block_per_thickness: {
    id: 'G_wall_block_kN_per_m3',
    labelHe: 'בלוק חלול - צפיפות אפקטיבית',
    value: 14,
    unit: 'kN/m3',
    source: 'SI 412 חלק 1 - צפיפות חומרי בנייה',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'ערך אופייני. לבלוק בטון מלא יש להגדיל.',
  },
};

/**
 * Load combination factors (SLS / ULS) — ULS = 1.35 G + 1.5 Q is current
 * Israeli practice aligned with Eurocode. Kept here as approvable preset.
 */
export const LOAD_FACTORS_PRESETS: Record<string, EngineeringPreset> = {
  gamma_g_uls: {
    id: 'gamma_G_ULS',
    labelHe: 'מקדם מצב גבולי קיצון לעומסים קבועים',
    value: 1.35,
    unit: '-',
    source: 'SI 412 / Eurocode 0',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'גרסת ULS שמרנית. ייתכן 1.4 בפרויקטים מסוימים - דורש אישור מהנדס.',
  },
  gamma_q_uls: {
    id: 'gamma_Q_ULS',
    labelHe: 'מקדם מצב גבולי קיצון לעומסים שימושיים',
    value: 1.5,
    unit: '-',
    source: 'SI 412 / Eurocode 0',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: '',
  },
};

/**
 * Deflection limits (serviceability) - L/limit ratio.
 */
export const DEFLECTION_LIMIT_PRESETS: Record<string, EngineeringPreset> = {
  beam_total_l_over_250: {
    id: 'deflection_total_L_over_250',
    labelHe: 'שקיעה כוללת מותרת - L/250',
    value: 250,
    unit: '-',
    source: 'SI 466 / Eurocode SLS - ערך אופייני לקורה ראשית',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'בקורות התומכות בקיר בנוי/זכוכית - להחמיר ל-L/500.',
  },
};

/* ──────────────────────────────────────────────────────────────────────────
 * Pergola / light-structure additions (roof self-weight, maintenance imposed
 * load, and the wind/uplift combination factors). SI 412 / EN 1991-1-1.
 * ────────────────────────────────────────────────────────────────────────── */

/** Roofing self-weight by covering type, kN/m² of plan area. */
export const ROOFING_SELF_WEIGHT_PRESETS: Record<string, EngineeringPreset> = {
  metal_panel: {
    id: 'G_roof_metal_panel',
    labelHe: 'משקל קירוי — פאנל מתכת',
    value: 0.25,
    unit: 'kN/m²',
    source: 'SI 412 / נתוני יצרן (ערך אופייני)',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: '',
  },
  polycarbonate: {
    id: 'G_roof_polycarbonate',
    labelHe: 'משקל קירוי — פוליקרבונט',
    value: 0.2,
    unit: 'kN/m²',
    source: 'נתוני יצרן (ערך אופייני)',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: '',
  },
  open_slats: {
    id: 'G_roof_open_slats',
    labelHe: 'משקל קירוי — סרגלי הצללה',
    value: 0.15,
    unit: 'kN/m²',
    source: 'הערכה הנדסית (ערך אופייני)',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'קירוי מחורר/פתוח קולט פחות רוח — המהנדס יכול להפחית c_p,net.',
  },
  fabric: {
    id: 'G_roof_fabric',
    labelHe: 'משקל קירוי — בד מתוח',
    value: 0.05,
    unit: 'kN/m²',
    source: 'נתוני יצרן (ערך אופייני)',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'בד מעביר יניקת רוח גבוהה למבנה — קריטי לעיגון.',
  },
};

/** Imposed roof load — light cover, not for human activity (פרגולה). */
export const ROOF_IMPOSED_PRESET: EngineeringPreset = {
  id: 'Q_roof_light',
  labelHe: 'עומס שימושי לגג — כיסוי קל שאינו מיועד לפעילות אנשים',
  value: 0.2,
  unit: 'kN/m²',
  source: 'ת"י 412 טבלה 1, סעיף 12.1 (בהיטל אופקי)',
  approvedBy: null,
  approvedAt: null,
  status: 'draft',
  notes: 'בנוסף עומס מרוכז ~1.0 kN לבדיקת אלמנט בודד — בדיקה נפרדת של המהנדס.',
};

/** ULS load-combination factors — ת"י 412 טבלה ב\'3 (שיטת 1.4/1.6). */
export const PERGOLA_GAMMA_G_PRESET: EngineeringPreset = {
  id: 'gamma_G_412',
  labelHe: 'מקדם עומס קבוע (ULS) — לא-מיטיב',
  value: 1.4,
  unit: '-',
  source: 'ת"י 412 טבלה ב\'3',
  approvedBy: null,
  approvedAt: null,
  status: 'draft',
  notes: '',
};

export const PERGOLA_GAMMA_Q_PRESET: EngineeringPreset = {
  id: 'gamma_Q_412',
  labelHe: 'מקדם עומס שימושי (ULS)',
  value: 1.6,
  unit: '-',
  source: 'ת"י 412 טבלה ב\'3',
  approvedBy: null,
  approvedAt: null,
  status: 'draft',
  notes: '',
};

export const PERGOLA_GAMMA_W_PRESET: EngineeringPreset = {
  id: 'gamma_W_412',
  labelHe: 'מקדם עומס רוח (ULS)',
  value: 1.4,
  unit: '-',
  source: 'ת"י 412 טבלה ב\'3',
  approvedBy: null,
  approvedAt: null,
  status: 'draft',
  notes: '',
};

/** Three-action combination factor (קבוע+שימושי+רוח), ת"י 412 טבלה ב\'3. */
export const PERGOLA_GAMMA_COMBINED_PRESET: EngineeringPreset = {
  id: 'gamma_combined_412',
  labelHe: 'מקדם שילוב שלושה עומסים (קבוע+שימושי+רוח)',
  value: 1.2,
  unit: '-',
  source: 'ת"י 412 טבלה ב\'3',
  approvedBy: null,
  approvedAt: null,
  status: 'draft',
  notes: '',
};

/** Favourable permanent factor for the uplift combination. */
export const PERGOLA_GAMMA_G_FAV_PRESET: EngineeringPreset = {
  id: 'gamma_G_fav_412',
  labelHe: 'מקדם עומס קבוע מיטיב (לבדיקת יניקה)',
  value: 1.0,
  unit: '-',
  source: 'ת"י 412 (G מיטיב בבדיקת היפוך/יניקה)',
  approvedBy: null,
  approvedAt: null,
  status: 'draft',
  notes: 'בבדיקת uplift המשקל העצמי מיטיב — מקדם 1.0.',
};
