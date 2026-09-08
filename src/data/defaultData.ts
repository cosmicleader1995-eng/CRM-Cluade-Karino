import { User, DailyReport, FollowUpStatusCode } from '../types';
import { getCurrentShamsiDate } from '../utils/shamsi';

export const FOLLOW_UP_STATUS_CODES: FollowUpStatusCode[] = [
  {
    code: '*',
    symbol: '*',
    label: 'عدم وجود / شماره اشتباه (*)',
    meaning: 'کارفرما نیست، شماره یا فرد وجود ندارد، رکورد اشتباه است، یا کارش عوض شده / شماره واگذار شده است',
    colorClass: 'text-purple-400 border-purple-500/50 bg-purple-950/40',
    badgeClass: 'bg-purple-900/60 text-purple-200 border-purple-400/40',
    bgClass: 'bg-purple-500/10',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500'
  },
  {
    code: '+',
    symbol: '+',
    label: 'اوکی اولیه و مسیر هموار (+)',
    meaning: 'اوکی اولیه را داده و برای پیگیری‌های بعدی و دعوت به جلسه مشاوره راه هموارتر شده است',
    colorClass: 'text-sky-400 border-sky-500/50 bg-sky-950/40',
    badgeClass: 'bg-sky-900/60 text-sky-200 border-sky-400/40',
    bgClass: 'bg-sky-500/10',
    textColor: 'text-sky-300',
    borderColor: 'border-sky-500'
  },
  {
    code: '-',
    symbol: '-',
    label: 'پاسخ منفی کارفرما (-)',
    meaning: 'کارفرما منفی است، اعلام عدم نیاز می‌کند یا هنگام تماس تلفنی برخورد نامناسب دارد',
    colorClass: 'text-rose-400 border-rose-500/50 bg-rose-950/40',
    badgeClass: 'bg-rose-900/60 text-rose-200 border-rose-400/40',
    bgClass: 'bg-rose-500/10',
    textColor: 'text-rose-300',
    borderColor: 'border-rose-500'
  },
  {
    code: '.',
    symbol: '.',
    label: 'عدم پاسخ / در جلسه (.)',
    meaning: 'امکان برقراری ارتباط مقدور نشد، وقت ندارد، در جلسه است یا جواب تلفن را نداده است',
    colorClass: 'text-amber-400 border-amber-500/50 bg-amber-950/40',
    badgeClass: 'bg-amber-900/60 text-amber-200 border-amber-400/40',
    bgClass: 'bg-amber-500/10',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-500'
  },
  {
    code: '✓',
    symbol: '✓',
    label: 'جلسه مشاوره ست شد (✓)',
    meaning: 'جواب اولیه کاملاً مثبت بوده و جلسه مشاوره حضوری یا آنلاین با کارفرما ست شده است',
    colorClass: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40',
    badgeClass: 'bg-emerald-900/60 text-emerald-200 border-emerald-400/40',
    bgClass: 'bg-emerald-500/10',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500'
  }
];

