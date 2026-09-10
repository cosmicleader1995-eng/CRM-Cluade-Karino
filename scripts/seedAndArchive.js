import fs from 'fs';
import http from 'http';

// Load existing db
const dbPath = './data/db.json';
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Define the comprehensive list of test rows
const concernsList = [
  'دعاوی و شکایات در اداره کار و هیئت‌های تشخیص/حل اختلاف',
  'جرایم بازرسی و مغایرت‌های حق بیمه تأمین اجتماعی',
  'عدم شفافیت در قراردادها و ابهام در تضامین پرسنلی',
  'فقدان آیین‌نامه انضباطی مصوب و رویه مشخص اخراج یا توبیخ',
  'ریزش مداوم نیروی انسانی کلیدی و بحران انگیزش',
  'چالش‌های توزیع مویرگی، وصول مطالبات و کسری انبار',
  'خطرات ناشی از حوادث کارگاهی و مسئولیت‌های کیفری کارفرما',
  'عدم توازن در حقوق، پاداش و ارزیابی عادلانه عملکرد',
  'ابهامات قانونی در اضافه‌کاری، نوبت‌کاری و شیفت‌های شبانه',
  'سفته و ضمانت‌نامه‌های بدون پشتوانه حقوقی مکفی',
  'بازنشستگی پیش از موعد در مشاغل سخت و زیان‌آور',
  'نبود ساختار چارت سازمانی و تداخل وظایف مدیریتی'
];

// Helper to make unique IDs
let rowCounter = 100;
function makeRowId() {
  rowCounter++;
  return `row-test-${Date.now()}-${rowCounter}`;
}

// 1. Expand Reports for Today (1405/06/19 - پنج‌شنبه)
const c101Today = db.reports.find(r => r.consultantCode === 'C-101' && r.dateShamsi === '1405/06/19') || {
  id: 'rep-c101-today',
  consultantId: 'user-c101',
  consultantName: 'علیرضا رضایی',
  consultantCode: 'C-101',
  dateShamsi: '1405/06/19',
  dayOfWeekShamsi: 'پنج‌شنبه',
  guild: 'تولیدی قطعات خودرو و ریخته‌گری',
  status: 'approved',
  managerFeedback: 'عملکرد درخشان در پیگیری‌های چندمرحله‌ای و ست کردن جلسات حضوری.',
  managerRating: 5,
  personalOpinion: 'کارفرمایان این صنف پس از دور دوم پیگیری، تمایل بالایی به بررسی قراردادهای پرسنلی نشان دادند.',
  submittedAt: '۱۶:۱۵',
  rows: []
};

// Ensure C101 has 8+ rich rows
c101Today.rows = [
  {
    id: 'row-c101-today-1',
    rowNumber: 1,
    clientName: 'صنایع ریخته‌گری توس فولاد',
    activityField: 'تولید قطعات چدنی خودرو',
    personnelCount: 48,
    phone: '05138401122',
    address: 'شهرک صنعتی توس، فاز ۱، تلاش جنوبی',
    employerConcern: 'دعاوی و شکایات در اداره کار و هیئت‌های تشخیص/حل اختلاف',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/10',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/14',
    followUp3: '✓',
    followUp3DateShamsi: '1405/06/19',
    followUp4: '',
    followUpResult: '✓ (جلسه حضوری ست شد)',
    meetingTopic: 'آنالیز ریسک حقوقی قراردادها و پیشگیری از شکایات اداره کار',
    notes: 'جلسه با مهندس صادقی (مدیرعامل) دوشنبه ساعت ۱۰:۰۰ در محل کارخانه تنظیم شد.'
  },
  {
    id: 'row-c101-today-2',
    rowNumber: 2,
    clientName: 'کارگاه تراشکاری نوین صنعت',
    activityField: 'تراشکاری قطعات برنجی',
    personnelCount: 14,
    phone: '05132456677',
    address: 'بزرگراه آسیایی، آزادی ۱۲۵',
    employerConcern: 'جرایم بازرسی و مغایرت‌های حق بیمه تأمین اجتماعی',
    followUp1: '.',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '. (در انتظار تماس مجدد)',
    meetingTopic: '',
    notes: 'مدیر کارگاه در خط تولید بود؛ تماس مجدد شنبه صبح هماهنگ شد.'
  },
  {
    id: 'row-c101-today-3',
    rowNumber: 3,
    clientName: 'قالب‌سازی دقیق البرز',
    activityField: 'طراحی قالب‌های سنبه ماتریس',
    personnelCount: 9,
    phone: '05136518899',
    address: 'شهرک صنعتی کلات',
    employerConcern: 'عدم توازن در حقوق، پاداش و ارزیابی عادلانه عملکرد',
    followUp1: '-',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '- (عدم نیاز فعلی)',
    meetingTopic: '',
    notes: 'کارفرما عنوان کرد فعلاً برنامه تغییر ساختار اداری ندارند.'
  },
  {
    id: 'row-c101-today-4',
    rowNumber: 4,
    clientName: 'شرکت پترو فرایند پایا',
    activityField: 'تولید اتصالات فشار قوی نفت و گاز',
    personnelCount: 85,
    phone: '05135421190',
    address: 'شهرک صنعتی توس، فاز ۲، بلوار اندیشه',
    employerConcern: 'جرایم بازرسی و مغایرت‌های حق بیمه تأمین اجتماعی',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/12',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/16',
    followUp3: '✓',
    followUp3DateShamsi: '1405/06/19',
    followUp4: '',
    followUpResult: '✓ (جلسه حضوری هماهنگ شد)',
    meetingTopic: 'رسیدگی به اعلام بدهی حسابرسی بیمه تامین اجتماعی و دفاعیات تخصصی',
    notes: 'جلسه با مدیر مالی و قائم مقام مدیرعامل یکشنبه ساعت ۱۱ در کارخانه قطعی شد.'
  },
  {
    id: 'row-c101-today-5',
    rowNumber: 5,
    clientName: 'صنایع ماشین‌سازی پارس تکنیک',
    activityField: 'ساخت ماشین‌آلات بسته‌بندی پیلوپک',
    personnelCount: 32,
    phone: '05138472255',
    address: 'جاده سنتو، سه راه فردوسی',
    employerConcern: 'فقدان آیین‌نامه انضباطی مصوب و رویه مشخص اخراج یا توبیخ',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/15',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/19',
    followUp3: '',
    followUp4: '',
    followUpResult: '+ (مذاکره مثبت، در انتظار پروپوزال)',
    meetingTopic: 'تنظیم و اخذ تاییدیه آیین‌نامه انضباطی کارگاه از اداره تعاون و کار',
    notes: 'پروپوزال خدمات تدوین آیین‌نامه ارسال گردید؛ پیگیری ۳ برای دوشنبه تنظیم شد.'
  },
  {
    id: 'row-c101-today-6',
    rowNumber: 6,
    clientName: 'صنایع فورج و اکستروژن نوین',
    activityField: 'تولید مقاطع برنجی و آلومینیومی فورجینگ',
    personnelCount: 64,
    phone: '05136528811',
    address: 'شهرک صنعتی چناران، فاز ۱',
    employerConcern: 'خطرات ناشی از حوادث کارگاهی و مسئولیت‌های کیفری کارفرما',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '+ (ابراز علاقه اولیه)',
    meetingTopic: 'بررسی پوشش‌های بیمه مسئولیت مدنی کارفرما در قبال کارکنان',
    notes: 'تماس اولیه بسیار موثر بود؛ کاتالوگ خدمات ایمنی و حقوقی ارسال شد.'
  },
  {
    id: 'row-c101-today-7',
    rowNumber: 7,
    clientName: 'کارگاه قالب‌سازی دقیق توس',
    activityField: 'قالب‌های تزریق پلاستیک قطعات پزشکی',
    personnelCount: 12,
    phone: '05137249900',
    address: 'بلوار توس، توس ۷۵',
    employerConcern: 'سفته و ضمانت‌نامه‌های بدون پشتوانه حقوقی مکفی',
    followUp1: '*',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '* (عدم پاسخگویی)',
    meetingTopic: '',
    notes: 'تلفن همراه روی منشی تلفنی بود؛ پیامک اطلاع‌رسانی ارسال گردید.'
  },
  {
    id: 'row-c101-today-8',
    rowNumber: 8,
    clientName: 'مجموعه قطعه‌سازی متالوژی سپهر',
    activityField: 'تولید بلبرینگ و قطعات دنده‌ای',
    personnelCount: 52,
    phone: '05135414433',
    address: 'شهرک صنعتی توس، فاز ۳',
    employerConcern: 'بازنشستگی پیش از موعد در مشاغل سخت و زیان‌آور',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/11',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/15',
    followUp3: '+',
    followUp3DateShamsi: '1405/06/19',
    followUp4: '',
    followUpResult: '+ (در حال نهایی‌سازی هماهنگی جلسه)',
    meetingTopic: 'محاسبه ۴ درصد مشاغل سخت و مدیریت سوابق زیان‌آور پرسنل',
    notes: 'مدیر اداری تایید اولیه داد، منتظر تایید زمان جلسه از طرف مدیرعامل هستند.'
  }
];

