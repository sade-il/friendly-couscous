/**
 * Multi-element sizing for the pergola frame — ת"י 412/414 + EC3 buckling.
 *
 * Three elements are sized from one load model:
 *   • rafter (קורת משנה) — spans the pergola depth, tributary = rafter spacing
 *   • main beam (קורה ראשית) — spans between posts, tributary = ½ rafter span
 *   • post (עמוד) — carries ¼ of the roof area; flexural-buckling check
 *
 * Bending members: lightest section passing bending / shear / deflection under
 * the gravity and uplift cases. Post: lightest SQUARE section passing flexural
 * buckling under the gravity axial load (L_cr = 2·H, cantilever — conservative).
 * Net uplift is reported as an anchor-tension demand (the pergola failure mode).
 */

import type {
  CandidateSection,
  EngineeringPreset,
  FormulaStep,
} from '@/engineering/engineeringKernel';
import { DEFLECTION_LIMIT_PRESETS } from '@/data/presets/loads';
import {
  beamForces,
  beamDeflectionMm,
  bendingUtilization,
  deflectionUtilization,
  axialBucklingUtilization,
} from './elements';
import type { ElementStaticScheme } from './elements';
import { materialModel, designBendingStrength } from './sectionLibrary';
import type { MaterialModel, SectionProps } from './sectionLibrary';
import type { DesignAreaLoads } from './loads';
import type { LightStructureInput } from './schema';

const GRAVITY_ACCEL = 9.81; // m/s²
const GAMMA_G = 1.4; // ת"י 412 טבלה ב'3
const POST_EFFECTIVE_LENGTH_FACTOR = 2.0; // cantilever post (sway) — conservative

export interface SizedElement {
  roleHe: string;
  candidate: CandidateSection | null;
  outOfRange: boolean;
}

export interface SizingResult {
  elements: SizedElement[];
  reactions: {
    beamVerticalUls_kN: number;
    postAxialUls_kN: number;
    upliftAnchorUls_kN: number;
  };
  steps: FormulaStep[];
  presetsUsed: EngineeringPreset[];
}

function selfWeightLine_kN_per_m(section: SectionProps): number {
  return (section.mass_kg_per_m * GRAVITY_ACCEL) / 1000;
}

function shearStress_Nmm2(V_kN: number, section: SectionProps): number {
  const base = (10 * Math.abs(V_kN)) / section.Av_cm2;
  return section.shape === 'solid_rect' ? 1.5 * base : base;
}

interface BendUtils {
  bending: number;
  shear: number;
  deflection: number;
  worst: number;
}

function evaluateBending(
  section: SectionProps,
  material: MaterialModel,
  wGravUls: number,
  wUpliftUls: number,
  wSls: number,
  spanM: number,
  scheme: ElementStaticScheme,
  deflDenom: number
): BendUtils {
  const fBend = designBendingStrength(material);
  const fShear = material.shearStrengthDesign_Nmm2;

  const g = beamForces(wGravUls, spanM, scheme);
  let bending = bendingUtilization(g.M_kNm, section.Wel_cm3, fBend, 1.0);
  let shear = shearStress_Nmm2(g.V_kN, section) / fShear;

  if (wUpliftUls > 0) {
    const u = beamForces(wUpliftUls, spanM, scheme);
    bending = Math.max(bending, bendingUtilization(u.M_kNm, section.Wel_cm3, fBend, 1.0));
    shear = Math.max(shear, shearStress_Nmm2(u.V_kN, section) / fShear);
  }

  const deflMm = beamDeflectionMm(wSls, spanM, scheme, material.E_Nmm2, section.Iy_cm4);
  const deflection = deflectionUtilization(deflMm, spanM, deflDenom);

  return { bending, shear, deflection, worst: Math.max(bending, shear, deflection) };
}

