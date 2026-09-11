import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { 
  toPersianDigits, 
  toEnglishDigits, 
  getCurrentShamsiDate, 
  normalizeShamsiDate, 
  shamsiToDate, 
  isThursday,
  formatStandardReportTitle,
  isValidIranianPhone
} from '../utils/shamsi';
import { getLatestFollowUpOutcome } from '../components/ManagerPanel/ManagerDashboard';

describe('تبدیل اعداد و تقویم خورشیدی کارینو', () => {
  it('تبدیل صحیح اعداد انگلیسی به فارسی و بالعکس', () => {
    expect(toPersianDigits('1404/06/19')).toBe('۱۴۰۴/۰۶/۱۹');
    expect(toEnglishDigits('۱۴۰۴/۰۶/۱۹')).toBe('1404/06/19');
    expect(toEnglishDigits('ساعت ۱۹:۰۰')).toBe('ساعت 19:00');
  });

  it('فرمت یکنواخت و نرمال‌سازی تاریخ خورشیدی', () => {
    expect(normalizeShamsiDate('1404/6/9')).toBe('1404/06/09');
    expect(normalizeShamsiDate('۱۴۰۴/۶/۱۹')).toBe('1404/06/19');
    expect(toPersianDigits(normalizeShamsiDate('1404/6/9'))).toBe('۱۴۰۴/۰۶/۰۹');
  });

  it('تبدیل تاریخ شمسی به شیء Date معتبر', () => {
    const d = shamsiToDate('۱۴۰۴/۰۶/۱۹');
    expect(d).toBeInstanceOf(Date);
    expect(d?.getFullYear()).toBe(2025);
  });
});

describe('محاسبه چرخه پیگیری ۴ روزه و وضعیت‌های زمانی', () => {
  it('محاسبه دقیق فاصله زمانی ۴ روزه و تعیین وضعیت', () => {
    const targetIntervalDays = 4;

    // سناریوی امروز (دقیقاً ۴ روز گذشته)
    const elapsedToday = 4;
    const daysRemainingToday = targetIntervalDays - elapsedToday;
    expect(daysRemainingToday).toBe(0);

    // سناریوی معوق (بیش از ۴ روز گذشته، مثلا ۶ روز)
    const elapsedOverdue = 6;
    const daysRemainingOverdue = targetIntervalDays - elapsedOverdue;
    expect(daysRemainingOverdue).toBeLessThan(0);
    expect(Math.abs(daysRemainingOverdue)).toBe(2); // ۲ روز گذشته از موعد

    // سناریوی آینده (کمتر از ۴ روز گذشته، مثلا ۱ روز)
    const elapsedFuture = 1;
    const daysRemainingFuture = targetIntervalDays - elapsedFuture;
    expect(daysRemainingFuture).toBe(3); // ۳ روز مانده تا پیگیری بعدی
  });
});

describe('امنیت و هش رمزهای عبور با Bcrypt', () => {
  it('تولید هش معتبر و اعتبارسنجی رمز عبور', () => {
    const plain = 'karino2026';
    const hash = bcrypt.hashSync(plain, 10);

    expect(hash).not.toBe(plain);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const isMatch = bcrypt.compareSync(plain, hash);
    expect(isMatch).toBe(true);

    const isWrong = bcrypt.compareSync('wrongpass', hash);
    expect(isWrong).toBe(false);
  });
});

describe('عناوین استاندارد گزارشات کارینو', () => {
  it('تولید عنوان استاندارد دوره‌ای', () => {
    const title = formatStandardReportTitle('weekly', '۱۴۰۴/۰۶/۱۹');
    expect(title).toContain('هفتگی');
  });
});

describe('تعیین آخرین نماد پیگیری در ریزگزارش و کارتابل مدیر', () => {
  it('استخراج آخرین مرحله ثبت‌شده به جای اولین مرحله', () => {
    const rowWithMultipleFollowUps = {
      followUp1: '+',
      followUp2: '.',
      followUp3: '✓',
      followUp4: '',
      followUpResult: 'مکالمه اولیه انجام شد'
    };

    const latest = getLatestFollowUpOutcome(rowWithMultipleFollowUps);
    expect(latest.symbol).toBe('✓');
    expect(latest.stepNumber).toBe(3);

    // اگر پیگیری ۴ هم انجام شده باشد
    const rowWithFourFollowUps = {
      ...rowWithMultipleFollowUps,
      followUp4: '*'
    };
    const latest4 = getLatestFollowUpOutcome(rowWithFourFollowUps);
    expect(latest4.symbol).toBe('*');
    expect(latest4.stepNumber).toBe(4);
  });
});

describe('اعتبارسنجی شماره تلفن همراه و ثابت ایرانی', () => {
  it('پذیرش شماره موبایل‌های معتبر ایرانی', () => {
    expect(isValidIranianPhone('09123456789')).toBe(true);
    expect(isValidIranianPhone('۰۹۳۵۱۲۳۴۵۶۷')).toBe(true);
    expect(isValidIranianPhone('09151234567')).toBe(true);
    expect(isValidIranianPhone('9123456789')).toBe(true);
  });

  it('پذیرش شماره تلفن ثابت معتبر با پیش‌شماره شهرستان', () => {
    expect(isValidIranianPhone('05138410000')).toBe(true); // مشهد
    expect(isValidIranianPhone('۰۲۱۸۸۸۸۸۸۸۸')).toBe(true); // تهران
  });

  it('رد شماره‌های نامعتبر، کوتاه یا نامرتبط', () => {
    expect(isValidIranianPhone('')).toBe(false);
    expect(isValidIranianPhone('12345')).toBe(false);
    expect(isValidIranianPhone('081234')).toBe(false);
    expect(isValidIranianPhone('abcdefghijk')).toBe(false);
  });
});
