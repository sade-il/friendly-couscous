export interface RequiredInputDefinition {
  field: string;
  labelHe: string;
  whyRequiredHe: string;
  blocksCandidateIfMissing: boolean;
}

export const WALL_REMOVAL_REQUIRED_INPUTS: RequiredInputDefinition[] = [
  { field: 'buildingType', labelHe: 'סוג מבנה', whyRequiredHe: 'עומסים ושימושים משתנים לפי סוג המבנה.', blocksCandidateIfMissing: true },
  { field: 'constructionYearRange', labelHe: 'שנת בנייה או טווח שנים', whyRequiredHe: 'שיטת בנייה ופרטי שלד משתנים לפי תקופה.', blocksCandidateIfMissing: true },
  { field: 'hasStructuralPlans', labelHe: 'האם קיימות תכניות קונסטרוקציה', whyRequiredHe: 'ללא תכניות קשה לזהות כיוון נשיאה ואלמנטים נושאים.', blocksCandidateIfMissing: true },
  { field: 'elementType', labelHe: 'סוג אלמנט', whyRequiredHe: 'עמוד, קיר וקורה אינם נבדקים באותו מודל.', blocksCandidateIfMissing: true },
  { field: 'protectedRoomRisk', labelHe: 'ממ"ד / קיר מגן / מרחב מוגן / לא ידוע', whyRequiredHe: 'רכיבי מיגון דורשים מסלול בדיקה ואישור נפרד.', blocksCandidateIfMissing: true },
  { field: 'visibleDamage', labelHe: 'סדיקה / שקיעה / רטיבות / קורוזיה', whyRequiredHe: 'מצב קיים פגום משנה את סיכון העבודה.', blocksCandidateIfMissing: true },
  { field: 'openingSpanM', labelHe: 'מפתח פתיחה מתוכנן', whyRequiredHe: 'המפתח משפיע על מומנט ושקיעה בקירוב ריבועי או חזק יותר.', blocksCandidateIfMissing: true },
  { field: 'wallTotalLengthM', labelHe: 'אורך קיר כולל', whyRequiredHe: 'מיקום הפתח והיתרות לצדדים משפיעים על מסלול הכוחות.', blocksCandidateIfMissing: true },
  { field: 'openingLocation', labelHe: 'מיקום הפתח בקיר', whyRequiredHe: 'פתח סמוך לקצה אינו שקול לפתח במרכז.', blocksCandidateIfMissing: true },
  { field: 'bearingLeftCm', labelHe: 'אורך השענה אפשרי בצד שמאל', whyRequiredHe: 'ללא סמך מספיק אין משמעות לבחירת קורה.', blocksCandidateIfMissing: true },
  { field: 'bearingRightCm', labelHe: 'אורך השענה אפשרי בצד ימין', whyRequiredHe: 'ללא סמך מספיק אין משמעות לבחירת קורה.', blocksCandidateIfMissing: true },
  { field: 'wallThicknessCm', labelHe: 'עובי קיר', whyRequiredHe: 'עובי הקיר משפיע על נשיאה, משקל ועיגון.', blocksCandidateIfMissing: true },
  { field: 'wallMaterial', labelHe: 'חומר הקיר', whyRequiredHe: 'בטון, בלוק, לבנים ואבן אינם שקולים.', blocksCandidateIfMissing: true },
  { field: 'wallHeightM', labelHe: 'גובה קיר', whyRequiredHe: 'משפיע על משקל קיר ועל פרטי ביצוע.', blocksCandidateIfMissing: true },
  { field: 'slabType', labelHe: 'סוג תקרה', whyRequiredHe: 'תקרה מקשית, צלעות, פלדה ועץ מעבירות עומסים אחרת.', blocksCandidateIfMissing: true },
  { field: 'slabSpanDirection', labelHe: 'כיוון נשיאת התקרה', whyRequiredHe: 'כיוון הנשיאה קובע אם הקיר מקבל עומס מהתקרה.', blocksCandidateIfMissing: true },
  { field: 'slabSpanM', labelHe: 'מפתח התקרה בכיוון הנשיאה', whyRequiredHe: 'נדרש להערכת רוחב טריבוטרי ותגובות.', blocksCandidateIfMissing: true },
  { field: 'slabThicknessCm', labelHe: 'עובי תקרה', whyRequiredHe: 'משפיע על משקל עצמי.', blocksCandidateIfMissing: true },
  { field: 'floorsAbove', labelHe: 'מספר קומות מעל', whyRequiredHe: 'משפיע על עומס מצטבר.', blocksCandidateIfMissing: true },
  { field: 'openingsAboveBelow', labelHe: 'פתחים מעל או מתחת', whyRequiredHe: 'פתחים קיימים משנים מסלול כוחות וריכוזי מאמץ.', blocksCandidateIfMissing: true },
];

