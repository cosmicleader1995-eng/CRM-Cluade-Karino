import React, { useState, useEffect, useMemo } from 'react';
import { User, DailyReport, ReportRow, ManagerDirective, UpcomingFollowUpItem } from '../../types';
import { 
  getStoredConcerns, 
  saveReport, 
  deleteReport,
  getStoredReports, 
  saveDraft, 
  getDraft, 
  clearDraft,
  getStoredDirectives
} from '../../services/storage';
import { MEETING_TOPICS_LIST, FOLLOW_UP_STATUS_CODES } from '../../data/defaultData';
import { getCurrentShamsiDate, toPersianDigits, toEnglishDigits, getCurrentTimeFormatted, shamsiToDate } from '../../utils/shamsi';
import { exportSingleReportToExcel, printOfficialReport } from '../../utils/export';
import { FollowUpSelector } from '../common/FollowUpSelector';
import { FollowUpBadge } from '../common/FollowUpBadge';
import { ScrollableTabs, TabItem } from '../common/ScrollableTabs';
import { MorningDashboard } from './MorningDashboard';
import confetti from 'canvas-confetti';

import { 
  FilePlus, 
  History, 
  Plus, 
  Trash2, 
  Copy, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  FileSpreadsheet, 
  Printer, 
  Save, 
  MessageSquare, 
  Calendar,
  Clock,
  CheckCircle2,
  CalendarClock,
  Phone,
  Building,
  Edit3,
  X,
  AlertTriangle,
  RotateCcw,
  Check,
  Flame
} from 'lucide-react';

interface ConsultantDashboardProps {
  currentUser: User;
}

