import type { HardStopReason, MissingInput } from '@/engineering/engineeringKernel';
import { LIGHT_STRUCTURE_REQUIRED_INPUTS } from '@/engineering/requiredInputs';
import { PUBLIC_SCREENING_POLICY } from '@/data/presets/policy';
import type { LightStructureInput } from './schema';

/**
 * Hard stops fire ONLY for genuinely dangerous configurations that no
 * screening value can responsibly cover — never merely for missing data.
 * Missing data is handled by detectMissingInputs (→ insufficient_data), which
 * prompts the user to complete the input rather than refusing outright.
 */
export function detectHardStops(input: LightStructureInput): HardStopReason[] {
  const reasons: HardStopReason[] = [];

  if (input.roofingType === 'glass') {
    reasons.push({
      code: 'glass_roofing_no_specific_design',
      labelHe: 'קירוי זכוכית ללא תכן פרטני',
      explanationHe: 'מערכות זכוכית רגישות לשבר ולשקיעה — אסור אומדן ציבורי, נדרש תכן פרטני.',
    });
  }

  if (input.anchorBaseType === 'pavers_over_waterproofing') {
    reasons.push({
      code: 'anchor_into_pavers',
      labelHe: 'עיגון לתוך ריצוף מעל איטום',
      explanationHe:
        'ריצוף אינו אלמנט קונסטרוקטיבי. אסור להציג חתך — נדרש פתרון עיגון פרטני למבנה.',
    });
  }

  if (
    input.installationHeightM !== null &&
    input.installationHeightM > PUBLIC_SCREENING_POLICY.max_pergola_installation_height_m.value
  ) {
    reasons.push({
      code: 'installation_height_exceeds_public_policy',
      labelHe: `גובה התקנה מעל ${PUBLIC_SCREENING_POLICY.max_pergola_installation_height_m.value} מ׳`,
      explanationHe: 'מעבר לטווח הסינון הציבורי — עומסי רוח גדלים, נדרש תכן רוח פרטני.',
    });
  }

  const maxSpan = PUBLIC_SCREENING_POLICY.max_pergola_span_m.value;
  const overSpan =
    (input.mainSpanM !== null && input.mainSpanM > maxSpan) ||
    (input.secondarySpanM !== null && input.secondarySpanM > maxSpan);
  if (overSpan) {
    reasons.push({
      code: 'span_exceeds_public_policy',
      labelHe: `מפתח מעל ${maxSpan} מ׳`,
      explanationHe: 'מפתח גדול חורג מטווח הסינון — נדרש תכן קורה פרטני.',
    });
  }

  if (input.floorLevel !== null && input.floorLevel >= 4) {
    reasons.push({
      code: 'high_floor_installation',
      labelHe: 'התקנה בקומה גבוהה',
      explanationHe: 'בקומות גבוהות עומסי הרוח גדלים משמעותית — דרוש תכן רוח פרטני.',
    });
  }

  if (input.distanceFromSea === 'under_500m') {
    reasons.push({
      code: 'first_line_to_sea',
      labelHe: 'קו ראשון לים',
      explanationHe:
        'אזורי חוף דורשים בדיקת רוח, מליחות ומאמצי קורוזיה פרטניים — לא לסינון ציבורי.',
    });
  }

  return reasons;
}

export function detectMissingInputs(input: LightStructureInput): MissingInput[] {
  const missing: MissingInput[] = [];
  const has = (v: unknown): boolean => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v !== '' && v !== 'unknown';
    if (typeof v === 'number') return !Number.isNaN(v);
    return true;
  };

  const valueOf = (field: string): unknown => {
    switch (field) {
      case 'location':
        return input.location;
      case 'installationHeightM':
        return input.installationHeightM;
      case 'floorLevel':
        return input.floorLevel;
      case 'distanceFromSeaM':
        return input.distanceFromSea === 'unknown' ? null : input.distanceFromSea;
      case 'exposureCategory':
        return input.exposureCategory === 'unknown' ? null : input.exposureCategory;
      case 'topography':
        return input.topography === 'unknown' ? null : input.topography;
      case 'material':
        return input.material === 'unknown' ? null : input.material;
      case 'roofingType':
        return input.roofingType === 'unknown' ? null : input.roofingType;
      case 'roofSlopeDeg':
        return input.roofSlopeDeg;
      case 'sidesCondition':
        return input.sidesCondition === 'unknown' ? null : input.sidesCondition;
      case 'mainSpanM':
        return input.mainSpanM;
      case 'secondarySpanM':
        return input.secondarySpanM;
      case 'secondarySpacingM':
        return input.secondarySpacingM;
      case 'staticScheme':
        return input.staticScheme === 'unknown' ? null : input.staticScheme;
      case 'supportConnectionType':
        return input.supportConnectionType === 'unknown' ? null : input.supportConnectionType;
      case 'anchorBaseType':
        return input.anchorBaseType === 'unknown' ? null : input.anchorBaseType;
      case 'anchorCheckAvailable':
        return input.anchorCheckAvailable === 'unknown' ? null : input.anchorCheckAvailable;
      default:
        return null;
    }
  };

  for (const def of LIGHT_STRUCTURE_REQUIRED_INPUTS) {
    if (!has(valueOf(def.field))) {
      missing.push({
        field: def.field,
        labelHe: def.labelHe,
        reasonHe: def.whyRequiredHe,
        severity: def.blocksCandidateIfMissing ? 'danger' : 'warning',
      });
    }
  }

  return missing;
}