export const EMPLOYER_CONCERNS_LIST: string[] = [
  'دعاوی و شکایات در اداره کار و هیئت‌های تشخیص/حل اختلاف',
  'عدم شفافیت قراردادهای کار، الحاقیه‌ها و تضامین پرسنلی',
  'جرایم بازرسی و مغایرت‌های حق بیمه تأمین اجتماعی',
  'عدم تطابق فیش حقوقی، مزایای قانونی و تراز مالی با پرداختی واقعی',
  'فقدان آیین‌نامه انضباطی مصوب و رویه مشخص اخراج یا توبیخ',
  'ریزش مداوم نیروی انسانی و تعارضات درون‌سازمانی',
  'وابستگی کامل سیستم به حضور فیزیکی کارفرما (عدم تفویض اختیار)',
  'نبود چارت سازمانی مصوب و تداخل در شرح وظایف پرسنل',
  'افت شدید بهره‌وری و نبود نظام ارزیابی عملکرد (KPI)',
  'ریسک‌های مالیاتی و حسابداری مرتبط با حقوق و دستمزد',
  'ابهام در فرمول‌های پورسانت، پاداش و تارگت‌های فروش',
  'چالش‌های توزیع مویرگی، وصول مطالبات و کسری انبار',
  'ترک کار ناگهانی پرسنل کلیدی و بردن اطلاعات/اسرار تجاری',
  'حوادث ناشی از کار، مسئولیت‌های مدنی و دیه کارفرمایی',
  'پرونده‌های سخت و زیان‌آور و بازنشستگی‌های زودرس پیش‌بینی نشده',
  'چالش محاسبه اضافه کاری، شب‌کاری، نوبت‌کاری و تعطیل‌کاری',
  'عدم رعایت دوره‌های آزمایشی و بلاتکلیفی حقوقی قراردادهای موقت',
  'ضعف در فرآیند جذب، غربالگری و مصاحبه استخدامی (Onboarding)',
  'قیمت‌گذاری غیراصولی خدمات/محصول و حاشیه سود کاهشی',
  'نبود دستورالعمل‌های مکتوب و استانداردهای اجرایی (SOP)',
  'عدم وجود سیستم کنترل داخلی و پیشگیری از تبانی یا فساد اداری',
  'عدم انگیزه کافی در تیم بازاریابی و فروش',
  'نارضایتی کارگران از شیفت‌های سنگین و افت کیفیت خروجی',
  'عدم تسلط تیم مالی شرکت به آخرین بخشنامه‌های اداره کار',
  'سایر دغدغه‌ها (نیاز به عارضه‌یابی تخصصی و مشاوره حضوری)'
];

export const MEETING_TOPICS_LIST: string[] = [
  'آنالیز ریسک حقوقی قراردادها و پیشگیری از شکایات اداره کار',
  'تنظیم آیین‌نامه انضباطی مصوب و الحاقیه‌های محرمانگی',
  'تراز فیش حقوقی و بهینه‌سازی فرآیندهای بیمه تأمین اجتماعی',
  'طراحی چارت سازمانی، سطوح اختیارات و شناسنامه شغلی',
  'مدیریت فرآیندهای فروش و نظارت بر تیم ویزیتوری',
  'عارضه‌یابی منابع انسانی و طراحی نظام پاداش و ارزیابی عملکرد',
  'مشاوره دفاعیات پرونده‌های مطروحه در هیئت‌های حل اختلاف',
  'استقرار سیستم کنترل داخلی و مدیریت ریسک‌های اجرایی'
];

export const DEFAULT_USERS: User[] = [
  {
    id: 'user-ceo',
    username: 'ceo',
    fullName: 'مدیریت کارینو (CEO)',
    consultantCode: 'KARINO-CEO',
    role: 'ceo',
    password: 'karino2026',
    phone: '09120000000',
    branch: 'دفتر مرکزی کارینو'
  },
  {
    id: 'user-it',
    username: 'it_admin',
    fullName: 'مدیر فاوا و فناوری اطلاعات',
    consultantCode: 'KARINO-IT',
    role: 'it_admin',
    password: 'it2026',
    phone: '09120000001',
    branch: 'واحد فناوری اطلاعات'
  },
  {
    id: 'user-c101',
    username: 'rezaei',
    fullName: 'علیرضا رضایی',
    consultantCode: 'C-101',
    role: 'consultant',
    password: '1234',
    phone: '09151112233',
    branch: 'تیم اجرایی مشهد'
  },
  {
    id: 'user-c102',
    username: 'mohammadi',
    fullName: 'مریم محمدی',
    consultantCode: 'C-102',
    role: 'consultant',
    password: '1234',
    phone: '09152223344',
    branch: 'تیم اجرایی مشهد'
  },
  {
    id: 'user-c103',
    username: 'hosseini',
    fullName: 'سعید حسینی',
    consultantCode: 'C-103',
    role: 'consultant',
    password: '1234',
    phone: '09123334455',
    branch: 'تیم اجرایی تهران'
  },
  {
    id: 'user-c104',
    username: 'karimi',
    fullName: 'ندا کریمی',
    consultantCode: 'C-104',
    role: 'consultant',
    password: '1234',
    phone: '09154445566',
    branch: 'تیم اجرایی مشهد'
  }
];

