/**
 * Section & material library for the pergola element calculator.
 *
 * Section properties are COMPUTED from real product dimensions using standard
 * mechanics (I = (b·h³ − bᵢ·hᵢ³)/12 for hollow, b·h³/12 for solid). This is
 * deliberate: it is fully auditable (every number is reproducible from the
 * geometry shown), avoids transcription errors from hand-copied catalogue
 * tables, and stays conservative via a corner-rounding knockdown on hollow
 * sections.
 *
 * Material design strengths cite the standards Israel adopts (EN 1993 steel,
 * EN 1999 aluminium, EN 1995 timber). They are 'draft' presets — the licensed
 * engineer verifies each value against the standard before it is relied upon.
 */

import type { EngineeringPreset } from '@/engineering/engineeringKernel';
import type { Material } from './schema';

export type SectionShape = 'hollow_rect' | 'solid_rect';

export interface SectionProps {
  id: string;
  /** Human label, e.g. "RHS 80×80×4" or "עץ 100×150" */
  label: string;
  shape: SectionShape;
  /** Outer width (mm), perpendicular to load */
  b_mm: number;
  /** Outer depth (mm), in the plane of bending (vertical) */
  h_mm: number;
  /** Wall thickness (mm); 0 for solid sections */
  t_mm: number;
  /** Cross-section area, cm² */
  A_cm2: number;
  /** Second moment of area about the strong (horizontal) axis, cm⁴ */
  Iy_cm4: number;
  /** Elastic section modulus about the strong axis, cm³ */
  Wel_cm3: number;
  /** Shear area for the vertical-load direction, cm² */
  Av_cm2: number;
  /** Self-weight, kg/m */
  mass_kg_per_m: number;
}

/** Outer-corner rounding on cold-formed hollow sections reduces I/Wel a few %. */
const HOLLOW_CORNER_KNOCKDOWN = 0.93;

const STEEL_DENSITY_KG_M3 = 7850;
const ALU_DENSITY_KG_M3 = 2700;
const TIMBER_DENSITY_KG_M3 = 500; // softwood C24, ~5 kN/m³

