
# שיפורי ביצועים נוספים — אחרי תיקון הגופנים

מה שנשאר בדוח PageSpeed (אחרי שהגופנים יעלו ב-Publish הבא):

| מקור הבעיה | זמן | מה הופך לבעיה |
|---|---|---|
| LCP render delay | 3,040 ms | הלוגו ב-Hero מחכה ש-`index-*.js` (249 KB) ייטען, יתפרס ויעבד את React לפני שמצויר |
| חבילת JS | 249 KB gzipped | קובץ יחיד שמכיל את כל ה-12 העמודים + shadcn + Helmet |
| גודל DOM | 1,077 אלמנטים | רוב הגדילה ב-Hero (12 ילדים ישירים) ו-ServiceAreas |
| לוגו 192×192 בקונטיינר 67×67 | 9.5 KiB | אפשר לחסוך ~8 KiB |
| Forced reflow | 73 ms | קריאת `offsetWidth` מתוך קוד ה-vendor (Embla/Helmet) |

## מה אני מציע לבצע

### 1. הסרת ה-LCP מהמסלול של React (השפעה הכי גדולה — צפוי −1.5s ב-LCP)
- להחליף את ה-Hero monogram מ-`<img src={import}>` שמרונדר אחרי hydrate ל-**SVG inline ב-`index.html`** או `<img>` ישיר ב-`index.html` עם `fetchpriority="high"`.
- React ימשיך לרנדר מעליו (overlay), אבל ה-LCP candidate כבר יהיה צבוע ב-FCP במקום אחרי 3s.

### 2. Code-splitting של עמודים משניים (צפוי −80 KB מהבאנדל הראשוני)
- `React.lazy()` על כל מה שלא נדרש ב-`/`:
  `AdminDns`, `AreaPage`, `AreasIndex`, `WhatIsKonstruktor`, `Mamad`, `PergolaApproval`, `InteriorChanges`, `BuildingReinforcement`, `Auth`, `NotFound`, דפי שפות.
- `<Suspense fallback={null}>` ב-`App.tsx`.
- הדף הבית (`Index`) נשאר eager.

### 3. צמצום הלוגו לגודל הריאלי
- אחזון מ-192×192 ל-`134×134` (2× עבור 67px @ DPR 1.75) → −8 KiB וגם פותר אזהרת "image size exceeds container".

### 4. תיקון forced reflow קל
- ב-`Header.tsx` יש קריאות `scrollIntoView` שיכולות להיגרם במהלך מעבר state; להוסיף `requestAnimationFrame` סביב פעולות שמודדות layout.

### 5. הקטנת DOM ב-Hero
- ב-`Hero.tsx` יש שכבות `grid-shimmer` עם רבדים דקורטיביים בלבד. למזג שתי שכבות overlay לאחת → ~60 אלמנטים פחות.

## מה לא ייגעו בו
- שום שינוי בעיצוב, תוכן, RTL, נגישות, או נתיבים.
- ה-Playwright selectors נשמרים.

## טכני (למפתח)
- `lazy` + `Suspense` ב-`src/App.tsx`. שמירה על `Index` ב-import רגיל כדי לא לאחר את ה-Hero.
- ה-monogram יישתל כ-`<svg>` קטן (~2 KB) ב-`<body>` של `index.html`, ו-React Hero יציג את אותו ה-SVG (אבל הראשון שכבר ב-DOM יוקדם כ-LCP).
- `vite-imagetools` כבר זמין; ניצור variant של `logo-si-monogram.jpg?w=134&format=webp`.
- אופציונלי: להוסיף `manualChunks` ב-`vite.config.ts` שמפצל `react-helmet-async`, `@radix-ui/*` ו-`embla-carousel` לצ'אנקים נפרדים — יעזור לקאשינג בין דפלויים.

## תוצאה צפויה
- Performance מובייל: **74 → 88–92**
- LCP: **4.1s → 2.2–2.5s**
- TBT: **40ms → <20ms** (פחות JS לבצע)
- בלי שום רגרסיה ויזואלית.

מאשרת שאתחיל?
