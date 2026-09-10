import React, { useState, useMemo } from 'react';
import { User, DailyReport, PeriodicOverallReport, PeriodicReportType, ManagerDirective } from '../../types';
import { 
  getStoredPeriodicReports, 
  updatePeriodicReportManagerStatus,
  saveDirective,
  getStoredUsers,
  getStoredReports
} from '../../services/storage';
import { 
  getCurrentShamsiDate, 
  toPersianDigits, 
  isThursday, 
  isEndOfShamsiMonth, 
  formatShamsiDateLong,
  getCurrentTimeFormatted
} from '../../utils/shamsi';
import { FollowUpBadge } from '../common/FollowUpBadge';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { 
  CalendarCheck, 
  CalendarDays, 
  CalendarRange, 
  Search, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Star, 
  MessageSquare, 
  Flame, 
  Sparkles,
  Filter,
  UserCheck,
  UserX,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  Eye,
  ShieldCheck
} from 'lucide-react';

interface PeriodicReportsManagerProps {
  currentUser: User;
  allReports?: DailyReport[];
  users?: User[];
  onReload?: () => void;
}

export const PeriodicReportsManager: React.FC<PeriodicReportsManagerProps> = ({ 
  currentUser, 
  allReports: propReports, 
  users: propUsers,
  onReload 
}) => {
  const curShamsi = getCurrentShamsiDate();
  const [users, setUsers] = useState<User[]>(propUsers || getStoredUsers());
  const [periodicReports, setPeriodicReports] = useState<PeriodicOverallReport[]>(getStoredPeriodicReports());
  const [allDailyReports, setAllDailyReports] = useState<DailyReport[]>(propReports || getStoredReports());

  // Sub-views inside this Manager section:
  // 1. 'matrix': ماتریس انضباط و پایش غیبت گزارش‌ها
  // 2. 'reports': فهرست و بررسی محتوایی گزارشات دوره‌ای
  // 3. 'followup_dates': جدول رهگیری دقیق تقویمی تاریخ پیگیری‌های ۱ تا ۴
  const [activeSection, setActiveSection] = useState<'matrix' | 'reports' | 'followup_dates'>('matrix');

  // Filter states for reports
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [selectedConsultantFilter, setSelectedConsultantFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rewarded' | 'warned'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected report for review modal
  const [reviewingReport, setReviewingReport] = useState<PeriodicOverallReport | null>(null);
  const [managerRating, setManagerRating] = useState<number>(5);
  const [managerFeedback, setManagerFeedback] = useState<string>('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Warning/Directive Modal State
  const [warningModalTarget, setWarningModalTarget] = useState<{ consultant: User; reason: string } | null>(null);
  const [warningMessage, setWarningMessage] = useState('');

  // Follow-up dates table search
  const [followUpSearch, setFollowUpSearch] = useState('');
  const [followUpConsultantFilter, setFollowUpConsultantFilter] = useState('all');

  // Refresh data from storage
  const reloadData = () => {
    setUsers(getStoredUsers());
    setPeriodicReports(getStoredPeriodicReports());
    setAllDailyReports(getStoredReports());
  };

  // Active consultants list
  const consultants = useMemo(() => {
    return users.filter(u => u.role === 'consultant');
  }, [users]);

  // Map consultants to their periodic report status
  const consultantComplianceList = useMemo(() => {
    return consultants.map(c => {
      // Find today's daily report
      const dailyRep = periodicReports.find(r => 
        (r.consultantId === c.id || (c.consultantCode && r.consultantCode?.toUpperCase() === c.consultantCode.toUpperCase())) &&
        r.periodType === 'daily' &&
        r.dateShamsi === curShamsi.formatted
      );

      // Find this week's weekly report
      const weeklyRep = periodicReports.find(r => 
        (r.consultantId === c.id || (c.consultantCode && r.consultantCode?.toUpperCase() === c.consultantCode.toUpperCase())) &&
        r.periodType === 'weekly' &&
        r.dateShamsi === curShamsi.formatted
      );

      // Find this month's monthly report
      const monthlyRep = periodicReports.find(r => 
        (r.consultantId === c.id || (c.consultantCode && r.consultantCode?.toUpperCase() === c.consultantCode.toUpperCase())) &&
        r.periodType === 'monthly' &&
        r.dateShamsi?.startsWith(`${curShamsi.year}/${String(curShamsi.month).padStart(2, '0')}`)
      );

      // Count total reports
      const totalReps = periodicReports.filter(r => 
        r.consultantId === c.id || (c.consultantCode && r.consultantCode?.toUpperCase() === c.consultantCode.toUpperCase())
      );

      return {
        consultant: c,
        todayDailyReport: dailyRep,
        thisWeekReport: weeklyRep,
        thisMonthReport: monthlyRep,
        totalPeriodicReportsCount: totalReps.length,
        hasMissingDaily: !dailyRep,
        hasMissingWeekly: isThursday(curShamsi.formatted) && !weeklyRep,
        hasMissingMonthly: isEndOfShamsiMonth(curShamsi.formatted) && !monthlyRep
      };
    });
  }, [consultants, periodicReports, curShamsi]);

  // Filtered periodic reports list
  const filteredReports = useMemo(() => {
    return periodicReports.filter(r => {
      if (selectedPeriodFilter !== 'all' && r.periodType !== selectedPeriodFilter) return false;
      if (selectedConsultantFilter !== 'all' && r.consultantId !== selectedConsultantFilter && r.consultantCode !== selectedConsultantFilter) return false;
      if (selectedStatusFilter !== 'all' && (r.managerStatus || 'pending') !== selectedStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = r.consultantName?.toLowerCase().includes(q);
        const matchesSummary = r.summary?.toLowerCase().includes(q);
        const matchesLabel = r.periodLabel?.toLowerCase().includes(q);
        const matchesDate = r.dateShamsi?.includes(q);
        if (!matchesName && !matchesSummary && !matchesLabel && !matchesDate) return false;
      }
      return true;
    });
  }, [periodicReports, selectedPeriodFilter, selectedConsultantFilter, selectedStatusFilter, searchQuery]);

  // Extract all rows with follow-up dates for the Calendar Follow-up Dates Table
  const allFollowUpRows = useMemo(() => {
    const list: {
      reportId: string;
      consultantName: string;
      consultantCode?: string;
      reportDateShamsi: string;
      guild?: string;
      clientName: string;
      activityField: string;
      phone: string;
      address: string;
      employerConcern: string;
      followUp1: string;
      followUp1DateShamsi?: string;
      followUp2: string;
      followUp2DateShamsi?: string;
      followUp3: string;
      followUp3DateShamsi?: string;
      followUp4: string;
      followUp4DateShamsi?: string;
      followUpResult: string;
      meetingTopic?: string;
    }[] = [];

    allDailyReports.forEach(rep => {
      rep.rows.forEach(row => {
        list.push({
          reportId: rep.id,
          consultantName: rep.consultantName,
          consultantCode: rep.consultantCode,
          reportDateShamsi: rep.dateShamsi,
          guild: rep.guild,
          clientName: row.clientName,
          activityField: row.activityField,
          phone: row.phone,
          address: row.address,
          employerConcern: row.employerConcern,
          followUp1: row.followUp1,
          followUp1DateShamsi: row.followUp1DateShamsi || rep.dateShamsi,
          followUp2: row.followUp2,
          followUp2DateShamsi: row.followUp2DateShamsi || (row.followUp2 ? rep.dateShamsi : undefined),
          followUp3: row.followUp3,
          followUp3DateShamsi: row.followUp3DateShamsi || (row.followUp3 ? rep.dateShamsi : undefined),
          followUp4: row.followUp4,
          followUp4DateShamsi: row.followUp4DateShamsi || (row.followUp4 ? rep.dateShamsi : undefined),
          followUpResult: row.followUpResult,
          meetingTopic: row.meetingTopic
        });
      });
    });

    return list.filter(item => {
      if (followUpConsultantFilter !== 'all' && item.consultantName !== followUpConsultantFilter && item.consultantCode !== followUpConsultantFilter) {
        return false;
      }
      if (followUpSearch.trim()) {
        const q = followUpSearch.toLowerCase().trim();
        const matchesClient = item.clientName?.toLowerCase().includes(q);
        const matchesPhone = item.phone?.includes(q);
        const matchesField = item.activityField?.toLowerCase().includes(q);
        const matchesConcern = item.employerConcern?.toLowerCase().includes(q);
        const matchesConsultant = item.consultantName?.toLowerCase().includes(q);
        if (!matchesClient && !matchesPhone && !matchesField && !matchesConcern && !matchesConsultant) return false;
      }
      return true;
    });
  }, [allDailyReports, followUpConsultantFilter, followUpSearch]);

  // Handle Review Modal submission
  const handleSaveReview = (status: 'approved' | 'rewarded' | 'warned') => {
    if (!reviewingReport) return;

    updatePeriodicReportManagerStatus(
      reviewingReport.id,
      status,
      managerFeedback.trim() || undefined,
      managerRating
    );

    setPeriodicReports(getStoredPeriodicReports());
    setActionSuccessMessage(
      status === 'rewarded' ? 'پاداش و تشویق عملکرد با موفقیت ثبت شد.' :
      status === 'approved' ? 'گزارش با موفقیت تایید شد.' :
      'تذکر انضباطی برای این گزارش ثبت گردید.'
    );

    if (status === 'rewarded') {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    }

    setTimeout(() => {
      setActionSuccessMessage(null);
      setReviewingReport(null);
    }, 1200);
  };

  // Open directive warning modal for missing reports
  const handleOpenWarningModal = (consultant: User, reason: string) => {
    setWarningModalTarget({ consultant, reason });
    setWarningMessage(`همکار گرامی جناب/سرکار ${consultant.fullName}، گزارش دوره‌ای موعد امروز (${curShamsi.formatted}) هنوز در سامانه کارینو ثبت نشده است. لطفاً فوراً نسبت به ارسال اقدام فرمایید.`);
  };

  // Send directive/warning
  const handleSendWarning = () => {
    if (!warningModalTarget) return;

    const newDirective: ManagerDirective = {
      id: `dir-${Date.now()}`,
      authorName: currentUser.fullName || 'مدیریت ارشد',
      authorId: currentUser.id,
      content: warningMessage.trim(),
      priority: 'high',
      targetConsultantId: warningModalTarget.consultant.id,
      targetConsultantName: warningModalTarget.consultant.fullName,
      createdAt: new Date().toISOString(),
      dateShamsi: curShamsi.formatted
    };

    saveDirective(newDirective);
    alert(`تذکر انضباطی با موفقیت در کارتابل مشاور «${warningModalTarget.consultant.fullName}» درج گردید.`);
    setWarningModalTarget(null);
  };

  // Export Follow-up dates table to Excel
  const handleExportFollowUpExcel = () => {
    const data = allFollowUpRows.map(r => ({
      'مشاور مسئول': r.consultantName,
      'کد مشاور': r.consultantCode || '—',
      'تاریخ گزارش اولیه': r.reportDateShamsi,
      'صنف / اتحادیه': r.guild || '—',
      'نام کارفرما': r.clientName,
      'زمینه فعالیت': r.activityField,
      'تلفن تماس': r.phone,
      'آدرس': r.address,
      'دغدغه اصلی کارفرما': r.employerConcern,
      'نماد پیگیری ۱': r.followUp1,
      'تاریخ دقیق پیگیری ۱': r.followUp1DateShamsi || r.reportDateShamsi,
      'نماد پیگیری ۲': r.followUp2 || '—',
      'تاریخ دقیق پیگیری ۲': r.followUp2DateShamsi || '—',
      'نماد پیگیری ۳': r.followUp3 || '—',
      'تاریخ دقیق پیگیری ۳': r.followUp3DateShamsi || '—',
      'نماد پیگیری ۴': r.followUp4 || '—',
      'تاریخ دقیق پیگیری ۴': r.followUp4DateShamsi || '—',
      'نتیجه پیگیری': r.followUpResult,
      'موضوع جلسه ست شده': r.meetingTopic || '—'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'رهگیری تقویمی پیگیری‌ها');
    XLSX.writeFile(wb, `Karino_FollowUp_Calendar_Dates_${curShamsi.formatted.replace(/\//g, '')}.xlsx`);
  };

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-slate-100 animate-fadeIn">

      {/* 1. HEADER HERO BANNER */}
      <div className="navy-card-glass rounded-3xl border border-amber-500/40 p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>مرکز پایش گزارشات دوره‌ای و رهگیری تقویمی پیگیری‌ها</span>
                  <span className="text-xs bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-full font-normal">
                    نظارت ستادی مدیریت
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  پایش وضعیت انضباط گزارشات روزانه، هفتگی و ماهانه • برجسته‌سازی خودکار غیبت‌ها و موارد از قلم افتاده به رنگ قرمز • رهگیری تاریخ دقیق هر پیگیری ۱ تا ۴
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-[#081525]/90 border border-slate-800 px-4 py-2.5 rounded-2xl text-center min-w-[110px]">
              <span className="text-[11px] text-slate-400 block">کل مشاوران</span>
              <span className="text-lg font-black text-white">{toPersianDigits(consultants.length)} نفر</span>
            </div>

            <div className="bg-emerald-950/60 border border-emerald-500/40 px-4 py-2.5 rounded-2xl text-center min-w-[110px]">
              <span className="text-[11px] text-emerald-300 block">ثبت‌شده امروز</span>
              <span className="text-lg font-black text-emerald-400">
                {toPersianDigits(consultantComplianceList.filter(c => !c.hasMissingDaily).length)} مشاور
              </span>
            </div>

            <div className="bg-rose-950/60 border border-rose-500/40 px-4 py-2.5 rounded-2xl text-center min-w-[110px]">
              <span className="text-[11px] text-rose-300 block">فاقد گزارش امروز (قرمز)</span>
              <span className="text-lg font-black text-rose-400">
                {toPersianDigits(consultantComplianceList.filter(c => c.hasMissingDaily).length)} مشاور
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECTION NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSection('matrix')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeSection === 'matrix'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-[#081525] border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>ماتریس انضباط گزارش‌دهی و پایش غیبت‌ها</span>
          {consultantComplianceList.some(c => c.hasMissingDaily) && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('reports')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeSection === 'reports'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-[#081525] border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>بررسی محتوایی گزارشات ({toPersianDigits(periodicReports.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('followup_dates')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeSection === 'followup_dates'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-[#081525] border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>رهگیری تقویمی تاریخ پیگیری‌های ۱ تا ۴</span>
          <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/30">
            تفکیک شده از چرخه ۴ روزه
          </span>
        </button>
      </div>

      {/* SECTION 1: COMPLIANCE MATRIX (RED FOR MISSING REPORTS) */}
      {activeSection === 'matrix' && (
        <div className="space-y-5 animate-fadeIn">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#081525] p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>ماتریس پایش موعد گزارشات روزانه، پنج‌شنبه (هفتگی) و پایان ماه</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                گزارش‌های از قلم افتاده با رنگ قرمز علامت خورده و دکمه اخطار سریع برای درج تذکر در کارتابل مشاور در دسترس است.
              </p>
            </div>

            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-xl font-mono">
              📅 تقویم پایش: {formatShamsiDateLong(curShamsi.formatted)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {consultantComplianceList.map(({ consultant, todayDailyReport, thisWeekReport, thisMonthReport, totalPeriodicReportsCount, hasMissingDaily, hasMissingWeekly, hasMissingMonthly }) => {
              return (
                <div 
                  key={consultant.id} 
                  className={`rounded-2xl border p-5 space-y-4 transition-all ${
                    hasMissingDaily 
                      ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/30' 
                      : 'bg-[#081525] border-slate-800 hover:border-amber-500/30'
                  }`}
                >
                  {/* Top: Consultant Identity */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border ${
                        hasMissingDaily 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {consultant.fullName.slice(0, 1)}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{consultant.fullName}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          کد مشاور: {consultant.consultantCode} • {consultant.branch || 'تیم اجرایی'}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs bg-[#0c1e34] border border-slate-800 text-slate-300 px-2.5 py-1 rounded-xl font-mono">
                      {toPersianDigits(totalPeriodicReportsCount)} گزارش
                    </span>
                  </div>

                  {/* Periodic Compliance Status Slots */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                    
                    {/* 1. Daily Report Status */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      todayDailyReport 
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                        : 'bg-rose-950/70 border-rose-500 text-rose-200 font-bold'
                    }`}>
                      <div className="flex items-center gap-2">
                        {todayDailyReport ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
                        )}
                        <div>
                          <span className="block font-bold">گزارش روزانه امروز</span>
                          <span className="text-[10px] opacity-80 font-mono">
                            {todayDailyReport ? `ثبت شده در ساعت ${todayDailyReport.submittedAt || '—'}` : '🔴 ثبت نشده (از قلم افتاده)'}
                          </span>
                        </div>
                      </div>

                      {todayDailyReport ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingReport(todayDailyReport);
                            setManagerRating(todayDailyReport.managerRating || 5);
                            setManagerFeedback(todayDailyReport.managerFeedback || '');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] hover:bg-emerald-500/30 transition-colors"
                        >
                          مشاهده و بررسی
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenWarningModal(consultant, 'عدم ارسال گزارش روزانه موعد امروز')}
                          className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold text-[11px] hover:bg-rose-600 transition-colors shadow-sm shadow-rose-900"
                        >
                          ثبت تذکر انضباطی
                        </button>
                      )}
                    </div>

                    {/* 2. Weekly Report (Thursday) Status */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      thisWeekReport 
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                        : isThursday(curShamsi.formatted)
                          ? 'bg-rose-950/70 border-rose-500 text-rose-200 font-bold'
                          : 'bg-[#06101c] border-slate-800 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <span className="block font-bold">گزارش جامع هفتگی (پنج‌شنبه)</span>
                          <span className="text-[10px] opacity-80">
                            {thisWeekReport 
                              ? '✅ تحویل داده شد' 
                              : isThursday(curShamsi.formatted) 
                                ? '🔴 موعد امروز است و تحویل نشده' 
                                : 'در انتظار پنج‌شنبه بعدی'}
                          </span>
                        </div>
                      </div>

                      {thisWeekReport && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingReport(thisWeekReport);
                            setManagerRating(thisWeekReport.managerRating || 5);
                            setManagerFeedback(thisWeekReport.managerFeedback || '');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px]"
                        >
                          بررسی
                        </button>
                      )}
                    </div>

                    {/* 3. Monthly Strategic Report Status */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      thisMonthReport 
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                        : isEndOfShamsiMonth(curShamsi.formatted)
                          ? 'bg-rose-950/70 border-rose-500 text-rose-200 font-bold'
                          : 'bg-[#06101c] border-slate-800 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <CalendarRange className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <span className="block font-bold">گزارش راهبردی ماهانه</span>
                          <span className="text-[10px] opacity-80">
                            {thisMonthReport 
                              ? '✅ تحویل داده شد' 
                              : isEndOfShamsiMonth(curShamsi.formatted) 
                                ? '🔴 موعد پایان ماه و تحویل نشده' 
                                : 'در انتهای ماه شمسی'}
                          </span>
                        </div>
                      </div>

                      {thisMonthReport && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingReport(thisMonthReport);
                            setManagerRating(thisMonthReport.managerRating || 5);
                            setManagerFeedback(thisMonthReport.managerFeedback || '');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px]"
                        >
                          بررسی
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* SECTION 2: PERIODIC REPORTS CONTENT EXPLORER & REVIEW */}
      {activeSection === 'reports' && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Filters Bar */}
          <div className="navy-card-glass rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              
              {/* Period Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">دوره:</span>
                <div className="flex items-center bg-[#081525] border border-slate-800 p-1 rounded-xl">
                  {(['all', 'daily', 'weekly', 'monthly'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPeriodFilter(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedPeriodFilter === p 
                          ? 'bg-amber-500 text-slate-950 font-black' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {p === 'all' ? 'همه' : p === 'daily' ? 'روزانه' : p === 'weekly' ? 'هفتگی' : 'ماهانه'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Consultant Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">مشاور:</span>
                <select
                  value={selectedConsultantFilter}
                  onChange={(e) => setSelectedConsultantFilter(e.target.value)}
                  className="bg-[#081525] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="all">تمام مشاوران</option>
                  {consultants.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.consultantCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">وضعیت:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                  className="bg-[#081525] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="pending">در انتظار بررسی</option>
                  <option value="approved">تایید شده</option>
                  <option value="rewarded">مشمول پاداش و تشویق</option>
                  <option value="warned">دارای تذکر</option>
                </select>
              </div>

              {/* Search input */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در متن یا مشاور..."
                  className="w-full bg-[#081525] border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

            </div>
          </div>

          {/* Reports Grid */}
          {filteredReports.length === 0 ? (
            <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl text-xs">
              هیچ گزارش دوره‌ای منطبق با فیلترهای انتخابی یافت نشد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map(rep => {
                const statusBadge = 
                  rep.managerStatus === 'rewarded' ? { label: '🌟 تشویق و پاداش منظور شد', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' } :
                  rep.managerStatus === 'approved' ? { label: '✅ تایید شده', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' } :
                  rep.managerStatus === 'warned' ? { label: '⚠️ دارای تذکر / کسر امتیاز', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' } :
                  { label: '⏳ در انتظار بررسی مدیریت', bg: 'bg-slate-700/40 text-slate-300 border-slate-600' };

                return (
                  <div 
                    key={rep.id}
                    className="navy-card-glass rounded-2xl border border-slate-800 hover:border-amber-500/40 p-5 space-y-4 transition-all"
                  >
                    {/* Header: Consultant & Date */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">{rep.consultantName}</h4>
                          <span className="text-[11px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {rep.consultantCode}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 mt-0.5 block">{rep.periodLabel || rep.dateShamsi}</span>
                      </div>

                      <div className="text-left space-y-1">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          rep.periodType === 'daily' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          rep.periodType === 'weekly' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {rep.periodType === 'daily' ? 'روزانه' : rep.periodType === 'weekly' ? 'هفتگی' : 'ماهانه'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          ساعت {rep.submittedAt || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Report Summary */}
                    <div className="space-y-1 bg-[#06101c] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[11px] font-bold text-amber-300 block">خلاصه فعالیت:</span>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                        {rep.summary}
                      </p>
                    </div>

                    {/* Achievements */}
                    {rep.keyAchievements && (
                      <div className="space-y-1 bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/20">
                        <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>دستاوردها و جلسات ست‌شده:</span>
                        </span>
                        <p className="text-xs text-emerald-200 leading-relaxed line-clamp-2">
                          {rep.keyAchievements}
                        </p>
                      </div>
                    )}

                    {/* Challenges */}
                    {rep.challengesOrBarriers && (
                      <div className="space-y-1 bg-rose-950/20 p-3 rounded-xl border border-rose-500/20">
                        <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>چالش‌ها و مقاومت‌های بازار:</span>
                        </span>
                        <p className="text-xs text-rose-200 leading-relaxed line-clamp-2">
                          {rep.challengesOrBarriers}
                        </p>
                      </div>
                    )}

                    {/* Self-Rating and Manager Feedback Summary */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1 text-slate-400">
                        <span>خودارزیابی:</span>
                        <span className="font-bold text-amber-400 font-mono">{toPersianDigits(rep.selfRating || 5)}/۵</span>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </div>

                      <span className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setReviewingReport(rep);
                          setManagerRating(rep.managerRating || 5);
                          setManagerFeedback(rep.managerFeedback || '');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>بررسی و امتیازدهی</span>
                      </button>
                    </div>

                    {rep.managerFeedback && (
                      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200">
                        <span className="font-bold block text-[11px] text-amber-400">دیدگاه مدیریت:</span>
                        <p className="leading-relaxed">{rep.managerFeedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* SECTION 3: CALENDAR FOLLOW-UP DATES TRACKER (1 TO 4) */}
      {activeSection === 'followup_dates' && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Header & Controls */}
          <div className="navy-card-glass rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sky-400" />
                  <span>جدول جامع رهگیری تقویمی تاریخ پیگیری‌های ۱ تا ۴</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  تاریخ دقیق هر تماس و پیگیری کارفرما به تفکیک مراحل، به صورت مجزا از تب یادآوری چرخه ۴ روزه
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleExportFollowUpExcel}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>خروجی اکسل رهگیری</span>
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-800">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={followUpSearch}
                  onChange={(e) => setFollowUpSearch(e.target.value)}
                  placeholder="جستجوی نام کارفرما، شماره تماس، زمینه فعالیت یا دغدغه..."
                  className="w-full bg-[#081525] border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-bold whitespace-nowrap">مشاور:</span>
                <select
                  value={followUpConsultantFilter}
                  onChange={(e) => setFollowUpConsultantFilter(e.target.value)}
                  className="bg-[#081525] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="all">تمام مشاوران</option>
                  {consultants.map(c => (
                    <option key={c.id} value={c.fullName}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Follow-up Dates Table */}
          <div className="navy-card-glass rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0c1e34] border-b border-slate-800 text-slate-300">
                    <th className="p-3.5 font-bold">#</th>
                    <th className="p-3.5 font-bold">مشاور</th>
                    <th className="p-3.5 font-bold">نام کارفرما</th>
                    <th className="p-3.5 font-bold">حوزه فعالیت</th>
                    <th className="p-3.5 font-bold">تلفن تماس</th>
                    <th className="p-3.5 font-bold text-center bg-blue-950/40 border-r border-l border-slate-800">
                      پیگیری ۱ (تاریخ)
                    </th>
                    <th className="p-3.5 font-bold text-center bg-amber-950/40 border-r border-slate-800">
                      پیگیری ۲ (تاریخ)
                    </th>
                    <th className="p-3.5 font-bold text-center bg-purple-950/40 border-r border-slate-800">
                      پیگیری ۳ (تاریخ)
                    </th>
                    <th className="p-3.5 font-bold text-center bg-emerald-950/40 border-r border-slate-800">
                      پیگیری ۴ (تاریخ)
                    </th>
                    <th className="p-3.5 font-bold">نتیجه نهایی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allFollowUpRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500 text-xs">
                        هیچ رکوردی برای نمایش یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    allFollowUpRows.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#0c1e34]/50 transition-colors">
                        <td className="p-3 text-slate-400 font-mono">{toPersianDigits(idx + 1)}</td>
                        <td className="p-3 font-bold text-white whitespace-nowrap">
                          {item.consultantName}
                        </td>
                        <td className="p-3 font-bold text-amber-300 whitespace-nowrap">
                          {item.clientName}
                        </td>
                        <td className="p-3 text-slate-300">{item.activityField}</td>
                        <td className="p-3 text-slate-300 font-mono text-left dir-ltr">{item.phone}</td>

                        {/* Step 1 Date */}
                        <td className="p-2.5 text-center bg-blue-950/20 border-r border-l border-slate-800">
                          <div className="flex flex-col items-center gap-1">
                            <FollowUpBadge code={item.followUp1} size="sm" />
                            <span className="text-[10px] text-sky-300 font-mono font-bold">
                              {item.followUp1DateShamsi || item.reportDateShamsi}
                            </span>
                          </div>
                        </td>

                        {/* Step 2 Date */}
                        <td className="p-2.5 text-center bg-amber-950/20 border-r border-slate-800">
                          {item.followUp2 ? (
                            <div className="flex flex-col items-center gap-1">
                              <FollowUpBadge code={item.followUp2} size="sm" />
                              <span className="text-[10px] text-amber-300 font-mono font-bold">
                                {item.followUp2DateShamsi || item.reportDateShamsi}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-600">—</span>
                          )}
                        </td>

                        {/* Step 3 Date */}
                        <td className="p-2.5 text-center bg-purple-950/20 border-r border-slate-800">
                          {item.followUp3 ? (
                            <div className="flex flex-col items-center gap-1">
                              <FollowUpBadge code={item.followUp3} size="sm" />
                              <span className="text-[10px] text-purple-300 font-mono font-bold">
                                {item.followUp3DateShamsi || item.reportDateShamsi}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-600">—</span>
                          )}
                        </td>

                        {/* Step 4 Date */}
                        <td className="p-2.5 text-center bg-emerald-950/20 border-r border-slate-800">
                          {item.followUp4 ? (
                            <div className="flex flex-col items-center gap-1">
                              <FollowUpBadge code={item.followUp4} size="sm" />
                              <span className="text-[10px] text-emerald-300 font-mono font-bold">
                                {item.followUp4DateShamsi || item.reportDateShamsi}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-600">—</span>
                          )}
                        </td>

                        <td className="p-3 text-slate-300 font-bold whitespace-nowrap">
                          {item.followUpResult}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* REVIEW & EVALUATION MODAL */}
      {reviewingReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="navy-card-glass rounded-3xl border border-amber-500/40 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span>ارزیابی و ثبت نظر مدیریت بر گزارش دوره‌ای</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {reviewingReport.consultantName} ({reviewingReport.consultantCode}) • {reviewingReport.periodLabel || reviewingReport.dateShamsi}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setReviewingReport(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="space-y-3 text-xs bg-[#081525] p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="font-bold text-amber-300 block mb-1">خلاصه فعالیت دوره:</span>
                <p className="text-slate-200 leading-relaxed">{reviewingReport.summary}</p>
              </div>

              {reviewingReport.keyAchievements && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="font-bold text-emerald-300 block mb-1">دستاوردها و جلسات:</span>
                  <p className="text-emerald-200 leading-relaxed">{reviewingReport.keyAchievements}</p>
                </div>
              )}

              {reviewingReport.challengesOrBarriers && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="font-bold text-rose-300 block mb-1">چالش‌ها و موانع:</span>
                  <p className="text-rose-200 leading-relaxed">{reviewingReport.challengesOrBarriers}</p>
                </div>
              )}

              {reviewingReport.plansOrPriorities && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="font-bold text-sky-300 block mb-1">برنامه‌های دوره بعد:</span>
                  <p className="text-sky-200 leading-relaxed">{reviewingReport.plansOrPriorities}</p>
                </div>
              )}

              {reviewingReport.weeklyFocusGuilds && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="font-bold text-amber-300 block mb-1">اصناف تمرکز هفتگی:</span>
                  <p className="text-amber-200 leading-relaxed">{reviewingReport.weeklyFocusGuilds}</p>
                </div>
              )}

              {reviewingReport.monthlyStrategicNotes && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="font-bold text-purple-300 block mb-1">پیشنهادات راهبردی ماهانه:</span>
                  <p className="text-purple-200 leading-relaxed">{reviewingReport.monthlyStrategicNotes}</p>
                </div>
              )}
            </div>

            {/* Manager Rating Input */}
            <div className="p-4 rounded-2xl bg-[#081525] border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-white block">امتیاز کیفیت و انضباط این گزارش (۱ تا ۵):</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setManagerRating(star)}
                    className="p-1 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= managerRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-sm font-black text-amber-400 mr-2 font-mono">
                  {toPersianDigits(managerRating)} از ۵
                </span>
              </div>
            </div>

            {/* Manager Feedback Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-amber-300 block">
                یادداشت و رهنمود مدیریت برای مشاور:
              </label>
              <textarea
                rows={3}
                value={managerFeedback}
                onChange={(e) => setManagerFeedback(e.target.value)}
                placeholder="تحلیل و نقاط قوت یا تذکرات لازم برای بهبود فرآیند پیگیری..."
                className="w-full bg-[#081525] border border-slate-700 focus:border-amber-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Decision Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSaveReview('warned')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>ثبت با اخطار / کسر امتیاز</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSaveReview('approved')}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تایید عادی گزارش</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveReview('rewarded')}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/30 hover:scale-105"
                >
                  <Award className="w-4 h-4" />
                  <span>اعطای پاداش و تشویق</span>
                </button>
              </div>
            </div>

            {actionSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
                {actionSuccessMessage}
              </div>
            )}

          </div>
        </div>
      )}

      {/* DIRECTIVE / WARNING MODAL */}
      {warningModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="navy-card-glass rounded-3xl border border-rose-500/50 w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-black text-white">ثبت تذکر انضباطی فوری در کارتابل</h3>
              </div>
              <button
                type="button"
                onClick={() => setWarningModalTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-rose-950/20 p-3 rounded-xl border border-rose-500/30">
              مشاور مخاطب: <strong className="text-white">{warningModalTarget.consultant.fullName}</strong> ({warningModalTarget.consultant.consultantCode})
              <br />
              علت: <strong className="text-rose-300">{warningModalTarget.reason}</strong>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                متن ابلاغیه / تذکر مدیریتی:
              </label>
              <textarea
                rows={4}
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                className="w-full bg-[#081525] border border-slate-700 focus:border-rose-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWarningModalTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSendWarning}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-900"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ابلاغ فوری تذکر</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
