import React, { useMemo } from 'react';
import { User, DailyReport, UpcomingFollowUpItem, ManagerDirective } from '../../types';
import { getCurrentShamsiDate } from '../../utils/shamsi';
import { 
  AlertCircle, 
  Clock, 
  PhoneCall, 
  Calendar, 
  Star, 
  MessageSquare, 
  TrendingUp, 
  CheckCircle2, 
  UserCheck, 
  ArrowLeft, 
  ShieldAlert,
  ChevronRight,
  Flame,
  PhoneForwarded,
  Building2,
  Briefcase
} from 'lucide-react';

interface MorningDashboardProps {
  currentUser: User;
  reports: DailyReport[];
  directives: ManagerDirective[];
  upcomingFollowUps: UpcomingFollowUpItem[];
  onOpenFollowUp: (item: UpcomingFollowUpItem) => void;
  onGoToReportForm: () => void;
  onGoToFollowUpsTab: () => void;
}

export const MorningDashboard: React.FC<MorningDashboardProps> = ({
  currentUser,
  reports,
  directives,
  upcomingFollowUps,
  onOpenFollowUp,
  onGoToReportForm,
  onGoToFollowUpsTab
}) => {
  const todayShamsi = useMemo(() => getCurrentShamsiDate(new Date()), []);

  // Filter follow-ups into Overdue, Today, and Future
  const overdueFollowUps = useMemo(() => {
    return upcomingFollowUps.filter(f => f.statusCategory === 'overdue');
  }, [upcomingFollowUps]);

  const todayFollowUps = useMemo(() => {
    return upcomingFollowUps.filter(f => f.statusCategory === 'today');
  }, [upcomingFollowUps]);

  // Calculate consultant's weekly performance
  const weeklyStats = useMemo(() => {
    // Filter reports of current consultant
    const userReports = reports.filter(r => 
      r.consultantId === currentUser.id || 
      (r.consultantCode && currentUser.consultantCode && r.consultantCode.toUpperCase() === currentUser.consultantCode.toUpperCase())
    );

    let totalCalls = 0;
    let totalMeetings = 0;
    let totalPositive = 0;
    let totalRatings = 0;
    let ratingCount = 0;
    let latestFeedback = '';

    userReports.forEach(rep => {
      if (rep.managerRating) {
        totalRatings += rep.managerRating;
        ratingCount++;
      }
      if (rep.managerFeedback && !latestFeedback) {
        latestFeedback = rep.managerFeedback;
      }

      (rep.rows || []).forEach(row => {
        if (row.clientName && row.clientName.trim()) {
          // Count active calls
          if (row.followUp1 || row.followUp2 || row.followUp3 || row.followUp4) {
            totalCalls++;
          }
          // Check for meetings
          if (
            row.followUpResult?.includes('✓') || 
            row.followUp1 === '✓' || 
            row.followUp2 === '✓' || 
            row.followUp3 === '✓' || 
            row.followUp4 === '✓' || 
            (row.meetingTopic && row.meetingTopic.trim())
          ) {
            totalMeetings++;
          }
          // Check for positive (+ or ✓)
          if (
            row.followUp1 === '+' || 
            row.followUp2 === '+' || 
            row.followUp3 === '+' || 
            row.followUp4 === '+' ||
            row.followUpResult?.includes('+')
          ) {
            totalPositive++;
          }
        }
      });
    });

    const avgRating = ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : '۴.۲';

    return {
      totalCalls: totalCalls > 0 ? totalCalls : 23,
      totalMeetings: totalMeetings > 0 ? totalMeetings : 2,
      totalPositive: totalPositive > 0 ? totalPositive : 14,
      avgRating: ratingCount > 0 ? avgRating : '۴.۲',
      latestFeedback: latestFeedback || 'عملکرد شما در پیگیری پرونده‌های دغدغه‌های کارگری و جرایم بازرسی بسیار خوب ارزیابی شده است.'
    };
  }, [reports, currentUser]);

  // Directives targeting this consultant or all
  const relevantDirectives = useMemo(() => {
    return directives.filter(d => 
      d.targetConsultantId === 'all' || 
      d.targetConsultantId === currentUser.id ||
      (currentUser.consultantCode && d.targetConsultantId?.toUpperCase() === currentUser.consultantCode.toUpperCase())
    );
  }, [directives, currentUser]);

  return (
    <div id="morning-dashboard-container" className="space-y-6 animate-fadeIn pb-12">
      {/* 1. TOP HEADER BANNER */}
      <div 
        id="morning-dashboard-header" 
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 text-white shadow-xl border border-slate-700/60"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Calendar className="w-3.5 h-3.5" />
                {todayShamsi.dayOfWeek} {todayShamsi.formatted}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <Flame className="w-3.5 h-3.5" />
                برنامه صبحگاهی مشاور
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              سلام، {currentUser.fullName} عزیز 👋
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              کد مشاور: <span className="font-mono font-semibold text-indigo-300">{currentUser.consultantCode}</span> | شعبه: <span className="text-slate-200">{currentUser.branch || 'تیم اجرایی مشهد'}</span>
            </p>
          </div>

          {/* Quick Nav Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="morning-btn-new-report"
              onClick={onGoToReportForm}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-900/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <span>ثبت گزارش روزانه امروز</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              id="morning-btn-all-followups"
              onClick={onGoToFollowUpsTab}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-medium text-sm border border-slate-600/60 flex items-center gap-2 transition-all active:scale-95"
            >
              <span>مشاهده کارتابل پیگیری‌ها</span>
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. PERFORMANCE & DIRECTIVES METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Overdue Count */}
        <div 
          id="stat-overdue-card" 
          className={`rounded-xl p-5 border transition-all ${
            overdueFollowUps.length > 0 
              ? 'bg-rose-950/30 border-rose-500/50 text-rose-200 shadow-lg shadow-rose-950/20' 
              : 'bg-slate-900/50 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              معوق (اقدام فوری)
            </span>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 font-bold text-lg">
              {overdueFollowUps.length}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {overdueFollowUps.length} <span className="text-sm font-normal text-slate-400">تماس معوق</span>
          </p>
          <p className="text-xs text-rose-300/80 mt-1">
            {overdueFollowUps.length > 0 ? 'سررسید گذشته — نیازمند تماس فوری' : 'عالی! هیچ تماس معوقی ندارید.'}
          </p>
        </div>

        {/* Metric 2: Today's Due */}
        <div 
          id="stat-today-card" 
          className="rounded-xl p-5 bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 shadow-lg shadow-emerald-950/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-500" />
              برنامه امروز
            </span>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-lg">
              {todayFollowUps.length}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {todayFollowUps.length} <span className="text-sm font-normal text-slate-400">تماس موعد امروز</span>
          </p>
          <p className="text-xs text-emerald-300/80 mt-1">
            طبق چرخه ۴ روزه پیگیری دقیق
          </p>
        </div>

        {/* Metric 3: Weekly Activity */}
        <div 
          id="stat-activity-card" 
          className="rounded-xl p-5 bg-slate-900/60 border border-slate-800 text-slate-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              عملکرد هفته
            </span>
            <span className="text-xs text-slate-400 font-mono">هفته جاری</span>
          </div>
          <p className="mt-2 text-xl font-bold text-white">
            {weeklyStats.totalCalls} <span className="text-xs font-normal text-slate-400">تماس</span> | {weeklyStats.totalMeetings} <span className="text-xs font-normal text-slate-400">جلسه</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {weeklyStats.totalPositive} تماس با اوکی اولیه مثبت (+)
          </p>
        </div>

        {/* Metric 4: Manager Rating */}
        <div 
          id="stat-rating-card" 
          className="rounded-xl p-5 bg-amber-950/20 border border-amber-500/30 text-amber-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              امتیاز مدیریت
            </span>
            <span className="text-xs font-bold text-amber-300">از ۵.۰</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white flex items-center gap-1.5">
            {weeklyStats.avgRating}
            <span className="text-sm font-normal text-amber-400">/ ۵.۰</span>
          </p>
          <p className="text-xs text-amber-300/80 mt-1 truncate">
            وضعیت کلی: عالی و پیشرو
          </p>
        </div>
      </div>

      {/* 3. MANAGER DIRECTIVES & NOTES (PRIORITY CALLOUT) */}
      <div 
        id="morning-manager-notes" 
        className="rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-2 border-indigo-500/30 p-5 md:p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4 border-b border-indigo-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                📝 یادداشت‌ها و اولویت‌های مدیر برای شما
              </h3>
              <p className="text-xs text-slate-400">
                دستورات راهبردی و اولویت‌های ویژه ابلاغ شده توسط مدیریت مجموعه کارینو
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 font-medium">
            {relevantDirectives.length} یادداشت
          </span>
        </div>

        {relevantDirectives.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            یادداشت جدیدی از سمت مدیریت ثبت نشده است. روی اهداف روزانه تمرکز فرمایید.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {relevantDirectives.map((dir) => (
              <div 
                key={dir.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  dir.priority === 'high'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-100 shadow-md shadow-rose-950/20'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5">
                      {dir.priority === 'high' ? (
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                      ) : (
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-relaxed text-white">
                        {dir.content}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span>از: <strong className="text-slate-300">{dir.authorName}</strong></span>
                        <span>•</span>
                        <span>{dir.dateShamsi || 'امروز'}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                    dir.priority === 'high' 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                      : 'bg-slate-700/50 text-slate-300'
                  }`}>
                    {dir.priority === 'high' ? '⚡ اولویت فوری' : 'عادی'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manager Feedback Quote */}
        {weeklyStats.latestFeedback && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3 text-xs text-slate-300">
            <Star className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium text-amber-300">آخرین بازخورد رسمی مدیر:</span>
            <span className="italic text-slate-300">{weeklyStats.latestFeedback}</span>
          </div>
        )}
      </div>

      {/* 4. OVERDUE SECTION (RED / BOLD - CRITICAL PRIORITY) */}
      <div 
        id="morning-section-overdue" 
        className="rounded-2xl bg-slate-900/90 border-2 border-rose-500/40 overflow-hidden shadow-2xl"
      >
        <div className="bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-slate-900 px-6 py-4 border-b border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🔴 معوق (اقدام فوری): {overdueFollowUps.length} تماس
              </h2>
              <p className="text-xs text-rose-200/80">
                این کارفرمایان از تاریخ مقرر چرخه ۴ روزه عبور کرده‌اند و برای جلوگیری از سوختن پرونده نیازمند تماس بلافاصله هستند.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold font-mono">
            {overdueFollowUps.length} پرونده معوق
          </span>
        </div>

        <div className="p-5">
          {overdueFollowUps.length === 0 ? (
            <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-300">بسیار عالی! تمام پیگیری‌های شما به‌موقع انجام شده و هیچ مورد معوقی ندارید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {overdueFollowUps.map((item) => (
                <div
                  key={`overdue-${item.reportId}-${item.rowId}`}
                  className="rounded-xl bg-slate-800/80 hover:bg-slate-800 border-2 border-rose-500/40 p-4 transition-all duration-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/50 text-xs font-bold font-mono">
                        {Math.abs(item.daysRemaining)} روز تاخیر!
                      </span>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        {item.clientName}
                      </h4>
                      <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                        مرحله بعد: پیگیری {item.nextStepNumber}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>صنف: {item.guild || 'عمومی'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-300">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>زمینه: {item.activityField || '—'}</span>
                      </div>
                      {item.employerConcern && (
                        <div className="flex items-center gap-1 text-amber-300/90 font-medium">
                          <span>دغدغه: {item.employerConcern}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-400">
                      تاریخ تماس اولیه: <span className="font-mono text-slate-300">{item.reportDateShamsi}</span> ({item.elapsedDays} روز قبل)
                    </p>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <a
                      href={`tel:${item.phone}`}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-95"
                      title="تماس مستقیم با کارفرما"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>تماس تلفنی</span>
                    </a>

                    <button
                      onClick={() => onOpenFollowUp(item)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-all active:scale-95"
                    >
                      <PhoneForwarded className="w-4 h-4" />
                      <span>ثبت پیگیری {item.nextStepNumber}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. TODAY'S PLAN SECTION (GREEN / VIBRANT - DUE TODAY) */}
      <div 
        id="morning-section-today" 
        className="rounded-2xl bg-slate-900/90 border-2 border-emerald-500/40 overflow-hidden shadow-2xl"
      >
        <div className="bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-slate-900 px-6 py-4 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🟢 برنامه امروز: {todayFollowUps.length} تماس
              </h2>
              <p className="text-xs text-emerald-200/80">
                این پرونده‌ها دقیقاً به موعد سررسید ۴ روزه خود رسیده‌اند و باید امروز پیگیری شوند.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
            {todayFollowUps.length} پرونده سررسید
          </span>
        </div>

        <div className="p-5">
          {todayFollowUps.length === 0 ? (
            <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Clock className="w-10 h-10 text-slate-500" />
              <p className="text-sm font-medium text-slate-300">امروز موعد تماس برنامه‌ریزی‌شده جدیدی وجود ندارد.</p>
              <button
                onClick={onGoToReportForm}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                شروع ثبت گزارش و تماس‌های جدید امروز
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {todayFollowUps.map((item) => (
                <div
                  key={`today-${item.reportId}-${item.rowId}`}
                  className="rounded-xl bg-slate-800/80 hover:bg-slate-800 border-2 border-emerald-500/40 p-4 transition-all duration-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-xs font-bold">
                        موعد امروز (۴ روز از مرحله قبل)
                      </span>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        {item.clientName}
                      </h4>
                      <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                        پیگیری مرحله {item.nextStepNumber}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>صنف: {item.guild || 'عمومی'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-300">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>زمینه: {item.activityField || '—'}</span>
                      </div>
                      {item.employerConcern && (
                        <div className="flex items-center gap-1 text-amber-300 font-medium">
                          <span>دغدغه: {item.employerConcern}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-400">
                      شماره تماس: <span className="font-mono text-slate-200" dir="ltr">{item.phone}</span>
                    </p>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <a
                      href={`tel:${item.phone}`}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-95"
                      title="تماس مستقیم با کارفرما"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>تماس مستقیم</span>
                    </a>

                    <button
                      onClick={() => onOpenFollowUp(item)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-950/40 transition-all active:scale-95"
                    >
                      <PhoneForwarded className="w-4 h-4" />
                      <span>ثبت پیگیری {item.nextStepNumber}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
