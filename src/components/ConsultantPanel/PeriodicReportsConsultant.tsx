import React, { useState, useMemo } from 'react';
import { User, DailyReport, PeriodicOverallReport, PeriodicReportType } from '../../types';
import { getStoredPeriodicReports, savePeriodicReport } from '../../services/storage';
import { 
  getCurrentShamsiDate, 
  toPersianDigits, 
  isThursday, 
  isEndOfShamsiMonth, 
  formatShamsiDateLong,
  getCurrentTimeFormatted 
} from '../../utils/shamsi';
import confetti from 'canvas-confetti';
import { 
  CalendarCheck, 
  CalendarDays, 
  CalendarRange, 
  Send, 
  Award, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Star, 
  MessageSquare, 
  Flame, 
  Sparkles,
  Info,
  Check,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

interface PeriodicReportsConsultantProps {
  currentUser: User;
  allReports: DailyReport[];
  onReportSubmitted?: () => void;
}

export const PeriodicReportsConsultant: React.FC<PeriodicReportsConsultantProps> = ({
  currentUser,
  allReports,
  onReportSubmitted
}) => {
  const curShamsi = getCurrentShamsiDate();
  const todayIsThursday = isThursday(curShamsi.formatted);
  const todayIsMonthEnd = isEndOfShamsiMonth(curShamsi.formatted);

  const [periodType, setPeriodType] = useState<PeriodicReportType>('daily');
  const [summary, setSummary] = useState('');
  const [keyAchievements, setKeyAchievements] = useState('');
  const [challengesOrBarriers, setChallengesOrBarriers] = useState('');
  const [plansOrPriorities, setPlansOrPriorities] = useState('');
  const [weeklyFocusGuilds, setWeeklyFocusGuilds] = useState('');
  const [monthlyStrategicNotes, setMonthlyStrategicNotes] = useState('');
  const [selfRating, setSelfRating] = useState<number>(5);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load all periodic reports for this consultant
  const [storedReports, setStoredReports] = useState<PeriodicOverallReport[]>(getStoredPeriodicReports());

  const myPeriodicReports = useMemo(() => {
    return storedReports.filter(r => 
      r.consultantId === currentUser.id || 
      (currentUser.consultantCode && r.consultantCode?.toUpperCase() === currentUser.consultantCode.toUpperCase())
    );
  }, [storedReports, currentUser]);

  // Check today's submission status
  const todayDailyReport = useMemo(() => {
    return myPeriodicReports.find(r => r.periodType === 'daily' && r.dateShamsi === curShamsi.formatted);
  }, [myPeriodicReports, curShamsi]);

  const thisWeekReport = useMemo(() => {
    return myPeriodicReports.find(r => r.periodType === 'weekly' && r.dateShamsi === curShamsi.formatted);
  }, [myPeriodicReports, curShamsi]);

  const thisMonthReport = useMemo(() => {
    return myPeriodicReports.find(r => r.periodType === 'monthly' && r.dateShamsi?.startsWith(`${curShamsi.year}/${String(curShamsi.month).padStart(2, '0')}`));
  }, [myPeriodicReports, curShamsi]);

  // Dynamic default label
  const currentPeriodLabel = useMemo(() => {
    if (periodType === 'daily') {
      return `گزارش کلی روزانه ${curShamsi.dayOfWeek} ${curShamsi.day} ${curShamsi.monthName} ${curShamsi.year}`;
    }
    if (periodType === 'weekly') {
      return `گزارش جامع هفتگی منتهی به پنج‌شنبه ${curShamsi.day} ${curShamsi.monthName}`;
    }
    return `گزارش راهبردی ماهانه ${curShamsi.monthName} ${curShamsi.year}`;
  }, [periodType, curShamsi]);

  // Load an existing report into the form if requested
  const handleLoadReport = (rep: PeriodicOverallReport) => {
    setPeriodType(rep.periodType);
    setSummary(rep.summary || '');
    setKeyAchievements(rep.keyAchievements || '');
    setChallengesOrBarriers(rep.challengesOrBarriers || '');
    setPlansOrPriorities(rep.plansOrPriorities || '');
    setWeeklyFocusGuilds(rep.weeklyFocusGuilds || '');
    setMonthlyStrategicNotes(rep.monthlyStrategicNotes || '');
    setSelfRating(rep.selfRating || 5);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      alert('لطفاً خلاصه عملکرد دوره را وارد نمایید.');
      return;
    }

    const reportId = `per-${currentUser.consultantCode || currentUser.id}-${periodType}-${curShamsi.formatted.replace(/\//g, '')}`;
    const newReport: PeriodicOverallReport = {
      id: reportId,
      consultantId: currentUser.id,
      consultantName: currentUser.fullName,
      consultantCode: currentUser.consultantCode,
      periodType,
      dateShamsi: curShamsi.formatted,
      periodLabel: currentPeriodLabel,
      summary: summary.trim(),
      keyAchievements: keyAchievements.trim(),
      challengesOrBarriers: challengesOrBarriers.trim(),
      plansOrPriorities: plansOrPriorities.trim(),
      weeklyFocusGuilds: periodType === 'weekly' ? weeklyFocusGuilds.trim() : undefined,
      monthlyStrategicNotes: periodType === 'monthly' ? monthlyStrategicNotes.trim() : undefined,
      selfRating,
      submittedAt: getCurrentTimeFormatted(),
      createdAt: new Date().toISOString(),
      managerStatus: 'pending'
    };

    savePeriodicReport(newReport);
    setStoredReports(getStoredPeriodicReports());
    setSaveSuccess(true);

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 }
    });

    setTimeout(() => {
      setSaveSuccess(false);
      if (onReportSubmitted) onReportSubmitted();
    }, 2000);
  };

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-slate-100 animate-fadeIn">

      {/* HEADER BANNER: PURPOSE & NOTICES */}
      <div className="navy-card-glass rounded-3xl border border-amber-500/40 p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>سامانه گزارشات کلی و دوره‌ای مشاوران</span>
                  <span className="text-xs bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2.5 py-0.5 rounded-full font-normal">
                    نظارت مستقیم مدیریت
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  تحلیل‌های شخصی از سطرهای تکی جدا شده و به صورت گزارشات تفصیلی روزانه، هفتگی و ماهانه ثبت و توسط مدیر ارزیابی می‌شود.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Compliance Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2 ${
              todayDailyReport 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300 animate-pulse'
            }`}>
              <CalendarCheck className="w-4 h-4" />
              <span>روزانه امروز: {todayDailyReport ? '✅ ثبت شده' : '❌ نیاز به ثبت'}</span>
            </div>

            <div className={`px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2 ${
              thisWeekReport 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : todayIsThursday 
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 animate-bounce' 
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <CalendarDays className="w-4 h-4" />
              <span>هفتگی (پنج‌شنبه): {thisWeekReport ? '✅ ثبت شده' : todayIsThursday ? '⚡ موعد پنج‌شنبه' : 'در انتظار'}</span>
            </div>

            <div className={`px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2 ${
              thisMonthReport 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : todayIsMonthEnd 
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 animate-bounce' 
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <CalendarRange className="w-4 h-4" />
              <span>ماهانه: {thisMonthReport ? '✅ ثبت شده' : todayIsMonthEnd ? '⚡ موعد پایان ماه' : 'در انتظار'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SPECIAL DATE ALERTS */}
      {todayIsThursday && !thisWeekReport && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/60 flex items-center gap-3 text-amber-200 text-xs sm:text-sm">
          <Flame className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
          <div className="flex-1">
            <span className="font-bold">یادآوری ویژه پنج‌شنبه: </span>
            امروز پنج‌شنبه است و موعد تحویل «گزارش هفتگی». لطفاً پس از گزارش روزانه، تب گزارش هفتگی را انتخاب کرده و خلاصه عملکرد هفته را ارسال نمایید.
          </div>
        </div>
      )}

      {todayIsMonthEnd && !thisMonthReport && (
        <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/60 flex items-center gap-3 text-purple-200 text-xs sm:text-sm">
          <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">موعد تحویل گزارش ماهانه: </span>
            در روزهای پایانی ماه قرار داریم. ارزیابی راهبردی ماهانه شما ملاک محاسبه کارایی و پاداش مدیریتی است.
          </div>
        </div>
      )}

      {/* FORM CARD */}
      <div className="navy-card-glass rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-6">
        
        {/* Period Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">نوع گزارش:</span>
            <div className="flex items-center p-1 bg-[#081525] border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setPeriodType('daily')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  periodType === 'daily'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>گزارش روزانه</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('weekly')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 relative ${
                  periodType === 'weekly'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>گزارش هفتگی (پنج‌شنبه)</span>
                {todayIsThursday && !thisWeekReport && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1.5 left-1.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 relative ${
                  periodType === 'monthly'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>گزارش ماهانه (پایان ماه)</span>
                {todayIsMonthEnd && !thisMonthReport && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1.5 left-1.5" />
                )}
              </button>
            </div>
          </div>

          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-mono">
            📅 {currentPeriodLabel}
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Section 1: Summary of Activity */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>خلاصه و ارزیابی جامع فعالیت دوره (الزامی) *</span>
            </label>
            <p className="text-[11px] text-slate-400">
              تعداد و کیفیت تماس‌ها، اصناف هدف، نرخ پاسخگویی و کلیات مذاکرات انجام‌شده:
            </p>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="مثال: امروز با ۱۰ کارفرما در صنف قطعات خودرو تماس برقرار شد. دغدغه اصلی عموم کارفرمایان..."
              className="w-full bg-[#081525] border border-slate-700 focus:border-amber-400 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/20 leading-relaxed"
            />
          </div>

          {/* Section 2: Key Achievements & Meetings Booked */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>دستاوردها، جلسات ست‌شده و پرونده‌های در شرف قرارداد</span>
            </label>
            <textarea
              rows={2}
              value={keyAchievements}
              onChange={(e) => setKeyAchievements(e.target.value)}
              placeholder="جلسات حضوری ست‌شده، توافقات اولیه، کارفرمایانی که پیش‌فاکتور دریافت کرده‌اند..."
              className="w-full bg-[#081525] border border-slate-700 focus:border-emerald-400 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 leading-relaxed"
            />
          </div>

          {/* Section 3: Challenges, Objections & Market Feedback */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>چالش‌ها، مقاومت کارفرمایان و نیازمندی‌های پشتیبانی</span>
            </label>
            <textarea
              rows={2}
              value={challengesOrBarriers}
              onChange={(e) => setChallengesOrBarriers(e.target.value)}
              placeholder="شبهات حقوقی کارفرمایان، مقایسه با رقبا، مدارک و نمونه فرم‌هایی که نیاز دارید..."
              className="w-full bg-[#081525] border border-slate-700 focus:border-rose-400 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-400/20 leading-relaxed"
            />
          </div>

          {/* Section 4: Plans & Priorities for Next Period */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>برنامه‌ها و اولویت‌های کاری دوره آتی</span>
            </label>
            <textarea
              rows={2}
              value={plansOrPriorities}
              onChange={(e) => setPlansOrPriorities(e.target.value)}
              placeholder="پیگیری‌های قطعی فردا/هفته بعد، اصناف جدیدی که بررسی خواهند شد..."
              className="w-full bg-[#081525] border border-slate-700 focus:border-sky-400 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/20 leading-relaxed"
            />
          </div>

          {/* Conditional: Weekly focus guilds */}
          {periodType === 'weekly' && (
            <div className="space-y-1.5 bg-[#081525] p-4 rounded-2xl border border-amber-500/20">
              <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>اصناف و خوشه‌های صنعتی تمرکز این هفته:</span>
              </label>
              <input
                type="text"
                value={weeklyFocusGuilds}
                onChange={(e) => setWeeklyFocusGuilds(e.target.value)}
                placeholder="مثال: صنایع ریخته‌گری، بسته‌بندی، مواد غذایی، پیمانکاران عمرانی..."
                className="w-full bg-[#0c1e34] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          )}

          {/* Conditional: Monthly strategic notes */}
          {periodType === 'monthly' && (
            <div className="space-y-1.5 bg-[#081525] p-4 rounded-2xl border border-purple-500/20">
              <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>پیشنهادات راهبردی توسعه بازار برای مدیریت:</span>
              </label>
              <textarea
                rows={2}
                value={monthlyStrategicNotes}
                onChange={(e) => setMonthlyStrategicNotes(e.target.value)}
                placeholder="پیشنهاد پکیج‌های جدید خدماتی، تغییر شیوه مذاکره، برگزاری سمینار یا جذب لید تخصصی..."
                className="w-full bg-[#0c1e34] border border-slate-700 focus:border-purple-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          )}

          {/* Self-Rating Star Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#081525] border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block">خودارزیابی انضباط و اثربخشی در این دوره:</span>
              <span className="text-[11px] text-slate-400 block">نمره خود به کیفیت پیگیری‌ها و تحقق تارگت را مشخص کنید.</span>
            </div>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelfRating(star)}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= selfRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
              <span className="text-sm font-black text-amber-400 mr-2 font-mono">
                {toPersianDigits(selfRating)} از ۵
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              * این گزارش بلافاصله در داشبورد نظارتی مدیریت و ماتریس انضباطی منعکس می‌گردد.
            </span>

            <button
              type="submit"
              className="px-8 py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 shadow-xl shadow-amber-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
            >
              <Send className="w-4 h-4" />
              <span>ثبت نهایی {periodType === 'daily' ? 'گزارش روزانه' : periodType === 'weekly' ? 'گزارش هفتگی' : 'گزارش ماهانه'}</span>
            </button>
          </div>

          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>گزارش کلی شما با موفقیت ثبت و به پنل نظارت مدیریت ارسال گردید.</span>
            </div>
          )}

        </form>
      </div>

      {/* RECENT SUBMITTED PERIODIC REPORTS LIST */}
      <div className="navy-card-glass rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>سوابق گزارشات دوره‌ای ثبت‌شده شما ({toPersianDigits(myPeriodicReports.length)} گزارش)</span>
          </h3>
          <span className="text-xs text-slate-400">نمایش آخرین ارزیابی‌ها و وضعیت تایید مدیریت</span>
        </div>

        {myPeriodicReports.length === 0 ? (
          <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl text-xs">
            هنوز هیچ گزارش کلی (روزانه/هفتگی/ماهانه) ثبت نشده است. از فرم بالا اولین گزارش خود را ثبت فرمایید.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPeriodicReports.map((rep) => {
              const statusBadge = 
                rep.managerStatus === 'rewarded' ? { label: '🌟 تشویق و پاداش منظور شد', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' } :
                rep.managerStatus === 'approved' ? { label: '✅ تایید شده توسط مدیر', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' } :
                rep.managerStatus === 'warned' ? { label: '⚠️ دارای تذکر / کسر امتیاز', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' } :
                { label: '⏳ در انتظار بررسی مدیریت', bg: 'bg-slate-700/40 text-slate-300 border-slate-600' };

              return (
                <div 
                  key={rep.id} 
                  className="bg-[#081525] border border-slate-800 hover:border-amber-500/30 rounded-2xl p-4.5 space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        rep.periodType === 'daily' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        rep.periodType === 'weekly' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {rep.periodType === 'daily' ? 'روزانه' : rep.periodType === 'weekly' ? 'هفتگی' : 'ماهانه'}
                      </span>
                      <span className="text-xs font-bold text-white">{rep.periodLabel || rep.dateShamsi}</span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      ساعت {rep.submittedAt || '—'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 line-clamp-3 leading-relaxed bg-[#06101c] p-3 rounded-xl border border-slate-800/80">
                    {rep.summary}
                  </div>

                  {rep.keyAchievements && (
                    <div className="text-[11px] text-emerald-300 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{rep.keyAchievements}</span>
                    </div>
                  )}

                  {/* Status & Feedback */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                    <span className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>

                    {rep.managerRating && (
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <span>امتیاز مدیر:</span>
                        <span className="font-bold font-mono">{toPersianDigits(rep.managerRating)} از ۵</span>
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleLoadReport(rep)}
                      className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer mr-auto"
                    >
                      مشاهده / ویرایش
                    </button>
                  </div>

                  {rep.managerFeedback && (
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                      <span className="font-bold block text-[11px] text-amber-400">بازخورد مدیریت:</span>
                      <p className="leading-relaxed">{rep.managerFeedback}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
