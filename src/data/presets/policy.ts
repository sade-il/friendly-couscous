import type { EngineeringPreset } from '@/engineering/engineeringKernel';

/**
 * Public-screening policy limits. These are NOT engineering values - they are
 * the boundaries beyond which the public tool refuses to produce a result.
 */
export const PUBLIC_SCREENING_POLICY: Record<string, EngineeringPreset> = {
  max_wall_opening_span_m: {
    id: 'policy_max_wall_opening_span_m',
    labelHe: 'מפתח פתיחה מקסימלי במחשבון הציבורי',
    value: 5.0,
    unit: 'm',
    source: 'מדיניות פנימית - גבול סינון ציבורי',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'מעל ערך זה הכלי יחזיר hard_stop ויפנה למהנדס.',
  },
  min_bearing_length_cm: {
    id: 'policy_min_bearing_length_cm',
    labelHe: 'אורך השענה מינימלי לקורת פלדה על קיר',
    value: 15,
    unit: 'cm',
    source: 'מדיניות פנימית; בדרך כלל 100-150 מ"מ לקורת פלדה על קיר בנוי',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'מתחת לסף זה הכלי יחזיר hard_stop.',
  },
  max_pergola_span_m: {
    id: 'policy_max_pergola_span_m',
    labelHe: 'מפתח פרגולה מקסימלי במחשבון הציבורי',
    value: 6.0,
    unit: 'm',
    source: 'מדיניות פנימית',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: '',
  },
  max_pergola_installation_height_m: {
    id: 'policy_max_pergola_installation_height_m',
    labelHe: 'גובה התקנה מקסימלי לפרגולה במחשבון הציבורי',
    value: 4.0,
    unit: 'm',
    source: 'מדיניות פנימית',
    approvedBy: null,
    approvedAt: null,
    status: 'draft',
    notes: 'מעל זה צריך בדיקת רוח פרטנית - hard_stop.',
  },
};