export const ConsultantDashboard: React.FC<ConsultantDashboardProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'morning' | 'form' | 'upcoming' | 'history'>('morning');
  const [concernsList, setConcernsList] = useState<string[]>(getStoredConcerns());
  const [allReports, setAllReports] = useState<DailyReport[]>(getStoredReports());
  const [directives, setDirectives] = useState<ManagerDirective[]>(getStoredDirectives());
  
  // Header form states
  const shamsi = getCurrentShamsiDate();
  const [guild, setGuild] = useState('اصناف و بنگاه‌های اقتصادی');
  const [dateShamsi, setDateShamsi] = useState(shamsi.formatted);
  const [dayOfWeekShamsi, setDayOfWeekShamsi] = useState(shamsi.dayOfWeek);
  
  // Edit existing report state
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Rows state
  const initialRow: ReportRow = {
    id: `row-${Date.now()}-1`,
    rowNumber: 1,
    clientName: '',
    activityField: '',
    personnelCount: '',
    phone: '',
    address: '',
    employerConcern: concernsList[0] || '',
    followUp1: '',
    followUp2: '',
    followUp3: '',
    followUp4: '',
    followUpResult: '',
    meetingTopic: ''
  };

  const [rows, setRows] = useState<ReportRow[]>([initialRow]);
  const [personalOpinion, setPersonalOpinion] = useState('');
  const [autoSavedTime, setAutoSavedTime] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [customConcernInput, setCustomConcernInput] = useState<{ [rowId: string]: string }>({});

  // Quick Follow-up Modal State for Tab 2
  const [activeFollowUpTarget, setActiveFollowUpTarget] = useState<UpcomingFollowUpItem | null>(null);
  const [newFollowUpSymbol, setNewFollowUpSymbol] = useState<string>('+');
  const [newFollowUpResultText, setNewFollowUpResultText] = useState<string>('');
  const [followUpSaveSuccess, setFollowUpSaveSuccess] = useState(false);

  // Refresh data from storage
  const reloadData = () => {
    setConcernsList(getStoredConcerns());
    setAllReports(getStoredReports());
    setDirectives(getStoredDirectives());
  };

  // Listen to live database sync from server
  useEffect(() => {
    const handleSync = () => {
      reloadData();
    };
    window.addEventListener('karino_db_synced', handleSync);
    return () => window.removeEventListener('karino_db_synced', handleSync);
  }, []);

  // Filter reports specifically for THIS consultant (User Isolation)
  const myReports = allReports.filter(r => r.consultantId === currentUser.id || r.consultantCode === currentUser.consultantCode);

  // Load draft on mount if not editing
  useEffect(() => {
    if (!editingReportId) {
      const draft = getDraft(currentUser.id);
      if (draft && draft.rows && draft.rows.length > 0) {
        setRows(draft.rows);
        if (draft.guild) setGuild(draft.guild);
        if (draft.personalOpinion) setPersonalOpinion(draft.personalOpinion);
        setAutoSavedTime('پیش‌نویس قبلی بازیابی شد');
      }
    }
  }, [currentUser.id, editingReportId]);

  // Auto-save draft on changes (only when not editing an existing report)
  useEffect(() => {
    if (editingReportId) return;
    const hasData = rows.some(r => r.clientName || r.phone || r.activityField) || personalOpinion;
    if (hasData) {
      const timer = setTimeout(() => {
        saveDraft(currentUser.id, {
          guild,
          rows,
          personalOpinion,
          dateShamsi
        });
        setAutoSavedTime(getCurrentTimeFormatted());
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [rows, guild, personalOpinion, dateShamsi, currentUser.id, editingReportId]);

  // Calculate Upcoming Follow-ups (4-Day Cycle)
  const upcomingFollowUps = useMemo<UpcomingFollowUpItem[]>(() => {
    const list: UpcomingFollowUpItem[] = [];
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMs = todayMidnight.getTime();

    myReports.forEach(rep => {
      // Use dateShamsi for accurate calendar-day calculation (avoids timezone/partial-day bugs)
      let reportDateMs: number;
      if (rep.dateShamsi) {
        const parsed = shamsiToDate(rep.dateShamsi);
        if (parsed && !isNaN(parsed.getTime())) {
          parsed.setHours(0, 0, 0, 0);
          reportDateMs = parsed.getTime();
        } else {
          const fallback = rep.createdAt ? new Date(rep.createdAt) : new Date();
          fallback.setHours(0, 0, 0, 0);
          reportDateMs = fallback.getTime();
        }
      } else {
        const fallback = rep.createdAt ? new Date(rep.createdAt) : new Date();
        fallback.setHours(0, 0, 0, 0);
        reportDateMs = fallback.getTime();
      }

      const elapsedDays = Math.round((todayMs - reportDateMs) / (1000 * 60 * 60 * 24));
      
      rep.rows.forEach(r => {
        // Exclude if already concluded:
        // Final states: '✓' (جلسه ست شد / قرارداد), '-' (پاسخ منفی), '*' (اشتباه / باطل), or completed followUp4
        const resultTrimmed = (r.followUpResult || '').trim();
        const hasReachedFinal = 
          resultTrimmed === '✓' || 
          resultTrimmed.startsWith('✓') ||
          resultTrimmed.includes('جلسه') ||
          resultTrimmed.includes('قرارداد') ||
          resultTrimmed === '-' || 
          resultTrimmed.startsWith('-') ||
          resultTrimmed.includes('انصراف') ||
          resultTrimmed === '*' ||
          resultTrimmed.startsWith('*') ||
          r.followUp1 === '✓' ||
          r.followUp2 === '✓' ||
          r.followUp3 === '✓' ||
          r.followUp4 === '✓' ||
          (r.followUp4 && r.followUp4.trim() !== '');

        // Only include if followUp1 has been done and not final
        if (r.followUp1 && !hasReachedFinal) {
          // Determine next step
          let nextStep = 2;
          if (r.followUp3) {
            nextStep = 4;
          } else if (r.followUp2) {
            nextStep = 3;
          }

          // Target cycle days: Step 2 = 4 days, Step 3 = 8 days, Step 4 = 12 days
          const targetCycleDays = (nextStep - 1) * 4;
          const daysRemaining = targetCycleDays - elapsedDays;

          let statusCategory: 'today' | 'overdue' | 'future' = 'future';
          if (daysRemaining === 0) {
            statusCategory = 'today';
          } else if (daysRemaining < 0) {
            statusCategory = 'overdue';
          } else {
            statusCategory = 'future';
          }

          list.push({
            reportId: rep.id,
            reportDateShamsi: rep.dateShamsi,
            createdAt: rep.createdAt,
            guild: rep.guild,
            rowNumber: r.rowNumber,
            rowId: r.id,
            clientName: r.clientName,
            activityField: r.activityField,
            phone: r.phone,
            address: r.address,
            employerConcern: r.employerConcern,
            meetingTopic: r.meetingTopic,
            followUp1: r.followUp1,
            followUp2: r.followUp2,
            followUp3: r.followUp3,
            followUp4: r.followUp4,
            followUpResult: r.followUpResult,
            nextStepNumber: nextStep,
            elapsedDays,
            daysRemaining,
            statusCategory
          });
        }
      });
    });

    // Sort: Overdue first, then Today, then Future
    return list.sort((a, b) => {
      const order = { overdue: 0, today: 1, future: 2 };
      if (order[a.statusCategory] !== order[b.statusCategory]) {
        return order[a.statusCategory] - order[b.statusCategory];
      }
      return b.elapsedDays - a.elapsedDays;
    });
  }, [myReports]);

  // Group upcoming follow-ups
  const todayFollowUps = useMemo(() => upcomingFollowUps.filter(i => i.statusCategory === 'today'), [upcomingFollowUps]);
  const overdueFollowUps = useMemo(() => upcomingFollowUps.filter(i => i.statusCategory === 'overdue'), [upcomingFollowUps]);
  const futureFollowUps = useMemo(() => upcomingFollowUps.filter(i => i.statusCategory === 'future'), [upcomingFollowUps]);

  // Row management handlers
  const handleAddRow = () => {
    const newRow: ReportRow = {
      id: `row-${Date.now()}-${rows.length + 1}`,
      rowNumber: rows.length + 1,
      clientName: '',
      activityField: rows[rows.length - 1]?.activityField || '',
      personnelCount: '',
      phone: '',
      address: '',
      employerConcern: concernsList[0] || '',
      followUp1: '',
      followUp2: '',
      followUp3: '',
      followUp4: '',
      followUpResult: '',
      meetingTopic: ''
    };
    setRows([...rows, newRow]);
  };

  const handleCloneRow = (index: number) => {
    const source = rows[index];
    const cloned: ReportRow = {
      ...source,
      id: `row-${Date.now()}-${rows.length + 1}`,
      rowNumber: rows.length + 1,
      clientName: `${source.clientName} (شعبه دوم)`
    };
    setRows([...rows, cloned]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      alert('حداقل باید یک ردیف در گزارش روزانه وجود داشته باشد.');
      return;
    }
    const filtered = rows.filter((_, i) => i !== index).map((r, i) => ({
      ...r,
      rowNumber: i + 1
    }));
    setRows(filtered);
  };

  const handleUpdateRow = (index: number, field: keyof ReportRow, value: any) => {
    const updated = [...rows];
    const currentRow = updated[index];
    const updatedRow = { ...currentRow, [field]: value };

    // Smart auto-fill: If followUp1 symbol is picked and followUpResult is empty or was previously a symbol label, auto-suggest the label
    if (field === 'followUp1' && value && (!currentRow.followUpResult.trim() || FOLLOW_UP_STATUS_CODES.some(c => c.label === currentRow.followUpResult))) {
      const codeObj = FOLLOW_UP_STATUS_CODES.find(c => c.code === value || c.symbol === value);
      if (codeObj) {
        updatedRow.followUpResult = codeObj.label;
      }
    }

    updated[index] = updatedRow;
    setRows(updated);
  };

  // Validation logic: Only followUp1 is mandatory, others are optional
  const checkCompleteness = () => {
    const errors: string[] = [];
    if (!guild.trim()) errors.push('نام صنف یا حوزه فعالیت کلی گزارش را وارد کنید.');
    if (!personalOpinion.trim()) errors.push('تکمیل بخش «نظر و بازخورد کارشناسی مشاور» برای مدیریت الزامی است.');

    rows.forEach((r, idx) => {
      const num = idx + 1;
      if (!r.clientName.trim()) errors.push(`ردیف ${toPersianDigits(num)}: نام و نام خانوادگی کارفرما الزامی است.`);
      if (!r.activityField.trim()) errors.push(`ردیف ${toPersianDigits(num)}: زمینه فعالیت الزامی است.`);
      if (!r.phone.trim()) errors.push(`ردیف ${toPersianDigits(num)}: شماره تماس الزامی است.`);
      if (!r.address.trim()) errors.push(`ردیف ${toPersianDigits(num)}: آدرس الزامی است.`);
      if (!r.employerConcern.trim()) errors.push(`ردیف ${toPersianDigits(num)}: دغدغه کارفرما انتخاب نشده است.`);
      if (!r.followUp1.trim()) {
        errors.push(`ردیف ${toPersianDigits(num)}: مرحله پیگیری ۱ (انتخاب نماد تماس اول) الزامی است.`);
      }
      if (!r.followUpResult.trim()) {
        const codeObj = FOLLOW_UP_STATUS_CODES.find(c => c.code === r.followUp1 || c.symbol === r.followUp1);
        if (codeObj) {
          r.followUpResult = codeObj.label;
        } else {
          errors.push(`ردیف ${toPersianDigits(num)}: نتیجه پیگیری را بنویسید.`);
        }
      }
    });

    return errors;
  };

  // Calculate percentage of mandatory fields completed
  // 7 mandatory fields per row: clientName, activityField, phone, address, concern, followUp1, followUpResult
  const totalMandatoryFields = 2 + (rows.length * 7); 
  let filledMandatoryFields = 0;
  if (guild.trim()) filledMandatoryFields++;
  if (personalOpinion.trim()) filledMandatoryFields++;
  rows.forEach(r => {
    if (r.clientName.trim()) filledMandatoryFields++;
    if (r.activityField.trim()) filledMandatoryFields++;
    if (r.phone.trim()) filledMandatoryFields++;
    if (r.address.trim()) filledMandatoryFields++;
    if (r.employerConcern.trim()) filledMandatoryFields++;
    if (r.followUp1.trim()) filledMandatoryFields++;
    if (r.followUpResult.trim() || r.followUp1.trim()) filledMandatoryFields++;
  });
  const completionPercentage = Math.round((filledMandatoryFields / totalMandatoryFields) * 100);

  // Submit new or edited report
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = checkCompleteness();
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    setValidationErrors([]);

    const reportIdToSave = editingReportId || `rep-${Date.now()}`;
    const existingRep = editingReportId ? allReports.find(r => r.id === editingReportId) : null;
    
    // Ensure all row follow-up results are populated and normalized
    const sanitizedRows = rows.map(r => ({
      ...r,
      followUpResult: r.followUpResult.trim() || (FOLLOW_UP_STATUS_CODES.find(c => c.code === r.followUp1 || c.symbol === r.followUp1)?.label || 'در حال پیگیری')
    }));

    const reportToSave: DailyReport = {
      id: reportIdToSave,
      consultantId: currentUser.id,
      consultantName: currentUser.fullName,
      consultantCode: currentUser.consultantCode,
      guild,
      dateShamsi: toEnglishDigits(dateShamsi),
      dayOfWeekShamsi,
      createdAt: existingRep?.createdAt || new Date().toISOString(),
      submittedAt: existingRep?.submittedAt || getCurrentTimeFormatted(),
      status: existingRep?.status || 'submitted',
      personalOpinion,
      rows: sanitizedRows,
      managerFeedback: existingRep?.managerFeedback,
      managerRating: existingRep?.managerRating,
      reviewedAt: existingRep?.reviewedAt
    };

    saveReport(reportToSave);
    clearDraft(currentUser.id);
    setAllReports(getStoredReports());
    setSubmitSuccess(true);
    setEditingReportId(null);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      setSubmitSuccess(false);
      // Reset form if it was a new report
      const cleanRow: ReportRow = {
        id: `row-${Date.now()}-1`,
        rowNumber: 1,
        clientName: '',
        activityField: '',
        personnelCount: '',
        phone: '',
        address: '',
        employerConcern: concernsList[0] || '',
        followUp1: '',
        followUp2: '',
        followUp3: '',
        followUp4: '',
        followUpResult: '',
        meetingTopic: ''
      };
      setRows([cleanRow]);
      setPersonalOpinion('');
    }, 4000);
  };

  // Load report into Form for Editing
  const handleEditReport = (report: DailyReport) => {
    setEditingReportId(report.id);
    setGuild(report.guild || 'اصناف و بنگاه‌های اقتصادی');
    setDateShamsi(report.dateShamsi);
    setDayOfWeekShamsi(report.dayOfWeekShamsi);
    setRows(report.rows.map(r => ({ ...r })));
    setPersonalOpinion(report.personalOpinion || '');
    setActiveSubTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingReportId(null);
    const cleanRow: ReportRow = {
      id: `row-${Date.now()}-1`,
      rowNumber: 1,
      clientName: '',
      activityField: '',
      personnelCount: '',
      phone: '',
      address: '',
      employerConcern: concernsList[0] || '',
      followUp1: '',
      followUp2: '',
      followUp3: '',
      followUp4: '',
      followUpResult: '',
      meetingTopic: ''
    };
    setRows([cleanRow]);
    setPersonalOpinion('');
  };

  // Open Quick Follow-up Modal from Tab 2
  const handleOpenFollowUpModal = (item: UpcomingFollowUpItem) => {
    setActiveFollowUpTarget(item);
    setNewFollowUpSymbol('+');
    setNewFollowUpResultText('');
    setFollowUpSaveSuccess(false);
  };

  // Save Next Follow-up in Storage & Supabase
  const handleSaveNextFollowUp = () => {
    if (!activeFollowUpTarget) return;

    const parentReport = allReports.find(r => r.id === activeFollowUpTarget.reportId);
    if (!parentReport) {
      alert('گزارش مرجع یافت نشد.');
      return;
    }

    const updatedRows = parentReport.rows.map(row => {
      const isTargetRow = 
        (activeFollowUpTarget.rowId && row.id === activeFollowUpTarget.rowId) ||
        (row.rowNumber === activeFollowUpTarget.rowNumber && row.clientName === activeFollowUpTarget.clientName) ||
        (row.phone && activeFollowUpTarget.phone && row.phone === activeFollowUpTarget.phone && row.clientName === activeFollowUpTarget.clientName);

      if (isTargetRow) {
        const updatedRow: ReportRow = { ...row };
        if (activeFollowUpTarget.nextStepNumber === 2) {
          updatedRow.followUp2 = newFollowUpSymbol;
        } else if (activeFollowUpTarget.nextStepNumber === 3) {
          updatedRow.followUp3 = newFollowUpSymbol;
        } else if (activeFollowUpTarget.nextStepNumber === 4) {
          updatedRow.followUp4 = newFollowUpSymbol;
        }
        if (newFollowUpResultText.trim()) {
          updatedRow.followUpResult = newFollowUpResultText.trim();
        } else {
          // Always update followUpResult to reflect the latest follow-up symbol
          const codeObj = FOLLOW_UP_STATUS_CODES.find(c => c.code === newFollowUpSymbol || c.symbol === newFollowUpSymbol);
          if (codeObj) {
            updatedRow.followUpResult = codeObj.label;
          }
        }
        return updatedRow;
      }
      return row;
    });

    const updatedReport: DailyReport = {
      ...parentReport,
      rows: updatedRows,
      submittedAt: getCurrentTimeFormatted(),
      updatedAt: new Date().toISOString()
    };

    saveReport(updatedReport);
    setAllReports(getStoredReports());
    setFollowUpSaveSuccess(true);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });

    setTimeout(() => {
      setFollowUpSaveSuccess(false);
      setActiveFollowUpTarget(null);
    }, 1200);
  };

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-slate-100">
      
      {/* 1. CONSULTANT HERO BANNER */}
      <div className="navy-card-glass rounded-3xl border border-amber-500/30 p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
                {currentUser.fullName.slice(0, 1)}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                پنل اجرایی مشاور: {currentUser.fullName}
              </h2>
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                کد مشاور: {currentUser.consultantCode}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              هر پیگیری دقیق شما، گامی در ایجاد امنیت حقوقی برای کارفرمایان و پایداری کسب‌وکارهاست. گزارشات ارسالی مستقیماً در داشبورد نظارتی مدیریت منعکس می‌گردد.
            </p>
          </div>

          {/* KPI Mini Badges */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="flex-1 md:flex-initial bg-[#081525]/80 border border-amber-500/20 px-4 py-2.5 rounded-xl text-center min-w-[120px]">
              <span className="text-[11px] text-slate-400 block">گزارشات ارسالی</span>
              <span className="text-lg font-black gold-gradient-text">{toPersianDigits(myReports.length)} گزارش</span>
            </div>
            <div className="flex-1 md:flex-initial bg-[#081525]/80 border border-amber-500/20 px-4 py-2.5 rounded-xl text-center min-w-[120px]">
              <span className="text-[11px] text-slate-400 block">پیگیری‌های فعال</span>
              <span className="text-lg font-black text-amber-300">{toPersianDigits(upcomingFollowUps.length)} کارفرما</span>
            </div>
            {overdueFollowUps.length > 0 && (
              <div className="flex-1 md:flex-initial bg-rose-950/60 border border-rose-500/40 px-4 py-2.5 rounded-xl text-center min-w-[120px]">
                <span className="text-[11px] text-rose-300 block">معوق (+۴ روز)</span>
                <span className="text-lg font-black text-rose-400">{toPersianDigits(overdueFollowUps.length)} مورد</span>
              </div>
            )}
          </div>
        </div>

        {/* Ambient Wave Decor */}
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. SUB-NAVIGATION BUTTONS (3 TABS) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <ScrollableTabs
          theme="dark"
          activeTab={activeSubTab}
          onChange={(id) => setActiveSubTab(id as any)}
          className="w-full sm:w-auto"
          tabs={[
            {
              id: 'morning',
              label: '📋 برنامه روزانه (داشبورد هوشمند)',
              icon: Flame,
              badge: (overdueFollowUps.length + todayFollowUps.length) > 0 ? toPersianDigits(overdueFollowUps.length + todayFollowUps.length) : undefined,
              badgeColor: overdueFollowUps.length > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-500 text-white'
            },
            {
              id: 'form',
              label: editingReportId ? 'ویرایش و تکمیل گزارش' : 'فرم ثبت گزارش عملکرد روزانه',
              icon: FilePlus
            },
            {
              id: 'upcoming',
              label: 'پیگیری‌های آینده (چرخه ۴ روزه)',
              icon: CalendarClock,
              badge: upcomingFollowUps.length > 0 ? toPersianDigits(upcomingFollowUps.length) : undefined,
              badgeColor: overdueFollowUps.length > 0 ? 'bg-rose-500 text-white animate-pulse' : undefined
            },
            {
              id: 'history',
              label: `سوابق گزارشات و فیدبک مدیریت (${toPersianDigits(myReports.length)})`,
              icon: History
            }
          ]}
        />

        {/* Auto Save Notification */}
        {autoSavedTime && activeSubTab === 'form' && !editingReportId && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-mono self-start sm:self-center shrink-0">
            <Save className="w-3.5 h-3.5" />
            <span>ذخیره خودکار پیش‌نویس: {autoSavedTime}</span>
          </div>
        )}
      </div>

      {/* TAB 0: MORNING DASHBOARD (TODAY'S PLAN & OVERDUE ACTIONS) */}
      {activeSubTab === 'morning' && (
        <MorningDashboard
          currentUser={currentUser}
          reports={allReports}
          directives={directives}
          upcomingFollowUps={upcomingFollowUps}
          onOpenFollowUp={handleOpenFollowUpModal}
          onGoToReportForm={() => setActiveSubTab('form')}
          onGoToFollowUpsTab={() => setActiveSubTab('upcoming')}
        />
      )}

      {/* TAB 1: FORM VIEW (NEW OR EDIT) */}
      {activeSubTab === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
          
          {/* Active Edit Mode Banner */}
          {editingReportId && (
            <div className="p-4 rounded-2xl bg-amber-950/80 border-2 border-amber-500 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl animate-fadeIn">
              <div className="flex items-center gap-3">
                <Edit3 className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-white">در حال ویرایش و تکمیل گزارش مورخ {dateShamsi}</h4>
                  <p className="text-xs text-amber-300/90">می‌توانید اطلاعات کارفرمایان یا پیگیری‌های ۲ تا ۴ را تکمیل کرده و ذخیره نمایید.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <X className="w-4 h-4" />
                <span>لغو ویرایش و ایجاد گزارش جدید</span>
              </button>
            </div>
          )}

          {/* Submission Success Toast */}
          {submitSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500 text-emerald-200 flex items-center justify-between gap-3 shadow-2xl animate-bounce">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">گزارش روزانه شما با موفقیت در سیستم ثبت و ذخیره شد!</h4>
                  <p className="text-xs text-emerald-300/90">داده‌ها در پایگاه داده و داشبورد نظارتی مدیریت منعکس گردید.</p>
                </div>
              </div>
              <span className="text-xs font-mono bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                وضعیت: ثبت شد
              </span>
            </div>
          )}

          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 space-y-2 shadow-2xl animate-shake">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>لطفاً موارد الزامی زیر را قبل از ثبت تکمیل نمایید:</span>
              </div>
              <ul className="list-disc list-inside text-xs space-y-1 text-rose-200/90 pr-2">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              <p className="text-[11px] text-rose-300 font-medium pt-1">
                * توجه: فقط فیلدهای کارفرما و پیگیری ۱ الزامی هستند؛ مراحل پیگیری ۲ تا ۴ برای روزهای بعدی اختیاری می‌باشند.
              </p>
            </div>
          )}

          {/* Form Header Card */}
          <div className="navy-card-glass rounded-2xl border border-amber-500/30 p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h3 className="text-base font-bold text-white">
                  مشخصات سربرگ گزارش عملکرد روزانه بخش اجرایی
                </h3>
              </div>
              <span className="text-xs text-amber-300 font-medium">
                پیگیری ۱ الزامی • پیگیری‌های ۲ تا ۴ اختیاری هستند
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Consultant Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>نام مشاور:</span>
                  <span className="text-amber-400 text-xs">*</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser.fullName}
                  className="w-full bg-[#071322] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-amber-200 font-bold cursor-not-allowed opacity-90"
                />
              </div>

              {/* Consultant Code */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>کد مشاور:</span>
                  <span className="text-amber-400 text-xs">*</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser.consultantCode}
                  className="w-full bg-[#071322] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-amber-200 font-bold font-mono text-left cursor-not-allowed opacity-90"
                />
              </div>

              {/* Guild / Industry */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>صنف / حوزه فعالیت:</span>
                  <span className="text-amber-400 text-xs">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={guild}
                  onChange={(e) => setGuild(e.target.value)}
                  placeholder="مثال: قطعات خودرو، پوشاک، آهن‌آلات..."
                  className="w-full bg-[#081525] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {/* Shamsi Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>تاریخ گزارش:</span>
                  <span className="text-amber-400 text-xs">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={dateShamsi}
                    onChange={(e) => setDateShamsi(e.target.value)}
                    className="w-full bg-[#081525] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono text-center focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                    ({dayOfWeekShamsi})
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Standard 5 Symbols Guide */}
          <div className="bg-[#081525]/90 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300">
              <span>راهنمای ۵ نماد استاندارد و ۲۵ ساله کارینو در ثبت مراحل پیگیری:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="flex items-center gap-2 bg-[#06101c] p-2 rounded-xl border border-slate-800">
                <FollowUpBadge code="*" size="sm" />
                <span className="text-slate-300">اشتباه / باطل</span>
              </div>
              <div className="flex items-center gap-2 bg-[#06101c] p-2 rounded-xl border border-slate-800">
                <FollowUpBadge code="+" size="sm" />
                <span className="text-slate-300">پاسخ مثبت</span>
              </div>
              <div className="flex items-center gap-2 bg-[#06101c] p-2 rounded-xl border border-slate-800">
                <FollowUpBadge code="-" size="sm" />
                <span className="text-slate-300">پاسخ منفی</span>
              </div>
              <div className="flex items-center gap-2 bg-[#06101c] p-2 rounded-xl border border-slate-800">
                <FollowUpBadge code="." size="sm" />
                <span className="text-slate-300">عدم پاسخگویی</span>
              </div>
              <div className="flex items-center gap-2 bg-[#06101c] p-2 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                <FollowUpBadge code="✓" size="sm" />
                <span className="text-slate-300 font-bold text-emerald-400">جلسه ست شد / قرارداد</span>
              </div>
            </div>
          </div>

          {/* Report Rows Container */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">جدول کارفرمایان پیگیری‌شده</span>
                <span className="text-xs text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-mono">
                  {toPersianDigits(rows.length)} ردیف
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن کارفرمای جدید</span>
              </button>
            </div>

            {/* Individual Row Cards */}
            <div className="space-y-4">
              {rows.map((row, index) => {
                const rowNum = index + 1;
                return (
                  <div 
                    key={row.id || index}
                    className="navy-card-glass rounded-2xl border border-slate-700/80 hover:border-amber-500/40 p-4 sm:p-5 shadow-lg space-y-4 transition-all"
                  >
                    {/* Row Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-300 font-bold font-mono text-xs flex items-center justify-center border border-amber-500/40">
                          {toPersianDigits(rowNum)}
                        </span>
                        <span className="text-sm font-bold text-white">
                          کارفرما {row.clientName ? `: ${row.clientName}` : `(ردیف ${toPersianDigits(rowNum)})`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCloneRow(index)}
                          className="p-1.5 rounded-lg bg-[#081525] hover:bg-slate-800 text-slate-400 hover:text-amber-300 text-xs flex items-center gap-1 border border-slate-700 cursor-pointer"
                          title="کپی کردن مشخصات این ردیف"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">کپی ردیف</span>
                        </button>
                        
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs flex items-center gap-1 border border-rose-800/60 cursor-pointer"
                            title="حذف این ردیف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">حذف</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Basic Client Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      
                      {/* Client Name */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 flex items-center gap-1">
                          <span>نام و نام خانوادگی کارفرما:</span>
                          <span className="text-amber-400 text-xs">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={row.clientName}
                          onChange={(e) => handleUpdateRow(index, 'clientName', e.target.value)}
                          placeholder="مثال: مهندس رحیمی"
                          className="w-full bg-[#0c1e34] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>

                      {/* Activity Field */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 flex items-center gap-1">
                          <span>زمینه فعالیت:</span>
                          <span className="text-amber-400 text-xs">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={row.activityField}
                          onChange={(e) => handleUpdateRow(index, 'activityField', e.target.value)}
                          placeholder="مثال: تولیدی مبلمان"
                          className="w-full bg-[#0c1e34] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>

                      {/* Personnel Count (Optional) */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 flex items-center gap-1">
                          <span>تعداد پرسنل:</span>
                          <span className="text-slate-500 text-[10px]">(اختیاری)</span>
                        </label>
                        <input
                          type="text"
                          value={row.personnelCount}
                          onChange={(e) => handleUpdateRow(index, 'personnelCount', e.target.value)}
                          placeholder="مثال: ۱۸ نفر"
                          className="w-full bg-[#0c1e34] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 flex items-center gap-1">
                          <span>شماره تماس:</span>
                          <span className="text-amber-400 text-xs">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={row.phone}
                          onChange={(e) => handleUpdateRow(index, 'phone', e.target.value)}
                          placeholder="0912... یا تلفن ثابت"
                          className="w-full bg-[#0c1e34] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono text-left"
                        />
                      </div>

                    </div>

                    {/* Address Field */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 flex items-center gap-1">
                        <span>آدرس محل فعالیت / کارخانه:</span>
                        <span className="text-amber-400 text-xs">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={row.address}
                        onChange={(e) => handleUpdateRow(index, 'address', e.target.value)}
                        placeholder="آدرس دقیق یا منطقه (مثال: جاده خاوران، شهرک صنعتی پایتخت، خ صنعت ۵...)"
                        className="w-full bg-[#0c1e34] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>

                    {/* Employer Concern Selection */}
                    <div className="space-y-1.5 bg-[#071322] p-3.5 rounded-xl border border-slate-800">
                      <label className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <span>دغدغه اصلی کارفرما (بر اساس مصاحبه و کشف نیاز):</span>
                        <span className="text-amber-400 text-xs">*</span>
                      </label>
                      <select
                        required
                        value={row.employerConcern}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateRow(index, 'employerConcern', val);
                        }}
                        className="w-full bg-[#0c1e34] border border-amber-500/30 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="">-- انتخاب سرفصل دغدغه کارفرما --</option>
                        {concernsList.map((concern, cIdx) => (
                          <option key={cIdx} value={concern}>
                            {concern}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 4 Follow-up Stages (1 Mandatory, 2-4 Optional) */}
                    <div className="space-y-2 bg-[#081525] p-3.5 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">مراحل پیگیری (۱ تا ۴):</span>
                        <span className="text-[11px] text-amber-300">
                          پیگیری ۱ الزامی • پیگیری‌های ۲ تا ۴ برای روزهای آینده اختیاری است
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        
                        {/* Follow-up 1 (MANDATORY) */}
                        <div className="space-y-1 p-2 rounded-xl bg-[#06101c] border border-amber-500/40">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-amber-300 font-bold">پیگیری ۱ (تماس اول) *</span>
                            <span className="text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded">الزامی</span>
                          </div>
                          <FollowUpSelector
                            value={row.followUp1}
                            onChange={(val) => handleUpdateRow(index, 'followUp1', val)}
                          />
                        </div>

                        {/* Follow-up 2 (OPTIONAL) */}
                        <div className="space-y-1 p-2 rounded-xl bg-[#06101c] border border-slate-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">پیگیری ۲ (+۴ روز)</span>
                            <span className="text-[10px] text-slate-400">اختیاری</span>
                          </div>
                          <FollowUpSelector
                            value={row.followUp2}
                            onChange={(val) => handleUpdateRow(index, 'followUp2', val)}
                          />
                        </div>

                        {/* Follow-up 3 (OPTIONAL) */}
                        <div className="space-y-1 p-2 rounded-xl bg-[#06101c] border border-slate-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">پیگیری ۳ (+۸ روز)</span>
                            <span className="text-[10px] text-slate-400">اختیاری</span>
                          </div>
                          <FollowUpSelector
                            value={row.followUp3}
                            onChange={(val) => handleUpdateRow(index, 'followUp3', val)}
                          />
                        </div>

                        {/* Follow-up 4 (OPTIONAL) */}
                        <div className="space-y-1 p-2 rounded-xl bg-[#06101c] border border-slate-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">پیگیری ۴ (+۱۲ روز)</span>
                            <span className="text-[10px] text-slate-400">اختیاری</span>
                          </div>
                          <FollowUpSelector
                            value={row.followUp4}
                            onChange={(val) => handleUpdateRow(index, 'followUp4', val)}
                          />
                        </div>

                      </div>
                    </div>

                    {/* Result & Meeting Topic */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      
                      {/* Follow-up Result */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 flex items-center gap-1">
                          <span>نتیجه پیگیری و وضعیت فعلی:</span>
                          <span className="text-amber-400 text-xs">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={row.followUpResult}
                          onChange={(e) => handleUpdateRow(index, 'followUpResult', e.target.value)}
                          placeholder="مثال: ✓ جلسه ست شد برای دوشنبه ساعت ۱۰ / . عدم پاسخگویی..."
                          className="w-full bg-[#0c1e34] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>

                      {/* Meeting Topic */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 flex items-center gap-1">
                          <span>موضوع جلسه و بسته پیشنهادی:</span>
                          <span className="text-slate-400 text-xs">(اختیاری)</span>
                        </label>
                        <input
                          type="text"
                          value={row.meetingTopic}
                          onChange={(e) => handleUpdateRow(index, 'meetingTopic', e.target.value)}
                          placeholder="مثال: قراردادهای پرسنلی، پیشگیری از دعاوی اداره کار..."
                          className="w-full bg-[#0c1e34] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Mandatory Personal Opinion Section */}
          <div className="navy-card-glass rounded-2xl border border-amber-500/40 p-5 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>نظر و تحلیل شخصی مشاور درباره فعالیت روزانه (ستون به شدت مهم برای مدیریت) *</span>
              </label>
              <span className="text-[11px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
                تکمیل الزامی
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              تحلیل کارشناسی، چالش‌ها، میزان پذیرش کارفرمایان و پیشنهاد شما برای بهبود خدمات یا تسهیل عقد قرارداد را ثبت فرمایید:
            </p>
            <textarea
              required
              rows={3}
              value={personalOpinion}
              onChange={(e) => setPersonalOpinion(e.target.value)}
              placeholder="دیدگاه کارشناسی شما درباره جلسات امروز، مقاومت‌ها یا فرصت‌های کشف‌شده در این صنف..."
              className="w-full bg-[#081525] border border-amber-500/30 focus:border-amber-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/20 leading-relaxed"
            />
          </div>

          {/* Action Buttons Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400">
              * پس از ثبت، گزارش در پنل نظارتی مدیریت جهت بررسی، امتیازدهی و آرشیو قرار می‌گیرد.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={completionPercentage < 100}
                className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                  completionPercentage === 100
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 shadow-amber-500/30 cursor-pointer hover:scale-105'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 border border-slate-700'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{editingReportId ? 'ذخیره تغییرات و تکمیل گزارش' : 'ثبت نهایی و ارسال به مدیریت'}</span>
              </button>
            </div>
          </div>

        </form>
      )}

      {/* TAB 2: UPCOMING FOLLOW-UPS (4-DAY CYCLE) */}
      {activeSubTab === 'upcoming' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#081525] p-5 rounded-2xl border border-amber-500/30 shadow-lg">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-400" />
                <span>میز کار پیگیری‌های آینده (چرخه زمانی ۴ روزه)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                کارفرمایانی که در مراحل پیگیری ۱ تا ۳ هستند و به نتیجه قطعی نرسیده‌اند، بر اساس چرخه +۴ روز دسته‌بندی شده‌اند.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-xl font-bold">
                امروز: {toPersianDigits(todayFollowUps.length)} تماس
              </span>
              <span className="bg-rose-950/80 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-xl font-bold">
                معوق: {toPersianDigits(overdueFollowUps.length)} تماس
              </span>
              <span className="bg-amber-950/80 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-xl font-bold">
                آینده: {toPersianDigits(futureFollowUps.length)} تماس
              </span>
            </div>
          </div>

          {upcomingFollowUps.length === 0 ? (
            <div className="navy-card-glass rounded-2xl border border-slate-800 p-10 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">تمام پیگیری‌های شما به نتیجه قطعی رسیده است!</h4>
              <p className="text-xs text-slate-400">هیچ کارفرمایی در وضعیت معوق یا در انتظار پیگیری بعدی قرار ندارد.</p>
              <button
                onClick={() => setActiveSubTab('form')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                ثبت گزارش و کارفرمایان جدید
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* 1. OVERDUE SECTION (معوق و تاخیر خورده) */}
              {overdueFollowUps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm border-b border-rose-500/30 pb-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span>🔴 نوبت تماس‌های معوق و تاخیر خورده (+۴ روز گذشته) - {toPersianDigits(overdueFollowUps.length)} کارفرما:</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {overdueFollowUps.map((item, idx) => (
                      <div 
                        key={item.rowId || idx}
                        className="bg-[#0a1524] border-2 border-rose-500/60 hover:border-rose-400 rounded-2xl p-4 shadow-lg space-y-3 transition-all relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="font-bold text-white text-sm">{item.clientName}</span>
                          <span className="bg-rose-500/20 text-rose-300 font-mono text-[11px] px-2 py-0.5 rounded-lg border border-rose-500/40">
                            {toPersianDigits(Math.abs(item.daysRemaining))} روز از موعد پیگیری {toPersianDigits(item.nextStepNumber)} گذشته
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">صنف:</span>
                            <span className="font-semibold text-amber-200">{item.activityField}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">تماس:</span>
                            <a href={`tel:${item.phone}`} className="font-mono text-amber-400 hover:underline">{item.phone}</a>
                          </div>
                          <div className="text-slate-400 truncate" title={item.employerConcern}>
                            دغدغه: <span className="text-slate-200">{item.employerConcern}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-1 bg-[#06101c] p-1 rounded-lg border border-slate-800">
                            <FollowUpBadge code={item.followUp1} size="sm" />
                            <FollowUpBadge code={item.followUp2} size="sm" />
                            <FollowUpBadge code={item.followUp3} size="sm" />
                            <FollowUpBadge code={item.followUp4} size="sm" />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenFollowUpModal(item)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>ثبت پیگیری {toPersianDigits(item.nextStepNumber)}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. TODAY SECTION (نوبت تماس امروز) */}
              {todayFollowUps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm border-b border-emerald-500/30 pb-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>🟢 نوبت تماس‌های امروز (دقیقاً موعد ۴ روزه) - {toPersianDigits(todayFollowUps.length)} کارفرما:</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {todayFollowUps.map((item, idx) => (
                      <div 
                        key={item.rowId || idx}
                        className="bg-[#0a1524] border-2 border-emerald-500/60 hover:border-emerald-400 rounded-2xl p-4 shadow-lg space-y-3 transition-all relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="font-bold text-white text-sm">{item.clientName}</span>
                          <span className="bg-emerald-500/20 text-emerald-300 font-bold text-[11px] px-2 py-0.5 rounded-lg border border-emerald-500/40">
                            موعد پیگیری {toPersianDigits(item.nextStepNumber)}: امروز
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">صنف:</span>
                            <span className="font-semibold text-amber-200">{item.activityField}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">تماس:</span>
                            <a href={`tel:${item.phone}`} className="font-mono text-amber-400 hover:underline">{item.phone}</a>
                          </div>
                          <div className="text-slate-400 truncate" title={item.employerConcern}>
                            دغدغه: <span className="text-slate-200">{item.employerConcern}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-1 bg-[#06101c] p-1 rounded-lg border border-slate-800">
                            <FollowUpBadge code={item.followUp1} size="sm" />
                            <FollowUpBadge code={item.followUp2} size="sm" />
                            <FollowUpBadge code={item.followUp3} size="sm" />
                            <FollowUpBadge code={item.followUp4} size="sm" />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenFollowUpModal(item)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>ثبت پیگیری {toPersianDigits(item.nextStepNumber)}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. FUTURE DAYS SECTION (روزهای آینده) */}
              {futureFollowUps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm border-b border-amber-500/30 pb-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span>🟡 پیگیری‌های روزهای آینده (موعد آتی) - {toPersianDigits(futureFollowUps.length)} کارفرما:</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {futureFollowUps.map((item, idx) => (
                      <div 
                        key={item.rowId || idx}
                        className="bg-[#081525] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 shadow space-y-3 transition-all"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="font-bold text-white text-sm">{item.clientName}</span>
                          <span className="bg-amber-500/10 text-amber-300 text-[11px] px-2 py-0.5 rounded-lg border border-amber-500/20 font-mono">
                            {toPersianDigits(item.daysRemaining)} روز تا پیگیری {toPersianDigits(item.nextStepNumber)}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">صنف:</span>
                            <span className="font-semibold text-amber-200">{item.activityField}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">تماس:</span>
                            <a href={`tel:${item.phone}`} className="font-mono text-amber-400 hover:underline">{item.phone}</a>
                          </div>
                          <div className="text-slate-400 truncate" title={item.employerConcern}>
                            دغدغه: <span className="text-slate-200">{item.employerConcern}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-1 bg-[#06101c] p-1 rounded-lg border border-slate-800">
                            <FollowUpBadge code={item.followUp1} size="sm" />
                            <FollowUpBadge code={item.followUp2} size="sm" />
                            <FollowUpBadge code={item.followUp3} size="sm" />
                            <FollowUpBadge code={item.followUp4} size="sm" />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenFollowUpModal(item)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer transition-all flex items-center gap-1"
                          >
                            <span>ثبت زودهنگام {toPersianDigits(item.nextStepNumber)}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* TAB 3: MY PAST SUBMITTED REPORTS HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>تاریخچه گزارش‌های ارسالی شما</span>
              <span className="text-xs text-slate-400">
                ({toPersianDigits(myReports.length)} گزارش مستند)
              </span>
            </h3>
          </div>

          {myReports.length === 0 ? (
            <div className="navy-card-glass rounded-2xl border border-slate-800 p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-300">هنوز گزارشی توسط شما ثبت نشده است</h4>
              <p className="text-xs text-slate-500">از تب «فرم ثبت گزارش روزانه» اولین گزارش کاری امروز را ارسال نمایید.</p>
              <button
                onClick={() => setActiveSubTab('form')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                ثبت اولین گزارش
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myReports.map((report) => (
                <div 
                  key={report.id}
                  className="navy-card-glass rounded-2xl border border-amber-500/20 hover:border-amber-500/40 p-5 shadow-lg space-y-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          گزارش صنف: {report.guild}
                        </span>
                        <span className="text-xs text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {report.dateShamsi} ({report.dayOfWeekShamsi})
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ساعت ارسال: {report.submittedAt}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        تعداد رکوردهای پیگیری‌شده: <strong className="text-amber-200">{toPersianDigits(report.rows.length)} کارفرما</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleEditReport(report)}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                        title="ویرایش و تکمیل مراحل پیگیری این گزارش"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>ویرایش و تکمیل</span>
                      </button>

                      <span className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow ${
                        report.status === 'approved' || !!report.managerFeedback
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                      }`}>
                        {report.status === 'approved' || !!report.managerFeedback ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>بازخورد شد</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>در انتظار بازخورد</span>
                          </>
                        )}
                      </span>

                      <button
                        onClick={() => exportSingleReportToExcel(report)}
                        className="p-2 rounded-xl bg-[#081525] hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors cursor-pointer"
                        title="دانلود اکسل اختصاصی"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      </button>

                      <button
                        onClick={() => printOfficialReport(report)}
                        className="p-2 rounded-xl bg-[#081525] hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors cursor-pointer"
                        title="چاپ رسمی با سربرگ کارینو"
                      >
                        <Printer className="w-4 h-4 text-amber-300" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`آیا از حذف گزارش تاریخ «${report.dateShamsi}» اطمینان دارید؟`)) {
                            deleteReport(report.id);
                            setAllReports(getStoredReports());
                          }
                        }}
                        className="p-2 rounded-xl bg-[#081525] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-colors cursor-pointer"
                        title="حذف گزارش"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-[#071322]/60">
                          <th className="py-2.5 px-3">ردیف</th>
                          <th className="py-2.5 px-3">کارفرما</th>
                          <th className="py-2.5 px-3">شماره تماس</th>
                          <th className="py-2.5 px-3">دغدغه اصلی</th>
                          <th className="py-2.5 px-3 text-center">مراحل پیگیری (۱ تا ۴)</th>
                          <th className="py-2.5 px-3">نتیجه پیگیری</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {report.rows.map((r, rIdx) => (
                          <tr key={r.id || rIdx} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-mono">{toPersianDigits(r.rowNumber)}</td>
                            <td className="py-2.5 px-3 font-bold text-white">{r.clientName}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{r.phone}</td>
                            <td className="py-2.5 px-3 text-amber-300/90 max-w-[200px] truncate" title={r.employerConcern}>
                              {r.employerConcern}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center gap-1.5 bg-[#06101c] p-1 rounded-lg border border-slate-800">
                                <span title="پیگیری ۱"><FollowUpBadge code={r.followUp1} size="sm" /></span>
                                <span title="پیگیری ۲"><FollowUpBadge code={r.followUp2} size="sm" /></span>
                                <span title="پیگیری ۳"><FollowUpBadge code={r.followUp3} size="sm" /></span>
                                <span title="پیگیری ۴"><FollowUpBadge code={r.followUp4} size="sm" /></span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {FOLLOW_UP_STATUS_CODES.some(c => c.code === r.followUpResult) ? (
                                <FollowUpBadge code={r.followUpResult} showLabel size="md" />
                              ) : (
                                <span className="text-xs text-slate-200 font-medium bg-[#08182b] px-2.5 py-1 rounded-lg border border-slate-700 block max-w-xs truncate" title={r.followUpResult}>
                                  {r.followUpResult || '—'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Consultant Personal Opinion */}
                  <div className="bg-[#071322] border-r-4 border-amber-500 p-3 rounded-lg text-xs space-y-1">
                    <span className="text-amber-300 font-bold block">نظر و بازخورد ثبت‌شده شما:</span>
                    <p className="text-slate-300 leading-relaxed">{report.personalOpinion}</p>
                  </div>

                  {/* Manager Feedback if any */}
                  {report.managerFeedback && (
                    <div className="bg-purple-950/40 border-r-4 border-purple-500 p-3 rounded-lg text-xs space-y-1">
                      <span className="text-purple-300 font-bold block">دستور و بازخورد مدیریت:</span>
                      <p className="text-slate-200 leading-relaxed">{report.managerFeedback}</p>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* QUICK FOLLOW-UP MODAL (FROM TAB 2) */}
      {activeFollowUpTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0a1829] border-2 border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  ثبت پیگیری مرحله {toPersianDigits(activeFollowUpTarget.nextStepNumber)}: {activeFollowUpTarget.clientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveFollowUpTarget(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#071322] p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">شماره تماس:</span>
                <span className="font-mono text-amber-300 font-bold">{activeFollowUpTarget.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">دغدغه اصلی:</span>
                <span className="text-slate-200 font-bold">{activeFollowUpTarget.employerConcern}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">تاریخ گزارش اولیه:</span>
                <span className="font-mono text-slate-300">{activeFollowUpTarget.reportDateShamsi}</span>
              </div>
            </div>

            {/* Select Symbol */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-amber-300 block">
                انتخاب نماد تماس پیگیری {toPersianDigits(activeFollowUpTarget.nextStepNumber)} (از ۵ نماد استاندارد کارینو):
              </label>
              <FollowUpSelector
                value={newFollowUpSymbol}
                onChange={(s) => setNewFollowUpSymbol(s)}
              />
            </div>

            {/* Follow-up Result Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                توضیحات و نتیجه این تماس:
              </label>
              <input
                type="text"
                value={newFollowUpResultText}
                onChange={(e) => setNewFollowUpResultText(e.target.value)}
                placeholder="مثال: توافق بر سر تاریخ جلسه، ارسال پیش‌نویس..."
                className="w-full bg-[#081525] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {followUpSaveSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>پیگیری مرحله {toPersianDigits(activeFollowUpTarget.nextStepNumber)} با موفقیت ثبت و ذخیره گردید.</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveFollowUpTarget(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveNextFollowUp}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>ذخیره مرحله {toPersianDigits(activeFollowUpTarget.nextStepNumber)}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
