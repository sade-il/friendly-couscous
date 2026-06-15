/**
 * Pure beam mechanics for light-structure line elements (pergola rafters,
 * main beams, posts).
 *
 * NO standard-specific constants live here — only universal mechanics of
 * materials. Every code factor (fy, γM0, E), section property, deflection
 * limit and load value is PASSED IN by the engine, which sources them from
 * engineer-approved presets. This keeps the standards data auditable in one
 * place and lets these formulas be unit-tested in isolation.
 *
 * Convention: downward load positive; all returned forces are magnitudes
 * (design envelope). Units are spelled out in every parameter name so a
 * unit mismatch is a visible bug, never a silent one.
 */

export type ElementStaticScheme = 'simple' | 'cantilever' | 'continuous';

/**
 * Bending-moment coefficient k_M such that M_max = k_M · w · L².
 * 'continuous' deliberately uses the simple-beam envelope (1/8) — for a
 * pre-design screening it is conservative to assume the larger simple-span
 * mid-moment rather than the reduced interior-span value.
 */
export function momentCoefficient(scheme: ElementStaticScheme): number {
  switch (scheme) {
    case 'simple':
      return 1 / 8;
    case 'continuous':
      return 1 / 8;
    case 'cantilever':
      return 1 / 2;
  }
}

/** Shear coefficient k_V such that V_max = k_V · w · L. */
export function shearCoefficient(scheme: ElementStaticScheme): number {
  switch (scheme) {
    case 'simple':
    case 'continuous':
      return 1 / 2;
    case 'cantilever':
      return 1;
  }
}

/** Deflection coefficient k_δ such that δ_max = k_δ · w · L⁴ / (E·I). */
export function deflectionCoefficient(scheme: ElementStaticScheme): number {
  switch (scheme) {
    case 'simple':
      return 5 / 384;
    case 'continuous':
      return 5 / 384;
    case 'cantilever':
      return 1 / 8;
  }
}

export interface BeamForces {
  /** Maximum bending moment, kN·m */
  M_kNm: number;
  /** Maximum shear force, kN */
  V_kN: number;
}

/** Max moment & shear for a uniform line load w (kN/m) over span L (m). */
export function beamForces(
  w_kN_per_m: number,
  spanM: number,
  scheme: ElementStaticScheme
): BeamForces {
  const w = Math.abs(w_kN_per_m);
  const L = spanM;
  return {
    M_kNm: momentCoefficient(scheme) * w * L * L,
    V_kN: shearCoefficient(scheme) * w * L,
  };
}

/**
 * Max deflection in mm for a uniform line load.
 *  w  — kN/m (numerically equals N/mm, since 1 kN/m = 1 N/mm)
 *  L  — m
 *  E  — N/mm²
 *  I  — cm⁴ (second moment of area about the bending axis)
 */
export function beamDeflectionMm(
  w_kN_per_m: number,
  spanM: number,
  scheme: ElementStaticScheme,
  E_Nmm2: number,
  I_cm4: number
): number {
  const w_N_per_mm = Math.abs(w_kN_per_m); // 1 kN/m ≡ 1 N/mm
  const L_mm = spanM * 1000;
  const I_mm4 = I_cm4 * 1e4;
  return (deflectionCoefficient(scheme) * w_N_per_mm * L_mm ** 4) / (E_Nmm2 * I_mm4);
}

/**
 * Bending utilization = σ_Ed / (fy/γM0), elastic check (conservative).
 *  M   — kN·m
 *  Wel — cm³ (elastic section modulus about the bending axis)
 *  fy  — N/mm²
 */
export function bendingUtilization(
  M_kNm: number,
  Wel_cm3: number,
  fy_Nmm2: number,
  gammaM0: number
): number {
  // σ = M/Wel ; (kN·m·1e6) / (cm³·1e3) = M_kNm/Wel_cm3 · 1000  [N/mm²]
  const sigma_Nmm2 = (Math.abs(M_kNm) * 1e6) / (Wel_cm3 * 1e3);
  const fyd = fy_Nmm2 / gammaM0;
  return sigma_Nmm2 / fyd;
}

/**
 * Shear utilization = V_Ed / V_Rd, with V_Rd = Av·(fy/√3)/γM0.
 *  V  — kN
 *  Av — cm² (shear area)
 *  fy — N/mm²
 */
export function shearUtilization(
  V_kN: number,
  Av_cm2: number,
  fy_Nmm2: number,
  gammaM0: number
): number {
  const Av_mm2 = Av_cm2 * 100;
  const Vrd_kN = (Av_mm2 * (fy_Nmm2 / Math.sqrt(3))) / gammaM0 / 1000;
  return Math.abs(V_kN) / Vrd_kN;
}

/**
 * Serviceability deflection utilization = δ / (L / limitDenominator).
 * e.g. limitDenominator = 200 → allowable = L/200.
 */
export function deflectionUtilization(
  deflectionMm: number,
  spanM: number,
  limitDenominator: number
): number {
  const allowableMm = (spanM * 1000) / limitDenominator;
  return Math.abs(deflectionMm) / allowableMm;
}

/** Tributary line load (kN/m) from an area pressure (kN/m²) over a width (m). */
export function lineLoadFromPressure(
  pressure_kN_per_m2: number,
  tributaryWidthM: number
): number {
  return pressure_kN_per_m2 * tributaryWidthM;
}

/* ── Column / post compression buckling (EC3-style flexural buckling) ────── */

/** Euler critical load N_cr = π²·E·I / L_cr², returned in kN. */
export function eulerCriticalLoad_kN(E_Nmm2: number, I_cm4: number, Lcr_m: number): number {
  const I_mm4 = I_cm4 * 1e4;
  const Lcr_mm = Lcr_m * 1000;
  return (Math.PI ** 2 * E_Nmm2 * I_mm4) / Lcr_mm ** 2 / 1000;
}

/**
 * Buckling reduction factor χ (EC3 6.3.1.2).
 * α is the imperfection factor of the buckling curve (cold-formed hollow ≈ 0.49).
 */
export function bucklingReductionChi(lambdaBar: number, alpha: number): number {
  const phi = 0.5 * (1 + alpha * (lambdaBar - 0.2) + lambdaBar * lambdaBar);
  const denom = phi + Math.sqrt(Math.max(phi * phi - lambdaBar * lambdaBar, 0));
  return Math.min(1 / denom, 1.0);
}

/**
 * Axial buckling utilization N_Ed / N_b,Rd, with
 *   N_b,Rd = χ·A·fk/γM ,  λ̄ = √(A·fk / N_cr).
 *  N_Ed — kN ; A — cm² ; I — cm⁴ ; fk — N/mm²
 */
export function axialBucklingUtilization(
  N_Ed_kN: number,
  A_cm2: number,
  I_cm4: number,
  fk_Nmm2: number,
  gammaM: number,
  E_Nmm2: number,
  Lcr_m: number,
  alpha: number
): number {
  const Npl_k_kN = (A_cm2 * 100 * fk_Nmm2) / 1000; // A[mm²]·fk → N → kN
  const Ncr_kN = eulerCriticalLoad_kN(E_Nmm2, I_cm4, Lcr_m);
  const lambdaBar = Math.sqrt(Npl_k_kN / Ncr_kN);
  const chi = bucklingReductionChi(lambdaBar, alpha);
  const Nb_Rd_kN = (chi * Npl_k_kN) / gammaM;
  return N_Ed_kN / Nb_Rd_kN;
}