// 2. Expand C-102 (مریم محمدی / سارا علیزاده)
const c102Today = db.reports.find(r => r.consultantCode === 'C-102' && r.dateShamsi === '1405/06/19') || {
  id: 'rep-c102-today',
  consultantId: 'user-c102',
  consultantName: 'مریم محمدی',
  consultantCode: 'C-102',
  dateShamsi: '1405/06/19',
  dayOfWeekShamsi: 'پنج‌شنبه',
  guild: 'صنایع غذایی، دارویی و کشاورزی',
  status: 'approved',
  managerFeedback: 'پیگیری شرکت‌های صنایع غذایی با دقت بالایی صورت گرفته است.',
  managerRating: 5,
  personalOpinion: 'صنایع غذایی به دلیل شیفت‌های شبانه بیشترین دغدغه نوبت‌کاری و اضافه کاری را دارند.',
  submittedAt: '۱۷:۰۰',
  rows: []
};

c102Today.rows = [
  {
    id: 'row-c102-today-1',
    rowNumber: 1,
    clientName: 'کارخانجات آرد خوشه طوس',
    activityField: 'تولید انواع آرد صنعتی و سبوس‌دار',
    personnelCount: 110,
    phone: '05136512244',
    address: 'کیلومتر ۱۸ جاده قوچان',
    employerConcern: 'ابهامات قانونی در اضافه‌کاری، نوبت‌کاری و شیفت‌های شبانه',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/12',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/16',
    followUp3: '✓',
    followUp3DateShamsi: '1405/06/19',
    followUp4: '',
    followUpResult: '✓ (جلسه حضوری ست شد)',
    meetingTopic: 'فرمولاسیون قانونی محاسبه نوبت‌کاری و رفع اختلاف کارگری',
    notes: 'جلسه با مدیرعامل و مدیر کارخانه روز سه‌شنبه ساعت ۱۰ صبح نهایی شد.'
  },
  {
    id: 'row-c102-today-2',
    rowNumber: 2,
    clientName: 'شرکت فرآورده‌های لبنی کوهستان توس',
    activityField: 'تولید دوغ و پنیر پاستوریزه',
    personnelCount: 78,
    phone: '05138469911',
    address: 'شهرک صنعتی بینالود',
    employerConcern: 'ریزش مداوم نیروی انسانی کلیدی و بحران انگیزش',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/15',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/19',
    followUp3: '',
    followUp4: '',
    followUpResult: '+ (موافقت با طرح سنجش انگیزش)',
    meetingTopic: 'طراحی نظام جامع پاداش و ارتقای شغلی جهت کاهش خروج پرسنل',
    notes: 'اطلاعات اولیه پرسنلی دریافت شد؛ جلسه پیگیری ۳ برای دوشنبه تنظیم گردید.'
  },
  {
    id: 'row-c102-today-3',
    rowNumber: 3,
    clientName: 'کشت و صنعت فردوس خاور',
    activityField: 'سردخانه و سورتینگ میوه صادراتی',
    personnelCount: 42,
    phone: '05135417722',
    address: 'شهرک صنعتی توس، فاز ۱',
    employerConcern: 'قراردادهای کار معین و فصلی کارگران',
    followUp1: '-',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '- (عدم تمایل به بازنگری فعلی)',
    meetingTopic: '',
    notes: 'کارفرما اعلام کرد مشاور حقوقی مقیم دارند.'
  },
  {
    id: 'row-c102-today-4',
    rowNumber: 4,
    clientName: 'صنایع بسته‌بندی زعفران و خشکبار نگین',
    activityField: 'بسته‌بندی صادراتی زعفران و زرشک',
    personnelCount: 35,
    phone: '05138423300',
    address: 'بلوار سجاد، بزرگمهر شمالی',
    employerConcern: 'سفته و ضمانت‌نامه‌های بدون پشتوانه حقوقی مکفی',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '+ (درخواست پیش‌نویس فرم تعهد)',
    meetingTopic: 'نحوه دریافت قانونی سفته حسن انجام کار و اقرارنامه مالی',
    notes: 'کارفرما بسیار راغب بود؛ نمونه شرایط ضمانت پرسنلی ارسال گردید.'
  },
  {
    id: 'row-c102-today-5',
    rowNumber: 5,
    clientName: 'مجتمع داروسازی گیاهی کیمیا دارو',
    activityField: 'عصاره‌گیری و اسانس‌های دارویی',
    personnelCount: 60,
    phone: '05136516688',
    address: 'شهرک صنعتی چناران',
    employerConcern: 'عدم شفافیت در قراردادها و ابهام در تضامین پرسنلی',
    followUp1: '.',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '. (درخواست تماس ساعت ۱۸)',
    meetingTopic: '',
    notes: 'مدیر اداری در جلسه ممیزی GMP بود؛ تماس مجدد عصر گرفته خواهد شد.'
  },
  {
    id: 'row-c102-today-6',
    rowNumber: 6,
    clientName: 'صنایع غذایی و کنسرو تبرک شرق',
    activityField: 'تولید رب گوجه و انواع کنسرو گوشتی',
    personnelCount: 95,
    phone: '05135423311',
    address: 'شهرک صنعتی توس، تلاش شمالی ۶',
    employerConcern: 'دعاوی و شکایات در اداره کار و هیئت‌های تشخیص/حل اختلاف',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/14',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/18',
    followUp3: '✓',
    followUp3DateShamsi: '1405/06/19',
    followUp4: '',
    followUpResult: '✓ (جلسه حضوری هماهنگ گردید)',
    meetingTopic: 'بررسی پرونده حل اختلاف یکی از سرپرستان سابق تولید',
    notes: 'جلسه چهارشنبه ساعت ۹ صبح با حضور وکیل کارخانه تنظیم شد.'
  }
];