/** Size the lightest bending section for an element role. */
function sizeBendingElement(
  roleHe: string,
  material: MaterialModel,
  spanM: number,
  tributaryM: number,
  loads: DesignAreaLoads,
  scheme: ElementStaticScheme,
  deflDenom: number,
  warnings: string[]
): SizedElement {
  const ordered = [...material.sections].sort((a, b) => a.A_cm2 - b.A_cm2);
  const wGravArea = loads.ulsGravity_kN_m2 * tributaryM;
  const wUpArea = loads.ulsUpliftNet_kN_m2 * tributaryM;
  const wSlsArea = loads.sls_kN_m2 * tributaryM;

  let best: { section: SectionProps; utils: BendUtils } | null = null;
  for (const section of ordered) {
    const sw = selfWeightLine_kN_per_m(section);
    const utils = evaluateBending(
      section,
      material,
      wGravArea + GAMMA_G * sw,
      wUpArea - sw,
      wSlsArea + sw,
      spanM,
      scheme,
      deflDenom
    );
    if (utils.worst <= 1.0) {
      best = { section, utils };
      break;
    }
  }

  if (!best) return { roleHe, candidate: null, outOfRange: true };
  return {
    roleHe,
    outOfRange: false,
    candidate: {
      id: `${roleHe}_${best.section.id}`,
      label: `${roleHe} · ${best.section.label}`,
      material: material.material,
      utilization: round(best.utils.worst, 2),
      deflectionRatio: round(best.utils.deflection, 2),
      warnings,
    },
  };
}

/** Size the lightest SQUARE post passing flexural buckling under axial load. */
function sizePost(
  material: MaterialModel,
  heightM: number,
  axialGravity_kN: number,
  warnings: string[]
): { element: SizedElement; sectionSelfWeight_kN_per_m: number } {
  const fkEff = material.fk_Nmm2 * material.kFactor;
  const gammaM = material.gammaM;
  const Lcr = POST_EFFECTIVE_LENGTH_FACTOR * heightM;
  const squares = material.sections
    .filter((s) => s.b_mm === s.h_mm)
    .sort((a, b) => a.A_cm2 - b.A_cm2);

  for (const section of squares) {
    const sw = selfWeightLine_kN_per_m(section);
    const N_Ed = axialGravity_kN + GAMMA_G * sw * heightM;
    const util = axialBucklingUtilization(
      N_Ed,
      section.A_cm2,
      section.Iy_cm4,
      fkEff,
      gammaM,
      material.E_Nmm2,
      Lcr,
      material.bucklingAlpha
    );
    if (util <= 1.0) {
      return {
        sectionSelfWeight_kN_per_m: sw,
        element: {
          roleHe: 'עמוד',
          outOfRange: false,
          candidate: {
            id: `post_${section.id}`,
            label: `עמוד · ${section.label}`,
            material: material.material,
            utilization: round(util, 2),
            warnings,
          },
        },
      };
    }
  }
  return {
    sectionSelfWeight_kN_per_m: 0,
    element: { roleHe: 'עמוד', candidate: null, outOfRange: true },
  };
}

