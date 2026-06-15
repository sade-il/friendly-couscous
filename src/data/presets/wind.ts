import type { EngineeringPreset } from '@/engineering/engineeringKernel';
import type { ExposureCategory } from '@/calculators/lightStructure/schema';

/**
 * Wind-model presets — ת"י 414 (2008), extracted directly from the standard.
 *
 *   qb  = ρ·vb²/2              (3.4) ; equivalently vb²/1.6
 *   ce(z) = cr²(z)·c0²(z)·[1+2·kp·Iv(z)]   (5.7), kp = 3.5, c0 = 1 (flat)
 *           = [kr·ln(z/z0)]²·[1 + 7/ln(z/z0)]
 *   qp(z) = qb·ce(z)          (peak velocity pressure, from 4.1)
 *   w = cp,net · qp           (net pressure on a free roof, §7.3)
 *
 * vb = vb,0 because cdir = cseason = 1.0 in Israel (§3.1).
 *
 * Each value cites its clause/table in ת"י 414. They remain 'draft' until the
 * licensed engineer confirms them against his copy (in particular the basic
 * velocity for the specific wind-map zone of the project).
 */

export const WIND_AIR_DENSITY: EngineeringPreset = {
  id: 'wind_air_density',
  labelHe: 'צפיפות אוויר ρ',
  value: 1.25,
  unit: 'kg/m³',
  source: 'ת"י 414 §3.5 (נוסחה 3.4)',
  approvedBy: null,
  approvedAt: null,
  status: 'draft',
  notes: '',
};

export const WIND_BASIC_VELOCITY: EngineeringPreset = {
  id: 'wind_v_b0',
  labelHe: 'מהירות רוח בסיסית Vb,0',
  value: 24,
  unit: 'm/s',
  source: 'ת"י 414 §3.4 — איזותך מינימלי במפה (מישור החוף והנגב)',
  approvedBy: null,
  approvedAt: null,
  status: 'draft',
  notes:
    'הערך הנמוך ביותר במפת הרוח (24 m/s) מקיף את מישור החוף והנגב. לאזורים אחרים יש לקרוא את הערך מהמפה בנספח ת"י 414.',
};

/** Gust peak factor kp from ת"י 414 (5.7). */
export const WIND_PEAK_FACTOR_KP = 3.5;

/** Terrain roughness category — ת"י 414 טבלה 5.1. */
export interface TerrainCategory {
  /** roughness length z0 (m) */
  z0_m: number;
  /** terrain factor kr */
  kr: number;
  /** minimum height zmin (m) — below it cr(z)=cr(zmin) */
  zmin_m: number;
  labelHe: string;
}

export const TERRAIN_CATEGORIES: Record<'0' | 'I' | 'II' | 'III' | 'IV', TerrainCategory> = {
  '0': { z0_m: 0.003, kr: 0.156, zmin_m: 1.0, labelHe: 'ים פתוח / חוף הפתוח לים' },
  I: { z0_m: 0.01, kr: 0.17, zmin_m: 1.0, labelHe: 'שטח שטוח ללא מכשולים' },
  II: { z0_m: 0.05, kr: 0.19, zmin_m: 2.0, labelHe: 'שטח פתוח עם מכשולים בודדים' },
  III: { z0_m: 0.3, kr: 0.215, zmin_m: 5.0, labelHe: 'פרברי / עירוני / יער' },
  IV: { z0_m: 1.0, kr: 0.234, zmin_m: 10.0, labelHe: 'עירוני צפוף (מבנים גבוהים)' },
};

/** Maps the tool's exposure categories to ת"י 414 terrain categories. */
export const EXPOSURE_TO_TERRAIN: Record<
  Exclude<ExposureCategory, 'unknown'>,
  '0' | 'I' | 'II' | 'III' | 'IV'
> = {
  sheltered: 'IV',
  urban: 'III',
  open: 'II',
  coast: '0',
};

/** Audit preset for the terrain category used (kr is the displayed value). */
export function exposureTerrainPreset(
  category: Exclude<ExposureCategory, 'unknown'>
): EngineeringPreset {
  const key = EXPOSURE_TO_TERRAIN[category];
  const t = TERRAIN_CATEGORIES[key];
  return {
    id: `wind_terrain_${key}`,
    labelHe: `קטגוריית חספוס ${key} — ${t.labelHe}`,
    value: t.kr,
    unit: 'kr',
    source: 'ת"י 414 טבלה 5.1',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: `z0=${t.z0_m} מ׳, zmin=${t.zmin_m} מ׳`,
  };
}

/**
 * Net pressure coefficients for free-standing canopy / pergola roofs
 * (ת"י 414 §7.3, טבלאות 7.5/7.6). Downward (+) acts with gravity; uplift (−)
 * is suction. Conservative single-value envelope for low-pitch free roofs.
 */
export const CP_NET_DOWNWARD: EngineeringPreset = {
  id: 'wind_cpnet_down',
  labelHe: 'מקדם לחץ נטו c_p,net — לחיצה (כלפי מטה)',
  value: 0.5,
  unit: '-',
  source: 'ת"י 414 §7.3 טבלאות 7.5/7.6 (גג חופשי, שיפוע נמוך)',
  approvedBy: null,
  approvedAt: null,
  status: 'draft',
  notes: 'בשיפועים תלולים יותר הלחיצה גדלה (עד ~+0.8 בזווית 60°).',
};

export const CP_NET_UPLIFT: EngineeringPreset = {
  id: 'wind_cpnet_up',
  labelHe: 'מקדם לחץ נטו c_p,net — יניקה (uplift)',
  value: -1.5,
  unit: '-',
  source: 'ת"י 414 §7.3 טבלאות 7.5/7.6 (גג חופשי) — מעטפה',
  approvedBy: null,
  approvedAt: null,
  status: 'draft',
  notes: 'אזורי קצה מקומיים (אזור F) מגיעים עד ~−2.1 — לאלמנטים בקצה המהנדס מגדיל.',
};