// 3. Expand C-103 (سعید حسینی / علی اکبری)
const c103Today = db.reports.find(r => r.consultantCode === 'C-103' && r.dateShamsi === '1405/06/19') || {
  id: 'rep-c103-today',
  consultantId: 'user-c103',
  consultantName: 'سعید حسینی',
  consultantCode: 'C-103',
  dateShamsi: '1405/06/19',
  dayOfWeekShamsi: 'پنج‌شنبه',
  guild: 'بازرگانی، پخش سراسری و لجستیک',
  status: 'approved',
  managerFeedback: 'تمرکز روی قراردادهای ناوگان حمل‌ونقل و ویزیتورها بسیار مطلوب است.',
  managerRating: 5,
  personalOpinion: 'شرکت‌های پخش به دلیل مبالغ بالای چک و سفته، آمادگی بالایی برای عقد قرارداد مشاوره دارند.',
  submittedAt: '۱۷:۳۰',
  rows: []
};

c103Today.rows = [
  {
    id: 'row-c103-today-1',
    rowNumber: 1,
    clientName: 'شرکت پخش سراسری مواد غذایی ماهان',
    activityField: 'پخش مویرگی لبنیات و نوشیدنی',
    personnelCount: 88,
    phone: '02188994411',
    address: 'تهران، کیلومتر ۱۱ جاده مخصوص کرج',
    employerConcern: 'چالش‌های توزیع مویرگی، وصول مطالبات و کسری انبار',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/11',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/15',
    followUp3: '✓',
    followUp3DateShamsi: '1405/06/19',
    followUp4: '',
    followUpResult: '✓ (جلسه دفاعیه ساختار فروش ست شد)',
    meetingTopic: 'سیستم جامع قرارداد ویزیتورها و نحوه جبران کسری انبار بر اساس قانون کار',
    notes: 'جلسه با مدیرعامل یکشنبه ساعت ۱۳ در دفتر مرکزی تهران ست شد.'
  },
  {
    id: 'row-c103-today-2',
    rowNumber: 2,
    clientName: 'بازرگانی قطعات یدکی آرین پارت',
    activityField: 'توزیع عمده قطعات خودروهای سواری',
    personnelCount: 36,
    phone: '05137258800',
    address: 'مشهد، بلوار قرنی، مجتمع خودرویی',
    employerConcern: 'سفته و ضمانت‌نامه‌های بدون پشتوانه حقوقی مکفی',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/15',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/19',
    followUp3: '',
    followUp4: '',
    followUpResult: '+ (استقبال مناسب از پکیج سفته)',
    meetingTopic: 'شیوه استانداردسازی سفته انبارداران و متصدیان فروش',
    notes: 'منتظر بررسی متن نمونه تعهدنامه توسط هیئت مدیره هستند.'
  },
  {
    id: 'row-c103-today-3',
    rowNumber: 3,
    clientName: 'لجستیک و ترابری سریع گامان',
    activityField: 'حمل کالای تجاری و انبارداری عمومی',
    personnelCount: 52,
    phone: '05138451122',
    address: 'پایانه بار مشهد، غرفه ۶۸',
    employerConcern: 'خطرات ناشی از حوادث کارگاهی و مسئولیت‌های کیفری کارفرما',
    followUp1: '.',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '. (مدیر در ماموریت بین شهری)',
    meetingTopic: '',
    notes: 'منشی اعلام کردند دوشنبه بازمی‌گردند؛ تاریخ پیگیری ثبت شد.'
  },
  {
    id: 'row-c103-today-4',
    rowNumber: 4,
    clientName: 'شرکت پخش دارویی رایا سلامت',
    activityField: 'توزیع اقلام مصرفی بیمارستانی',
    personnelCount: 65,
    phone: '02166554433',
    address: 'تهران، خیابان توحید، بن‌بست کاج',
    employerConcern: 'دعاوی و شکایات در اداره کار و هیئت‌های تشخیص/حل اختلاف',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/12',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/16',
    followUp3: '✓',
    followUp3DateShamsi: '1405/06/19',
    followUp4: '',
    followUpResult: '✓ (جلسه آنلاین تصویری ست شد)',
    meetingTopic: 'ارائه لایحه دفاعیه هیئت تشخیص برای ۲ نفر پرسنل پخش',
    notes: 'جلسه آنلاین گوگل میت روز سه‌شنبه ساعت ۱۱ با حضور تیم حقوقی کارفرما.'
  },
  {
    id: 'row-c103-today-5',
    rowNumber: 5,
    clientName: 'فروشگاه‌های زنجیره‌ای افق نوین',
    activityField: 'خرده‌فروشی کالاهای اساسی و تندمصرف',
    personnelCount: 140,
    phone: '05138012233',
    address: 'مشهد، بلوار معلم، بین معلم ۴۰ و ۴۲',
    employerConcern: 'عدم توازن در حقوق، پاداش و ارزیابی عادلانه عملکرد',
    followUp1: '-',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '- (برنامه تغییرات معلق شد)',
    meetingTopic: '',
    notes: 'مدیر منابع انسانی اعلام کردند تغییر چارت سازمانی فعلاً متوقف شده است.'
  }
];

// 4. Expand C-104 (ندا کریمی / مریم حسینی)
const c104Today = db.reports.find(r => r.consultantCode === 'C-104' && r.dateShamsi === '1405/06/19') || {
  id: 'rep-c104-today',
  consultantId: 'user-c104',
  consultantName: 'ندا کریمی',
  consultantCode: 'C-104',
  dateShamsi: '1405/06/19',
  dayOfWeekShamsi: 'پنج‌شنبه',
  guild: 'ساختمانی، انبوه‌سازی و مهندسی پروژه',
  status: 'approved',
  managerFeedback: 'پرونده‌های احضاریه پیمانکاری در اولویت پیگیری قرار گیرد.',
  managerRating: 4,
  personalOpinion: 'کارفرمایان ساختمانی به دلیل بازرسی‌های تامین اجتماعی در پایان کار، نیازمند حسابرسی فوری هستند.',
  submittedAt: '۱۶:۵۰',
  rows: []
};