export function computeSizing(
  input: LightStructureInput,
  loads: DesignAreaLoads
): SizingResult | null {
  const material = materialModel(input.material === 'unknown' ? 'steel' : input.material);
  if (!material) return null;
  if (input.mainSpanM === null || input.mainSpanM <= 0) return null;
  if (input.secondarySpanM === null || input.secondarySpanM <= 0) return null;
  if (input.secondarySpacingM === null || input.secondarySpacingM <= 0) return null;
  if (input.installationHeightM === null || input.installationHeightM <= 0) return null;

  const scheme: ElementStaticScheme =
    input.staticScheme === 'unknown' ? 'simple' : input.staticScheme;
  const deflDenom = DEFLECTION_LIMIT_PRESETS.beam_total_l_over_250.value;

  const mainSpan = input.mainSpanM;
  const rafterSpan = input.secondarySpanM;
  const spacing = input.secondarySpacingM;
  const height = input.installationHeightM;

  const anchorWarn =
    'העיגון למבנה הוא אחריות המהנדס — יש לאמת עוגנים, קוטר, עומק וקצה בטון.';
  const upliftWarn =
    input.anchorCheckAvailable !== 'yes'
      ? 'לא צוין מפרט עיגון מאומת — האומדן אינו תקף ללא בדיקת עוגנים.'
      : '';
  const memberWarnings = [anchorWarn, upliftWarn].filter(Boolean);

  // Rafter: spans the pergola depth, tributary = rafter spacing.
  const rafter = sizeBendingElement(
    'קורת משנה',
    material,
    rafterSpan,
    spacing,
    loads,
    scheme,
    deflDenom,
    memberWarnings
  );

  // Main beam: spans between posts, tributary = half the rafter span.
  const beam = sizeBendingElement(
    'קורה ראשית',
    material,
    mainSpan,
    rafterSpan / 2,
    loads,
    scheme,
    deflDenom,
    memberWarnings
  );

  // Post: carries ¼ of the roof area; flexural buckling.
  const areaPerPost = (mainSpan * rafterSpan) / 4;
  const axialGravity = loads.ulsGravity_kN_m2 * areaPerPost;
  const postWarnings = [
    anchorWarn,
    'אורך הקריסה נלקח כ-2·גובה (עמוד זיז) — חיבור עליון נוקשה מפחית.',
    'מומנט בסיס מרוח אופקית — בדיקה פרטנית של המהנדס.',
  ];
  const { element: post } = sizePost(material, height, axialGravity, postWarnings);

  // Reactions for the audit.
  const beamTrib = rafterSpan / 2;
  const beamWGrav = loads.ulsGravity_kN_m2 * beamTrib;
  const beamVertical = (beamWGrav * mainSpan) / 2;
  const upliftAnchor = Math.max(0, loads.ulsUpliftNet_kN_m2 * areaPerPost);

  const steps: FormulaStep[] = [
    {
      id: 'geom',
      labelHe: 'גיאומטריית מסגרת',
      expression: 'main × depth × spacing × height',
      variables: { main_m: mainSpan, depth_m: rafterSpan, spacing_m: spacing, height_m: height },
      result: round(mainSpan * rafterSpan, 2),
      unit: 'm² (שטח גג)',
    },
    {
      id: 'sizing_beam_reaction',
      labelHe: 'תגובת קורה ראשית לעמוד (ULS)',
      expression: 'R = w_beam·L/2',
      variables: { w_beam: round(beamWGrav, 3), L: mainSpan },
      result: round(beamVertical, 2),
      unit: 'kN',
    },
    {
      id: 'sizing_post_axial',
      labelHe: 'כוח ציר בעמוד (ULS, כובד)',
      expression: 'N = q_uls·(שטח/4)',
      variables: { q_uls: round(loads.ulsGravity_kN_m2, 3), area_per_post: round(areaPerPost, 2) },
      result: round(axialGravity, 2),
      unit: 'kN',
    },
    {
      id: 'sizing_uplift_tension',
      labelHe: 'מתיחת עוגן מיניקת רוח (ULS)',
      expression: 'T_up = max(0, w_up,net·שטח/4)',
      variables: { w_up_net: round(loads.ulsUpliftNet_kN_m2, 3), area_per_post: round(areaPerPost, 2) },
      result: round(upliftAnchor, 2),
      unit: 'kN',
      source: 'מצב הכשל האופייני — קריטי לעיגון',
    },
  ];

  const presetsUsed: EngineeringPreset[] = [
    material.strengthPreset,
    material.eModulusPreset,
    DEFLECTION_LIMIT_PRESETS.beam_total_l_over_250,
  ];

  return {
    elements: [rafter, beam, post],
    reactions: {
      beamVerticalUls_kN: round(beamVertical, 2),
      postAxialUls_kN: round(axialGravity, 2),
      upliftAnchorUls_kN: round(upliftAnchor, 2),
    },
    steps,
    presetsUsed,
  };
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
