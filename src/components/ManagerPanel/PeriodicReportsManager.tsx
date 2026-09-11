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
  isFriday,
  isEndOfShamsiMonth, 
  formatShamsiDateLong,
  getCurrentTimeFormatted,
  getDailyReportWindowStatus,
  compareReportsLatestFirst,
  formatStandardReportTitle
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
  ShieldCheck,
  Lock,
  Unlock,
  AlertOctagon,
  Check
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

  // Daily reporting window status (Tehran time & Friday holiday rules)
  const windowStatus = useMemo(() => {
    return getDailyReportWindowStatus(curShamsi.formatted);
  }, [curShamsi.formatted]);

  // Refresh data from storage
  const reloadData = () => {
    setUsers(getStoredUsers());
    setPeriodicReports(getStoredPeriodicReports());
    setAllDailyReports(getStoredReports());
    if (onReload) onReload();
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

      // Missing daily rule:
      // - Friday: NEVER missing (official holiday, no daily reports)
      // - Working days before 17:00: NOT missing yet (still working hours)
      // - Working days 17:00 to 19:00: MISSING if not submitted (due now, deadline 19:00)
      // - Working days after 19:00: MISSING and PENALTY locked if not submitted
      const hasMissingDaily = !dailyRep && !windowStatus.isFriday && !windowStatus.isBeforeSubmissionWindow;

      return {
        consultant: c,
        todayDailyReport: dailyRep,
        thisWeekReport: weeklyRep,
        thisMonthReport: monthlyRep,
        totalPeriodicReportsCount: totalReps.length,
        hasMissingDaily,
        hasMissingWeekly: isThursday(curShamsi.formatted) && !weeklyRep,
        hasMissingMonthly: isEndOfShamsiMonth(curShamsi.formatted) && !monthlyRep
      };
    });
  }, [consultants, periodicReports, curShamsi, windowStatus]);

  // Filtered periodic reports list (sorted strictly latest first)
  const filteredReports = useMemo(() => {
    const list = periodicReports.filter(r => {
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
    return [...list].sort(compareReportsLatestFirst);
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
    setWarningMessage(`همکار گرامی جناب/سرکار ${consultant.fullName}، موعد قانونی ثبت گزارش روزانه شما در تاریخ ${curShamsi.formatted} سپری شده و گزارشی واصل نگردیده است. این مورد مشمول عدم ارسال و کسر امتیاز در سیستم ارزیابی انضباطی و KPI کارینو می‌باشد. لطفاً در صورت داشتن عذر موجه فوراً به مدیریت اطلاع دهید.`);
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
    XLSX.writeFile(wb, `رهگیری_تقویمی_پیگیری‌ها_${curShamsi.formatted.replace(/\//g, '')}.xlsx`);
  };

  const submittedDailyCount = consultantComplianceList.filter(c => !!c.todayDailyReport).length;
  const missingDailyCount = consultantComplianceList.filter(c => c.hasMissingDaily).length;

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-[#2B1810] animate-fadeIn">

      {/* 1. HEADER HERO BANNER (NESCAFE / NUDE / ESPRESSO THEME) */}
      <div className="bg-gradient-to-l from-[#F5EDE2] via-[#FAF7F2] to-white rounded-3xl border border-[#DEC8B0] p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#9C6644] text-white flex items-center justify-center font-black shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-[#2B1810]">
                    مرکز پایش گزارشات دوره‌ای و نظارت ستادی
                  </h2>
                  <span className="text-xs bg-[#F5EDE2] border border-[#DEC8B0] text-[#7F4F24] px-3 py-1 rounded-full font-bold">
                    نظارت ستادی مدیریت
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#6F4E37] mt-1 leading-relaxed">
                  پایش وضعیت انضباط گزارشات روزانه، پنج‌شنبه (هفتگی) و پایان ماه • استثنای تعطیلی جمعه‌ها • پنجره موعد ۱۷:۰۰ الی ۱۹:۰۰ عصر به وقت تهران • رهگیری تاریخ دقیق هر پیگیری ۱ تا ۴
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Total Consultants */}
            <div className="bg-white border border-[#DEC8B0] px-4 py-2.5 rounded-2xl text-center min-w-[105px] shadow-xs">
              <span className="text-[11px] text-[#8D5B4C] block font-medium">کل مشاوران</span>
              <span className="text-lg font-black text-[#2B1810]">{toPersianDigits(consultants.length)} نفر</span>
            </div>

            {/* Submitted Today */}
            <div className="bg-[#E8F5E9] border border-[#A5D6A7] px-4 py-2.5 rounded-2xl text-center min-w-[115px] shadow-xs">
              <span className="text-[11px] text-[#2E7D32] block font-medium">ثبت‌شده امروز</span>
              <span className="text-lg font-black text-[#1B5E20]">
                {windowStatus.isFriday ? 'تعطیل رسمی' : `${toPersianDigits(submittedDailyCount)} مشاور`}
              </span>
            </div>

            {/* Daily Status Box */}
            {windowStatus.isFriday ? (
              <div className="bg-[#FAF7F2] border border-[#DEC8B0] px-4 py-2.5 rounded-2xl text-center min-w-[130px] shadow-xs">
                <span className="text-[11px] text-[#7F4F24] block font-medium">وضعیت روز</span>
                <span className="text-sm font-black text-[#2B1810]">جمعه (تعطیل رسمی)</span>
              </div>
            ) : windowStatus.isBeforeSubmissionWindow ? (
              <div className="bg-[#FFF8E1] border border-[#FFE082] px-4 py-2.5 rounded-2xl text-center min-w-[130px] shadow-xs">
                <span className="text-[11px] text-[#B78103] block font-medium">ساعت کاری فعال</span>
                <span className="text-xs font-black text-[#7A4B00]">موعد: ۱۷ الی ۱۹</span>
              </div>
            ) : windowStatus.isInsideSubmissionWindow ? (
              <div className="bg-[#FFEBEE] border border-[#EF5350] px-4 py-2.5 rounded-2xl text-center min-w-[130px] shadow-xs animate-pulse">
                <span className="text-[11px] text-[#C62828] block font-bold">مهلت ثبت تا ۱۹:۰۰</span>
                <span className="text-sm font-black text-[#B71C1C]">
                  {toPersianDigits(missingDailyCount)} نفر منتظر ثبت
                </span>
              </div>
            ) : (
              <div className="bg-[#FFEBEE] border border-[#C62828] px-4 py-2.5 rounded-2xl text-center min-w-[130px] shadow-xs">
                <span className="text-[11px] text-[#B71C1C] block font-bold">از قلم افتاده (جریمه KPI)</span>
                <span className="text-lg font-black text-[#B71C1C]">
                  {toPersianDigits(missingDailyCount)} مشاور
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. SECTION NAVIGATION TABS (MATCHING MANAGER PALETTE) */}
      <div className="flex items-center gap-2.5 border-b border-[#DEC8B0] pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveSection('matrix')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'matrix'
              ? 'bg-[#2B1810] text-white shadow-md'
              : 'bg-white border border-[#DEC8B0] text-[#5C4033] hover:bg-[#F5EDE2]'
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-[#9C6644]" />
          <span>ماتریس انضباط گزارش‌دهی و پایش غیبت‌ها</span>
          {missingDailyCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('reports')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'reports'
              ? 'bg-[#2B1810] text-white shadow-md'
              : 'bg-white border border-[#DEC8B0] text-[#5C4033] hover:bg-[#F5EDE2]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-[#9C6644]" />
          <span>بررسی محتوایی گزارشات دوره‌ای ({toPersianDigits(periodicReports.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('followup_dates')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'followup_dates'
              ? 'bg-[#2B1810] text-white shadow-md'
              : 'bg-white border border-[#DEC8B0] text-[#5C4033] hover:bg-[#F5EDE2]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#9C6644]" />
          <span>رهگیری تقویمی تاریخ پیگیری‌های ۱ تا ۴</span>
          <span className="text-[10px] bg-[#F5EDE2] text-[#7F4F24] px-2 py-0.5 rounded-full border border-[#DEC8B0] font-bold">
            تفکیک از چرخه ۴ روزه
          </span>
        </button>
      </div>

      {/* SECTION 1: COMPLIANCE MATRIX */}
      {activeSection === 'matrix' && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Top Notice Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white p-4 sm:p-5 rounded-3xl border border-[#DEC8B0] shadow-xs">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#2B1810] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#9C6644]" />
                <span>ماتریس پایش موعد گزارشات روزانه، پنج‌شنبه (هفتگی) و پایان ماه</span>
              </h3>
              <p className="text-xs text-[#6F4E37] mt-1 leading-relaxed">
                قانون سازمانی: جمعه‌ها به عنوان روز تعطیل محاسبه شده و هیچ مشاوره‌ای مشمول عدم ارسال نمی‌گردد. در روزهای کاری موعد گزارش روزانه از ساعت ۱۷:۰۰ آغاز شده و در ساعت ۱۹:۰۰ به وقت تهران قفل می‌گردد.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-[#7F4F24] bg-[#F5EDE2] border border-[#DEC8B0] px-3.5 py-1.5 rounded-2xl font-bold whitespace-nowrap">
                📅 {formatShamsiDateLong(curShamsi.formatted)}
              </div>
              <div className="text-xs text-[#2B1810] bg-[#FAF7F2] border border-[#DEC8B0] px-3.5 py-1.5 rounded-2xl font-mono font-bold whitespace-nowrap">
                ساعت تهران: {windowStatus.tehranTimeString}
              </div>
            </div>
          </div>

          {/* Grid of Consultant Compliance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {consultantComplianceList.map(({ consultant, todayDailyReport, thisWeekReport, thisMonthReport, totalPeriodicReportsCount, hasMissingDaily, hasMissingWeekly, hasMissingMonthly }) => {
              return (
                <div 
                  key={consultant.id} 
                  className={`rounded-3xl border p-5 space-y-4 transition-all ${
                    hasMissingDaily 
                      ? 'bg-[#FFF5F5] border-[#FFCDD2] shadow-md ring-1 ring-[#EF5350]/30' 
                      : 'bg-white border-[#E6DAC8] hover:border-[#DEC8B0] shadow-sm'
                  }`}
                >
                  {/* Top: Consultant Identity */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm border shadow-xs ${
                        hasMissingDaily 
                          ? 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]' 
                          : 'bg-[#F5EDE2] text-[#7F4F24] border-[#DEC8B0]'
                      }`}>
                        {consultant.fullName.slice(0, 1)}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#2B1810]">{consultant.fullName}</h4>
                        <span className="text-[11px] text-[#8D5B4C] font-mono block">
                          کد مشاور: {consultant.consultantCode} • {consultant.branch || 'تیم اجرایی'}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs bg-[#FAF7F2] border border-[#DEC8B0] text-[#5C4033] px-2.5 py-1 rounded-xl font-bold font-mono">
                      {toPersianDigits(totalPeriodicReportsCount)} گزارش
                    </span>
                  </div>

                  {/* Periodic Compliance Status Slots */}
                  <div className="space-y-3 pt-2 border-t border-[#E6DAC8]">
                    
                    {/* 1. Daily Report Status (SMART TIME & FRIDAY AWARE) */}
                    {todayDailyReport ? (
                      <div className="p-3.5 rounded-2xl border bg-[#E8F5E9] border-[#A5D6A7] text-[#1B5E20] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0" />
                          <div>
                            <span className="block font-black text-[#1B5E20]">گزارش روزانه امروز تحویل شد</span>
                            <span className="text-[10px] text-[#2E7D32] font-mono block">
                              ثبت شده در ساعت {todayDailyReport.submittedAt || '—'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingReport(todayDailyReport);
                            setManagerRating(todayDailyReport.managerRating || 5);
                            setManagerFeedback(todayDailyReport.managerFeedback || '');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#2D6A4F] text-white hover:bg-[#1B4332] text-[11px] font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                        >
                          مشاهده و بررسی
                        </button>
                      </div>
                    ) : windowStatus.isFriday ? (
                      <div className="p-3.5 rounded-2xl border bg-[#FAF7F2] border-[#DEC8B0] text-[#6F4E37] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <CalendarCheck className="w-4 h-4 text-[#8D5B4C] shrink-0" />
                          <div>
                            <span className="block font-black text-[#2B1810]">جمعه - تعطیل رسمی اداری</span>
                            <span className="text-[10px] text-[#8D5B4C] block">بدون الزام ثبت گزارش روزانه</span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2.5 py-1 rounded-xl bg-white border border-[#DEC8B0] text-[#7F4F24] font-bold whitespace-nowrap">
                          تعطیل رسمی
                        </span>
                      </div>
                    ) : windowStatus.isBeforeSubmissionWindow ? (
                      <div className="p-3.5 rounded-2xl border bg-[#FFF8E1] border-[#FFE082] text-[#B78103] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-[#F57F17] shrink-0" />
                          <div>
                            <span className="block font-black text-[#7A4B00]">ساعت کاری در حال اجرا</span>
                            <span className="text-[10px] text-[#9A6700] block">
                              موعد ارسال: ۱۷:۰۰ الی ۱۹:۰۰
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2.5 py-1 rounded-xl bg-white border border-[#FFE082] text-[#B78103] font-bold whitespace-nowrap">
                          در انتظار ۱۷:۰۰
                        </span>
                      </div>
                    ) : windowStatus.isInsideSubmissionWindow ? (
                      <div className="p-3.5 rounded-2xl border-2 border-[#EF5350] bg-[#FFEBEE] text-[#C62828] flex items-center justify-between text-xs animate-pulse">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-[#D32F2F] shrink-0" />
                          <div>
                            <span className="block font-black text-[#B71C1C]">🔴 موعد ثبت گزارش (تا ۱۹:۰۰)</span>
                            <span className="text-[10px] text-[#C62828] block">
                              ساعت کاری پایان یافت - گزارش نزده
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenWarningModal(consultant, 'عدم ارسال گزارش روزانه موعد ۱۷ الی ۱۹ امروز')}
                          className="px-2.5 py-1.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white text-[11px] font-black transition-all shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          ثبت اخطار
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl border-2 border-[#C62828] bg-[#FFEBEE] text-[#B71C1C] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <AlertOctagon className="w-4 h-4 text-[#C62828] shrink-0" />
                          <div>
                            <span className="block font-black text-[#B71C1C]">🔴 از قلم افتاده (جریمه KPI)</span>
                            <span className="text-[10px] text-[#C62828] block">
                              مهلت ۱۹:۰۰ پایان یافت و قفل شد
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenWarningModal(consultant, 'عدم ارسال گزارش روزانه تا ساعت ۱۹ (مشمول جریمه انضباطی KPI)')}
                          className="px-2.5 py-1.5 rounded-xl bg-[#B71C1C] hover:bg-[#880E4F] text-white text-[11px] font-black transition-all shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          تذکر و کسر امتیاز
                        </button>
                      </div>
                    )}

                    {/* 2. Weekly Report (Thursday) Status */}
                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                      thisWeekReport 
                        ? 'bg-[#E8F5E9] border-[#A5D6A7] text-[#1B5E20]' 
                        : isThursday(curShamsi.formatted)
                          ? windowStatus.isPastDeadline
                            ? 'bg-[#FFEBEE] border-2 border-[#C62828] text-[#B71C1C]'
                            : 'bg-[#FFEBEE] border-2 border-[#EF5350] text-[#C62828] font-bold'
                          : 'bg-[#FAF7F2] border-[#DEC8B0] text-[#6F4E37]'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <CalendarDays className={`w-4 h-4 shrink-0 ${thisWeekReport ? 'text-[#2E7D32]' : isThursday(curShamsi.formatted) ? 'text-[#D32F2F]' : 'text-[#8D5B4C]'}`} />
                        <div>
                          <span className="block font-black text-[#2B1810]">گزارش جامع هفتگی (پنج‌شنبه)</span>
                          <span className="text-[10px] opacity-90 block">
                            {thisWeekReport 
                              ? '✅ تحویل داده شد' 
                              : isThursday(curShamsi.formatted) 
                                ? windowStatus.isPastDeadline
                                  ? '🔴 از قلم افتاده و قفل شد (کسر امتیاز KPI هفتگی)'
                                  : '⚡ موعد پنج‌شنبه است (مهلت تا ۱۹:۰۰)'
                                : 'در انتظار پنج‌شنبه بعدی'}
                          </span>
                        </div>
                      </div>

                      {thisWeekReport ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingReport(thisWeekReport);
                            setManagerRating(thisWeekReport.managerRating || 5);
                            setManagerFeedback(thisWeekReport.managerFeedback || '');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#2D6A4F] text-white hover:bg-[#1B4332] text-[11px] font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                        >
                          بررسی
                        </button>
                      ) : isThursday(curShamsi.formatted) && (
                        <button
                          type="button"
                          onClick={() => handleOpenWarningModal(
                            consultant, 
                            windowStatus.isPastDeadline 
                              ? 'عدم ارسال گزارش هفتگی پنج‌شنبه تا ساعت ۱۹:۰۰ (کسر امتیاز KPI)' 
                              : 'عدم ارسال گزارش هفتگی پنج‌شنبه'
                          )}
                          className={`px-2.5 py-1.5 rounded-xl text-white text-[11px] font-black transition-all shadow-sm cursor-pointer whitespace-nowrap ${
                            windowStatus.isPastDeadline ? 'bg-[#B71C1C] hover:bg-[#880E4F]' : 'bg-[#C62828] hover:bg-[#B71C1C]'
                          }`}
                        >
                          {windowStatus.isPastDeadline ? 'تذکر و جریمه KPI' : 'ثبت تذکر'}
                        </button>
                      )}
                    </div>

                    {/* 3. Monthly Strategic Report Status */}
                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                      thisMonthReport 
                        ? 'bg-[#E8F5E9] border-[#A5D6A7] text-[#1B5E20]' 
                        : isEndOfShamsiMonth(curShamsi.formatted)
                          ? windowStatus.isPastDeadline
                            ? 'bg-[#FFEBEE] border-2 border-[#C62828] text-[#B71C1C]'
                            : 'bg-[#FFEBEE] border-2 border-[#EF5350] text-[#C62828] font-bold'
                          : 'bg-[#FAF7F2] border-[#DEC8B0] text-[#6F4E37]'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <CalendarRange className={`w-4 h-4 shrink-0 ${thisMonthReport ? 'text-[#2E7D32]' : isEndOfShamsiMonth(curShamsi.formatted) ? 'text-[#D32F2F]' : 'text-[#8D5B4C]'}`} />
                        <div>
                          <span className="block font-black text-[#2B1810]">گزارش راهبردی ماهانه</span>
                          <span className="text-[10px] opacity-90 block">
                            {thisMonthReport 
                              ? '✅ تحویل داده شد' 
                              : isEndOfShamsiMonth(curShamsi.formatted) 
                                ? windowStatus.isPastDeadline
                                  ? '🔴 از قلم افتاده و قفل شد (کسر امتیاز KPI ماهانه)'
                                  : '⚡ موعد پایان ماه (مهلت تا ۱۹:۰۰)'
                                : 'در انتهای ماه شمسی'}
                          </span>
                        </div>
                      </div>

                      {thisMonthReport ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingReport(thisMonthReport);
                            setManagerRating(thisMonthReport.managerRating || 5);
                            setManagerFeedback(thisMonthReport.managerFeedback || '');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#2D6A4F] text-white hover:bg-[#1B4332] text-[11px] font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                        >
                          بررسی
                        </button>
                      ) : isEndOfShamsiMonth(curShamsi.formatted) && (
                        <button
                          type="button"
                          onClick={() => handleOpenWarningModal(
                            consultant, 
                            windowStatus.isPastDeadline 
                              ? 'عدم ارسال گزارش راهبردی ماهانه تا ساعت ۱۹:۰۰ (کسر امتیاز KPI)' 
                              : 'عدم ارسال گزارش راهبردی ماهانه'
                          )}
                          className={`px-2.5 py-1.5 rounded-xl text-white text-[11px] font-black transition-all shadow-sm cursor-pointer whitespace-nowrap ${
                            windowStatus.isPastDeadline ? 'bg-[#B71C1C] hover:bg-[#880E4F]' : 'bg-[#C62828] hover:bg-[#B71C1C]'
                          }`}
                        >
                          {windowStatus.isPastDeadline ? 'تذکر و جریمه KPI' : 'ثبت تذکر'}
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
          <div className="bg-white rounded-3xl border border-[#DEC8B0] p-4 sm:p-5 shadow-sm space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
              
              {/* Period Type Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#6F4E37] font-bold">دوره:</span>
                <div className="flex items-center bg-[#FAF7F2] border border-[#DEC8B0] p-1 rounded-2xl">
                  {(['all', 'daily', 'weekly', 'monthly'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPeriodFilter(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedPeriodFilter === p 
                          ? 'bg-[#2B1810] text-white shadow-sm font-black' 
                          : 'text-[#5C4033] hover:text-[#2B1810]'
                      }`}
                    >
                      {p === 'all' ? 'همه' : p === 'daily' ? 'روزانه' : p === 'weekly' ? 'هفتگی' : 'ماهانه'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Consultant Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6F4E37] font-bold whitespace-nowrap">مشاور:</span>
                <select
                  value={selectedConsultantFilter}
                  onChange={(e) => setSelectedConsultantFilter(e.target.value)}
                  className="bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl px-3 py-2 text-xs text-[#2B1810] font-medium focus:outline-none"
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
                <span className="text-xs text-[#6F4E37] font-bold whitespace-nowrap">وضعیت:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                  className="bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl px-3 py-2 text-xs text-[#2B1810] font-medium focus:outline-none"
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
                <Search className="w-4 h-4 text-[#8D5B4C] absolute right-3.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در متن یا مشاور..."
                  className="w-full bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl pr-10 pl-3.5 py-2 text-xs text-[#2B1810] placeholder-[#8D5B4C] focus:outline-none font-medium"
                />
              </div>

            </div>
          </div>

          {/* Reports Grid */}
          {filteredReports.length === 0 ? (
            <div className="p-12 text-center text-[#8D5B4C] bg-white border border-dashed border-[#DEC8B0] rounded-3xl text-sm font-bold shadow-xs">
              هیچ گزارش دوره‌ای منطبق با فیلترهای انتخابی یافت نشد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {filteredReports.map(rep => {
                const statusBadge = 
                  rep.managerStatus === 'rewarded' ? { label: '🌟 تشویق و پاداش منظور شد', bg: 'bg-[#FFF8E1] text-[#B78103] border-[#FFE082]' } :
                  rep.managerStatus === 'approved' ? { label: '✅ تایید شده', bg: 'bg-[#E8F5E9] text-[#1B5E20] border-[#A5D6A7]' } :
                  rep.managerStatus === 'warned' ? { label: '⚠️ دارای تذکر / کسر امتیاز', bg: 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]' } :
                  { label: '⏳ در انتظار بررسی مدیریت', bg: 'bg-[#FAF7F2] text-[#5C4033] border-[#DEC8B0]' };

                return (
                  <div 
                    key={rep.id}
                    className="bg-white rounded-3xl border border-[#E6DAC8] hover:border-[#DEC8B0] p-5 sm:p-6 space-y-4 shadow-sm transition-all"
                  >
                    {/* Header: Consultant & Date */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-[#2B1810]">{rep.consultantName}</h4>
                          <span className="text-[11px] text-[#7F4F24] font-mono bg-[#F5EDE2] px-2 py-0.5 rounded-lg border border-[#DEC8B0] font-bold">
                            {rep.consultantCode}
                          </span>
                        </div>
                        <span className="text-xs text-[#6F4E37] mt-0.5 block">
                          {formatStandardReportTitle(rep.periodType, rep.dateShamsi, rep.periodLabel)}
                        </span>
                      </div>

                      <div className="text-left space-y-1">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase border ${
                          rep.periodType === 'daily' ? 'bg-[#E3F2FD] text-[#1565C0] border-[#90CAF9]' :
                          rep.periodType === 'weekly' ? 'bg-[#FFF8E1] text-[#B78103] border-[#FFE082]' :
                          'bg-[#F3E5F5] text-[#7B1FA2] border-[#CE93D8]'
                        }`}>
                          {rep.periodType === 'daily' ? 'روزانه' : rep.periodType === 'weekly' ? 'هفتگی' : 'ماهانه'}
                        </span>
                        <span className="text-[11px] text-[#8D5B4C] font-mono block">
                          ساعت {rep.submittedAt || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Report Summary */}
                    <div className="space-y-1 bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#DEC8B0]">
                      <span className="text-[11px] font-black text-[#7F4F24] block">خلاصه فعالیت:</span>
                      <p className="text-xs text-[#2B1810] leading-relaxed line-clamp-3">
                        {rep.summary}
                      </p>
                    </div>

                    {/* Achievements */}
                    {rep.keyAchievements && (
                      <div className="space-y-1 bg-[#E8F5E9] p-3.5 rounded-2xl border border-[#C8E6C9]">
                        <span className="text-[11px] font-black text-[#1B5E20] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                          <span>دستاوردها و جلسات ست‌شده:</span>
                        </span>
                        <p className="text-xs text-[#1B5E20] leading-relaxed line-clamp-2">
                          {rep.keyAchievements}
                        </p>
                      </div>
                    )}

                    {/* Challenges */}
                    {rep.challengesOrBarriers && (
                      <div className="space-y-1 bg-[#FFEBEE] p-3.5 rounded-2xl border border-[#FFCDD2]">
                        <span className="text-[11px] font-black text-[#C62828] flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-[#D32F2F]" />
                          <span>چالش‌ها و موانع بازار:</span>
                        </span>
                        <p className="text-xs text-[#C62828] leading-relaxed line-clamp-2">
                          {rep.challengesOrBarriers}
                        </p>
                      </div>
                    )}

                    {/* Self-Rating and Manager Feedback Summary */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E6DAC8] flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-[#5C4033]">
                        <span className="font-medium">خودارزیابی:</span>
                        <span className="font-black text-[#B78103] font-mono">{toPersianDigits(rep.selfRating || 5)}/۵</span>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      </div>

                      <span className={`text-[11px] px-2.5 py-1 rounded-xl border font-bold ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setReviewingReport(rep);
                          setManagerRating(rep.managerRating || 5);
                          setManagerFeedback(rep.managerFeedback || '');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#9C6644] hover:bg-[#7F4F24] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>بررسی و امتیازدهی</span>
                      </button>
                    </div>

                    {rep.managerFeedback && (
                      <div className="p-3 rounded-2xl bg-[#FFF8E1] border border-[#FFE082] text-xs text-[#7A4B00]">
                        <span className="font-bold block text-[11px] text-[#B78103] mb-0.5">دیدگاه مدیریت:</span>
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
          <div className="bg-white rounded-3xl border border-[#DEC8B0] p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#2B1810] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#9C6644]" />
                  <span>جدول جامع رهگیری تقویمی تاریخ پیگیری‌های ۱ تا ۴</span>
                </h3>
                <p className="text-xs text-[#6F4E37] mt-1">
                  تاریخ دقیق هر تماس و پیگیری کارفرما به تفکیک مراحل، به صورت مجزا از تب یادآوری چرخه ۴ روزه
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleExportFollowUpExcel}
                  className="px-4 py-2.5 rounded-2xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>خروجی اکسل رهگیری</span>
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-[#E6DAC8]">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-[#8D5B4C] absolute right-3.5 top-2.5" />
                <input
                  type="text"
                  value={followUpSearch}
                  onChange={(e) => setFollowUpSearch(e.target.value)}
                  placeholder="جستجوی نام کارفرما، شماره تماس، زمینه فعالیت یا دغدغه..."
                  className="w-full bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl pr-10 pl-3 py-2 text-xs text-[#2B1810] placeholder-[#8D5B4C] focus:outline-none font-medium"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-[#6F4E37] font-bold whitespace-nowrap">مشاور:</span>
                <select
                  value={followUpConsultantFilter}
                  onChange={(e) => setFollowUpConsultantFilter(e.target.value)}
                  className="bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl px-3 py-2 text-xs text-[#2B1810] font-medium focus:outline-none"
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
          <div className="bg-white rounded-3xl border border-[#DEC8B0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#DEC8B0] text-[#5C4033]">
                    <th className="p-3.5 font-bold">#</th>
                    <th className="p-3.5 font-bold">مشاور</th>
                    <th className="p-3.5 font-bold">نام کارفرما</th>
                    <th className="p-3.5 font-bold">حوزه فعالیت</th>
                    <th className="p-3.5 font-bold">تلفن تماس</th>
                    <th className="p-3.5 font-bold text-center bg-[#E3F2FD]/50 border-r border-l border-[#DEC8B0] text-[#1565C0]">
                      پیگیری ۱ (تاریخ)
                    </th>
                    <th className="p-3.5 font-bold text-center bg-[#FFF8E1]/60 border-r border-[#DEC8B0] text-[#B78103]">
                      پیگیری ۲ (تاریخ)
                    </th>
                    <th className="p-3.5 font-bold text-center bg-[#F3E5F5]/60 border-r border-[#DEC8B0] text-[#7B1FA2]">
                      پیگیری ۳ (تاریخ)
                    </th>
                    <th className="p-3.5 font-bold text-center bg-[#E8F5E9]/60 border-r border-[#DEC8B0] text-[#2E7D32]">
                      پیگیری ۴ (تاریخ)
                    </th>
                    <th className="p-3.5 font-bold">نتیجه نهایی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DAC8]">
                  {allFollowUpRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-[#8D5B4C] text-xs font-bold">
                        هیچ رکوردی برای نمایش یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    allFollowUpRows.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF7F2]/60 transition-colors">
                        <td className="p-3 text-[#8D5B4C] font-mono">{toPersianDigits(idx + 1)}</td>
                        <td className="p-3 font-bold text-[#5C4033] whitespace-nowrap">
                          {item.consultantName}
                        </td>
                        <td className="p-3 font-black text-[#2B1810] whitespace-nowrap">
                          {item.clientName}
                        </td>
                        <td className="p-3 text-[#5C4033]">{item.activityField}</td>
                        <td className="p-3 text-[#2B1810] font-mono text-left dir-ltr">{item.phone}</td>

                        {/* Step 1 Date */}
                        <td className="p-2.5 text-center bg-[#E3F2FD]/20 border-r border-l border-[#DEC8B0]">
                          <div className="flex flex-col items-center gap-1">
                            <FollowUpBadge code={item.followUp1} size="sm" />
                            <span className="text-[10px] text-[#1565C0] font-mono font-bold">
                              {item.followUp1DateShamsi || item.reportDateShamsi}
                            </span>
                          </div>
                        </td>

                        {/* Step 2 Date */}
                        <td className="p-2.5 text-center bg-[#FFF8E1]/20 border-r border-[#DEC8B0]">
                          {item.followUp2 ? (
                            <div className="flex flex-col items-center gap-1">
                              <FollowUpBadge code={item.followUp2} size="sm" />
                              <span className="text-[10px] text-[#B78103] font-mono font-bold">
                                {item.followUp2DateShamsi || item.reportDateShamsi}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8D5B4C]">—</span>
                          )}
                        </td>

                        {/* Step 3 Date */}
                        <td className="p-2.5 text-center bg-[#F3E5F5]/20 border-r border-[#DEC8B0]">
                          {item.followUp3 ? (
                            <div className="flex flex-col items-center gap-1">
                              <FollowUpBadge code={item.followUp3} size="sm" />
                              <span className="text-[10px] text-[#7B1FA2] font-mono font-bold">
                                {item.followUp3DateShamsi || item.reportDateShamsi}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8D5B4C]">—</span>
                          )}
                        </td>

                        {/* Step 4 Date */}
                        <td className="p-2.5 text-center bg-[#E8F5E9]/20 border-r border-[#DEC8B0]">
                          {item.followUp4 ? (
                            <div className="flex flex-col items-center gap-1">
                              <FollowUpBadge code={item.followUp4} size="sm" />
                              <span className="text-[10px] text-[#2E7D32] font-mono font-bold">
                                {item.followUp4DateShamsi || item.reportDateShamsi}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8D5B4C]">—</span>
                          )}
                        </td>

                        <td className="p-3 text-[#2B1810] font-bold whitespace-nowrap">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#DEC8B0] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-5 shadow-2xl animate-scaleUp text-[#2B1810]">
            
            <div className="flex items-center justify-between border-b border-[#E6DAC8] pb-3.5">
              <div>
                <h3 className="text-base font-black text-[#2B1810] flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <span>ارزیابی و ثبت نظر مدیریت بر گزارش دوره‌ای</span>
                </h3>
                <span className="text-xs text-[#6F4E37] block mt-0.5">
                  {reviewingReport.consultantName} ({reviewingReport.consultantCode}) • {formatStandardReportTitle(reviewingReport.periodType, reviewingReport.dateShamsi, reviewingReport.periodLabel)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setReviewingReport(null)}
                className="p-1.5 rounded-xl hover:bg-[#F5EDE2] text-[#8D5B4C] hover:text-[#2B1810] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="space-y-3 text-xs bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#DEC8B0]">
              <div>
                <span className="font-bold text-[#7F4F24] block mb-1">خلاصه فعالیت دوره:</span>
                <p className="text-[#2B1810] leading-relaxed">{reviewingReport.summary}</p>
              </div>

              {reviewingReport.keyAchievements && (
                <div className="pt-2.5 border-t border-[#DEC8B0]">
                  <span className="font-bold text-[#1B5E20] block mb-1">دستاوردها و جلسات:</span>
                  <p className="text-[#1B5E20] leading-relaxed">{reviewingReport.keyAchievements}</p>
                </div>
              )}

              {reviewingReport.challengesOrBarriers && (
                <div className="pt-2.5 border-t border-[#DEC8B0]">
                  <span className="font-bold text-[#C62828] block mb-1">چالش‌ها و موانع:</span>
                  <p className="text-[#C62828] leading-relaxed">{reviewingReport.challengesOrBarriers}</p>
                </div>
              )}

              {reviewingReport.plansOrPriorities && (
                <div className="pt-2.5 border-t border-[#DEC8B0]">
                  <span className="font-bold text-[#1565C0] block mb-1">برنامه‌های دوره بعد:</span>
                  <p className="text-[#1565C0] leading-relaxed">{reviewingReport.plansOrPriorities}</p>
                </div>
              )}

              {reviewingReport.weeklyFocusGuilds && (
                <div className="pt-2.5 border-t border-[#DEC8B0]">
                  <span className="font-bold text-[#7F4F24] block mb-1">اصناف تمرکز هفتگی:</span>
                  <p className="text-[#5C4033] leading-relaxed">{reviewingReport.weeklyFocusGuilds}</p>
                </div>
              )}

              {reviewingReport.monthlyStrategicNotes && (
                <div className="pt-2.5 border-t border-[#DEC8B0]">
                  <span className="font-bold text-[#7B1FA2] block mb-1">پیشنهادات راهبردی ماهانه:</span>
                  <p className="text-[#5C4033] leading-relaxed">{reviewingReport.monthlyStrategicNotes}</p>
                </div>
              )}
            </div>

            {/* Manager Rating Input */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#DEC8B0] space-y-2">
              <span className="text-xs font-bold text-[#2B1810] block">امتیاز کیفیت و انضباط این گزارش (۱ تا ۵):</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setManagerRating(star)}
                    className="p-1 hover:scale-125 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= managerRating ? 'text-amber-500 fill-amber-400' : 'text-[#DEC8B0]'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-sm font-black text-[#7F4F24] mr-2 font-mono">
                  {toPersianDigits(managerRating)} از ۵
                </span>
              </div>
            </div>

            {/* Manager Feedback Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6F4E37] block">
                یادداشت و رهنمود مدیریت برای مشاور:
              </label>
              <textarea
                rows={3}
                value={managerFeedback}
                onChange={(e) => setManagerFeedback(e.target.value)}
                placeholder="تحلیل، نقاط قوت یا تذکرات لازم برای بهبود فرآیند پیگیری..."
                className="w-full bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl p-3 text-xs sm:text-sm text-[#2B1810] placeholder-[#8D5B4C] focus:outline-none"
              />
            </div>

            {/* Decision Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSaveReview('warned')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] border border-[#EF5350]/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>ثبت با اخطار / کسر امتیاز</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSaveReview('approved')}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تایید عادی گزارش</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveReview('rewarded')}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#9C6644] to-[#7F4F24] hover:from-[#7F4F24] hover:to-[#5C4033] text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-105"
                >
                  <Award className="w-4 h-4" />
                  <span>اعطای پاداش و تشویق</span>
                </button>
              </div>
            </div>

            {actionSuccessMessage && (
              <div className="p-3.5 rounded-2xl bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] text-xs font-bold text-center">
                {actionSuccessMessage}
              </div>
            )}

          </div>
        </div>
      )}

      {/* DIRECTIVE / WARNING MODAL */}
      {warningModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#FFCDD2] w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scaleUp text-[#2B1810]">
            <div className="flex items-center justify-between border-b border-[#E6DAC8] pb-3">
              <div className="flex items-center gap-2 text-[#C62828]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-black text-[#2B1810]">ثبت تذکر انضباطی فوری در کارتابل مشاور</h3>
              </div>
              <button
                type="button"
                onClick={() => setWarningModalTarget(null)}
                className="p-1 rounded-xl text-[#8D5B4C] hover:bg-[#F5EDE2] hover:text-[#2B1810] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#5C4033] bg-[#FFEBEE] p-3.5 rounded-2xl border border-[#FFCDD2]">
              مشاور مخاطب: <strong className="text-[#2B1810]">{warningModalTarget.consultant.fullName}</strong> ({warningModalTarget.consultant.consultantCode})
              <br />
              علت: <strong className="text-[#C62828]">{warningModalTarget.reason}</strong>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6F4E37] block">
                متن ابلاغیه / تذکر انضباطی مدیریت:
              </label>
              <textarea
                rows={4}
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#C62828] rounded-2xl p-3 text-xs text-[#2B1810] placeholder-[#8D5B4C] focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWarningModalTarget(null)}
                className="px-4 py-2 rounded-2xl bg-[#FAF7F2] border border-[#DEC8B0] text-[#5C4033] text-xs hover:bg-[#F5EDE2] cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSendWarning}
                className="px-5 py-2.5 rounded-2xl bg-[#C62828] hover:bg-[#B71C1C] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
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