c104Today.rows = [
  {
    id: 'row-c104-today-1',
    rowNumber: 1,
    clientName: 'شرکت مهندسی ابنیه سازه پارس',
    activityField: 'پیمانکاری ساخت برج‌های اداری و تجاری',
    personnelCount: 135,
    phone: '05138447788',
    address: 'مشهد، بلوار فلسطین، تقاطع خیام',
    employerConcern: 'دعاوی و شکایات در اداره کار و هیئت‌های تشخیص/حل اختلاف',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/10',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/14',
    followUp3: '✓',
    followUp3DateShamsi: '1405/06/19',
    followUp4: '',
    followUpResult: '✓ (جلسه حضوری قطعی شد)',
    meetingTopic: 'تنظیم قراردادهای دست‌دوم پیمانکاری و سلب مسئولیت تضامنی ماده ۳۸',
    notes: 'جلسه با مهندس ابراهیمی (مدیرعامل) شنبه ساعت ۹ صبح در دفتر پروژه.'
  },
  {
    id: 'row-c104-today-2',
    rowNumber: 2,
    clientName: 'تأسیسات مکانیکی آریا دژ',
    activityField: 'اجرای سیستم‌های تهویه مطبوع و موتورخانه مرکزی',
    personnelCount: 28,
    phone: '05137651199',
    address: 'بلوار دستغیب، نرسیده به بیستون',
    employerConcern: 'خطرات ناشی از حوادث کارگاهی و مسئولیت‌های کیفری کارفرما',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/15',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/19',
    followUp3: '',
    followUp4: '',
    followUpResult: '+ (مذاکره مثبت، در انتظار بررسی بیمه‌نامه)',
    meetingTopic: 'تنظیم صورتجلسات تحویل وسایل حفاظت فردی (PPE)',
    notes: 'پکیج فرم‌های ایمنی کارگاهی برای ایشان ایمیل شد.'
  },
  {
    id: 'row-c104-today-3',
    rowNumber: 3,
    clientName: 'شرکت بتن آماده و قطعات پیش‌ساخته هیراد',
    activityField: 'تولید بتن آماده استاندارد و تیرچه صنعتی',
    personnelCount: 45,
    phone: '05135418800',
    address: 'جاده میامی، شهرک مصالح ساختمانی',
    employerConcern: 'جرایم بازرسی و مغایرت‌های حق بیمه تأمین اجتماعی',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/12',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/16',
    followUp3: '✓',
    followUp3DateShamsi: '1405/06/19',
    followUp4: '',
    followUpResult: '✓ (جلسه حضوری ست شد)',
    meetingTopic: 'اعتراض به ضرایب بیمه پیمانکاری و پیگیری در هیئت‌های بدوی تامین اجتماعی',
    notes: 'جلسه چهارشنبه ساعت ۱۰:۳۰ با مدیرعامل تنظیم گردید.'
  },
  {
    id: 'row-c104-today-4',
    rowNumber: 4,
    clientName: 'دفتر معماری و طراحی داخلی نقش نگار',
    activityField: 'طراحی نما و دکوراسیون فضاهای تجاری',
    personnelCount: 11,
    phone: '05138842211',
    address: 'بلوار وکیل‌آباد، نبش باهنر ۷',
    employerConcern: 'عدم شفافیت در قراردادها و ابهام در تضامین پرسنلی',
    followUp1: '.',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '. (عدم حضور در دفتر)',
    meetingTopic: '',
    notes: 'تماس شنبه ساعت ۱۱ پیگیری خواهد شد.'
  }
];

// 5. Consultant 110 (علی زارع)
const c110Today = db.reports.find(r => r.consultantCode === '110' && r.dateShamsi === '1405/06/19') || {
  id: 'rep-c110-today',
  consultantId: 'user-1788870728032',
  consultantName: 'علی زارع',
  consultantCode: '110',
  dateShamsi: '1405/06/19',
  dayOfWeekShamsi: 'پنج‌شنبه',
  guild: 'نساجی، چرم و پوشاک صنعتی',
  status: 'approved',
  managerFeedback: 'پیگیری صنایع نساجی با سرعت مناسبی در حال انجام است.',
  managerRating: 5,
  personalOpinion: 'کارفرمایان این صنف بیشترین پرونده مشاغل سخت و زیان‌آور را دارند.',
  submittedAt: '۱۷:۴۵',
  rows: []
};

c110Today.rows = [
  {
    id: 'row-c110-today-1',
    rowNumber: 1,
    clientName: 'صنایع نساجی و رنگرزی حریر توس',
    activityField: 'بافت و رنگرزی پارچه‌های صنعتی و لباسی',
    personnelCount: 75,
    phone: '05135419988',
    address: 'شهرک صنعتی چرمشهر، خیابان نسترن',
    employerConcern: 'بازنشستگی پیش از موعد در مشاغل سخت و زیان‌آور',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/11',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/15',
    followUp3: '✓',
    followUp3DateShamsi: '1405/06/19',
    followUp4: '',
    followUpResult: '✓ (جلسه حضوری هماهنگ شد)',
    meetingTopic: 'مهندسی کاهش آلاینده‌های سالن بافندگی جهت لغو عناوین زیان‌آور تامین اجتماعی',
    notes: 'جلسه دوشنبه ساعت ۱۰:۳۰ با مدیر کارخانه در چرمشهر هماهنگ شد.'
  },
  {
    id: 'row-c110-today-2',
    rowNumber: 2,
    clientName: 'تولیدی پوشاک صنعتی و بیمارستانی ایمن‌ساز',
    activityField: 'دوخت لباس کار ضد برش و روپوش پزشکی',
    personnelCount: 38,
    phone: '05137286655',
    address: 'مشهد، میدان ابوطالب، اول هدایت',
    employerConcern: 'فقدان آیین‌نامه انضباطی مصوب و رویه مشخص اخراج یا توبیخ',
    followUp1: '+',
    followUp1DateShamsi: '1405/06/15',
    followUp2: '+',
    followUp2DateShamsi: '1405/06/19',
    followUp3: '',
    followUp4: '',
    followUpResult: '+ (ارسال پیش‌نویس آیین‌نامه)',
    meetingTopic: 'مراحل ثبت و اخذ تاییدیه آیین‌نامه انضباطی از اداره کار مشهد',
    notes: 'کارفرما تایید کردند پس از مطالعه با ما تماس می‌گیرند.'
  },
  {
    id: 'row-c110-today-3',
    rowNumber: 3,
    clientName: 'چرم مصنوعی و کفی کفش صبا',
    activityField: 'تولید لایه‌های پلی‌یورتان و چرم مصنوعی',
    personnelCount: 24,
    phone: '05136517744',
    address: 'شهرک صنعتی توس، فاز ۱',
    employerConcern: 'ابهامات قانونی در اضافه‌کاری، نوبت‌کاری و شیفت‌های شبانه',
    followUp1: '.',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '. (وقت جلسه فردا تعیین شد)',
    meetingTopic: '',
    notes: 'مدیر اداری قول تماس فردا دادند.'
  },
  {
    id: 'row-c110-today-4',
    rowNumber: 4,
    clientName: 'کارگاه تولید ملزومات ایمنی رادین',
    activityField: 'تولید دستکش صنعتی و گوشی محافظ',
    personnelCount: 16,
    phone: '05138459900',
    address: 'بلوار خرمشهر، کوشش ۱۰',
    employerConcern: 'عدم توازن در حقوق، پاداش و ارزیابی عادلانه عملکرد',
    followUp1: '-',
    followUp1DateShamsi: '1405/06/19',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '- (تمایل به همکاری نشان ندادند)',
    meetingTopic: '',
    notes: 'پاسخ منفی قطعی دادند.'
  }
];