export const LIGHT_STRUCTURE_REQUIRED_INPUTS: RequiredInputDefinition[] = [
  { field: 'location', labelHe: 'יישוב או קואורדינטות', whyRequiredHe: 'רוח, סביבה וקורוזיה תלויים במיקום.', blocksCandidateIfMissing: true },
  { field: 'installationHeightM', labelHe: 'גובה התקנה מעל הקרקע', whyRequiredHe: 'גובה משפיע על עומסי רוח.', blocksCandidateIfMissing: true },
  { field: 'floorLevel', labelHe: 'קומת התקנה', whyRequiredHe: 'קומה גבוהה מגדילה סיכון רוח ועיגון.', blocksCandidateIfMissing: true },
  { field: 'distanceFromSeaM', labelHe: 'מרחק מהים', whyRequiredHe: 'קרבה לים משפיעה על רוח וקורוזיה.', blocksCandidateIfMissing: true },
  { field: 'exposureCategory', labelHe: 'חשיפת שטח', whyRequiredHe: 'שטח פתוח/חופי אינו שקול לסביבה עירונית מוגנת.', blocksCandidateIfMissing: true },
  { field: 'topography', labelHe: 'טופוגרפיה', whyRequiredHe: 'רכס, מדרון ושטח פתוח משנים חשיפה.', blocksCandidateIfMissing: true },
  { field: 'material', labelHe: 'חומר ראשי', whyRequiredHe: 'עץ, פלדה ואלומיניום שונים בחוזק, שקיעה וחיבור.', blocksCandidateIfMissing: true },
  { field: 'roofingType', labelHe: 'סוג קירוי', whyRequiredHe: 'משפיע על משקל, יניקה וחיבור.', blocksCandidateIfMissing: true },
  { field: 'roofSlopeDeg', labelHe: 'שיפוע קירוי', whyRequiredHe: 'משפיע על רוח וניקוז.', blocksCandidateIfMissing: true },
  { field: 'sidesCondition', labelHe: 'צדדים פתוחים או סגורים', whyRequiredHe: 'משפיע על לחץ פנימי ויניקה.', blocksCandidateIfMissing: true },
  { field: 'mainSpanM', labelHe: 'מפתח קורה ראשית', whyRequiredHe: 'מרחק בין עמודים — שולט במומנט הקורה הראשית.', blocksCandidateIfMissing: true },
  { field: 'secondarySpanM', labelHe: 'מפתח קורת משנה (עומק הפרגולה)', whyRequiredHe: 'מרחק שקורות המשנה גושרות — שולט במומנט קורת המשנה ובעומס הראשית.', blocksCandidateIfMissing: true },
  { field: 'secondarySpacingM', labelHe: 'מרווח בין קורות משנה', whyRequiredHe: 'קובע רוחב טריבוטרי לקורת המשנה.', blocksCandidateIfMissing: true },
  { field: 'staticScheme', labelHe: 'סכמה סטטית', whyRequiredHe: 'קורה פשוטה, זיז ורציפה אינם שקולים.', blocksCandidateIfMissing: true },
  { field: 'supportConnectionType', labelHe: 'סוג סמך וחיבור', whyRequiredHe: 'חיבור משפיע על תגובות ועיגון.', blocksCandidateIfMissing: true },
  { field: 'anchorBaseType', labelHe: 'סוג בסיס עיגון', whyRequiredHe: 'עיגון לבטון, קיר או פלדה דורש בדיקות שונות.', blocksCandidateIfMissing: true },
  { field: 'anchorCheckAvailable', labelHe: 'האם קיימת בדיקת עוגנים', whyRequiredHe: 'ללא בדיקת עוגנים אין להציג חתך כמועמד לביצוע.', blocksCandidateIfMissing: true },
];
