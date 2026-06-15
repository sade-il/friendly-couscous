/**
 * Wind pressures for the pergola calculator — ת"י 414 (2008).
 *
 *   vb     = vb,0                         (§3.1, cdir=cseason=1)
 *   qb     = ρ·vb²/2                      (3.4)
 *   cr(z)  = kr·ln(z/z0)  (z ≥ zmin) ; cr(zmin) below   (5.2/5.3)
 *   Iv(z)  = 1/ln(z/z0)   (kI=1, c0=1)
 *   ce(z)  = cr²·[1 + 2·kp·Iv]            (5.7), kp=3.5, c0=1 (flat)
 *   qp(z)  = qb·ce(z)
 *   w_down = c_p,net,down · qp ;  w_up = |c_p,net,up| · qp   (§7.3 free roof)
 *
 * Gravity, downward wind and uplift are kept SEPARATE (never wind = factor×gravity).
 */

import type { EngineeringPreset, FormulaStep } from '@/engineering/engineeringKernel';
import {
  WIND_AIR_DENSITY,
  WIND_BASIC_VELOCITY,
  WIND_PEAK_FACTOR_KP,
  TERRAIN_CATEGORIES,
  EXPOSURE_TO_TERRAIN,
  exposureTerrainPreset,
  CP_NET_DOWNWARD,
  CP_NET_UPLIFT,
} from '@/data/presets/wind';
import type { LightStructureInput } from './schema';

export interface WindModel {
  qb_kN_m2: number;
  ce: number;
  qp_kN_m2: number;
  /** downward net wind pressure (+), kN/m² */
  pressureDown_kN_m2: number;
  /** uplift net wind pressure magnitude (+), kN/m² */
  pressureUp_kN_m2: number;
  presetsUsed: EngineeringPreset[];
  steps: FormulaStep[];
}

/** Returns the wind model, or null if exposure is unknown (treated as missing data). */
export function computeWindModel(input: LightStructureInput): WindModel | null {
  if (input.exposureCategory === 'unknown') return null;

  const rho = WIND_AIR_DENSITY.value; // kg/m³
  const vb = WIND_BASIC_VELOCITY.value; // m/s
  const terrainKey = EXPOSURE_TO_TERRAIN[input.exposureCategory];
  const t = TERRAIN_CATEGORIES[terrainKey];

  // qb = ρ·vb²/2  →  Pa = N/m²  →  /1000  →  kN/m²
  const qb_kN_m2 = (0.5 * rho * vb * vb) / 1000;

  // ce(z): clamp z to zmin, then cr & turbulence.
  const z = Math.max(input.installationHeightM ?? t.zmin_m, t.zmin_m);
  const lnz = Math.log(z / t.z0_m);
  const cr = t.kr * lnz;
  const iv = 1 / lnz; // kI = 1, c0 = 1
  const ce = cr * cr * (1 + 2 * WIND_PEAK_FACTOR_KP * iv);

  const qp_kN_m2 = ce * qb_kN_m2;
  const cpDown = CP_NET_DOWNWARD.value;
  const cpUp = CP_NET_UPLIFT.value;
  const pressureDown_kN_m2 = cpDown * qp_kN_m2;
  const pressureUp_kN_m2 = Math.abs(cpUp) * qp_kN_m2;

  const steps: FormulaStep[] = [
    {
      id: 'wind_qb',
      labelHe: 'לחץ רוח בסיסי q_b',
      expression: 'q_b = ρ·V_b²/2',
      variables: { rho, V_b: vb },
      result: round(qb_kN_m2, 3),
      unit: 'kN/m²',
      source: 'ת"י 414 נוסחה 3.4',
    },
    {
      id: 'wind_ce',
      labelHe: 'מקדם חשיפה c_e(z)',
      expression: 'c_e = [k_r·ln(z/z0)]²·[1 + 7/ln(z/z0)]',
      variables: { kr: t.kr, z0: t.z0_m, z: round(z, 2), terrain: terrainKey },
      result: round(ce, 3),
      unit: '-',
      source: 'ת"י 414 נוסחה 5.7 + טבלה 5.1',
    },
    {
      id: 'wind_qp',
      labelHe: 'לחץ רוח שיא q_p',
      expression: 'q_p = c_e·q_b',
      variables: { c_e: round(ce, 3), q_b: round(qb_kN_m2, 3) },
      result: round(qp_kN_m2, 3),
      unit: 'kN/m²',
      source: 'ת"י 414 נוסחה 4.1',
    },
    {
      id: 'wind_down',
      labelHe: 'לחץ רוח כלפי מטה',
      expression: 'w_down = c_p,net,down·q_p',
      variables: { c_p_net_down: cpDown, q_p: round(qp_kN_m2, 3) },
      result: round(pressureDown_kN_m2, 3),
      unit: 'kN/m²',
      source: CP_NET_DOWNWARD.source,
    },
    {
      id: 'wind_uplift',
      labelHe: 'יניקת רוח (uplift)',
      expression: 'w_up = |c_p,net,up|·q_p',
      variables: { c_p_net_up: cpUp, q_p: round(qp_kN_m2, 3) },
      result: round(pressureUp_kN_m2, 3),
      unit: 'kN/m²',
      source: CP_NET_UPLIFT.source,
    },
  ];

  return {
    qb_kN_m2,
    ce,
    qp_kN_m2,
    pressureDown_kN_m2,
    pressureUp_kN_m2,
    presetsUsed: [
      WIND_AIR_DENSITY,
      WIND_BASIC_VELOCITY,
      exposureTerrainPreset(input.exposureCategory),
      CP_NET_DOWNWARD,
      CP_NET_UPLIFT,
    ],
    steps,
  };
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