// Merge updated reports into db.reports
function upsertReport(rep) {
  const idx = db.reports.findIndex(r => r.id === rep.id || (r.consultantCode === rep.consultantCode && r.dateShamsi === rep.dateShamsi));
  if (idx >= 0) {
    db.reports[idx] = rep;
  } else {
    db.reports.unshift(rep);
  }
}

upsertReport(c101Today);
upsertReport(c102Today);
upsertReport(c103Today);
upsertReport(c104Today);
upsertReport(c110Today);

// -------------------------------------------------------------
// Ensure Rich Periodic Reports Exist
// -------------------------------------------------------------
if (!Array.isArray(db.overallReports)) db.overallReports = [];

const periodicDaily19 = [
  {
    id: 'per-c101-daily-today',
    consultantId: 'user-c101',
    consultantName: 'علیرضا رضایی',
    consultantCode: 'C-101',
    periodType: 'daily',
    dateShamsi: '1405/06/19',
    periodLabel: 'گزارش روزانه پنج‌شنبه ۱۹ شهریور',
    summary: 'برقراری ۸ تماس هدفمند با کارخانجات قطعه‌سازی و ریخته‌گری شهرک توس. تنظیم ۲ جلسه حضوری با صنایع ریخته‌گری توس فولاد و پترو فرایند پایا.',
    keyAchievements: 'هماهنگی ۲ جلسه حضوری تایید شده با مدیران عامل و ارسال پروپوزال رسمی به ۳ شرکت.',
    challengesOrBarriers: 'پرونده‌های ضرایب پیمانکاری تامین اجتماعی به دلیل تغییر رویه شعب مشهد نیازمند ترازنامه مالی دقیق است.',
    plansOrPriorities: 'پیگیری جلسه روز دوشنبه کارخانه توس فولاد و هماهنگی با تیم حسابرسی بیمه کارینو.',
    selfRating: 5,
    managerStatus: 'approved',
    managerRating: 5,
    managerFeedback: 'عملکرد درخشان و انضباط کامل در گزارش‌دهی؛ جلسات ست شده پیگیری شود.',
    submittedAt: '۱۶:۴۵'
  },
  {
    id: 'per-c102-daily-today',
    consultantId: 'user-c102',
    consultantName: 'مریم محمدی',
    consultantCode: 'C-102',
    periodType: 'daily',
    dateShamsi: '1405/06/19',
    periodLabel: 'گزارش روزانه پنج‌شنبه ۱۹ شهریور',
    summary: 'انجام ۶ تماس متمرکز در صنف صنایع غذایی و بسته‌بندی. موفقیت در تعیین جلسه حضوری با کارخانجات آرد خوشه طوس و تبرک شرق.',
    keyAchievements: '۲ جلسه حضوری قطعی و دریافت موافقت اولیه شرکت لبنی کوهستان توس برای سیستم سنجش انگیزش.',
    challengesOrBarriers: 'برخی کارخانجات درخواست استعلام نمونه قراردادهای محرمانگی و عدم رقابت را داشتند.',
    plansOrPriorities: 'آماده‌سازی پکیج دفاعیات شیفت شبانه برای جلسه آرد خوشه طوس.',
    selfRating: 5,
    managerStatus: 'approved',
    managerRating: 5,
    managerFeedback: 'بسیار خوب. تمرکز روی صنایع بزرگ غذایی استان نتیجه‌بخش بوده است.',
    submittedAt: '۱۷:۰۵'
  },
  {
    id: 'per-c103-daily-today',
    consultantId: 'user-c103',
    consultantName: 'سعید حسینی',
    consultantCode: 'C-103',
    periodType: 'daily',
    dateShamsi: '1405/06/19',
    periodLabel: 'گزارش روزانه پنج‌شنبه ۱۹ شهریور',
    summary: 'پیگیری ۵ مجموعه توزیع و پخش سراسری در تهران و مشهد. تنظیم یک جلسه حضوری با پخش ماهان و یک جلسه آنلاین با رایا سلامت.',
    keyAchievements: 'ورود به زنجیره شرکت‌های پخش تندمصرف و استقبال از ساختار حقوقی سفته ویزیتورها.',
    challengesOrBarriers: 'مسافت دفاتر مرکزی شرکت‌های تهران نیاز به جلسات آنلاین تصویری با کیفیت بالا دارد.',
    plansOrPriorities: 'تنظیم سناریوی دفاعیه آنلاین جلسه سه‌شنبه پخش رایا سلامت.',
    selfRating: 5,
    managerStatus: 'approved',
    managerRating: 5,
    managerFeedback: 'تمرکز روی پکیج سفته ویزیتورها فرصت کم‌نظیری است؛ پیگیری جدی شود.',
    submittedAt: '۱۷:۴۰'
  },
  {
    id: 'per-c104-daily-today',
    consultantId: 'user-c104',
    consultantName: 'ندا کریمی',
    consultantCode: 'C-104',
    periodType: 'daily',
    dateShamsi: '1405/06/19',
    periodLabel: 'گزارش روزانه پنج‌شنبه ۱۹ شهریور',
    summary: 'ارتباط با ۴ شرکت انبوه‌سازی و مهندسی پروژه. قطعی شدن جلسه با ابنیه سازه پارس و بتن آماده هیراد.',
    keyAchievements: 'ست شدن ۲ جلسه حضوری در محل کارگاه پروژه‌های بزرگ ساختمانی.',
    challengesOrBarriers: 'کارفرمایان ساختمانی دغدغه حوادث کارگاهی و مسئولیت کیفری در مراجع قضایی دارند.',
    plansOrPriorities: 'هماهنگی با مشاور ایمنی و HSE کارینو برای شرکت در جلسه پروژه ابنیه سازه پارس.',
    selfRating: 4,
    managerStatus: 'approved',
    managerRating: 5,
    managerFeedback: 'حضور مشاور ایمنی در جلسه تصویب شد؛ هماهنگی کامل انجام گیرد.',
    submittedAt: '۱۷:۵۵'
  },
  {
    id: 'per-c110-daily-today',
    consultantId: 'user-1788870728032',
    consultantName: 'علی زارع',
    consultantCode: '110',
    periodType: 'daily',
    dateShamsi: '1405/06/19',
    periodLabel: 'گزارش روزانه پنج‌شنبه ۱۹ شهریور',
    summary: 'پیگیری ۴ کارخانه نساجی در شهرک چرمشهر و توس. هماهنگی جلسه در کارخانه نساجی حریر توس.',
    keyAchievements: 'تنظیم جلسه حضوری برای بررسی ۴ درصد مشاغل سخت و زیان‌آور.',
    challengesOrBarriers: 'پیچیدگی پرونده‌های سخت و زیان‌آور با بیش از ۱۰ سال سابقه در تامین اجتماعی.',
    plansOrPriorities: 'جمع‌آوری مستندات کمیته استانی سخت و زیان‌آور جهت جلسه دوشنبه.',
    selfRating: 4,
    managerStatus: 'approved',
    managerRating: 4,
    managerFeedback: 'خوب؛ مستندات آلاینده‌سنجی کارخانه قبل از جلسه مطالعه شود.',
    submittedAt: '۱۸:۱۰'
  }
];