export function getInitialReports(): DailyReport[] {
  const now = new Date();
  const todayInfo = getCurrentShamsiDate(now);
  
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayInfo = getCurrentShamsiDate(yesterday);

  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const fourDaysAgoInfo = getCurrentShamsiDate(fourDaysAgo);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoInfo = getCurrentShamsiDate(sevenDaysAgo);

  return [
    // 1. Today's Report - Alireza Rezaei (C-101)
    {
      id: 'rep-seed-1',
      consultantId: 'user-c101',
      consultantName: 'علیرضا رضایی',
      consultantCode: 'C-101',
      dateShamsi: todayInfo.formatted,
      dayOfWeekShamsi: todayInfo.dayOfWeek,
      guild: 'تولیدی قطعات خودرو و ریخته‌گری',
      status: 'approved',
      managerFeedback: 'عملکرد بسیار عالی در برقراری ارتباط با صنایع ریخته‌گری توس فولاد. جلسه حضوری هماهنگ شود.',
      managerRating: 5,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: now.toISOString(),
      submittedAt: '۱۴:۳۰',
      personalOpinion: 'به دلیل افزایش نظارت و بازرسی‌های تأمین اجتماعی، کارفرمایان این صنف استقبال چشمگیری از خدمات بازبینی قراردادها و تراز مالی دارند.',
      rows: [
        {
          id: 'row-seed-1-1',
          rowNumber: 1,
          clientName: 'صنایع ریخته‌گری توس فولاد',
          activityField: 'تولید قطعات چدنی خودرو',
          personnelCount: 48,
          phone: '05138401122',
          address: 'شهرک صنعتی توس، فاز ۱، تلاش جنوبی',
          employerConcern: 'دعاوی و شکایات در اداره کار و هیئت‌های تشخیص/حل اختلاف',
          followUp1: '+',
          followUp2: '+',
          followUp3: '✓',
          followUp4: '',
          followUpResult: '✓ (جلسه حضوری ست شد)',
          meetingTopic: 'آنالیز ریسک حقوقی قراردادها و پیشگیری از شکایات اداره کار',
          notes: 'جلسه با مهندس صادقی (مدیرعامل) دوشنبه ساعت ۱۰:۰۰ در محل کارخانه تنظیم شد.'
        },
        {
          id: 'row-seed-1-2',
          rowNumber: 2,
          clientName: 'صنعتی پارت سازان خاور',
          activityField: 'ماشین‌کاری قطعات حساس',
          personnelCount: 22,
          phone: '05135412233',
          address: 'شهرک صنعتی فناوری‌های برتر',
          employerConcern: 'عدم شفافیت قراردادهای کار، الحاقیه‌ها و تضامین پرسنلی',
          followUp1: '+',
          followUp2: '+',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'تماس دوم انجام شد؛ پیش‌نویس چک‌لیست حقوقی ارسال گردید، منتظر بررسی هیئت‌مدیره هستند.'
        },
        {
          id: 'row-seed-1-3',
          rowNumber: 3,
          clientName: 'کارگاه تراشکاری نوین صنعت',
          activityField: 'تراشکاری قطعات برنجی',
          personnelCount: 14,
          phone: '05132456677',
          address: 'بزرگراه آسیایی، آزادی ۱۲۵',
          employerConcern: 'جرایم بازرسی و مغایرت‌های حق بیمه تأمین اجتماعی',
          followUp1: '.',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'مدیر کارگاه در خط تولید بود؛ تماس مجدد در نوبت عصر هماهنگ خواهد شد.'
        },
        {
          id: 'row-seed-1-4',
          rowNumber: 4,
          clientName: 'قالب‌سازی دقیق البرز',
          activityField: 'طراحی قالب‌های سنبه ماتریس',
          personnelCount: 9,
          phone: '05136518899',
          address: 'شهرک صنعتی کلات',
          employerConcern: 'افت شدید بهره‌وری و نبود نظام ارزیابی عملکرد (KPI)',
          followUp1: '-',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '- (اعلام عدم نیاز فعلی)',
          meetingTopic: '',
          notes: 'کارفرما عنوان کرد فعلاً به دلیل نوسانات بازار برنامه اصلاح ساختار ندارند.'
        },
        {
          id: 'row-seed-1-5',
          rowNumber: 5,
          clientName: 'ریخته‌گری آلومینیوم خاوران',
          activityField: 'ریخته‌گری تحت فشار دایکست',
          personnelCount: 30,
          phone: '05138810011',
          address: 'جاده قدیم نیشابور',
          employerConcern: 'عدم تطابق فیش حقوقی، مزایای قانونی و تراز مالی با پرداختی واقعی',
          followUp1: '*',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '* (شماره کارخانه تغییر یافته است)',
          meetingTopic: '',
          notes: 'خط قطع بود؛ نیاز به اصلاح شماره در پایگاه داده داده‌کاوی.'
        }
      ]
    },

    // 2. Today's Report - Maryam Mohammadi (C-102)
    {
      id: 'rep-seed-2',
      consultantId: 'user-c102',
      consultantName: 'مریم محمدی',
      consultantCode: 'C-102',
      dateShamsi: todayInfo.formatted,
      dayOfWeekShamsi: todayInfo.dayOfWeek,
      guild: 'فناوری اطلاعات و تجارت الکترونیک',
      status: 'submitted',
      managerFeedback: '',
      managerRating: undefined,
      updatedAt: new Date().toISOString(),
      createdAt: now.toISOString(),
      submittedAt: '۱۳:۱۵',
      personalOpinion: 'شرکت‌های نرم‌افزاری به شدت نگران حفظ محرمانگی کدها و ترک ناگهانی برنامه‌نویسان ارشد هستند.',
      rows: [
        {
          id: 'row-seed-2-1',
          rowNumber: 1,
          clientName: 'شرکت دانش‌بنیان داده‌پردازان عصر نوین',
          activityField: 'توسعه نرم‌افزارهای سازمانی و هوش مصنوعی',
          personnelCount: 36,
          phone: '05138479900',
          address: 'بلوار سجاد، خیابان بهار',
          employerConcern: 'ترک کار ناگهانی پرسنل کلیدی و بردن اطلاعات/اسرار تجاری',
          followUp1: '+',
          followUp2: '+',
          followUp3: '✓',
          followUp4: '',
          followUpResult: '✓ (جلسه آنلاین با هم‌بنیان‌گذار ست شد)',
          meetingTopic: 'تنظیم آیین‌نامه انضباطی مصوب و الحاقیه‌های محرمانگی',
          notes: 'جلسه تخصصی گوگل میت چهارشنبه ساعت ۱۴:۳۰ ست شد.'
        },
        {
          id: 'row-seed-2-2',
          rowNumber: 2,
          clientName: 'پلتفرم خدمات ابری رایان‌سرویس',
          activityField: 'ارائه زیرساخت و سرور ابری',
          personnelCount: 24,
          phone: '05137614455',
          address: 'بلوار دستغیب، مجتمع تک',
          employerConcern: 'ریسک‌های مالیاتی و حسابداری مرتبط با حقوق و دستمزد',
          followUp1: '+',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'مدیر مالی شرکت استقبال کرد؛ مستندات مقایسه‌ای مالیات حقوق ارسال شد.'
        },
        {
          id: 'row-seed-2-3',
          rowNumber: 3,
          clientName: 'آژانس دیجیتال مارکتینگ صبا',
          activityField: 'سئو و تبلیغات دیجیتال',
          personnelCount: 16,
          phone: '05138435566',
          address: 'احمدآباد، خیابان عدالت',
          employerConcern: 'ابهام در فرمول‌های پورسانت، پاداش و تارگت‌های فروش',
          followUp1: '+',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'درخواست راهنمایی در خصوص فرمول پورسانت پلکانی کارشناسان فروش.'
        }
      ]
    },

    // 3. Yesterday's Report - Maryam Mohammadi (C-102)
    {
      id: 'rep-seed-3',
      consultantId: 'user-c102',
      consultantName: 'مریم محمدی',
      consultantCode: 'C-102',
      dateShamsi: yesterdayInfo.formatted,
      dayOfWeekShamsi: yesterdayInfo.dayOfWeek,
      guild: 'صنایع غذایی و بسته‌بندی',
      status: 'approved',
      managerFeedback: 'نکات درج شده در خصوص شرکت فرآورده‌های لبنی کوهستان فوق‌العاده است. پشتیبانی کامل حقوقی داده شود.',
      managerRating: 5,
      reviewedAt: yesterday.toISOString(),
      updatedAt: yesterday.toISOString(),
      createdAt: yesterday.toISOString(),
      submittedAt: '۱۶:۰۰',
      personalOpinion: 'صنایع غذایی به دلیل شیفت‌های گردشی و سختی کار، ریسک بسیار بالایی در پرونده‌های بازنشستگی پیش‌ازموعد دارند.',
      rows: [
        {
          id: 'row-seed-3-1',
          rowNumber: 1,
          clientName: 'فرآورده‌های لبنی کوهستان مشهد',
          activityField: 'تولید دوغ و ماست پاستوریزه',
          personnelCount: 92,
          phone: '05135421100',
          address: 'شهرک صنعتی چناران',
          employerConcern: 'پرونده‌های سخت و زیان‌آور و بازنشستگی‌های زودرس پیش‌بینی نشده',
          followUp1: '+',
          followUp2: '✓',
          followUp3: '',
          followUp4: '',
          followUpResult: '✓ (جلسه حضوری با مدیر اداری ست شد)',
          meetingTopic: 'تراز فیش حقوقی و بهینه‌سازی فرآیندهای بیمه تأمین اجتماعی',
          notes: 'مدیر اداری آقای رجبی بسیار پیگیر بودند؛ جلسه پنج‌شنبه ساعت ۱۱ صبح.'
        },
        {
          id: 'row-seed-3-2',
          rowNumber: 2,
          clientName: 'صنایع بسته‌بندی ترنج سبز',
          activityField: 'بسته‌بندی حبوبات و خشکبار صادراتی',
          personnelCount: 38,
          phone: '05135413344',
          address: 'شهرک صنعتی توس، فاز ۲',
          employerConcern: 'فقدان آیین‌نامه انضباطی مصوب و رویه مشخص اخراج یا توبیخ',
          followUp1: '+',
          followUp2: '+',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'مذاکره اولیه انجام شد؛ منتظر تماس مجدد در چرخه پیگیری هستند.'
        },
        {
          id: 'row-seed-3-3',
          rowNumber: 3,
          clientName: 'تولیدی کیک و کلوچه پردیس',
          activityField: 'شیرینی و بیسکویت صنعتی',
          personnelCount: 25,
          phone: '05136517722',
          address: 'شهرک صنعتی ماشین‌سازی',
          employerConcern: 'چالش محاسبه اضافه کاری، شب‌کاری، نوبت‌کاری و تعطیل‌کاری',
          followUp1: '.',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'مدیرعامل در جلسه بازرسی استاندارد بود.'
        }
      ]
    },

    // 4. Report 4 Days Ago (4-Day Cycle Test) - Saeed Hosseini (C-103)
    {
      id: 'rep-seed-4',
      consultantId: 'user-c103',
      consultantName: 'سعید حسینی',
      consultantCode: 'C-103',
      dateShamsi: fourDaysAgoInfo.formatted,
      dayOfWeekShamsi: fourDaysAgoInfo.dayOfWeek,
      guild: 'بازرگانی و پخش مویرگی',
      status: 'submitted',
      managerFeedback: '',
      managerRating: undefined,
      updatedAt: fourDaysAgo.toISOString(),
      createdAt: fourDaysAgo.toISOString(),
      submittedAt: '۱۵:۴۵',
      personalOpinion: 'شرکت‌های پخش به دلیل مبالغ سنگین ضمانت‌نامه‌های ویزیتورها و رانندگان، دغدغه فوری تنظیم سفته و قرارداد ضمانت دارند.',
      rows: [
        {
          id: 'row-seed-4-1',
          rowNumber: 1,
          clientName: 'شرکت بازرگانی پخش مویرگی کیان',
          activityField: 'پخش سراسری مواد شوینده و بهداشتی',
          personnelCount: 65,
          phone: '02188991122',
          address: 'تهران، خیابان مطهری، پلاک ۱۱۴',
          employerConcern: 'چالش‌های توزیع مویرگی، وصول مطالبات و کسری انبار',
          followUp1: '+',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'امروز دقیقاً موعد تماس دوم در چرخه ۴ روزه است و سیستم آلارم پیگیری صادر کرده است.'
        },
        {
          id: 'row-seed-4-2',
          rowNumber: 2,
          clientName: 'توزیع و پخش دارویی رازیان سلامت',
          activityField: 'پخش اقلام دارویی و مکمل‌ها',
          personnelCount: 42,
          phone: '02166554433',
          address: 'تهران، خیابان آزادی، نبش شادمان',
          employerConcern: 'عدم شفافیت قراردادهای کار، الحاقیه‌ها و تضامین پرسنلی',
          followUp1: '+',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'موعد تماس دوم فرارسیده؛ مدیر منابع انسانی تمایل به دریافت نمونه قرارداد امانی دارد.'
        },
        {
          id: 'row-seed-4-3',
          rowNumber: 3,
          clientName: 'شرکت لجستیک سپهر ترابر',
          activityField: 'خدمات انبارداری و ارسال مرسولات',
          personnelCount: 28,
          phone: '02155443322',
          address: 'تهران، جاده مخصوص کرج، کیلومتر ۱۱',
          employerConcern: 'حوادث ناشی از کار، مسئولیت‌های مدنی و دیه کارفرمایی',
          followUp1: '.',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'در چرخه پیگیری قرار دارد.'
        }
      ]
    },

    // 5. Report 7 Days Ago (Overdue +4 Days Test) - Neda Karimi (C-104)
    {
      id: 'rep-seed-5',
      consultantId: 'user-c104',
      consultantName: 'ندا کریمی',
      consultantCode: 'C-104',
      dateShamsi: sevenDaysAgoInfo.formatted,
      dayOfWeekShamsi: sevenDaysAgoInfo.dayOfWeek,
      guild: 'ساختمانی، انبوه‌سازی و تأسیسات',
      status: 'approved',
      managerFeedback: 'دو مورد از کارفرمایان این لیست بیش از ۵ روز است که پیگیری نشده‌اند. لطفاً بلافاصله تماس گرفته شود.',
      managerRating: 4,
      reviewedAt: sevenDaysAgo.toISOString(),
      updatedAt: sevenDaysAgo.toISOString(),
      createdAt: sevenDaysAgo.toISOString(),
      submittedAt: '۱۲:۳۰',
      personalOpinion: 'شرکت‌های پیمانکاری ساختمانی بیشترین حجم احضاریه‌های هیئت‌های تشخیص اداره کار را گزارش کردند.',
      rows: [
        {
          id: 'row-seed-5-1',
          rowNumber: 1,
          clientName: 'شرکت ساختمانی و ابنیه عمران گستر پارس',
          activityField: 'پیمانکاری پروژه‌های مسکونی و تجاری',
          personnelCount: 115,
          phone: '05138447788',
          address: 'مشهد، بلوار فلسطین، تقاطع خیام',
          employerConcern: 'دعاوی و شکایات در اداره کار و هیئت‌های تشخیص/حل اختلاف',
          followUp1: '+',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'بیش از ۶ روز از تماس اول گذشته؛ نیازمند تماس فوری پیگیری دوم (معوق).'
        },
        {
          id: 'row-seed-5-2',
          rowNumber: 2,
          clientName: 'تأسیسات سرمایش و گرمایش آریا سازه',
          activityField: 'اجرای موتورخانه و تأسیسات برج‌ها',
          personnelCount: 29,
          phone: '05137682211',
          address: 'مشهد، بلوار پیروزی، نبش پیروزی ۳۴',
          employerConcern: 'حوادث ناشی از کار، مسئولیت‌های مدنی و دیه کارفرمایی',
          followUp1: '+',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'پیگیری معوق؛ در انتظار تماس بعدی.'
        },
        {
          id: 'row-seed-5-3',
          rowNumber: 3,
          clientName: 'تولیدی سازه‌های بتنی پایدار',
          activityField: 'تیرچه، بلوک و قطعات پیش‌ساخته بتنی',
          personnelCount: 18,
          phone: '05132459900',
          address: 'جاده سیمان، کیلومتر ۴',
          employerConcern: 'عدم رعایت دوره‌های آزمایشی و بلاتکلیفی حقوقی قراردادهای موقت',
          followUp1: '-',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '- (عدم تمایل به تغییر رویه فعلی)',
          meetingTopic: '',
          notes: 'تماس اولیه منفی بود و خاتمه یافت.'
        }
      ]
    }
  ];
}
