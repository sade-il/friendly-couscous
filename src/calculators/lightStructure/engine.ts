/**
 * Light-structure (pergola / canopy) engine — standards-based element sizing.
 *
 * Pipeline:
 *   1. detectHardStops      — dangerous configurations refer straight to an engineer.
 *   2. detectMissingInputs  — incomplete data asks the user to complete it.
 *   3. computeWindModel     — SI 414 / EN 1991-1-4 peak pressure, down + uplift.
 *   4. computeDesignLoads   — SI 412 / EN 1990 ULS gravity, ULS uplift, SLS.
 *   5. computeSizing        — picks the lightest section passing bending/shear/deflection.
 *
 * Gravity, downward wind and uplift are modelled SEPARATELY (never wind =
 * factor × gravity). Every constant is an auditable, sourced preset shown in
 * the audit panel.
 *
 * DESIGN NOTE — this calculator intentionally produces an `indicative_screening`
 * result from 'draft' presets (it does NOT call downgradeIfDraftPresets). It is
 * an engineer-owned pre-design tool: the presets are conservative standard
 * defaults, transparently labelled draft in the audit, and every result carries
 * the public disclaimer that it is not an execution approval. The licensed
 * engineer verifies/edits each value in one place (src/data/presets/*).
 */

import type { CalculationReport, EngineeringPreset } from '@/engineering/engineeringKernel';
import {
  PUBLIC_DISCLAIMER_HE,
  createHardStopReport,
  createInsufficientDataReport,
  enforceNoCandidatesWhenBlocked,
} from '@/engineering/engineeringKernel';
import { detectHardStops, detectMissingInputs } from './decision';
import type { LightStructureInput } from './schema';
import { computeWindModel } from './wind';
import { computeDesignLoads } from './loads';
import { computeSizing } from './sizing';

const ASSUMPTIONS: string[] = [
  'הופרדו עומסים: כובד, רוח כלפי מטה ויניקת רוח — ללא הכפלת עומס אנכי במקדם רוח.',
  'נבדקים שלושה אלמנטים: קורת משנה, קורה ראשית ועמוד — מומנט/גזירה/שקיעה, ועמוד גם בקריסה.',
  'דגם מסגרת חד-תאי: הקורה הראשית נושאת חצי ממפתח קורת המשנה, והעמוד רבע משטח הגג.',
  'מעטפת רוח שמרנית (חסימה φ→1); אלמנטים בקצה הגג עלולים לדרוש מקדם גבוה יותר.',
  'אורך קריסת העמוד נלקח כ-2·גובה (זיז); מומנט בסיס מרוח אופקית — לבדיקת המהנדס.',
  'משקל עצמי נכלל; שקיעה נבדקת במצב שירות (L/250).',
  'העיגון, היציבות הכוללת והחיבורים הם באחריות המהנדס.',
  'הערכים הם ערכי תקן (טיוטה) — לאימות המהנדס מול עותק התקן.',
];

export function computeLightStructureReport(input: LightStructureInput): CalculationReport {
  const inputSnapshot = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;

  const hardStops = detectHardStops(input);
  if (hardStops.length > 0) {
    return enforceNoCandidatesWhenBlocked(createHardStopReport({ inputSnapshot, hardStops }));
  }

  const missing = detectMissingInputs(input);
  if (missing.length > 0) {
    return enforceNoCandidatesWhenBlocked(
      createInsufficientDataReport({ inputSnapshot, missingInputs: missing })
    );
  }

  const wind = computeWindModel(input);
  if (!wind) {
    return enforceNoCandidatesWhenBlocked(
      createInsufficientDataReport({
        inputSnapshot,
        missingInputs: [
          {
            field: 'exposureCategory',
            labelHe: 'חשיפת שטח',
            reasonHe: 'דרושה לקביעת מקדם החשיפה c_e ועומס הרוח.',
            severity: 'danger',
          },
        ],
      })
    );
  }

  const loads = computeDesignLoads(input, wind);
  if (!loads) {
    return enforceNoCandidatesWhenBlocked(
      createInsufficientDataReport({
        inputSnapshot,
        missingInputs: [
          {
            field: 'roofingType',
            labelHe: 'סוג קירוי',
            reasonHe: 'דרוש לקביעת משקל עצמי הקירוי ועומס הרוח.',
            severity: 'danger',
          },
        ],
      })
    );
  }

  const sizing = computeSizing(input, loads);
  if (!sizing) {
    return enforceNoCandidatesWhenBlocked(
      createInsufficientDataReport({
        inputSnapshot,
        missingInputs: [
          {
            field: 'mainSpanM',
            labelHe: 'מפתח / חומר / מרווח',
            reasonHe: 'נדרשים מפתח ראשי, חומר ורוחב טעינה לבחירת אלמנט.',
            severity: 'danger',
          },
        ],
      })
    );
  }

  const presetsUsed = dedupePresets([
    ...wind.presetsUsed,
    ...loads.presetsUsed,
    ...sizing.presetsUsed,
  ]);

  const formulaSteps = [...wind.steps, ...loads.steps, ...sizing.steps];

  const candidateSections = sizing.elements
    .map((e) => e.candidate)
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const outOfRange = sizing.elements.filter((e) => e.outOfRange).map((e) => e.roleHe);

  let publicMessageHe: string;
  if (candidateSections.length === 0) {
    publicMessageHe =
      'בטווח הסינון לא נמצא חתך מספיק לעומסים שחושבו — נדרש תכן פרטני של מהנדס/ת.';
  } else if (outOfRange.length > 0) {
    publicMessageHe = `אומדן ראשוני — אין בכך אישור ביצוע. ${outOfRange.join(' ו')} חורגים מטווח הסינון ודורשים תכן פרטני.`;
  } else {
    publicMessageHe =
      'לא זוהה חסם סינון מיידי — אין בכך אישור ביצוע. האומדן מבוסס ערכי תקן (ת"י 414 / 412) ודורש אימות מהנדס/ת.';
  }

  return {
    status: 'indicative_screening',
    inputSnapshot,
    missingInputs: [],
    hardStops: [],
    assumptions: ASSUMPTIONS,
    formulaSteps,
    presetsUsed,
    candidateSections,
    publicMessageHe,
    disclaimerHe: PUBLIC_DISCLAIMER_HE,
  };
}

function dedupePresets(presets: EngineeringPreset[]): EngineeringPreset[] {
  const seen = new Set<string>();
  const out: EngineeringPreset[] = [];
  for (const p of presets) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}