// Weekly Reports for Today (1405/06/19 - پنج‌شنبه)
const periodicWeekly19 = [
  {
    id: 'per-c101-weekly-14050619',
    consultantId: 'user-c101',
    consultantName: 'علیرضا رضایی',
    consultantCode: 'C-101',
    periodType: 'weekly',
    dateShamsi: '1405/06/19',
    periodLabel: 'گزارش تحلیلی هفتگی پنج‌شنبه ۱۹ شهریور ۱۴۰۵',
    summary: 'طی این هفته مجموعاً ۳۴ تماس کارفرمایی با نرخ تماس موثر ۷۶ درصد برقرار شد. ۵ جلسه حضوری با مدیران صنایع فلزی و خودرویی هماهنگ گردید.',
    keyAchievements: 'عقد قرارداد مشاوره بازبینی احکام با صنایع فولاد توس و ست شدن جلسات حیاتی با ۲ واحد قطعه‌ساز مطرح استان.',
    challengesOrBarriers: 'نیاز مبرم کارفرمایان به فرم‌های استاندارد سفته و الحاقیه عدم افشای اسرار تجاری.',
    plansOrPriorities: 'تمرکز بر کارخانجات فاز ۲ و ۳ شهرک توس و پیگیری مرحله دوم ۶ تماس موثر هفتگی.',
    weeklyFocusGuilds: 'صنایع ریخته‌گری، قطعه‌سازی خودرو، ماشین‌سازی و قالب‌سازی سنبه‌ماتریس',
    selfRating: 5,
    managerStatus: 'rewarded',
    managerRating: 5,
    managerFeedback: 'رتبه برتر هفته؛ پاداش عملکرد و ثبت بالاترین نرخ تبدیل جلسات حضوری به ایشان تعلق گرفت.',
    submittedAt: '۱۸:۳۰'
  },
  {
    id: 'per-c102-weekly-14050619',
    consultantId: 'user-c102',
    consultantName: 'مریم محمدی',
    consultantCode: 'C-102',
    periodType: 'weekly',
    dateShamsi: '1405/06/19',
    periodLabel: 'گزارش تحلیلی هفتگی پنج‌شنبه ۱۹ شهریور ۱۴۰۵',
    summary: 'برقراری ۲۸ تماس در حوزه صنایع غذایی و فرآورده‌های دامی. ۴ جلسه حضوری قطعی و ۲ درخواست ممیزی ساختار دریافت شد.',
    keyAchievements: 'ورود موفق به ۳ کارخانه بزرگ صنایع آرد و لبنیات و دریافت مدارک مالی جهت دفاعیه نوبت‌کاری.',
    challengesOrBarriers: 'همپوشانی زمان استراحت شیفت‌ها با ساعات تماس که با تنظیم جدول ساعات تماس رفع شد.',
    plansOrPriorities: 'تدوین پروپوزال جامع آیین‌نامه انضباطی برای شرکت‌های بالای ۵۰ نفر پرسنل غذایی.',
    weeklyFocusGuilds: 'کارخانجات آرد، لبنیات، کنسرو، بسته‌بندی صادراتی و سردخانه‌های نگهداری',
    selfRating: 5,
    managerStatus: 'approved',
    managerRating: 5,
    managerFeedback: 'پیشرفت عالی و انضباط کامل در پیگیری‌ها.',
    submittedAt: '۱۸:۴۵'
  },
  {
    id: 'per-c103-weekly-14050619',
    consultantId: 'user-c103',
    consultantName: 'سعید حسینی',
    consultantCode: 'C-103',
    periodType: 'weekly',
    dateShamsi: '1405/06/19',
    periodLabel: 'گزارش تحلیلی هفتگی پنج‌شنبه ۱۹ شهریور ۱۴۰۵',
    summary: 'برقراری ۲۵ تماس با ناوگان پخش مویرگی در سطح تهران و مشهد. ایجاد ۲ جلسه حضوری و ۲ جلسه ویدیوکنفرانس تخصصی.',
    keyAchievements: 'طراحی سناریوی مذاکره ویژه سفته ویزیتورها و جذب اعتماد مدیران پخش مواد غذایی.',
    challengesOrBarriers: 'تعدد شرکای تجاری در برخی شرکت‌های پخش که تصمیم‌گیری را زمان‌بر می‌کند.',
    plansOrPriorities: 'پیگیری قرارداد با پخش سراسری ماهان و انعقاد توافقنامه سه جانبه.',
    weeklyFocusGuilds: 'پخش مویرگی دارویی، غذایی، آرایشی-بهداشتی و زنجیره‌های لجستیک کالا',
    selfRating: 5,
    managerStatus: 'approved',
    managerRating: 5,
    managerFeedback: 'رویکرد خلاقانه در مذاکره با شرکت‌های پخش تهران قابل تقدیر است.',
    submittedAt: '۱۹:۰۰'
  },
  {
    id: 'per-c104-weekly-14050619',
    consultantId: 'user-c104',
    consultantName: 'ندا کریمی',
    consultantCode: 'C-104',
    periodType: 'weekly',
    dateShamsi: '1405/06/19',
    periodLabel: 'گزارش تحلیلی هفتگی پنج‌شنبه ۱۹ شهریور ۱۴۰۵',
    summary: 'تماس با ۲۲ شرکت پیمانکاری ساختمانی. ۳ جلسه در کارگاه پروژه‌ها و بررسی ۲ احضاریه هیئت حل اختلاف اداره کار.',
    keyAchievements: 'موفقیت در جلب رضایت کارفرمای پروژه ابنیه سازه پارس جهت بررسی تمامی قراردادهای اکیپ‌های اجرایی.',
    challengesOrBarriers: 'عدم ثبت حضور و غیاب پرسنل در کارگاه‌های عمرانی که ریسک دعاوی را بالا برده است.',
    plansOrPriorities: 'ارائه سیستم ثبت حضور و غیاب ابری و فرم‌های تحویل کار به پیمانکاران جزء.',
    weeklyFocusGuilds: 'انبوه‌سازی، پیمانکاری ابنیه و تأسیسات، قطعات بتنی پیش‌ساخته و راه و ترابری',
    selfRating: 4,
    managerStatus: 'approved',
    managerRating: 4,
    managerFeedback: 'عملکرد مناسب؛ روی بیمه مسئولیت مدنی کارگاهی تمرکز بیشتری شود.',
    submittedAt: '۱۹:۱۵'
  }
];

