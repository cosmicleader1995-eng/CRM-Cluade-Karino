/**
 * Persian / Shamsi Date Utilities for Karino Management System
 */

// Centralized digit conversion functions to avoid duplication
export function toPersianDigits(n: string | number | undefined | null): string {
  if (n === undefined || n === null) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (w) => persianDigits[Number(w)]);
}

export function toEnglishDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let res = String(str);
  for (let i = 0; i < 10; i++) {
    res = res.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  return res;
}

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

export const PERSIAN_WEEK_DAYS = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
  'شنبه'
];

export const PERSIAN_MONTH_NAMES = [
  '',
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const gd_m = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 12 && days >= gd_m[gm]) {
    days -= gd_m[gm];
    gm++;
  }
  return [gy, gm, days + 1];
}

export function parseShamsiDate(str: string | undefined | null): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const clean = toEnglishDigits(str).trim().replace(/-/g, '/');
  const parts = clean.split('/').map(p => parseInt(p, 10));
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  return null;
}

export function shamsiToDate(str: string | undefined | null): Date | null {
  const parsed = parseShamsiDate(str);
  if (!parsed) return null;
  const [gy, gm, gd] = jalaliToGregorian(parsed.year, parsed.month, parsed.day);
  return new Date(gy, gm - 1, gd, 12, 0, 0);
}

export function normalizeShamsiDate(d: string | undefined | null): string {
  const parsed = parseShamsiDate(d);
  if (!parsed) return '';
  return `${parsed.year}/${String(parsed.month).padStart(2, '0')}/${String(parsed.day).padStart(2, '0')}`;
}

