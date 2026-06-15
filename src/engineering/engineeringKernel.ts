export type ApprovalStatus = 'draft' | 'approved' | 'rejected';

export type ResultStatus =
  | 'hard_stop'
  | 'insufficient_data'
  | 'indicative_screening'
  | 'quantity_only';

export type Severity = 'info' | 'warning' | 'danger';

export interface EngineeringPreset<T = number> {
  id: string;
  labelHe: string;
  value: T;
  unit: string;
  source: string;
  approvedBy: string | null;
  approvedAt: string | null;
  status: ApprovalStatus;
  notes?: string;
}

export interface FormulaStep {
  id: string;
  labelHe: string;
  expression: string;
  variables: Record<string, number | string | boolean | null>;
  result: number | string | boolean | null;
  unit?: string;
  source?: string;
}

export interface MissingInput {
  field: string;
  labelHe: string;
  reasonHe: string;
  severity: Severity;
}

export interface HardStopReason {
  code: string;
  labelHe: string;
  explanationHe: string;
}

export interface CandidateSection {
  id: string;
  label: string;
  material: 'steel' | 'timber' | 'aluminum' | 'other';
  utilization?: number;
  deflectionRatio?: number;
  warnings: string[];
}

export interface CalculationReport {
  status: ResultStatus;
  inputSnapshot: Record<string, unknown>;
  missingInputs: MissingInput[];
  hardStops: HardStopReason[];
  assumptions: string[];
  formulaSteps: FormulaStep[];
  presetsUsed: EngineeringPreset[];
  candidateSections: CandidateSection[];
  publicMessageHe: string;
  disclaimerHe: string;
}

export const PUBLIC_DISCLAIMER_HE =
  'הכלי מספק אומדן ראשוני בלבד לצורכי בדיקה מוקדמת והיערכות כללית. התוצאות אינן חישוב סטטי, אינן תכנית ביצוע, אינן אישור לפי דין ואינן מחליפות בדיקת מהנדס/ת מבנים. אין לבצע הריסה, קידוח, עיגון, הזמנת חומר, שינוי מבני או עבודה באתר על סמך הכלי בלבד.';

export function assertApprovedPreset<T>(preset: EngineeringPreset<T>): void {
  if (preset.status !== 'approved') {
    throw new Error(
      `Preset ${preset.id} is not approved and cannot be used for public candidate output.`
    );
  }
  if (!preset.source || !preset.approvedBy || !preset.approvedAt) {
    throw new Error(
      `Preset ${preset.id} is missing source/approval metadata.`
    );
  }
}

export function createHardStopReport(params: {
  inputSnapshot: Record<string, unknown>;
  hardStops: HardStopReason[];
  missingInputs?: MissingInput[];
  assumptions?: string[];
}): CalculationReport {
  return {
    status: 'hard_stop',
    inputSnapshot: params.inputSnapshot,
    missingInputs: params.missingInputs ?? [],
    hardStops: params.hardStops,
    assumptions: params.assumptions ?? [],
    formulaSteps: [],
    presetsUsed: [],
    candidateSections: [],
    publicMessageHe:
      'נמצא חסם סינון מהותי. אין להציג חתך או המלצת ביצוע. נדרשת בדיקה פרטנית של מהנדס/ת מבנים.',
    disclaimerHe: PUBLIC_DISCLAIMER_HE,
  };
}

export function createInsufficientDataReport(params: {
  inputSnapshot: Record<string, unknown>;
  missingInputs: MissingInput[];
  assumptions?: string[];
}): CalculationReport {
  return {
    status: 'insufficient_data',
    inputSnapshot: params.inputSnapshot,
    missingInputs: params.missingInputs,
    hardStops: [],
    assumptions: params.assumptions ?? [],
    formulaSteps: [],
    presetsUsed: [],
    candidateSections: [],
    publicMessageHe:
      'חסר מידע חיוני לחישוב אחראי. אין להציג חתך או המלצת ביצוע לפני השלמת הנתונים.',
    disclaimerHe: PUBLIC_DISCLAIMER_HE,
  };
}

export function enforceNoCandidatesWhenBlocked(report: CalculationReport): CalculationReport {
  if (report.status === 'hard_stop' || report.status === 'insufficient_data') {
    return {
      ...report,
      candidateSections: [],
      formulaSteps: report.status === 'hard_stop' ? [] : report.formulaSteps,
    };
  }
  return report;
}

export function hasUnapprovedPresets(report: CalculationReport): boolean {
  return report.presetsUsed.some((preset) => preset.status !== 'approved');
}

export function downgradeIfDraftPresets(report: CalculationReport): CalculationReport {
  if (!hasUnapprovedPresets(report)) return report;

  return {
    ...report,
    status: 'insufficient_data',
    candidateSections: [],
    publicMessageHe:
      'קיימים קבועים מקצועיים שטרם אושרו. אין להציג תוצאה ציבורית עד לאישור הנתונים.',
    missingInputs: [
      ...report.missingInputs,
      {
        field: 'approved_presets',
        labelHe: 'אישור קבועים מקצועיים',
        reasonHe: 'לפחות אחד מקובצי הנתונים נמצא במצב טיוטה ולא אושר לשימוש ציבורי.',
        severity: 'danger',
      },
    ],
  };
}
