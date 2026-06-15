/**
 * Load assembly & combinations for the pergola calculator — ת"י 412 טבלה ב'3.
 *
 * Three characteristic AREA loads are kept separate (kN/m² of plan area):
 *   G  — roof covering self-weight (member self-weight is added later, per metre)
 *   Q  — maintenance imposed load (§12.1: light, non-accessible roof)
 *   W  — wind, split into downward (w_down) and uplift (w_up)
 *
 * ULS combinations (ת"י 412, method 1.4/1.6):
 *   gravity = max( 1.4·G + 1.6·Q ,  1.2·(G + Q + w_down) )
 *   uplift  = 1.4·w_up − 1.0·G                (positive ⇒ net uplift)
 *   SLS     = G + Q                           (characteristic, for deflection)
 */

import type { EngineeringPreset, FormulaStep } from '@/engineering/engineeringKernel';
import {
  ROOFING_SELF_WEIGHT_PRESETS,
  ROOF_IMPOSED_PRESET,
  PERGOLA_GAMMA_G_PRESET,
  PERGOLA_GAMMA_Q_PRESET,
  PERGOLA_GAMMA_W_PRESET,
  PERGOLA_GAMMA_COMBINED_PRESET,
  PERGOLA_GAMMA_G_FAV_PRESET,
} from '@/data/presets/loads';
import type { LightStructureInput } from './schema';
import type { WindModel } from './wind';

export interface DesignAreaLoads {
  gRoof_kN_m2: number;
  qImposed_kN_m2: number;
  wDown_kN_m2: number;
  wUp_kN_m2: number;
  /** governing downward ULS pressure, kN/m² */
  ulsGravity_kN_m2: number;
  /** 1.4·w_up − 1.0·G, kN/m² (positive = net uplift on the roof plane) */
  ulsUpliftNet_kN_m2: number;
  /** G + Q, kN/m² (characteristic, for deflection) */
  sls_kN_m2: number;
  presetsUsed: EngineeringPreset[];
  steps: FormulaStep[];
}

function roofingSelfWeightPreset(
  roofing: LightStructureInput['roofingType']
): EngineeringPreset | null {
  return ROOFING_SELF_WEIGHT_PRESETS[roofing] ?? null;
}

/**
 * Returns the area design loads, or null when the covering self-weight is
 * undefined (unknown/other/glass) — the engine treats that as missing data.
 */
export function computeDesignLoads(
  input: LightStructureInput,
  wind: WindModel
): DesignAreaLoads | null {
  const gPreset = roofingSelfWeightPreset(input.roofingType);
  if (!gPreset || Number.isNaN(gPreset.value)) return null;

  const gRoof = gPreset.value;
  const qImposed = ROOF_IMPOSED_PRESET.value;
  const wDown = wind.pressureDown_kN_m2;
  const wUp = wind.pressureUp_kN_m2;

  const gammaG = PERGOLA_GAMMA_G_PRESET.value; // 1.4
  const gammaQ = PERGOLA_GAMMA_Q_PRESET.value; // 1.6
  const gammaW = PERGOLA_GAMMA_W_PRESET.value; // 1.4
  const gammaC = PERGOLA_GAMMA_COMBINED_PRESET.value; // 1.2
  const gammaGfav = PERGOLA_GAMMA_G_FAV_PRESET.value; // 1.0

  const gravityDominant = gammaG * gRoof + gammaQ * qImposed;
  const threeLoad = gammaC * (gRoof + qImposed + wDown);
  const ulsGravity = Math.max(gravityDominant, threeLoad);
  const ulsUpliftNet = gammaW * wUp - gammaGfav * gRoof;
  const sls = gRoof + qImposed;

  const steps: FormulaStep[] = [
    {
      id: 'load_uls_gravity',
      labelHe: 'עומס תכן — מצב כובד (ULS)',
      expression: 'max(1.4·G + 1.6·Q ,  1.2·(G+Q+w_down))',
      variables: {
        G: gRoof,
        Q: qImposed,
        w_down: round(wDown, 3),
        case_gravity: round(gravityDominant, 3),
        case_three_load: round(threeLoad, 3),
      },
      result: round(ulsGravity, 3),
      unit: 'kN/m²',
      source: 'ת"י 412 טבלה ב\'3',
    },
    {
      id: 'load_uls_uplift',
      labelHe: 'עומס תכן — מצב יניקה (ULS)',
      expression: '1.4·w_up − 1.0·G',
      variables: { w_up: round(wUp, 3), G: gRoof },
      result: round(ulsUpliftNet, 3),
      unit: 'kN/m²',
      source: 'ת"י 412 טבלה ב\'3 (G מיטיב)',
    },
    {
      id: 'load_sls',
      labelHe: 'עומס שירות (SLS) לשקיעה',
      expression: 'G + Q',
      variables: { G: gRoof, Q: qImposed },
      result: round(sls, 3),
      unit: 'kN/m²',
      source: 'ת"י 412 — מצב גבול שירות',
    },
  ];

  return {
    gRoof_kN_m2: gRoof,
    qImposed_kN_m2: qImposed,
    wDown_kN_m2: wDown,
    wUp_kN_m2: wUp,
    ulsGravity_kN_m2: ulsGravity,
    ulsUpliftNet_kN_m2: ulsUpliftNet,
    sls_kN_m2: sls,
    presetsUsed: [
      gPreset,
      ROOF_IMPOSED_PRESET,
      PERGOLA_GAMMA_G_PRESET,
      PERGOLA_GAMMA_Q_PRESET,
      PERGOLA_GAMMA_W_PRESET,
      PERGOLA_GAMMA_COMBINED_PRESET,
      PERGOLA_GAMMA_G_FAV_PRESET,
    ],
    steps,
  };
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