export function getCurrentShamsiDate(dateInput: Date = new Date()) {
  const gy = dateInput.getFullYear();
  const gm = dateInput.getMonth() + 1;
  const gd = dateInput.getDate();
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);

  const dayOfWeek = PERSIAN_WEEK_DAYS[dateInput.getDay()];
  const monthName = PERSIAN_MONTH_NAMES[jm];
  const formatted = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  const formattedWithMonth = `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;

  return {
    year: jy,
    month: jm,
    day: jd,
    dayOfWeek,
    monthName,
    formatted,
    formattedWithMonth
  };
}

export function getCurrentTimeFormatted(dateInput: Date = new Date()): string {
  const hours = String(dateInput.getHours()).padStart(2, '0');
  const minutes = String(dateInput.getMinutes()).padStart(2, '0');
  return `${toPersianDigits(hours)}:${toPersianDigits(minutes)}`;
}

export function isLastWorkingDayOfShamsiMonth(dateInput?: string | Date): boolean {
  let p: { year: number; month: number; day: number } | null = null;
  if (!dateInput) {
    const cur = getCurrentShamsiDate();
    p = { year: cur.year, month: cur.month, day: cur.day };
  } else if (typeof dateInput === 'string') {
    p = parseShamsiDate(dateInput);
  } else {
    const [jy, jm, jd] = gregorianToJalali(dateInput.getFullYear(), dateInput.getMonth() + 1, dateInput.getDate());
    p = { year: jy, month: jm, day: jd };
  }

  if (!p) return false;
  const maxDay = getShamsiMonthLastDay(p.year, p.month);
  const lastDayDate = shamsiToDate(`${p.year}/${p.month}/${maxDay}`);
  // If last day of the month is Friday (day 5), the last working day is Thursday (maxDay - 1)
  const isFriday = lastDayDate ? lastDayDate.getDay() === 5 : false;
  const lastWorkingDay = isFriday ? maxDay - 1 : maxDay;

  return p.day === lastWorkingDay;
}

export function getArchiveFileName(
  dateShamsi?: string, 
  dayOfWeek?: string,
  archiveType: 'calls_daily' | 'periodic_daily' | 'periodic_weekly' | 'periodic_monthly' = 'calls_daily'
): string {
  let rawDate = dateShamsi;
  if (!rawDate) {
    const cur = getCurrentShamsiDate();
    rawDate = cur.formatted;
  }
  const sanitized = rawDate.replace(/\//g, '-');
  const parsed = parseShamsiDate(rawDate);
  const monthName = parsed ? (PERSIAN_MONTH_NAMES[parsed.month] || '') : '';

  switch (archiveType) {
    case 'periodic_daily':
      return `تحلیلی_روزانه_${sanitized}.xlsx`;
    case 'periodic_weekly':
      return `تحلیلی_هفتگی_${sanitized}.xlsx`;
    case 'periodic_monthly':
      return monthName ? `تحلیلی_ماهانه_${monthName}_${parsed?.year || ''}.xlsx` : `تحلیلی_ماهانه_${sanitized}.xlsx`;
    case 'calls_daily':
    default:
      return `تماس‌های_روزانه_${sanitized}.xlsx`;
  }
}

/**
 * Calculates a comprehensive, deterministic time weight for a report.
 * Ensures that:
 * 1. Later Shamsi dates (e.g. 1405/06/11 > 1405/06/10) have higher weight
 * 2. On the same date, later submission times (14:30 > 11:00) have higher weight
 * 3. Exact creation timestamps and IDs break ties deterministically
 */
export function getReportSubmissionWeight(r: { 
  id?: string; 
  dateShamsi?: string; 
  submittedAt?: string; 
  createdAt?: string;
  updatedAt?: string;
}): {
  shamsiScore: number;
  timeOfDaySeconds: number;
  creationMs: number;
  id: string;
} {
  let shamsiScore = 0;
  let timeOfDaySeconds = 0;
  let creationMs = 0;

  const createdTime = r?.createdAt ? new Date(r.createdAt).getTime() : 0;
  if (createdTime > 0) creationMs = createdTime;
  if (!creationMs && r?.id) {
    const m = String(r.id).match(/\d{10,}/);
    if (m) creationMs = parseInt(m[0], 10);
  }

  // 1. Primary anchor: Shamsi calendar date (e.g. 1405/06/19 -> 14050619)
  if (r?.dateShamsi) {
    const p = parseShamsiDate(r.dateShamsi);
    if (p) {
      shamsiScore = p.year * 10000 + p.month * 100 + p.day;
    }
  } else if (r?.createdAt) {
    const cDate = new Date(r.createdAt);
    if (!isNaN(cDate.getTime())) {
      const cShamsi = getCurrentShamsiDate(cDate);
      shamsiScore = cShamsi.year * 10000 + cShamsi.month * 100 + cShamsi.day;
    }
  }

  // 2. Secondary anchor: Exact submission time of day (e.g. '18:59' -> 68340 seconds)
  if (r?.submittedAt) {
    const en = toEnglishDigits(String(r.submittedAt)).trim();
    const m = en.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (m) {
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const s = m[3] ? parseInt(m[3], 10) : 0;
      timeOfDaySeconds = h * 3600 + min * 60 + s;
    }
  } else if (r?.createdAt) {
    const cDate = new Date(r.createdAt);
    if (!isNaN(cDate.getTime())) {
      timeOfDaySeconds = cDate.getHours() * 3600 + cDate.getMinutes() * 60 + cDate.getSeconds();
    }
  }

  return {
    shamsiScore,
    timeOfDaySeconds,
    creationMs,
    id: String(r?.id || '')
  };
}

/**
 * Unified, standard title generator for periodic reports (Daily, Weekly, Monthly).
 * Format rules:
 * - Daily: "گزارش روزانه [روز هفته] [روز] [نام ماه]" (e.g. "گزارش روزانه پنج‌شنبه ۱۹ شهریور")
 * - Weekly: "گزارش هفتگی هفته [چندم] [نام ماه] پنج‌شنبه [روز] [نام ماه]" (e.g. "گزارش هفتگی هفته سوم شهریور پنج‌شنبه ۱۹ شهریور")
 * - Monthly: "گزارش ماهانه [نام ماه] [سال]" (e.g. "گزارش ماهانه شهریور ۱۴۰۵")
 */
export function formatStandardReportTitle(
  periodType: 'daily' | 'weekly' | 'monthly',
  dateShamsi?: string,
  existingLabel?: string
): string {
  let targetDate = dateShamsi;
  if (!targetDate) {
    targetDate = getCurrentShamsiDate().formatted;
  }

  const p = parseShamsiDate(targetDate);
  if (!p) {
    return existingLabel || (periodType === 'daily' ? 'گزارش روزانه' : periodType === 'weekly' ? 'گزارش هفتگی' : 'گزارش ماهانه');
  }

  const monthName = PERSIAN_MONTH_NAMES[p.month] || '';
  const gDate = shamsiToDate(targetDate);
  const dayOfWeek = gDate ? PERSIAN_WEEK_DAYS[gDate.getDay()] : '';
  const dayStr = toPersianDigits(p.day);

  if (periodType === 'daily') {
    return `گزارش روزانه ${dayOfWeek} ${dayStr} ${monthName}`;
  }

  if (periodType === 'weekly') {
    let weekWord = 'اول';
    if (p.day <= 7) weekWord = 'اول';
    else if (p.day <= 14) weekWord = 'دوم';
    else if (p.day <= 21) weekWord = 'سوم';
    else if (p.day <= 28) weekWord = 'چهارم';
    else weekWord = 'پنجم';

    const dayName = dayOfWeek || 'پنج‌شنبه';
    return `گزارش هفتگی هفته ${weekWord} ${monthName} ${dayName} ${dayStr} ${monthName}`;
  }

  if (periodType === 'monthly') {
    return `گزارش ماهانه ${monthName} ${toPersianDigits(p.year)}`;
  }

  return existingLabel || 'گزارش عملکرد';
}

/**
 * Stable comparator to sort reports: latest submitted report at the TOP (descending).
 * Guaranteed to be consistent for daily, weekly, monthly, and yearly timeframes.
 */
export function compareReportsLatestFirst(
  a: { id?: string; dateShamsi?: string; submittedAt?: string; createdAt?: string },
  b: { id?: string; dateShamsi?: string; submittedAt?: string; createdAt?: string }
): number {
  const wa = getReportSubmissionWeight(a);
  const wb = getReportSubmissionWeight(b);

  // 1. Shamsi calendar date (later date first)
  if (wa.shamsiScore !== wb.shamsiScore) {
    return wb.shamsiScore - wa.shamsiScore;
  }

  // 2. Submission time of day on that date (later time first)
  if (wa.timeOfDaySeconds !== wb.timeOfDaySeconds) {
    return wb.timeOfDaySeconds - wa.timeOfDaySeconds;
  }

  // 3. Exact creation milliseconds
  if (wa.creationMs !== wb.creationMs) {
    return wb.creationMs - wa.creationMs;
  }

  // 4. Stable tie-breaker
  return wb.id.localeCompare(wa.id);
}

/**
 * Checks if a given Shamsi date or Gregorian Date is Thursday (پنج‌شنبه)
 */
export function isThursday(dateInput?: string | Date): boolean {
  if (!dateInput) {
    const cur = getCurrentShamsiDate();
    return cur.dayOfWeek === 'پنج‌شنبه';
  }
  if (typeof dateInput === 'string') {
    const d = shamsiToDate(dateInput);
    if (!d) return false;
    return d.getDay() === 4; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  }
  return dateInput.getDay() === 4;
}

/**
 * Checks if a given Shamsi date or Gregorian Date is Friday (جمعه)
 */
export function isFriday(dateInput?: string | Date): boolean {
  if (!dateInput) {
    const cur = getCurrentShamsiDate();
    return cur.dayOfWeek === 'جمعه';
  }
  if (typeof dateInput === 'string') {
    const d = shamsiToDate(dateInput);
    if (!d) return false;
    return d.getDay() === 5; // 5 = Friday
  }
  return dateInput.getDay() === 5;
}

/**
 * Returns current Tehran time components
 */
export function getTehranTimeInfo(): { hours: number; minutes: number; totalMinutes: number; timeString: string } {
  try {
    const tehranString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Tehran' });
    const tehranDate = new Date(tehranString);
    const hours = tehranDate.getHours();
    const minutes = tehranDate.getMinutes();
    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    return { 
      hours, 
      minutes, 
      totalMinutes: hours * 60 + minutes, 
      timeString: `${toPersianDigits(hStr)}:${toPersianDigits(mStr)}` 
    };
  } catch (e) {
    const now = new Date();
    // Default fallback: +3.5 hours from UTC
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    let totalMinutes = Math.floor((utcHours * 60 + utcMinutes + 210) % 1440);
    if (totalMinutes < 0) totalMinutes += 1440;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    return { 
      hours, 
      minutes, 
      totalMinutes, 
      timeString: `${toPersianDigits(hStr)}:${toPersianDigits(mStr)}` 
    };
  }
}

export interface DailyReportWindowStatus {
  isFriday: boolean;
  isBeforeSubmissionWindow: boolean; // < 17:00 on non-Friday
  isInsideSubmissionWindow: boolean; // 17:00 - 19:00 on non-Friday
  isPastDeadline: boolean; // >= 19:00 on non-Friday
  tehranTimeString: string;
  tehranHours: number;
}

export function getDailyReportWindowStatus(dateShamsi?: string): DailyReportWindowStatus {
  const friday = isFriday(dateShamsi);
  if (friday) {
    const tehran = getTehranTimeInfo();
    return {
      isFriday: true,
      isBeforeSubmissionWindow: false,
      isInsideSubmissionWindow: false,
      isPastDeadline: false,
      tehranTimeString: tehran.timeString,
      tehranHours: tehran.hours
    };
  }

  const tehran = getTehranTimeInfo();
  const isBefore = tehran.hours < 17;
  const isInside = tehran.hours >= 17 && tehran.hours < 19;
  const isPast = tehran.hours >= 19;

  return {
    isFriday: false,
    isBeforeSubmissionWindow: isBefore,
    isInsideSubmissionWindow: isInside,
    isPastDeadline: isPast,
    tehranTimeString: tehran.timeString,
    tehranHours: tehran.hours
  };
}

/**
 * Returns the maximum days of a given Shamsi month
 */
export function getShamsiMonthLastDay(year: number, month: number): number {
  if (month >= 1 && month <= 6) return 31;
  if (month >= 7 && month <= 11) return 30;
  // Esfand: check leap year (approximate Jalali leap cycle)
  const isLeap = (((((year - 474) % 2820) + 474) + 38) * 682) % 2816 < 682;
  return isLeap ? 30 : 29;
}

/**
 * Checks if a given Shamsi date is the last working day or end of that Shamsi month (e.g. 29, 30, 31)
 */
export function isEndOfShamsiMonth(dateInput?: string | Date): boolean {
  let p: { year: number; month: number; day: number } | null = null;
  if (!dateInput) {
    const cur = getCurrentShamsiDate();
    p = { year: cur.year, month: cur.month, day: cur.day };
  } else if (typeof dateInput === 'string') {
    p = parseShamsiDate(dateInput);
  } else {
    const [jy, jm, jd] = gregorianToJalali(dateInput.getFullYear(), dateInput.getMonth() + 1, dateInput.getDate());
    p = { year: jy, month: jm, day: jd };
  }

  if (!p) return false;
  const maxDay = getShamsiMonthLastDay(p.year, p.month);
  // Last 2-3 days of the month or last Thursday of the month
  return p.day >= maxDay - 1;
}

/**
 * Calculates exact elapsed calendar days between two Shamsi dates (date2 - date1)
 */
export function daysBetweenShamsiDates(d1?: string | null, d2?: string | null): number | null {
  if (!d1 || !d2) return null;
  const dt1 = shamsiToDate(d1);
  const dt2 = shamsiToDate(d2);
  if (!dt1 || !dt2) return null;
  const msDiff = dt2.getTime() - dt1.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
}

/**
 * Formats a Shamsi date string to full Persian readable date (e.g. ۱۹ شهریور ۱۴۰۵)
 */
export function formatShamsiDateLong(d?: string | null): string {
  if (!d) return '';
  const p = parseShamsiDate(d);
  if (!p) return d;
  const monthName = PERSIAN_MONTH_NAMES[p.month] || '';
  return `${toPersianDigits(p.day)} ${monthName} ${toPersianDigits(p.year)}`;
}