// Monthly Reports
const periodicMonthly = [
  {
    id: 'per-c101-monthly-mordad',
    consultantId: 'user-c101',
    consultantName: 'علیرضا رضایی',
    consultantCode: 'C-101',
    periodType: 'monthly',
    dateShamsi: '1405/05/31',
    periodLabel: 'گزارش راهبردی عملکرد مرداد ماه ۱۴۰۵',
    summary: 'مجموع ۱۲۲ تماس هدفمند در طول ماه؛ تحقق ۱۸ جلسه حضوری و انعقاد ۷ قرارداد رسمی مشاوره مدیریت و حقوق کار.',
    keyAchievements: 'ثبت بالاترین حجم وصول درآمد مشاوره‌ای در تاریخ شعبه مشهد و بازنگری چارت سازمانی ۲ کارخانه بزرگ.',
    challengesOrBarriers: 'طولانی بودن فرآیند استعلام سوابق تامین اجتماعی کارگران در شعب ۳ و ۴ مشهد.',
    plansOrPriorities: 'راه‌اندازی کارگروه تخصصی ممیزی تامین اجتماعی و دفاع در هیئت‌های بدوی برای شهریور ماه.',
    monthlyStrategicNotes: 'پیشنهاد می‌شود یک بسته جامع اختصاصی شامل ۳ خدمت (آیین‌نامه انضباطی + آنالیز قرارداد + بررسی بیمه) با تخفیف ترکیبی برای صنایع مستقر در شهرک توس تعریف شود.',
    selfRating: 5,
    managerStatus: 'rewarded',
    managerRating: 5,
    managerFeedback: 'عملکرد استثنایی و الگوی سازمانی؛ پاداش مدیریتی ویژه مرداد ماه اعطا گردید.',
    submittedAt: '۱۹:۳۰'
  },
  {
    id: 'per-c102-monthly-mordad',
    consultantId: 'user-c102',
    consultantName: 'مریم محمدی',
    consultantCode: 'C-102',
    periodType: 'monthly',
    dateShamsi: '1405/05/31',
    periodLabel: 'گزارش راهبردی عملکرد مرداد ماه ۱۴۰۵',
    summary: 'مجموع ۱۰۸ تماس با صنایع تبدیلی و کشاورزی استان خراسان؛ ۱۲ جلسه نهایی شده و ۴ قرارداد منعقد شده.',
    keyAchievements: 'برگزاری سمینار آموزشی درون‌سازمانی نحوه تعامل با بازرسان تامین اجتماعی برای ۳ واحد صنعتی.',
    challengesOrBarriers: 'نوسانات فصلی تولید در صنایع غذایی که باعث نوسان تعداد پرسنل می‌شود.',
    plansOrPriorities: 'گسترش بازاریابی در شهرک‌های صنعتی چناران و نیشابور.',
    monthlyStrategicNotes: 'ایجاد میز تخصصی صنایع غذایی در پرتال کارینو می‌تواند اعتبار برند را به شکل تصاعدی افزایش دهد.',
    selfRating: 5,
    managerStatus: 'approved',
    managerRating: 5,
    managerFeedback: 'تحلیل دقیق بازار و وفادارسازی مطلوب کارفرمایان.',
    submittedAt: '۱۹:۴۵'
  },
  {
    id: 'per-c103-monthly-mordad',
    consultantId: 'user-c103',
    consultantName: 'سعید حسینی',
    consultantCode: 'C-103',
    periodType: 'monthly',
    dateShamsi: '1405/05/31',
    periodLabel: 'گزارش راهبردی عملکرد مرداد ماه ۱۴۰۵',
    summary: '۹۸ تماس در حوزه لجستیک و توزیع کالا در تهران و مشهد؛ ۱۰ جلسه حضوری و ۳ قرارداد بلندمدت نظارت حقوقی.',
    keyAchievements: 'نفوذ موفق در شرکت‌های توزیع و پخش مویرگی شوینده و بهداشتی.',
    challengesOrBarriers: 'نیاز به هماهنگی بیشتر با مشاوران مالیاتی در پرونده‌های توزیع.',
    plansOrPriorities: 'توسعه خدمات ارزیابی ویزیتورها و استانداردسازی ضمانت‌نامه‌ها.',
    monthlyStrategicNotes: 'پیشنهاد می‌شود سمینار یک‌روزه مدیریت ریسک قراردادهای توزیع و فروش برای مدیران عامل شرکت‌های پخش برگزار شود.',
    selfRating: 4,
    managerStatus: 'approved',
    managerRating: 5,
    managerFeedback: 'بسیار ارزشمند و آینده‌نگرانه.',
    submittedAt: '۲۰:۰۰'
  },
  {
    id: 'per-c101-monthly-shahrivar',
    consultantId: 'user-c101',
    consultantName: 'علیرضا رضایی',
    consultantCode: 'C-101',
    periodType: 'monthly',
    dateShamsi: '1405/06/19',
    periodLabel: 'پیش‌بایگانی استراتژیک ماهانه شهریور ۱۴۰۵',
    summary: 'پیشرفت ۷۸ درصدی تارگت‌های ماهانه تا نیمه دوم شهریور؛ انجام ۸۶ تماس و ۹ جلسه هماهنگ شده.',
    keyAchievements: 'انعقاد تفاهم‌نامه اولیه با شهرک صنعتی توس برای ارائه خدمات مشاوره‌ای به واحدهای منتخب.',
    challengesOrBarriers: 'کمبود زمان کارفرمایان در روزهای پایانی تابستان جهت جلسات حضوری.',
    plansOrPriorities: 'تمرکز بر بستن قراردادهای معوق تا ۳۱ شهریور ماه.',
    monthlyStrategicNotes: 'راه‌اندازی سرویس پاسخگویی تلفنی اورژانسی برای احضاریه‌های ۲۴ ساعته اداره کار.',
    selfRating: 5,
    managerStatus: 'approved',
    managerRating: 5,
    managerFeedback: 'پیش‌بینی عملکرد عالی برای پایان شهریور.',
    submittedAt: '۲۰:۱۵'
  }
];

// Merge into overallReports
function upsertPeriodic(item) {
  const idx = db.overallReports.findIndex(p => p.id === item.id);
  if (idx >= 0) {
    db.overallReports[idx] = item;
  } else {
    db.overallReports.unshift(item);
  }
}

periodicDaily19.forEach(upsertPeriodic);
periodicWeekly19.forEach(upsertPeriodic);
periodicMonthly.forEach(upsertPeriodic);

// -------------------------------------------------------------
// MANUALLY GENERATE COMPREHENSIVE ARCHIVES
// -------------------------------------------------------------
if (!Array.isArray(db.archives)) db.archives = [];

function buildArchiveFileName(dateShamsi, dayOfWeek, type) {
  const safeDate = dateShamsi.replace(/\//g, '-');
  switch (type) {
    case 'periodic_daily':
      return `بایگانی_گزارشات_تحلیلی_روزانه_${dayOfWeek}_${safeDate}.xlsx`;
    case 'periodic_weekly':
      return `بایگانی_هفتگی_پنج‌شنبه_گزارشات_مشاورین_${safeDate}.xlsx`;
    case 'periodic_monthly':
      return `بایگانی_ماهانه_پایان_ماه_استراتژیک_${safeDate}.xlsx`;
    case 'calls_daily':
    default:
      return `بایگانی_تماسها_و_پیگیری_روزانه_${dayOfWeek}_${safeDate}.xlsx`;
  }
}

// 1. Calls Daily for Today (1405/06/19 - پنج‌شنبه)
const todayReports = db.reports.filter(r => r.dateShamsi === '1405/06/19');
let todayTotalRows = 0;
const concernMap = {};
todayReports.forEach(rep => {
  (rep.rows || []).forEach(row => {
    todayTotalRows++;
    if (row.employerConcern) {
      concernMap[row.employerConcern] = (concernMap[row.employerConcern] || 0) + 1;
    }
  });
});

const topConcernsToday = Object.entries(concernMap)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 5);