function round(n: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/** Compute hollow rectangular/square section properties (strong axis = depth h). */
export function hollowProps(
  b_mm: number,
  h_mm: number,
  t_mm: number,
  density_kg_m3: number
): Pick<SectionProps, 'A_cm2' | 'Iy_cm4' | 'Wel_cm3' | 'Av_cm2' | 'mass_kg_per_m'> {
  const bi = b_mm - 2 * t_mm;
  const hi = h_mm - 2 * t_mm;
  const A_mm2 = b_mm * h_mm - bi * hi;
  const I_mm4 = ((b_mm * h_mm ** 3 - bi * hi ** 3) / 12) * HOLLOW_CORNER_KNOCKDOWN;
  const Wel_mm3 = I_mm4 / (h_mm / 2);
  // Shear area in the load direction ≈ A·h/(b+h) (EN 1993-1-1 for RHS).
  const Av_mm2 = (A_mm2 * h_mm) / (b_mm + h_mm);
  return {
    A_cm2: round(A_mm2 / 100, 2),
    Iy_cm4: round(I_mm4 / 1e4, 1),
    Wel_cm3: round(Wel_mm3 / 1e3, 1),
    Av_cm2: round(Av_mm2 / 100, 2),
    mass_kg_per_m: round((A_mm2 * 1e-6 * density_kg_m3), 2),
  };
}

/** Compute solid rectangular (timber) section properties (strong axis = depth h). */
export function solidProps(
  b_mm: number,
  h_mm: number,
  density_kg_m3: number
): Pick<SectionProps, 'A_cm2' | 'Iy_cm4' | 'Wel_cm3' | 'Av_cm2' | 'mass_kg_per_m'> {
  const A_mm2 = b_mm * h_mm;
  const I_mm4 = (b_mm * h_mm ** 3) / 12;
  const Wel_mm3 = (b_mm * h_mm ** 2) / 6;
  return {
    A_cm2: round(A_mm2 / 100, 1),
    Iy_cm4: round(I_mm4 / 1e4, 0),
    Wel_cm3: round(Wel_mm3 / 1e3, 1),
    Av_cm2: round(A_mm2 / 100, 1), // full area; rectangle shear handled with 1.5 factor in sizing
    mass_kg_per_m: round(A_mm2 * 1e-6 * density_kg_m3, 2),
  };
}

// A beam is installed in its strong orientation: the larger dimension is the
// depth (h, in the plane of bending). Orient here so properties are computed
// about the strong axis regardless of how the size was listed.
function hollow(label: string, d1: number, d2: number, t: number, density: number): SectionProps {
  const b = Math.min(d1, d2);
  const h = Math.max(d1, d2);
  return {
    id: `sec_${label.replace(/[^\dA-Za-z]/g, '_')}`,
    label,
    shape: 'hollow_rect',
    b_mm: b,
    h_mm: h,
    t_mm: t,
    ...hollowProps(b, h, t, density),
  };
}

function solid(label: string, d1: number, d2: number, density: number): SectionProps {
  const b = Math.min(d1, d2);
  const h = Math.max(d1, d2);
  return {
    id: `sec_${label.replace(/[^\dA-Za-z]/g, '_')}`,
    label,
    shape: 'solid_rect',
    b_mm: b,
    h_mm: h,
    t_mm: 0,
    ...solidProps(b, h, density),
  };
}

/**
 * Material design model. f_d (design bending strength) = fk · kFactor / gammaM.
 * shearStrengthDesign is the design shear stress capacity.
 */
export interface MaterialModel {
  material: Material;
  labelHe: string;
  /** Characteristic strength: fy (steel) / f0 (alu) / fm,k (timber), N/mm² */
  fk_Nmm2: number;
  /** Modification factor (timber k_mod for outdoor/medium-term; else 1) */
  kFactor: number;
  /** Partial safety factor γM */
  gammaM: number;
  /** Modulus of elasticity, N/mm² */
  E_Nmm2: number;
  /** Design shear strength, N/mm² (already includes its own γM/k) */
  shearStrengthDesign_Nmm2: number;
  /** Flexural-buckling imperfection factor α (EC3 buckling curve) */
  bucklingAlpha: number;
  /** Deflection limit denominator (L/denom) */
  deflectionLimitDenom: number;
  density_kN_m3: number;
  sections: SectionProps[];
  strengthPreset: EngineeringPreset;
  eModulusPreset: EngineeringPreset;
}

/** Design bending strength f_d = fk · kFactor / γM. */
export function designBendingStrength(m: MaterialModel): number {
  return (m.fk_Nmm2 * m.kFactor) / m.gammaM;
}

const STEEL_SIZES: Array<[number, number, number]> = [
  [40, 40, 3],
  [50, 50, 3],
  [60, 60, 3],
  [60, 60, 4],
  [80, 80, 4],
  [80, 80, 5],
  [100, 100, 4],
  [100, 100, 5],
  [120, 120, 5],
  [150, 150, 6],
  [100, 50, 4],
  [120, 60, 4],
  [120, 80, 5],
  [150, 100, 5],
];

const ALU_SIZES: Array<[number, number, number]> = [
  [50, 50, 3],
  [60, 60, 3],
  [80, 80, 4],
  [100, 100, 4],
  [120, 120, 4],
  [100, 50, 4],
  [120, 60, 4],
  [150, 100, 5],
];

// Timber: b × h in mm (sawn softwood, common pergola sizes)
const TIMBER_SIZES: Array<[number, number]> = [
  [75, 100],
  [75, 150],
  [100, 100],
  [100, 150],
  [100, 200],
  [120, 120],
  [120, 200],
  [150, 150],
  [150, 200],
  [150, 250],
];

export const STEEL_S235: MaterialModel = {
  material: 'steel',
  labelHe: 'פלדה S235 (חלול RHS/SHS)',
  fk_Nmm2: 235,
  kFactor: 1,
  gammaM: 1.0,
  E_Nmm2: 210_000,
  shearStrengthDesign_Nmm2: 235 / Math.sqrt(3) / 1.0, // ≈ 135.7
  bucklingAlpha: 0.49, // cold-formed hollow → curve c
  deflectionLimitDenom: 250,
  density_kN_m3: 78.5,
  sections: STEEL_SIZES.map(([b, h, t]) => hollow(`RHS ${b}×${h}×${t}`, b, h, t, STEEL_DENSITY_KG_M3)),
  strengthPreset: {
    id: 'mat_steel_S235_fy',
    labelHe: 'פלדה S235 — מאמץ כניעה fy',
    value: 235,
    unit: 'N/mm²',
    source: 'EN 1993-1-1 / ת"י 1225 (γM0 = 1.0)',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'ברירת מחדל שמרנית. S275/S355 — preset נפרד לאחר אישור מהנדס.',
  },
  eModulusPreset: {
    id: 'mat_steel_E',
    labelHe: 'פלדה — מודול אלסטיות E',
    value: 210_000,
    unit: 'N/mm²',
    source: 'EN 1993-1-1',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: '',
  },
};

export const ALUMINIUM_6005A: MaterialModel = {
  material: 'aluminum',
  labelHe: 'אלומיניום EN AW-6005A-T6 (חלול)',
  fk_Nmm2: 200, // 0.2% proof stress f0
  kFactor: 1,
  gammaM: 1.1, // γM1 (EN 1999)
  E_Nmm2: 70_000,
  shearStrengthDesign_Nmm2: 200 / Math.sqrt(3) / 1.1, // ≈ 105
  bucklingAlpha: 0.49, // conservative for aluminium HAZ-free extrusion
  deflectionLimitDenom: 250,
  density_kN_m3: 27,
  sections: ALU_SIZES.map(([b, h, t]) => hollow(`ALU ${b}×${h}×${t}`, b, h, t, ALU_DENSITY_KG_M3)),
  strengthPreset: {
    id: 'mat_alu_6005A_f0',
    labelHe: 'אלומיניום 6005A-T6 — מאמץ כניעה f0',
    value: 200,
    unit: 'N/mm²',
    source: 'EN 1999-1-1, EN AW-6005A-T6 (γM1 = 1.1)',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'מאמץ באזור מושפע-חום (HAZ) ליד ריתוכים נמוך יותר — לאימות מהנדס.',
  },
  eModulusPreset: {
    id: 'mat_alu_E',
    labelHe: 'אלומיניום — מודול אלסטיות E',
    value: 70_000,
    unit: 'N/mm²',
    source: 'EN 1999-1-1',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'שקיעה באלומיניום גדולה פי ~3 מפלדה (E נמוך) — לרוב קובעת.',
  },
};

export const TIMBER_C24: MaterialModel = {
  material: 'timber',
  labelHe: 'עץ מלא C24 (אורן/אשוח)',
  fk_Nmm2: 24, // fm,k bending
  kFactor: 0.7, // k_mod outdoor / service class 3, medium-term (conservative)
  gammaM: 1.3,
  E_Nmm2: 11_000, // E0,mean
  shearStrengthDesign_Nmm2: (4.0 * 0.7) / 1.3, // fv,k=4.0 → fv,d ≈ 2.15
  bucklingAlpha: 0.49, // conservative timber column factor
  deflectionLimitDenom: 250,
  density_kN_m3: 5,
  sections: TIMBER_SIZES.map(([b, h]) => solid(`עץ ${b}×${h}`, b, h, TIMBER_DENSITY_KG_M3)),
  strengthPreset: {
    id: 'mat_timber_C24_fmk',
    labelHe: 'עץ C24 — חוזק כפיפה אופייני fm,k',
    value: 24,
    unit: 'N/mm²',
    source: 'EN 338 / EN 1995-1-1 (k_mod=0.7, γM=1.3)',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'k_mod לחוץ/לח נמוך יותר. עץ חיצוני דורש הגנה וקיבועים מתאימים.',
  },
  eModulusPreset: {
    id: 'mat_timber_E',
    labelHe: 'עץ C24 — מודול אלסטיות E0,mean',
    value: 11_000,
    unit: 'N/mm²',
    source: 'EN 338',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: '',
  },
};

export function materialModel(material: Material): MaterialModel | null {
  switch (material) {
    case 'steel':
      return STEEL_S235;
    case 'aluminum':
      return ALUMINIUM_6005A;
    case 'timber':
      return TIMBER_C24;
    default:
      return null;
  }
}
