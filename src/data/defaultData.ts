import { User, DailyReport, FollowUpStatusCode, ManagerDirective } from '../types';
import { getCurrentShamsiDate } from '../utils/shamsi';

export const DEFAULT_DIRECTIVES: ManagerDirective[] = [
  {
    id: 'dir-seed-1',
    targetConsultantId: 'user-c101',
    targetConsultantName: 'علیرضا رضایی',
    authorName: 'مدیریت کارینو (CEO)',
    content: 'پرونده کریمی و صنایع ریخته‌گری توس فولاد رو در اولویت قطعی امروز قرار بده.',
    priority: 'high',
    createdAt: new Date().toISOString(),
    dateShamsi: 'امروز'
  },
  {
    id: 'dir-seed-2',
    targetConsultantId: 'all',
    authorName: 'مدیریت کارینو (CEO)',
    content: 'تمرکز تماس‌های این هفته بر روی عارضه‌یابی قراردادهای کار و پیشگیری از جرایم بازرسی تأمین اجتماعی است.',
    priority: 'normal',
    createdAt: new Date().toISOString(),
    dateShamsi: 'امروز'
  },
  {
    id: 'dir-seed-3',
    targetConsultantId: 'user-c102',
    targetConsultantName: 'مریم محمدی',
    authorName: 'مدیریت کارینو (CEO)',
    content: 'جلسه شرکت فرآورده‌های لبنی کوهستان رو با بسته پیشنهادی سطح ۲ هماهنگ فرمایید.',
    priority: 'high',
    createdAt: new Date().toISOString(),
    dateShamsi: 'امروز'
  },
  {
    id: 'dir-seed-4',
    targetConsultantId: 'user-c103',
    targetConsultantName: 'سعید حسینی',
    authorName: 'مدیریت کارینو (CEO)',
    content: 'تمرکز تماس‌های امروز بر مبالغ سفته و تضامین پرسنلی ویزیتورها و رانندگان پخش باشد.',
    priority: 'normal',
    createdAt: new Date().toISOString(),
    dateShamsi: 'امروز'
  }
];

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
  
  const getRelativeInfo = (daysAgo: number) => {
    const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return {
      date: d,
      iso: d.toISOString(),
      shamsi: getCurrentShamsiDate(d)
    };
  };

  const day0 = getRelativeInfo(0);
  const day1 = getRelativeInfo(1);
  const day3 = getRelativeInfo(3);
  const day4 = getRelativeInfo(4); // Step 2 (target 4d) - Today!
  const day6 = getRelativeInfo(6); // Step 2 (target 4d) - Overdue by 2 days!
  const day8 = getRelativeInfo(8); // Step 3 (target 8d) - Today!
  const day9 = getRelativeInfo(9); // Step 3 (target 8d) - Overdue by 1 day!

  return [
    // -------------------------------------------------------------
    // CONSULTANT 1: علیرضا رضایی (C-101) - Focus Profile for Testing
    // -------------------------------------------------------------
    // 1-1. Today's Report (Current Activity & Session Booked)
    {
      id: 'rep-c101-today',
      consultantId: 'user-c101',
      consultantName: 'علیرضا رضایی',
      consultantCode: 'C-101',
      dateShamsi: day0.shamsi.formatted,
      dayOfWeekShamsi: day0.shamsi.dayOfWeek,
      guild: 'تولیدی قطعات خودرو و ریخته‌گری',
      status: 'approved',
      managerFeedback: 'عملکرد بسیار عالی در برقراری ارتباط با صنایع ریخته‌گری توس فولاد. جلسه حضوری به خوبی هماهنگ شد.',
      managerRating: 5,
      reviewedAt: day0.iso,
      updatedAt: day0.iso,
      createdAt: day0.iso,
      submittedAt: '۱۴:۳۰',
      personalOpinion: 'به دلیل افزایش نظارت و بازرسی‌های تأمین اجتماعی، کارفرمایان این صنف استقبال چشمگیری از خدمات بازبینی قراردادها و تراز مالی دارند.',
      rows: [
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
          followUp2: '+',
          followUp3: '✓',
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
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: '',
          notes: 'مدیر کارگاه در خط تولید بود؛ تماس مجدد هماهنگ خواهد شد.'
        },
        {
          id: 'row-c101-today-3',
          rowNumber: 3,
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
          notes: 'کارفرما عنوان کرد فعلاً برنامه اصلاح ساختار ندارند.'
        }
      ]
    },

    // 1-2. Report from 6 Days Ago (Generates: 🔴 معوق — ۲ روز از پیگیری ۲)
    {
      id: 'rep-c101-overdue-6d',
      consultantId: 'user-c101',
      consultantName: 'علیرضا رضایی',
      consultantCode: 'C-101',
      dateShamsi: day6.shamsi.formatted,
      dayOfWeekShamsi: day6.shamsi.dayOfWeek,
      guild: 'ماشین‌سازی و قطعه‌سازی خودرو',
      status: 'approved',
      managerFeedback: 'پرونده کارفرما احمدی را سریعاً تماس گرفته و تعیین تکلیف نمایید.',
      managerRating: 4,
      reviewedAt: day6.iso,
      updatedAt: day6.iso,
      createdAt: day6.iso,
      submittedAt: '۱۶:۱۵',
      personalOpinion: 'کارفرمایان این گروه به دلیل چالش تضامین و قراردادهای کارگری نیازمند پیگیری منظم هستند.',
      rows: [
        {
          id: 'row-c101-ahmadi',
          rowNumber: 1,
          clientName: 'کارفرما احمدی (گروه صنعتی پارت گستر)',
          activityField: 'تولید قطعات پرسی بدنه خودرو',
          personnelCount: 35,
          phone: '05138491122',
          address: 'شهرک صنعتی توس، تلاش شمالی ۶',
          employerConcern: 'عدم شفافیت قراردادهای کار، الحاقیه‌ها و تضامین پرسنلی',
          followUp1: '+',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: 'تنظیم آیین‌نامه انضباطی مصوب و الحاقیه‌های محرمانگی',
          notes: 'در تماس اول بسیار مشتاق بودند؛ قرار شد بعد از ۴ روز برای ارسال پیش‌نویس تماس گرفته شود.'
        }
      ]
    },

    // 1-3. Report from 9 Days Ago (Generates: 🔴 معوق — ۱ روز از پیگیری ۳)
    {
      id: 'rep-c101-overdue-9d',
      consultantId: 'user-c101',
      consultantName: 'علیرضا رضایی',
      consultantCode: 'C-101',
      dateShamsi: day9.shamsi.formatted,
      dayOfWeekShamsi: day9.shamsi.dayOfWeek,
      guild: 'صنایع چاپ و بسته‌بندی صادراتی',
      status: 'approved',
      managerFeedback: 'پیگیری سوم کارفرما رضایی برای نهایی‌سازی قرارداد مشاوره بسیار حساس است.',
      managerRating: 5,
      reviewedAt: day9.iso,
      updatedAt: day9.iso,
      createdAt: day9.iso,
      submittedAt: '۱۵:۰۰',
      personalOpinion: 'چاپخانه‌ها با مسائل بیمه تأمین اجتماعی کارگران شیفت شب درگیرند.',
      rows: [
        {
          id: 'row-c101-rezaei-client',
          rowNumber: 1,
          clientName: 'کارفرما رضایی (صنایع بسته‌بندی آرین نگین)',
          activityField: 'تولید جعبه‌های دارویی و صادراتی',
          personnelCount: 52,
          phone: '05135429988',
          address: 'شهرک صنعتی فناوری‌های برتر، صنعت ۴',
          employerConcern: 'چالش محاسبه اضافه کاری، شب‌کاری، نوبت‌کاری و تعطیل‌کاری',
          followUp1: '+',
          followUp2: '+',
          followUp3: '',
          followUp4: '',
          followUp1Date: day9.iso,
          followUp2Date: getRelativeInfo(5).iso, // Follow-up 2 done 5 days ago -> 1 day overdue for step 3!
          followUpResult: '',
          meetingTopic: 'تراز فیش حقوقی و بهینه‌سازی فرآیندهای بیمه تأمین اجتماعی',
          notes: 'تماس دوم عالی بود؛ پیش‌فاکتور ارسال شده و برای نهایی‌سازی نیاز به پیگیری ۳ دارد.'
        }
      ]
    },

    // 1-4. Report from 4 Days Ago (Generates: 🟢 برنامه امروز — پیگیری ۲ موعد امروز)
    {
      id: 'rep-c101-today-due-4d',
      consultantId: 'user-c101',
      consultantName: 'علیرضا رضایی',
      consultantCode: 'C-101',
      dateShamsi: day4.shamsi.formatted,
      dayOfWeekShamsi: day4.shamsi.dayOfWeek,
      guild: 'صنعتی و مهندسی دقیق',
      status: 'submitted',
      managerFeedback: '',
      managerRating: undefined,
      updatedAt: day4.iso,
      createdAt: day4.iso,
      submittedAt: '۱۱:۴۰',
      personalOpinion: 'استقبال مدیرعامل در جلسه نخست امیدوارکننده بود.',
      rows: [
        {
          id: 'row-c101-hosseini-client',
          rowNumber: 1,
          clientName: 'کارفرما حسینی (صنعتی پارت سازان خاور)',
          activityField: 'ماشین‌کاری قطعات حساس موتور',
          personnelCount: 22,
          phone: '05135412233',
          address: 'شهرک صنعتی فناوری‌های برتر',
          employerConcern: 'ریسک‌های مالیاتی و حسابداری مرتبط با حقوق و دستمزد',
          followUp1: '+',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: 'عارضه‌یابی منابع انسانی و طراحی نظام پاداش و ارزیابی عملکرد',
          notes: 'امروز دقیقاً موعد تماس دوم (روز چهارم) است.'
        }
      ]
    },

    // 1-5. Report from 8 Days Ago (Generates: 🟢 برنامه امروز — پیگیری ۳ موعد امروز)
    {
      id: 'rep-c101-today-due-8d',
      consultantId: 'user-c101',
      consultantName: 'علیرضا رضایی',
      consultantCode: 'C-101',
      dateShamsi: day8.shamsi.formatted,
      dayOfWeekShamsi: day8.shamsi.dayOfWeek,
      guild: 'تولید تجهیزات بالابری و صنعتی',
      status: 'approved',
      managerFeedback: 'این پرونده شانس بالایی برای تبدیل به قرارداد سالانه دارد.',
      managerRating: 5,
      reviewedAt: day8.iso,
      updatedAt: day8.iso,
      createdAt: day8.iso,
      submittedAt: '۱۷:۲۰',
      personalOpinion: 'نیاز جدی به استقرار نظام ایمنی و مسئولیت مدنی کارفرما دارند.',
      rows: [
        {
          id: 'row-c101-nouri-client',
          rowNumber: 1,
          clientName: 'کارفرما نوری (تولیدی قطعات آسانسور پارس نوری)',
          activityField: 'تولید درب و کابین آسانسور',
          personnelCount: 31,
          phone: '05136514455',
          address: 'شهرک صنعتی کلات، خیابان تلاش ۳',
          employerConcern: 'حوادث ناشی از کار، مسئولیت‌های مدنی و دیه کارفرمایی',
          followUp1: '+',
          followUp2: '+',
          followUp3: '',
          followUp4: '',
          followUp1Date: day8.iso,
          followUp2Date: getRelativeInfo(4).iso, // Follow-up 2 done 4 days ago -> exactly due TODAY for step 3!
          followUpResult: '',
          meetingTopic: 'آنالیز ریسک حقوقی قراردادها و پیشگیری از شکایات اداره کار',
          notes: 'پیگیری ۱ و ۲ با موفقیت انجام شده؛ امروز موعد تماس سوم برای ست کردن جلسه است.'
        }
      ]
    },

    // -------------------------------------------------------------
    // CONSULTANT 2: مریم محمدی (C-102)
    // -------------------------------------------------------------
    {
      id: 'rep-c102-today',
      consultantId: 'user-c102',
      consultantName: 'مریم محمدی',
      consultantCode: 'C-102',
      dateShamsi: day0.shamsi.formatted,
      dayOfWeekShamsi: day0.shamsi.dayOfWeek,
      guild: 'فناوری اطلاعات و تجارت الکترونیک',
      status: 'approved',
      managerFeedback: 'جلسه شرکت فرآورده‌های لبنی کوهستان رو با بسته پیشنهادی سطح ۲ هماهنگ فرمایید.',
      managerRating: 5,
      reviewedAt: day0.iso,
      updatedAt: day0.iso,
      createdAt: day0.iso,
      submittedAt: '۱۳:۱۵',
      personalOpinion: 'شرکت‌های نرم‌افزاری به شدت نگران حفظ محرمانگی کدها و ترک ناگهانی برنامه‌نویسان ارشد هستند.',
      rows: [
        {
          id: 'row-c102-1',
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
          notes: 'جلسه گوگل میت چهارشنبه ساعت ۱۴:۳۰ ست شد.'
        }
      ]
    },
    {
      id: 'rep-c102-overdue',
      consultantId: 'user-c102',
      consultantName: 'مریم محمدی',
      consultantCode: 'C-102',
      dateShamsi: day6.shamsi.formatted,
      dayOfWeekShamsi: day6.shamsi.dayOfWeek,
      guild: 'صنایع غذایی و کشاورزی',
      status: 'approved',
      managerFeedback: 'پشتیبانی کامل حقوقی داده شود.',
      managerRating: 4,
      reviewedAt: day6.iso,
      updatedAt: day6.iso,
      createdAt: day6.iso,
      submittedAt: '۱۶:۰۰',
      personalOpinion: 'صنایع غذایی ریسک بسیار بالایی در پرونده‌های بازنشستگی پیش‌ازموعد دارند.',
      rows: [
        {
          id: 'row-c102-overdue-1',
          rowNumber: 1,
          clientName: 'کارفرما کاظمی (صنایع بسته‌بندی ترنج سبز)',
          activityField: 'بسته‌بندی حبوبات و خشکبار صادراتی',
          personnelCount: 38,
          phone: '05135413344',
          address: 'شهرک صنعتی توس، فاز ۲',
          employerConcern: 'فقدان آیین‌نامه انضباطی مصوب و رویه مشخص اخراج یا توبیخ',
          followUp1: '+',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          followUpResult: '',
          meetingTopic: 'تنظیم آیین‌نامه انضباطی مصوب و الحاقیه‌های محرمانگی',
          notes: 'نیازمند تماس فوری پیگیری دوم (۲ روز معوق).'
        }
      ]
    },

    // -------------------------------------------------------------
    // CONSULTANT 3: سعید حسینی (C-103)
    // -------------------------------------------------------------
    {
      id: 'rep-c103-today',
      consultantId: 'user-c103',
      consultantName: 'سعید حسینی',
      consultantCode: 'C-103',
      dateShamsi: day4.shamsi.formatted,
      dayOfWeekShamsi: day4.shamsi.dayOfWeek,
      guild: 'بازرگانی و پخش مویرگی',
      status: 'approved',
      managerFeedback: 'تمرکز بر روی مبالغ سفته و تضامین ویزیتورها باشد.',
      managerRating: 4,
      reviewedAt: day4.iso,
      updatedAt: day4.iso,
      createdAt: day4.iso,
      submittedAt: '۱۵:۴۵',
      personalOpinion: 'شرکت‌های پخش دغدغه فوری تنظیم سفته و قرارداد ضمانت دارند.',
      rows: [
        {
          id: 'row-c103-1',
          rowNumber: 1,
          clientName: 'کارفرما شجاعی (شرکت بازرگانی پخش مویرگی کیان)',
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
          meetingTopic: 'آنالیز ریسک حقوقی قراردادها و پیشگیری از شکایات اداره کار',
          notes: 'امروز موعد تماس دوم است.'
        }
      ]
    },

    // -------------------------------------------------------------
    // CONSULTANT 4: ندا کریمی (C-104)
    // -------------------------------------------------------------
    {
      id: 'rep-c104-today',
      consultantId: 'user-c104',
      consultantName: 'ندا کریمی',
      consultantCode: 'C-104',
      dateShamsi: day6.shamsi.formatted,
      dayOfWeekShamsi: day6.shamsi.dayOfWeek,
      guild: 'ساختمانی، انبوه‌سازی و تأسیسات',
      status: 'approved',
      managerFeedback: 'پکیج مشاوره آیین‌نامه انضباطی برای کارگاه‌های بالای ۲۰ نفر معرفی شود.',
      managerRating: 4,
      reviewedAt: day6.iso,
      updatedAt: day6.iso,
      createdAt: day6.iso,
      submittedAt: '۱۲:۳۰',
      personalOpinion: 'شرکت‌های پیمانکاری بیشترین حجم احضاریه‌های هیئت‌های تشخیص را دارند.',
      rows: [
        {
          id: 'row-c104-1',
          rowNumber: 1,
          clientName: 'کارفرما ابراهیمی (شرکت ابنیه عمران گستر)',
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
          meetingTopic: 'مشاوره دفاعیات پرونده‌های مطروحه در هیئت‌های حل اختلاف',
          notes: 'پیگیری معوق؛ تماس دوم باید فوری انجام شود.'
        }
      ]
    }
  ];
}