const archCallsToday = {
  id: 'arch-calls-14050619',
  fileName: buildArchiveFileName('1405/06/19', 'پنج‌شنبه', 'calls_daily'),
  dateShamsi: '1405/06/19',
  dayOfWeek: 'پنج‌شنبه',
  timestamp: new Date().toISOString(),
  archiveType: 'calls_daily',
  periodTitle: 'بایگانی روزانه تماس‌ها و پیگیری‌ها',
  totalConsultants: new Set(todayReports.map(r => r.consultantCode || r.consultantId)).size,
  totalClientsContacted: todayTotalRows,
  topConcerns: topConcernsToday,
  reports: JSON.parse(JSON.stringify(todayReports)),
  autoGenerated: false
};

// 2. Periodic Daily for Today (1405/06/19)
const todayPeriodic = db.overallReports.filter(p => p.dateShamsi === '1405/06/19' && p.periodType === 'daily');
const archPeriodicDailyToday = {
  id: 'arch-periodic_daily-14050619',
  fileName: buildArchiveFileName('1405/06/19', 'پنج‌شنبه', 'periodic_daily'),
  dateShamsi: '1405/06/19',
  dayOfWeek: 'پنج‌شنبه',
  timestamp: new Date().toISOString(),
  archiveType: 'periodic_daily',
  periodTitle: 'بایگانی روزانه گزارشات تحلیلی مشاورین',
  totalConsultants: new Set(todayPeriodic.map(p => p.consultantCode || p.consultantId)).size,
  totalClientsContacted: 0,
  topConcerns: [],
  reports: [],
  overallReports: JSON.parse(JSON.stringify(todayPeriodic)),
  autoGenerated: false
};

// 3. Periodic Weekly for Today (1405/06/19 - پنج‌شنبه)
const weeklyPeriodic = db.overallReports.filter(p => p.periodType === 'weekly' && p.dateShamsi === '1405/06/19');
const archPeriodicWeeklyToday = {
  id: 'arch-periodic_weekly-14050619',
  fileName: buildArchiveFileName('1405/06/19', 'پنج‌شنبه', 'periodic_weekly'),
  dateShamsi: '1405/06/19',
  dayOfWeek: 'پنج‌شنبه',
  timestamp: new Date().toISOString(),
  archiveType: 'periodic_weekly',
  periodTitle: 'بایگانی هفتگی پنج‌شنبه گزارشات مشاورین',
  totalConsultants: new Set(weeklyPeriodic.map(p => p.consultantCode || p.consultantId)).size,
  totalClientsContacted: 0,
  topConcerns: [],
  reports: [],
  overallReports: JSON.parse(JSON.stringify(weeklyPeriodic)),
  autoGenerated: false
};

// 4. Periodic Weekly for Last Week Thursday (1405/06/12)
const weeklyPeriodicLast = db.overallReports.filter(p => p.periodType === 'weekly' && p.dateShamsi === '1405/06/12');
const archPeriodicWeeklyLast = {
  id: 'arch-periodic_weekly-14050612',
  fileName: buildArchiveFileName('1405/06/12', 'پنج‌شنبه', 'periodic_weekly'),
  dateShamsi: '1405/06/12',
  dayOfWeek: 'پنج‌شنبه',
  timestamp: new Date().toISOString(),
  archiveType: 'periodic_weekly',
  periodTitle: 'بایگانی هفتگی پنج‌شنبه گزارشات مشاورین (هفته قبل)',
  totalConsultants: new Set(weeklyPeriodicLast.map(p => p.consultantCode || p.consultantId)).size,
  totalClientsContacted: 0,
  topConcerns: [],
  reports: [],
  overallReports: JSON.parse(JSON.stringify(weeklyPeriodicLast)),
  autoGenerated: false
};

// 5. Periodic Monthly for Mordad (1405/05/31)
const monthlyPeriodicMordad = db.overallReports.filter(p => p.periodType === 'monthly' && p.dateShamsi === '1405/05/31');
const archPeriodicMonthlyMordad = {
  id: 'arch-periodic_monthly-14050531',
  fileName: buildArchiveFileName('1405/05/31', 'جمعه', 'periodic_monthly'),
  dateShamsi: '1405/05/31',
  dayOfWeek: 'جمعه',
  timestamp: new Date().toISOString(),
  archiveType: 'periodic_monthly',
  periodTitle: 'بایگانی ماهانه پایان ماه گزارشات استراتژیک (مرداد ماه)',
  totalConsultants: new Set(monthlyPeriodicMordad.map(p => p.consultantCode || p.consultantId)).size,
  totalClientsContacted: 0,
  topConcerns: [],
  reports: [],
  overallReports: JSON.parse(JSON.stringify(monthlyPeriodicMordad)),
  autoGenerated: false
};

// 6. Periodic Monthly Strategic for Current Month (1405/06/19)
const monthlyPeriodicCurrent = db.overallReports.filter(p => p.periodType === 'monthly' && p.dateShamsi === '1405/06/19');
const archPeriodicMonthlyCurrent = {
  id: 'arch-periodic_monthly-14050619',
  fileName: buildArchiveFileName('1405/06/19', 'پنج‌شنبه', 'periodic_monthly'),
  dateShamsi: '1405/06/19',
  dayOfWeek: 'پنج‌شنبه',
  timestamp: new Date().toISOString(),
  archiveType: 'periodic_monthly',
  periodTitle: 'بایگانی ماهانه پایان ماه گزارشات استراتژیک (شهریور ماه)',
  totalConsultants: new Set(monthlyPeriodicCurrent.map(p => p.consultantCode || p.consultantId)).size,
  totalClientsContacted: 0,
  topConcerns: [],
  reports: [],
  overallReports: JSON.parse(JSON.stringify(monthlyPeriodicCurrent)),
  autoGenerated: false
};

// Upsert archives by composite key
function upsertArchive(arch) {
  const compKey = `${arch.dateShamsi}_${arch.archiveType}`;
  const idx = db.archives.findIndex(a => `${a.dateShamsi}_${a.archiveType || 'calls_daily'}` === compKey);
  if (idx >= 0) {
    db.archives[idx] = arch;
  } else {
    db.archives.unshift(arch);
  }
}

upsertArchive(archCallsToday);
upsertArchive(archPeriodicDailyToday);
upsertArchive(archPeriodicWeeklyToday);
upsertArchive(archPeriodicWeeklyLast);
upsertArchive(archPeriodicMonthlyMordad);
upsertArchive(archPeriodicMonthlyCurrent);

// Sort archives by dateShamsi desc
db.archives.sort((a, b) => (b.dateShamsi || '').localeCompare(a.dateShamsi || ''));

// Update metadata
db.lastUpdated = new Date().toISOString();
if (!db.stats) db.stats = { totalWrites: 0 };
db.stats.totalWrites = (db.stats.totalWrites || 0) + 1;

// Write back to disk
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

console.log('Successfully seeded database!');
console.log(`Reports count: ${db.reports.length}`);
console.log(`Total rows across reports: ${db.reports.reduce((s, r) => s + (r.rows?.length || 0), 0)}`);
console.log(`Overall periodic reports count: ${db.overallReports.length}`);
console.log(`Archives count: ${db.archives.length}`);
console.log(`Archive Types breakdown:`, db.archives.map(a => `${a.archiveType} (${a.dateShamsi})`));
