import React, { useState, useEffect, useMemo } from 'react';
import { User, DailyReport, ArchiveRecord, AIAnalysisResult, ManagerDirective } from '../../types';
import { 
  getStoredReports, 
  getStoredUsers, 
  getStoredArchives, 
  createArchiveRecord, 
  createPeriodicArchiveRecord,
  getStoredPeriodicReports,
  updateReportStatus,
  getStoredConcerns,
  saveConcerns,
  getStoredDirectives,
  saveDirective,
  deleteDirective,
  syncWithServer
} from '../../services/storage';
import { 
  getCurrentShamsiDate, 
  toPersianDigits, 
  parseShamsiDate, 
  shamsiToDate, 
  normalizeShamsiDate, 
  compareReportsLatestFirst 
} from '../../utils/shamsi';
import { exportAggregatedReportsToExcel, exportSingleReportToExcel, exportArchiveToExcel, printOfficialReport } from '../../utils/export';
import { FollowUpBadge } from '../common/FollowUpBadge';
import { ScrollableTabs, TabItem } from '../common/ScrollableTabs';
import { PeriodicReportsManager } from './PeriodicReportsManager';
import { FOLLOW_UP_STATUS_CODES } from '../../data/defaultData';
import { 
  BarChart3, 
  Users, 
  FileSpreadsheet, 
  Sparkles, 
  Archive, 
  Search, 
  CheckCircle2, 
  Star, 
  TrendingUp, 
  Clock, 
  Download, 
  Printer, 
  ShieldCheck, 
  ChevronLeft, 
  Building, 
  Phone, 
  Settings, 
  Plus, 
  RefreshCw, 
  Award, 
  Layers, 
  BrainCircuit, 
  FileCheck, 
  Eye,
  Calendar,
  CalendarDays,
  Trophy,
  UserCheck,
  Briefcase,
  MessageSquare,
  X,
  AlertTriangle,
  Filter,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ManagerDashboardProps {
  currentUser: User;
}

type TimePeriod = 'today' | 'week' | 'month' | 'all';

interface AggregatedConsultantData {
  user?: User;
  consultantId: string;
  consultantName: string;
  consultantCode: string;
  branch?: string;
  guild?: string;
  reports: DailyReport[];
  totalReportsCount: number;
  totalClientsContacted: number;
  successfulMeetingsCount: number; // ✓ Result or Follow-ups
  successRate: number; // percentage
  averageRating: number; // 1-5
  ratedReportsCount: number;
  lastActivityDate: string;
  lastActivityTime: string;
  hasSubmittedToday: boolean;
  latestReport?: DailyReport;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'consultants' | 'periodic' | 'aggregated' | 'gemini' | 'archive' | 'settings'>('analytics');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  
  // Storage states
  const [reports, setReports] = useState<DailyReport[]>(getStoredReports());
  const [users, setUsers] = useState<User[]>(getStoredUsers());
  const [archives, setArchives] = useState<ArchiveRecord[]>(getStoredArchives());
  const [concerns, setConcerns] = useState<string[]>(getStoredConcerns());
  const [directives, setDirectives] = useState<ManagerDirective[]>(getStoredDirectives());
  
  // Directive Form States
  const [newDirectiveTarget, setNewDirectiveTarget] = useState('all');
  const [newDirectivePriority, setNewDirectivePriority] = useState<'normal' | 'high'>('normal');
  const [newDirectiveContent, setNewDirectiveContent] = useState('');
  
  // Filtering & search for All Reports table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConsultantFilter, setSelectedConsultantFilter] = useState('all');
  const [selectedConcernFilter, setSelectedConcernFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'feedbacked' | 'pending'>('all');
  const [selectedSymbolFilter, setSelectedSymbolFilter] = useState<string>('all'); // 5 Standard Symbols Filter
  
  // Modals & Detail views
  const [selectedReportDetail, setSelectedReportDetail] = useState<DailyReport | null>(null);
  const [selectedConsultantDetail, setSelectedConsultantDetail] = useState<AggregatedConsultantData | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [ratingInput, setRatingInput] = useState(5);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Gemini AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [customAiPrompt, setCustomAiPrompt] = useState('');

  // Settings: New Concern
  const [newConcernInput, setNewConcernInput] = useState('');
  const [archiveSuccessMsg, setArchiveSuccessMsg] = useState('');
  const [selectedArchiveTypeFilter, setSelectedArchiveTypeFilter] = useState<'all' | 'calls_daily' | 'periodic_daily' | 'periodic_weekly' | 'periodic_monthly'>('all');
  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);

  // Reload data from storage
  const reloadData = () => {
    setReports(getStoredReports());
    setUsers(getStoredUsers());
    setArchives(getStoredArchives());
    setConcerns(getStoredConcerns());
    setDirectives(getStoredDirectives());
  };

  // Sync listener with cloud storage
  useEffect(() => {
    const handleSync = () => {
      reloadData();
      setSelectedReportDetail(prev => {
        if (!prev) return null;
        const fresh = getStoredReports().find(r => r.id === prev.id);
        return fresh || prev;
      });
    };
    window.addEventListener('karino_db_synced', handleSync);
    return () => window.removeEventListener('karino_db_synced', handleSync);
  }, []);

  // Lock background scroll when any modal is open
  useEffect(() => {
    if (selectedReportDetail || selectedConsultantDetail) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedReportDetail, selectedConsultantDetail]);

  const todayShamsiInfo = useMemo(() => getCurrentShamsiDate(), []);

  const handleAddDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirectiveContent.trim()) return;

    const newDir: ManagerDirective = {
      id: `dir-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.fullName || 'مدیریت کارینو',
      targetConsultantId: newDirectiveTarget,
      content: newDirectiveContent.trim(),
      priority: newDirectivePriority,
      dateShamsi: todayShamsiInfo.formatted,
      createdAt: new Date().toISOString()
    };

    saveDirective(newDir);
    setDirectives(getStoredDirectives());
    setNewDirectiveContent('');
  };

  const handleDeleteDirective = (id: string) => {
    deleteDirective(id);
    setDirectives(getStoredDirectives());
  };

  // Helper to normalize Persian/Arabic digits to English
  const toEnDigits = (str: string) => (str || '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());

  // Filter reports according to selected time period (Strictly based on Shamsi calendar date)
  // Also includes reports whose updatedAt falls in the period (follow-up 2-4 edits)
  const periodFilteredReports = useMemo(() => {
    const filtered = reports.filter(r => {
      if (timePeriod === 'all') return true;

      const rParsed = parseShamsiDate(r.dateShamsi);
      
      // Check if dateShamsi matches the period
      const matchesByDate = (() => {
        if (rParsed) {
          if (timePeriod === 'today') {
            return (
              rParsed.year === todayShamsiInfo.year &&
              rParsed.month === todayShamsiInfo.month &&
              rParsed.day === todayShamsiInfo.day
            );
          }
          if (timePeriod === 'month') {
            return (
              rParsed.year === todayShamsiInfo.year &&
              rParsed.month === todayShamsiInfo.month
            );
          }
          if (timePeriod === 'week') {
            const rDate = shamsiToDate(r.dateShamsi);
            if (rDate) {
              const todayMidday = new Date();
              todayMidday.setHours(12, 0, 0, 0);
              const diffDays = (todayMidday.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24);
              return diffDays >= -0.5 && diffDays <= 7.5;
            }
            return (
              rParsed.year === todayShamsiInfo.year &&
              rParsed.month === todayShamsiInfo.month
            );
          }
        }

        // Fallback only if dateShamsi is missing (never use updatedAt for original date)
        if (r.createdAt) {
          const cDate = new Date(r.createdAt);
          if (!isNaN(cDate.getTime())) {
            const cShamsi = getCurrentShamsiDate(cDate);
            if (timePeriod === 'today') {
              return (
                cShamsi.year === todayShamsiInfo.year &&
                cShamsi.month === todayShamsiInfo.month &&
                cShamsi.day === todayShamsiInfo.day
              );
            }
            if (timePeriod === 'month') {
              return (
                cShamsi.year === todayShamsiInfo.year &&
                cShamsi.month === todayShamsiInfo.month
              );
            }
            if (timePeriod === 'week') {
              const todayMidday = new Date();
              todayMidday.setHours(12, 0, 0, 0);
              const diffDays = (todayMidday.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24);
              return diffDays >= 0 && diffDays <= 7.5;
            }
          }
        }

        return false;
      })();

      if (matchesByDate) return true;

      // Also include if updatedAt is within the period (follow-up 2-4 edits today)
      if (r.updatedAt) {
        const uDate = new Date(r.updatedAt);
        if (!isNaN(uDate.getTime())) {
          const uShamsi = getCurrentShamsiDate(uDate);
          if (timePeriod === 'today') {
            return (
              uShamsi.year === todayShamsiInfo.year &&
              uShamsi.month === todayShamsiInfo.month &&
              uShamsi.day === todayShamsiInfo.day
            );
          }
          if (timePeriod === 'month') {
            return (
              uShamsi.year === todayShamsiInfo.year &&
              uShamsi.month === todayShamsiInfo.month
            );
          }
          if (timePeriod === 'week') {
            const todayMidday = new Date();
            todayMidday.setHours(12, 0, 0, 0);
            const diffDays = (todayMidday.getTime() - uDate.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= 7.5;
          }
        }
      }

      return false;
    });

    return filtered.sort(compareReportsLatestFirst);
  }, [reports, timePeriod, todayShamsiInfo]);

  // Aggregated Consultant Calculations (Single Card Per Consultant - NO DUPLICATES)
  const consultantsAggregatedList = useMemo(() => {
    const consultantUsers = users.filter(u => u.role === 'consultant');
    
    // Group all reports by consultantId or consultantCode
    const map = new Map<string, AggregatedConsultantData>();

    // Seed map with registered consultant users first
    consultantUsers.forEach(u => {
      map.set(u.id, {
        user: u,
        consultantId: u.id,
        consultantName: u.fullName,
        consultantCode: u.consultantCode,
        branch: u.branch || 'دفتر مرکزی کارینو',
        reports: [],
        totalReportsCount: 0,
        totalClientsContacted: 0,
        successfulMeetingsCount: 0,
        successRate: 0,
        averageRating: 0,
        ratedReportsCount: 0,
        lastActivityDate: '—',
        lastActivityTime: '—',
        hasSubmittedToday: false
      });
    });

    // Populate with reports (all reports for history, and check period)
    reports.forEach(rep => {
      let item = (rep.consultantId ? map.get(rep.consultantId) : undefined) || 
                 (rep.consultantCode ? map.get(rep.consultantCode) : undefined);
      
      if (!item) {
        const matchingUser = consultantUsers.find(
          u => (rep.consultantId && u.id === rep.consultantId) || 
               (rep.consultantCode && u.consultantCode === rep.consultantCode)
        );
        if (matchingUser) {
          item = map.get(matchingUser.id);
        }
      }

      if (!item) {
        // Consultant not in users list, create entry
        const key = rep.consultantId || rep.consultantCode;
        item = {
          consultantId: rep.consultantId || rep.consultantCode,
          consultantName: rep.consultantName,
          consultantCode: rep.consultantCode,
          branch: 'واحد مشاوره تخصصی',
          guild: rep.guild,
          reports: [],
          totalReportsCount: 0,
          totalClientsContacted: 0,
          successfulMeetingsCount: 0,
          successRate: 0,
          averageRating: 0,
          ratedReportsCount: 0,
          lastActivityDate: '—',
          lastActivityTime: '—',
          hasSubmittedToday: false
        };
        map.set(key, item);
      }

      item.reports.push(rep);
    });

    // Calculate aggregated metrics for each consultant
    const list = Array.from(map.values()).map(c => {
      // Sort consultant's reports by submission date/time descending (latest first)
      c.reports.sort(compareReportsLatestFirst);

      // Filter reports if in period view for KPIs
      const relevantReports = timePeriod === 'all' 
        ? c.reports 
        : c.reports.filter(r => periodFilteredReports.some(pr => pr.id === r.id));

      c.totalReportsCount = relevantReports.length;
      c.totalClientsContacted = relevantReports.reduce((sum, r) => sum + r.rows.length, 0);

      // Successful booked meetings (Symbol '✓' in followUpResult or stages)
      let meetings = 0;
      relevantReports.forEach(r => {
        r.rows.forEach(row => {
          if (
            row.followUpResult === '✓' || 
            row.followUpResult.includes('جلسه') || 
            row.followUpResult.includes('ست شد') ||
            row.followUp1 === '✓' || 
            row.followUp2 === '✓' || 
            row.followUp3 === '✓' || 
            row.followUp4 === '✓'
          ) {
            meetings++;
          }
        });
      });
      c.successfulMeetingsCount = meetings;
      c.successRate = c.totalClientsContacted > 0 
        ? Math.round((meetings / c.totalClientsContacted) * 100) 
        : 0;

      // Ratings
      const ratings = relevantReports
        .map(r => r.managerRating)
        .filter((r): r is number => typeof r === 'number' && r > 0);
      c.ratedReportsCount = ratings.length;
      c.averageRating = ratings.length > 0 
        ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) 
        : 5.0;

      // Activity
      if (c.reports.length > 0) {
        c.latestReport = c.reports[0];
        const latestUpdateMs = c.latestReport.updatedAt ? new Date(c.latestReport.updatedAt).getTime() : 0;
        const createdMs = c.latestReport.createdAt ? new Date(c.latestReport.createdAt).getTime() : 0;
        const isUpdatedLater = latestUpdateMs > createdMs + 60000;

        if (isUpdatedLater) {
          const uDate = new Date(latestUpdateMs);
          const uShamsi = getCurrentShamsiDate(uDate);
          c.lastActivityDate = uShamsi.formatted;
          const h = String(uDate.getHours()).padStart(2, '0');
          const m = String(uDate.getMinutes()).padStart(2, '0');
          c.lastActivityTime = `${toPersianDigits(h)}:${toPersianDigits(m)}`;
        } else {
          c.lastActivityDate = c.latestReport.dateShamsi;
          c.lastActivityTime = c.latestReport.submittedAt;
        }
        c.guild = c.latestReport.guild;
      }

      // Check if submitted OR updated today (e.g. follow-ups 2-4 submitted today)
      c.hasSubmittedToday = c.reports.some(r => {
        // 1. Check if dateShamsi is today
        const rParsed = parseShamsiDate(r.dateShamsi);
        if (rParsed) {
          if (
            rParsed.year === todayShamsiInfo.year &&
            rParsed.month === todayShamsiInfo.month &&
            rParsed.day === todayShamsiInfo.day
          ) {
            return true;
          }
        }
        // 2. Check if createdAt is today
        if (r.createdAt) {
          const cShamsi = getCurrentShamsiDate(new Date(r.createdAt));
          if (
            cShamsi.year === todayShamsiInfo.year &&
            cShamsi.month === todayShamsiInfo.month &&
            cShamsi.day === todayShamsiInfo.day
          ) {
            return true;
          }
        }
        // 3. Check if updatedAt is today (Follow-up 2, 3, or 4 submitted today!)
        if (r.updatedAt) {
          const uDate = new Date(r.updatedAt);
          if (!isNaN(uDate.getTime())) {
            const uShamsi = getCurrentShamsiDate(uDate);
            if (
              uShamsi.year === todayShamsiInfo.year &&
              uShamsi.month === todayShamsiInfo.month &&
              uShamsi.day === todayShamsiInfo.day
            ) {
              return true;
            }
          }
        }
        return false;
      });

      return c;
    });

    // Sort consultants stably:
    // 1. Total clients contacted descending
    // 2. Most recent report submission first
    // 3. Deterministic consultantName / code tie-breaker
    return list.sort((a, b) => {
      if (b.totalClientsContacted !== a.totalClientsContacted) {
        return b.totalClientsContacted - a.totalClientsContacted;
      }
      if (a.reports.length > 0 && b.reports.length > 0) {
        const timeDiff = compareReportsLatestFirst(a.reports[0], b.reports[0]);
        if (timeDiff !== 0) return timeDiff;
      } else if (a.reports.length > 0) {
        return -1;
      } else if (b.reports.length > 0) {
        return 1;
      }
      return String(a.consultantName).localeCompare(String(b.consultantName));
    });
  }, [users, reports, periodFilteredReports, timePeriod, todayShamsiInfo]);

  // Overall Statistics for Selected Period
  const totalRowsCount = periodFilteredReports.reduce((acc, r) => acc + r.rows.length, 0);
  const activeConsultantsCount = consultantsAggregatedList.filter(c => c.totalReportsCount > 0).length;
  const feedbackedReportsCount = periodFilteredReports.filter(r => r.status === 'approved' || !!r.managerFeedback).length;
  const pendingFeedbackCount = periodFilteredReports.filter(r => r.status !== 'approved' && !r.managerFeedback).length;

  const totalSuccessfulMeetings = useMemo(() => {
    let count = 0;
    periodFilteredReports.forEach(r => {
      r.rows.forEach(row => {
        if (
          row.followUpResult === '✓' || 
          row.followUpResult.includes('جلسه') || 
          row.followUpResult.includes('ست شد') ||
          row.followUp1 === '✓' || 
          row.followUp2 === '✓' || 
          row.followUp3 === '✓' || 
          row.followUp4 === '✓'
        ) {
          count++;
        }
      });
    });
    return count;
  }, [periodFilteredReports]);

  // Calculate Overdue 4-Day Follow-ups across all company consultants
  const companyOverdueFollowUpsCount = useMemo(() => {
    let count = 0;
    const now = Date.now();
    reports.forEach(rep => {
      const repDateObj = rep.dateShamsi ? shamsiToDate(rep.dateShamsi) : (rep.createdAt ? new Date(rep.createdAt) : null);
      const reportTime = repDateObj && !isNaN(repDateObj.getTime()) ? repDateObj.getTime() : now;
      const elapsedDays = Math.floor((now - reportTime) / (1000 * 60 * 60 * 24));
      rep.rows.forEach(r => {
        const isTerminal = 
          r.followUpResult === '✓' || 
          r.followUpResult === '-' || 
          r.followUpResult === '*' || 
          r.followUp1 === '✓' || 
          r.followUp2 === '✓' || 
          r.followUp3 === '✓' || 
          r.followUp4 === '✓' || 
          (r.followUp4 && r.followUp4.trim() !== '');
        if (r.followUp1 && !isTerminal) {
          let nextStep = 2;
          if (r.followUp3) nextStep = 4;
          else if (r.followUp2) nextStep = 3;
          const targetCycleDays = (nextStep - 1) * 4;
          if (elapsedDays > targetCycleDays) {
            count++;
          }
        }
      });
    });
    return count;
  }, [reports]);

  // Top Consultant of the Period
  const topConsultant = consultantsAggregatedList.length > 0 ? consultantsAggregatedList[0] : null;

  // Concern counts calculation
  const concernFrequencyMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    periodFilteredReports.forEach(r => {
      r.rows.forEach(row => {
        if (row.employerConcern) {
          map[row.employerConcern] = (map[row.employerConcern] || 0) + 1;
        }
      });
    });
    return map;
  }, [periodFilteredReports]);

  const sortedConcerns = useMemo<{ name: string; count: number }[]>(() => {
    return (Object.entries(concernFrequencyMap) as [string, number][])
      .map(([name, count]) => ({ name, count: Number(count) }))
      .sort((a, b) => b.count - a.count);
  }, [concernFrequencyMap]);

  // Guild frequency calculation
  const guildFrequencyMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    periodFilteredReports.forEach(r => {
      if (r.guild) {
        map[r.guild] = (map[r.guild] || 0) + r.rows.length;
      }
    });
    return map;
  }, [periodFilteredReports]);

  // Filtered rows for all reports table (Including 5-symbol filter)
  const allFlattenedRows = useMemo(() => {
    return periodFilteredReports.flatMap(rep => 
      rep.rows.map((r, rIdx) => ({
        ...r,
        uniqueRowKey: `${rep.id}-${r.id || rIdx}`,
        parentReport: rep
      }))
    ).filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        item.clientName.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.parentReport.consultantName.toLowerCase().includes(q) ||
        item.employerConcern.toLowerCase().includes(q) ||
        item.activityField.toLowerCase().includes(q)
      );

      const matchesConsultant = 
        selectedConsultantFilter === 'all' || 
        item.parentReport.consultantId === selectedConsultantFilter || 
        item.parentReport.consultantCode === selectedConsultantFilter;

      const matchesConcern = 
        selectedConcernFilter === 'all' || item.employerConcern === selectedConcernFilter;

      const hasFeedback = item.parentReport.status === 'approved' || !!item.parentReport.managerFeedback;
      const matchesStatus = 
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'feedbacked' && hasFeedback) ||
        (selectedStatusFilter === 'pending' && !hasFeedback);

      const matchesSymbol = 
        selectedSymbolFilter === 'all' ||
        item.followUpResult === selectedSymbolFilter ||
        item.followUpResult.startsWith(selectedSymbolFilter) ||
        item.followUp1 === selectedSymbolFilter ||
        item.followUp2 === selectedSymbolFilter ||
        item.followUp3 === selectedSymbolFilter ||
        item.followUp4 === selectedSymbolFilter;

      return matchesSearch && matchesConsultant && matchesConcern && matchesStatus && matchesSymbol;
    });
  }, [periodFilteredReports, searchQuery, selectedConsultantFilter, selectedConcernFilter, selectedStatusFilter, selectedSymbolFilter]);

  // Handle Feedback Submission
  const handleSaveFeedback = (reportId: string) => {
    updateReportStatus(reportId, 'approved', feedbackInput, ratingInput);
    reloadData();
    setFeedbackSuccess(true);
    setTimeout(() => {
      setFeedbackSuccess(false);
      setReports(prev => {
        const updated = prev.map(r => r.id === reportId ? { ...r, status: 'approved' as const, managerFeedback: feedbackInput, managerRating: ratingInput } : r);
        const cur = updated.find(r => r.id === reportId);
        if (cur) setSelectedReportDetail(cur);
        return updated;
      });
    }, 1200);
  };

  // Trigger Gemini AI Executive Analysis
  const handleTriggerGeminiAnalysis = async () => {
    if (periodFilteredReports.length === 0) {
      alert('گزارشی در این بازه زمانی برای تحلیل وجود ندارد.');
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reports: periodFilteredReports,
          customInstruction: customAiPrompt
        })
      });

      const json = await response.json();
      if (json.data) {
        setAiResult(json.data);
      }
    } catch (e: any) {
      console.error(e);
      alert('خطا در دریافت تحلیل هوشمند. لطفاً مجدداً تلاش نمایید.');
    } finally {
      setAiLoading(false);
    }
  };

  // Manual Archive Trigger: Specific Category
  const handleManualArchiveCategory = (type: 'calls_daily' | 'periodic_daily' | 'periodic_weekly' | 'periodic_monthly') => {
    let createdArch: ArchiveRecord | null = null;
    const allPeriodic = getStoredPeriodicReports();

    if (type === 'calls_daily') {
      const dayCalls = reports.filter(r => normalizeShamsiDate(r.dateShamsi) === todayShamsiInfo.formatted);
      const targetCalls = dayCalls.length > 0 ? dayCalls : reports;
      createdArch = createArchiveRecord(targetCalls, false, todayShamsiInfo.formatted, todayShamsiInfo.dayOfWeek);
      if (createdArch) {
        setArchiveSuccessMsg(`بایگانی روزانه تماس‌ها و پیگیری‌ها (${toPersianDigits(createdArch.totalClientsContacted)} کارفرما در ${toPersianDigits(createdArch.reports?.length || 0)} فرم) با موفقیت ثبت شد.`);
      }
    } else if (type === 'periodic_daily') {
      const dayPeriodic = allPeriodic.filter(p => normalizeShamsiDate(p.dateShamsi) === todayShamsiInfo.formatted && p.periodType === 'daily');
      const targetPeriodic = dayPeriodic.length > 0 ? dayPeriodic : allPeriodic.filter(p => p.periodType === 'daily');
      createdArch = createPeriodicArchiveRecord(
        targetPeriodic, 
        'periodic_daily', 
        false, 
        todayShamsiInfo.formatted, 
        todayShamsiInfo.dayOfWeek, 
        'بایگانی روزانه گزارشات تحلیلی مشاورین'
      );
      if (createdArch) {
        setArchiveSuccessMsg(`بایگانی تحلیلی روزانه مشاورین (${toPersianDigits(createdArch.overallReports?.length || 0)} گزارش تحلیلی) با موفقیت ثبت گردید.`);
      }
    } else if (type === 'periodic_weekly') {
      const weekly = allPeriodic.filter(p => p.periodType === 'weekly');
      createdArch = createPeriodicArchiveRecord(
        weekly,
        'periodic_weekly',
        false,
        todayShamsiInfo.formatted,
        todayShamsiInfo.dayOfWeek,
        'بایگانی هفتگی پنج‌شنبه گزارشات مشاورین'
      );
      if (createdArch) {
        setArchiveSuccessMsg(`بایگانی هفتگی پنج‌شنبه مشاورین (${toPersianDigits(createdArch.overallReports?.length || 0)} گزارش هفتگی) با موفقیت ثبت شد.`);
      }
    } else if (type === 'periodic_monthly') {
      const monthly = allPeriodic.filter(p => p.periodType === 'monthly');
      createdArch = createPeriodicArchiveRecord(
        monthly,
        'periodic_monthly',
        false,
        todayShamsiInfo.formatted,
        todayShamsiInfo.dayOfWeek,
        'بایگانی ماهانه پایان ماه گزارشات استراتژیک'
      );
      if (createdArch) {
        setArchiveSuccessMsg(`بایگانی ماهانه استراتژیک (${toPersianDigits(createdArch.overallReports?.length || 0)} گزارش راهبردی) با موفقیت ثبت گردید.`);
      }
    }

    setArchives(getStoredArchives());
    syncWithServer();
    setTimeout(() => setArchiveSuccessMsg(''), 5000);
  };

  // Manual Trigger: All 4 Archive Categories (Comprehensive Test Suite)
  const handleManualArchiveAll = () => {
    const allPeriodic = getStoredPeriodicReports();
    const dayCalls = reports.filter(r => normalizeShamsiDate(r.dateShamsi) === todayShamsiInfo.formatted);
    const targetCalls = dayCalls.length > 0 ? dayCalls : reports;

    // 1. Calls daily
    createArchiveRecord(targetCalls, false, todayShamsiInfo.formatted, todayShamsiInfo.dayOfWeek);

    // 2. Periodic daily
    const dailyPeriodic = allPeriodic.filter(p => p.periodType === 'daily');
    createPeriodicArchiveRecord(
      dailyPeriodic,
      'periodic_daily',
      false,
      todayShamsiInfo.formatted,
      todayShamsiInfo.dayOfWeek,
      'بایگانی روزانه گزارشات تحلیلی مشاورین'
    );

    // 3. Periodic weekly
    const weeklyPeriodic = allPeriodic.filter(p => p.periodType === 'weekly');
    createPeriodicArchiveRecord(
      weeklyPeriodic,
      'periodic_weekly',
      false,
      todayShamsiInfo.formatted,
      todayShamsiInfo.dayOfWeek,
      'بایگانی هفتگی پنج‌شنبه گزارشات مشاورین'
    );

    // 4. Periodic monthly
    const monthlyPeriodic = allPeriodic.filter(p => p.periodType === 'monthly');
    createPeriodicArchiveRecord(
      monthlyPeriodic,
      'periodic_monthly',
      false,
      todayShamsiInfo.formatted,
      todayShamsiInfo.dayOfWeek,
      'بایگانی ماهانه پایان ماه گزارشات استراتژیک'
    );

    setArchives(getStoredArchives());
    syncWithServer();
    setArchiveSuccessMsg('🚀 بایگانی دستی جامع با موفقیت انجام شد: هر ۴ دسته‌بندی (تماس‌های روزانه، تحلیلی روزانه، هفتگی پنج‌شنبه و ماهانه استراتژیک) در کتابخانه و دیتابیس ابری ثبت و همگام شدند.');
    setTimeout(() => setArchiveSuccessMsg(''), 6000);
  };

  const handleManualArchiveNow = handleManualArchiveAll;

  // Add new custom concern
  const handleAddConcern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcernInput.trim()) return;
    const updated = [...concerns, newConcernInput.trim()];
    saveConcerns(updated);
    setConcerns(updated);
    setNewConcernInput('');
  };

  const periodLabels: Record<TimePeriod, { label: string; sub: string; icon: any }> = {
    today: { label: 'امروز (روزانه)', sub: todayShamsiInfo.formattedWithMonth, icon: Calendar },
    week: { label: 'این هفته (هفتگی)', sub: '۷ روز اخیر', icon: CalendarDays },
    month: { label: 'این ماه (ماهانه)', sub: todayShamsiInfo.monthName + ' ' + toPersianDigits(todayShamsiInfo.year), icon: Building },
    all: { label: 'کل سال / تمام دوران', sub: 'جامع و تجمعی', icon: Trophy }
  };

  return (
    <div className="space-y-6 pb-20 font-['Vazirmatn',sans-serif] text-[#2B1810]">
      
      {/* 1. EXECUTIVE COMMAND HEADER - Luxury Mocha & Warm Nude */}
      <header className="rounded-3xl bg-gradient-to-l from-[#F5EDE2] via-[#EFE6D8] to-[#EAE0D0] border border-[#DEC8B0] p-5 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="p-2.5 rounded-2xl bg-[#9C6644] text-white shadow-md flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#2B1810] tracking-tight">
                  داشبورد راهبردی مدیریت ارشد کارینو
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs sm:text-sm font-bold text-[#6F4E37]">
                    مجموعه حقوقی و مدیریت کارینو
                  </span>
                  <span className="text-[#9C6644]">•</span>
                  <span className="bg-[#E6DAC8] text-[#3E2723] text-xs px-2.5 py-0.5 rounded-full font-bold">
                    پنل نظارتی مدیرعامل
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-xs sm:text-sm text-[#5C4033] max-w-3xl leading-relaxed font-medium">
              مرکز پایش زنده عملکرد مشاوران اجرایی، چرخه پیگیری‌های ۴ روزه، تحلیل دغدغه‌های کارفرمایان و جلسات مشاوره‌ای ست‌شده در بازار
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => exportAggregatedReportsToExcel(periodFilteredReports)}
              className="px-4 py-2.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>خروجی اکسل ({periodLabels[timePeriod].label})</span>
            </button>
            <button
              onClick={handleManualArchiveNow}
              className="px-4 py-2.5 bg-[#9C6644] hover:bg-[#7F4F24] text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Archive className="w-4 h-4" />
              <span>بایگانی دستی ۲۳:۰۰</span>
            </button>
          </div>

        </div>

        {/* Soft Ambient Warm Circle */}
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[#D4A373]/20 rounded-full blur-2xl pointer-events-none" />
      </header>

      {/* Archive Notification Alert */}
      {archiveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-[#D8F3DC] border border-[#B7E4C7] text-[#1B4332] flex items-center justify-between text-sm font-bold animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#2D6A4F]" />
            <span>{archiveSuccessMsg}</span>
          </div>
          <button 
            onClick={() => setActiveTab('archive')}
            className="underline text-[#2D6A4F] hover:text-[#1B4332] cursor-pointer text-xs font-bold"
          >
            مشاهده کتابخانه بایگانی
          </button>
        </div>
      )}

      {/* 2. 4-WAY TIME PERIOD FILTER BAR */}
      <div className="bg-white rounded-2xl border border-[#E6DAC8] p-2 sm:p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#5C4033] px-2 self-start sm:self-center">
          <Clock className="w-4 h-4 text-[#9C6644]" />
          <span>بازه زمانی تحلیل آمار:</span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {(['today', 'week', 'month', 'all'] as TimePeriod[]).map((period) => {
            const isSelected = timePeriod === period;
            const Icon = periodLabels[period].icon;
            return (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#9C6644] text-white shadow-md scale-[1.02]'
                    : 'bg-[#F5EDE2] text-[#5C4033] hover:bg-[#EBE0D2] hover:text-[#2B1810]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{periodLabels[period].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. NAVIGATION TABS BAR - Warm Luxury */}
      <div className="pb-1 border-b border-[#E6DAC8]">
        <ScrollableTabs
          theme="nude"
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          tabs={[
            { id: 'analytics', label: 'خلاصه استراتژیک و شاخص‌ها', icon: BarChart3 },
            { id: 'consultants', label: `عملکرد تفکیکی مشاورین (${toPersianDigits(consultantsAggregatedList.length)})`, icon: Users },
            { id: 'periodic', label: 'گزارشات دوره‌ای و پیگیری‌ها (نظارت)', icon: FileSpreadsheet, badge: 'جدید' },
            { id: 'aggregated', label: `جدول کل گزارشات (${toPersianDigits(totalRowsCount)})`, icon: Layers },
            { id: 'gemini', label: 'تحلیل هوشمند بازار (AI)', icon: BrainCircuit, badge: 'هوشمند' },
            { id: 'archive', label: `بایگانی مکانیزه (${toPersianDigits(archives.length)})`, icon: Archive },
            { id: 'settings', label: 'مدیریت سرفصل‌های دغدغه‌ها', icon: Settings },
          ]}
        />
      </div>

      {/* TAB 1: EXECUTIVE KPIS OVERVIEW & VISUALS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* 5 Large High-Legibility KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* KPI 1 */}
            <div className="bg-white rounded-3xl border border-[#E6DAC8] p-5 shadow-sm hover:shadow-md transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6F4E37]">کل کارفرمایان پیگیری‌شده</span>
                <span className="p-2 rounded-2xl bg-[#F5EDE2] text-[#9C6644] border border-[#E6DAC8]">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#2B1810]">
                {toPersianDigits(totalRowsCount)}
                <span className="text-xs text-[#8D5B4C] font-semibold mr-1.5">کارفرما</span>
              </div>
              <div className="text-[11px] text-[#2D6A4F] font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>ثبت در بازه {periodLabels[timePeriod].label}</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white rounded-3xl border border-[#E6DAC8] p-5 shadow-sm hover:shadow-md transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6F4E37]">جلسات مشاوره ست‌شده</span>
                <span className="p-2 rounded-2xl bg-[#D8F3DC] text-[#2D6A4F] border border-[#B7E4C7]">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#2D6A4F]">
                {toPersianDigits(totalSuccessfulMeetings)}
                <span className="text-xs text-[#2D6A4F] font-semibold mr-1.5">جلسه</span>
              </div>
              <div className="text-[11px] text-[#5C4033] font-bold">
                نرخ موفقیت: <strong className="text-[#2D6A4F] font-black">{totalRowsCount > 0 ? toPersianDigits(Math.round((totalSuccessfulMeetings / totalRowsCount) * 100)) : '۰'}٪</strong>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white rounded-3xl border border-[#E6DAC8] p-5 shadow-sm hover:shadow-md transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6F4E37]">مشاوران فعال این دوره</span>
                <span className="p-2 rounded-2xl bg-[#F5EDE2] text-[#9C6644] border border-[#E6DAC8]">
                  <UserCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#2B1810]">
                {toPersianDigits(activeConsultantsCount)}
                <span className="text-xs text-[#8D5B4C] font-semibold mr-1.5">مشاور</span>
              </div>
              <div className="text-[11px] text-[#8D5B4C] font-bold">
                از مجموع {toPersianDigits(consultantsAggregatedList.length)} مشاور سازمان
              </div>
            </div>

            {/* KPI 4: Overdue Follow-ups indicator */}
            <div className="bg-white rounded-3xl border border-[#E6DAC8] p-5 shadow-sm hover:shadow-md transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700">پیگیری‌های معوق (+۴ روز)</span>
                <span className="p-2 rounded-2xl bg-rose-100 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-700">
                {toPersianDigits(companyOverdueFollowUpsCount)}
                <span className="text-xs text-rose-600 font-semibold mr-1.5">مورد</span>
              </div>
              <div className="text-[11px] text-rose-700 font-bold">
                نیازمند تماس مجدد مشاوران
              </div>
            </div>

            {/* KPI 5 */}
            <div className="bg-white rounded-3xl border border-[#E6DAC8] p-5 shadow-sm hover:shadow-md transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6F4E37]">وضعیت بازخورد مدیریت</span>
                <span className="p-2 rounded-2xl bg-[#FFF3CD] text-[#9A6B00] border border-[#FFE69C]">
                  <FileCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#2B1810]">
                {toPersianDigits(feedbackedReportsCount)}
                <span className="text-xs text-[#8D5B4C] font-semibold mr-1.5">از {toPersianDigits(periodFilteredReports.length)}</span>
              </div>
              <div className="text-[11px] font-bold">
                {pendingFeedbackCount > 0 ? (
                  <span className="text-[#9A6B00] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {toPersianDigits(pendingFeedbackCount)} در انتظار بازخورد
                  </span>
                ) : (
                  <span className="text-[#2D6A4F] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    تماماً بررسی شد
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Top Consultant Spotlight & Overview */}
          {topConsultant && topConsultant.totalClientsContacted > 0 && (
            <div className="bg-gradient-to-r from-[#FDFBF7] to-[#F5EDE2] rounded-3xl border-2 border-[#D4A373] p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#9C6644] text-white flex items-center justify-center text-xl font-black shadow-md shrink-0">
                  <Trophy className="w-7 h-7 text-[#FFD166]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black bg-[#9C6644] text-white px-2.5 py-0.5 rounded-full">
                      مشاور برتر دوره ({periodLabels[timePeriod].label})
                    </span>
                    <span className="text-xs font-bold text-[#6F4E37]">کد: {topConsultant.consultantCode}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-[#2B1810]">
                    {topConsultant.consultantName}
                  </h3>
                  <p className="text-xs text-[#5C4033] font-medium">
                    ثبت {toPersianDigits(topConsultant.totalClientsContacted)} کارفرما | {toPersianDigits(topConsultant.successfulMeetingsCount)} جلسه ست‌شده موفق ({toPersianDigits(topConsultant.successRate)}٪)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedConsultantDetail(topConsultant)}
                className="px-5 py-2.5 bg-[#9C6644] hover:bg-[#7F4F24] text-white font-bold text-xs sm:text-sm rounded-2xl shadow transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <span>مشاهده پرونده کامل مشاور</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Zero Reports Notice for Selected Period */}
          {totalRowsCount === 0 && (
            <div className="bg-white rounded-3xl border border-[#E6DAC8] p-5 text-center space-y-2 shadow-sm">
              <div className="text-sm font-bold text-[#6F4E37]">
                در بازه زمانی انتخابی (<span className="text-[#9C6644]">{periodLabels[timePeriod].label}</span>) هیچ گزارشی ثبت نشده است و تمام شاخص‌های روز جاری صفر هستند.
              </div>
              <p className="text-xs text-[#8D5B4C]">
                برای مشاهده سوابق و پیگیری‌های گذشته می‌توانید بازه زمانی را روی «این هفته» یا «تمام دوران» قرار دهید.
              </p>
            </div>
          )}

          {/* PARETO CHART: Top Employer Concerns */}
          <div className="bg-white rounded-3xl border border-[#E6DAC8] p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6DAC8] pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#2B1810] flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#9C6644]" />
                  <span>پربسامدترین دغدغه‌های کارفرمایان (تحلیل بازار هدف)</span>
                </h3>
                <p className="text-xs sm:text-sm text-[#6F4E37] font-medium mt-0.5">
                  نمودار فراوانی نیازهای اعلام‌شده توسط کارفرمایان در جلسات و تماس‌های مشاوران
                </p>
              </div>
              <span className="text-xs font-bold text-[#5C4033] bg-[#F5EDE2] px-3 py-1 rounded-xl border border-[#E6DAC8] self-start">
                مبنای تدوین بسته‌های خدمات حقوقی کارینو
              </span>
            </div>

            {sortedConcerns.length === 0 ? (
              <div className="py-12 text-center text-sm font-bold text-[#8D5B4C]">
                در این بازه زمانی رکوردی ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-4">
                {sortedConcerns.slice(0, 8).map((item, idx) => {
                  const percentage = totalRowsCount > 0 ? Math.round((item.count / totalRowsCount) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-bold text-[#2B1810] flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-[#F5EDE2] border border-[#DEC8B0] flex items-center justify-center text-xs text-[#9C6644] font-black">
                            {toPersianDigits(idx + 1)}
                          </span>
                          <span className="font-bold">{item.name}</span>
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[#6F4E37] font-bold">{toPersianDigits(item.count)} کارفرما</span>
                          <span className="text-[#9C6644] font-black text-sm w-12 text-left">{toPersianDigits(percentage)}٪</span>
                        </div>
                      </div>
                      <div className="w-full h-3.5 bg-[#FAF7F2] rounded-full overflow-hidden p-0.5 border border-[#E6DAC8]">
                        <div 
                          className="h-full rounded-full bg-gradient-to-l from-[#9C6644] via-[#B08968] to-[#D4A373] transition-all duration-500 shadow-sm"
                          style={{ width: `${Math.max(percentage, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Secondary Grid: Industry Share & Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Industry Share */}
            <div className="bg-white rounded-3xl border border-[#E6DAC8] p-6 shadow-sm space-y-4">
              <h3 className="text-sm sm:text-base font-black text-[#2B1810] flex items-center gap-2 border-b border-[#E6DAC8] pb-3">
                <Building className="w-5 h-5 text-[#9C6644]" />
                <span>پراکندگی صنایع و اصناف مخاطب</span>
              </h3>
              <div className="space-y-2.5">
                {Object.entries(guildFrequencyMap).length === 0 ? (
                  <div className="py-8 text-center text-xs font-bold text-[#8D5B4C]">داده‌ای یافت نشد.</div>
                ) : (
                  (Object.entries(guildFrequencyMap) as [string, number][]).map(([guildName, count], gIdx) => (
                    <div key={gIdx} className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8]">
                      <span className="text-xs sm:text-sm font-bold text-[#2B1810]">{guildName}</span>
                      <span className="text-xs font-black text-[#9C6644] bg-white px-3 py-1 rounded-xl border border-[#DEC8B0]">
                        {toPersianDigits(count)} رکورد
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Strategic Reminder for Management */}
            <div className="bg-gradient-to-br from-white to-[#F5EDE2] rounded-3xl border border-[#E6DAC8] p-6 shadow-sm space-y-3">
              <h3 className="text-sm sm:text-base font-black text-[#2B1810] flex items-center gap-2 border-b border-[#E6DAC8] pb-3">
                <Award className="w-5 h-5 text-[#9C6644]" />
                <span>شاخص‌های کلیدی تصمیم‌گیری مدیریت</span>
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#5C4033] font-medium leading-relaxed">
                <li className="flex items-start gap-2 p-2 rounded-xl bg-white/80 border border-[#E6DAC8]">
                  <span className="text-[#9C6644] font-black">•</span>
                  <span><strong>اولویت جلسات حضوری:</strong> پیگیری کارفرمایانی که نتیجه پیگیری آن‌ها با علامت <strong className="text-[#2D6A4F]">✓</strong> ست شده است.</span>
                </li>
                <li className="flex items-start gap-2 p-2 rounded-xl bg-white/80 border border-[#E6DAC8]">
                  <span className="text-[#9C6644] font-black">•</span>
                  <span><strong>کنترل چرخه ۴ روزه:</strong> نظارت بر تماس‌های معوق مشاوران جهت ممانعت از فراموشی کارفرمایان راغب.</span>
                </li>
                <li className="flex items-start gap-2 p-2 rounded-xl bg-white/80 border border-[#E6DAC8]">
                  <span className="text-[#9C6644] font-black">•</span>
                  <span><strong>ابلاغ بازخورد روزانه:</strong> جهت حفظ انگیزه و نظم تیم مشاوران، بازخورد مدیریت در همان روز ثبت شود.</span>
                </li>
                <li className="flex items-start gap-2 p-2 rounded-xl bg-white/80 border border-[#E6DAC8]">
                  <span className="text-[#9C6644] font-black">•</span>
                  <span><strong>آرشیو ۲۳:۰۰:</strong> کل داده‌های هر روز راس ساعت ۲۳:۰۰ به صورت دائمی در فایل اکسل آرشیو می‌گردد.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: CONSULTANTS MASTER-DETAIL VIEW (1 CARD PER CONSULTANT) */}
      {activeTab === 'consultants' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E6DAC8] shadow-sm">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#2B1810]">
                تفکیک عملکرد جامع مشاوران اجرایی ({toPersianDigits(consultantsAggregatedList.length)} مشاور)
              </h3>
              <p className="text-xs text-[#6F4E37] font-medium">
                هر کارت نشان‌دهنده پرونده تجمیعی یک مشاور است. برای مشاهده تاریخچه گزارشات و ثبت بازخورد، روی مشاور کلیک کنید.
              </p>
            </div>
            <div className="text-xs font-bold text-[#5C4033] bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E6DAC8] self-start sm:self-center">
              بازه محاسبه: {periodLabels[timePeriod].label}
            </div>
          </div>

          {/* Dedicated Single Card Per Consultant Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {consultantsAggregatedList.map((consultant) => (
              <div
                key={consultant.consultantId}
                onClick={() => setSelectedConsultantDetail(consultant)}
                className="bg-white rounded-3xl border border-[#E6DAC8] hover:border-[#9C6644] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-4 hover:-translate-y-1 relative"
              >
                {/* Consultant Header */}
                <div className="flex items-center justify-between border-b border-[#E6DAC8] pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#9C6644] to-[#B08968] text-white flex items-center justify-center font-black text-lg shadow-sm">
                      {consultant.consultantName.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="font-black text-[#2B1810] text-base group-hover:text-[#9C6644] transition-colors">
                        {consultant.consultantName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-[#6F4E37] bg-[#FAF7F2] px-2 py-0.5 rounded-lg border border-[#E6DAC8]">
                          کد: {consultant.consultantCode}
                        </span>
                        <span className="text-[11px] text-[#8D5B4C] truncate max-w-[110px]">
                          {consultant.branch || consultant.guild || 'مشاور ارشد'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Today Status Badge */}
                  <div>
                    {consultant.hasSubmittedToday ? (
                      <span className="inline-flex items-center gap-1 bg-[#D8F3DC] text-[#1B4332] border border-[#B7E4C7] px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                        <span>گزارش امروز ثبت شد</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-[#FFF3CD] text-[#856404] border border-[#FFE69C] px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-[#9A6B00]" />
                        <span>در انتظار ثبت امروز</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 4 Aggregated Metrics Mini-Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8] space-y-1">
                    <span className="text-[#6F4E37] font-semibold block text-[11px]">تعداد کل گزارشات:</span>
                    <span className="text-base font-black text-[#2B1810] block">
                      {toPersianDigits(consultant.totalReportsCount)} <span className="text-[10px] font-normal text-[#8D5B4C]">روز</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8] space-y-1">
                    <span className="text-[#6F4E37] font-semibold block text-[11px]">کارفرمایان پیگیری‌شده:</span>
                    <span className="text-base font-black text-[#9C6644] block">
                      {toPersianDigits(consultant.totalClientsContacted)} <span className="text-[10px] font-normal text-[#8D5B4C]">نفر</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8] space-y-1">
                    <span className="text-[#6F4E37] font-semibold block text-[11px]">جلسات ست‌شده (موفق):</span>
                    <span className="text-base font-black text-[#2D6A4F] block">
                      {toPersianDigits(consultant.successfulMeetingsCount)} <span className="text-[10px] font-normal">({toPersianDigits(consultant.successRate)}٪)</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8] space-y-1">
                    <span className="text-[#6F4E37] font-semibold block text-[11px]">میانگین امتیاز مدیریت:</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-[#9A6B00] fill-[#9A6B00]" />
                      <span className="text-base font-black text-[#2B1810]">
                        {toPersianDigits(consultant.averageRating)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Latest Activity Date */}
                <div className="flex items-center justify-between text-xs text-[#6F4E37] pt-1">
                  <span>آخرین گزارش: <strong>{consultant.lastActivityDate}</strong> ({consultant.lastActivityTime})</span>
                  <span className="text-[#9C6644] font-bold group-hover:underline flex items-center gap-1">
                    مشاهده سوابق
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </span>
                </div>

              </div>
            ))}
          </div>

          {/* MANAGER DIRECTIVES & PRIORITIES MANAGEMENT (Pushed to Morning Dashboard) */}
          <div id="manager-directives-section" className="bg-white rounded-3xl border border-[#E6DAC8] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6DAC8] pb-4">
              <div>
                <h4 className="text-base font-black text-[#2B1810] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#9C6644]" />
                  <span>ابلاغ دستورات و اولویت‌های کاری به مشاوران (داشبورد صبحگاهی)</span>
                </h4>
                <p className="text-xs text-[#6F4E37] mt-0.5">
                  دستورات ثبت‌شده در این بخش، فوراً در پنل و داشبورد صبحگاهی مشاوران هدف نمایش داده می‌شود.
                </p>
              </div>
              <span className="text-xs font-bold text-[#5C4033] bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E6DAC8] self-start sm:self-center">
                {toPersianDigits(directives.length)} دستور ثبت‌شده
              </span>
            </div>

            {/* Form to Add New Directive */}
            <form onSubmit={handleAddDirective} className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#DEC8B0] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#6F4E37] mb-1">مشاور هدف:</label>
                  <select
                    value={newDirectiveTarget}
                    onChange={(e) => setNewDirectiveTarget(e.target.value)}
                    className="w-full bg-white border border-[#DEC8B0] focus:border-[#9C6644] rounded-xl px-3 py-2 text-xs font-bold text-[#2B1810] focus:outline-none"
                  >
                    <option value="all">📢 عمومی (تمام مشاوران اجرایی)</option>
                    {consultantsAggregatedList.map(c => (
                      <option key={c.consultantId} value={c.consultantId}>
                        {c.consultantName} ({c.consultantCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6F4E37] mb-1">اولویت دستور:</label>
                  <select
                    value={newDirectivePriority}
                    onChange={(e) => setNewDirectivePriority(e.target.value as any)}
                    className="w-full bg-white border border-[#DEC8B0] focus:border-[#9C6644] rounded-xl px-3 py-2 text-xs font-bold text-[#2B1810] focus:outline-none"
                  >
                    <option value="normal">عادی</option>
                    <option value="high">⚡ اولویت فوری و حیاتی</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6F4E37] mb-1">متن دستور / اولویت پرونده‌ها:</label>
                <textarea
                  rows={2}
                  value={newDirectiveContent}
                  onChange={(e) => setNewDirectiveContent(e.target.value)}
                  placeholder="مثال: پرونده کارفرما کریمی (ریخته‌گری) را امروز حتماً در اولویت تماس و ست جلسه قرار دهید..."
                  className="w-full bg-white border border-[#DEC8B0] focus:border-[#9C6644] rounded-xl p-3 text-xs text-[#2B1810] placeholder-[#8D5B4C] focus:outline-none font-medium"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#9C6644] hover:bg-[#7F4F24] text-white text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت و ابلاغ به داشبورد مشاور</span>
                </button>
              </div>
            </form>

            {/* Existing Directives List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#6F4E37] block">دستورات فعال در سامانه:</span>
              {directives.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">هیچ دستور فعالی ثبت نشده است.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {directives.map(dir => {
                    const targetName = dir.targetConsultantId === 'all' 
                      ? 'تمام مشاوران' 
                      : (consultantsAggregatedList.find(c => c.consultantId === dir.targetConsultantId || c.consultantCode === dir.targetConsultantId)?.consultantName || dir.targetConsultantId);
                    
                    return (
                      <div 
                        key={dir.id}
                        className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                          dir.priority === 'high'
                            ? 'bg-rose-50 border-rose-200 text-rose-950'
                            : 'bg-[#FAF7F2] border-[#E6DAC8] text-[#2B1810]'
                        }`}
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              dir.priority === 'high' ? 'bg-rose-200 text-rose-900' : 'bg-[#E6DAC8] text-[#5C4033]'
                            }`}>
                              {dir.priority === 'high' ? 'فوری' : 'عادی'}
                            </span>
                            <span className="font-bold text-[#6F4E37]">برای: {targetName}</span>
                            <span className="text-slate-400">• {dir.dateShamsi}</span>
                          </div>
                          <p className="font-medium leading-relaxed pt-1">{dir.content}</p>
                        </div>

                        <button
                          onClick={() => handleDeleteDirective(dir.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors shrink-0"
                          title="حذف دستور"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB: PERIODIC REPORTS (DAILY/WEEKLY/MONTHLY) & FOLLOW-UP DATES CALENDAR TRACKER */}
      {activeTab === 'periodic' && (
        <div className="space-y-6 animate-fadeIn">
          <PeriodicReportsManager
            currentUser={currentUser}
            allReports={reports}
            users={users}
            onReload={reloadData}
          />
        </div>
      )}

      {/* TAB 3: ALL REPORTS MASTER TABLE & MOBILE CARDS */}
      {activeTab === 'aggregated' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Search and Filters Bar */}
          <div className="bg-white rounded-3xl border border-[#E6DAC8] p-4 sm:p-5 shadow-sm space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو کارفرما، تماس، مشاور..."
                  className="w-full bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl pr-10 pl-3 py-2.5 text-xs sm:text-sm text-[#2B1810] placeholder-[#8D5B4C] focus:outline-none font-medium"
                />
                <Search className="w-4 h-4 text-[#8D5B4C] absolute right-3.5 top-3" />
              </div>

              {/* Filter Consultant */}
              <div>
                <select
                  value={selectedConsultantFilter}
                  onChange={(e) => setSelectedConsultantFilter(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-[#2B1810] focus:outline-none font-medium"
                >
                  <option value="all">تمام مشاورین اجرایی</option>
                  {consultantsAggregatedList.map(c => (
                    <option key={c.consultantId} value={c.consultantId}>
                      {c.consultantName} ({c.consultantCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Concern */}
              <div>
                <select
                  value={selectedConcernFilter}
                  onChange={(e) => setSelectedConcernFilter(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-[#2B1810] focus:outline-none font-medium"
                >
                  <option value="all">تمام دغدغه‌ها ({toPersianDigits(concerns.length)} سرفصل)</option>
                  {concerns.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Filter Feedback Status */}
              <div>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                  className="w-full bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-[#2B1810] font-bold focus:outline-none"
                >
                  <option value="all">همه وضعیت‌های بازخورد</option>
                  <option value="pending">در انتظار بازخورد ({toPersianDigits(pendingFeedbackCount)})</option>
                  <option value="feedbacked">بازخورد شد ({toPersianDigits(feedbackedReportsCount)})</option>
                </select>
              </div>

            </div>

            {/* 5-Symbol Quick Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#E6DAC8]">
              <span className="text-xs font-bold text-[#6F4E37] flex items-center gap-1 ml-1">
                <Filter className="w-3.5 h-3.5 text-[#9C6644]" />
                <span>فیلتر نمادهای استاندارد:</span>
              </span>

              <button
                onClick={() => setSelectedSymbolFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedSymbolFilter === 'all'
                    ? 'bg-[#9C6644] text-white shadow-sm font-black'
                    : 'bg-[#FAF7F2] text-[#5C4033] hover:bg-[#F5EDE2] border border-[#DEC8B0]'
                }`}
              >
                همه نمادها
              </button>

              {FOLLOW_UP_STATUS_CODES.map((item) => (
                <button
                  key={item.code}
                  onClick={() => setSelectedSymbolFilter(item.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedSymbolFilter === item.code
                      ? 'bg-[#2B1810] text-white shadow-sm ring-2 ring-[#9C6644]'
                      : 'bg-[#FAF7F2] text-[#5C4033] hover:bg-[#F5EDE2] border border-[#DEC8B0]'
                  }`}
                >
                  <FollowUpBadge code={item.code} size="sm" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

          </div>

          {/* Mobile View: High Legibility Touch Cards (<lg) */}
          <div className="grid grid-cols-1 gap-3.5 lg:hidden">
            {allFlattenedRows.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#E6DAC8] p-10 text-center text-sm font-bold text-[#8D5B4C]">
                موردی با فیلترهای انتخابی یافت نشد.
              </div>
            ) : (
              allFlattenedRows.map((row, idx) => {
                const isFeedbacked = row.parentReport.status === 'approved' || !!row.parentReport.managerFeedback;
                return (
                  <div
                    key={row.uniqueRowKey}
                    className="bg-white rounded-3xl border border-[#E6DAC8] p-4 sm:p-5 space-y-3.5 shadow-sm"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 border-b border-[#E6DAC8] pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-[#F5EDE2] text-[#9C6644] font-black font-mono text-xs flex items-center justify-center border border-[#DEC8B0]">
                          {toPersianDigits(idx + 1)}
                        </span>
                        <div>
                          <span className="font-black text-[#2B1810] text-sm block">{row.parentReport.consultantName}</span>
                          <span className="text-xs text-[#8D5B4C] font-mono">کد: {row.parentReport.consultantCode} | {row.parentReport.dateShamsi}</span>
                        </div>
                      </div>

                      <div>
                        {isFeedbacked ? (
                          <span className="inline-flex items-center gap-1 bg-[#D8F3DC] text-[#1B4332] border border-[#B7E4C7] px-2.5 py-1 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                            <span>بازخورد شد</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-[#FFF3CD] text-[#856404] border border-[#FFE69C] px-2.5 py-1 rounded-full text-xs font-bold">
                            <Clock className="w-3.5 h-3.5 text-[#9A6B00]" />
                            <span>بدون بازخورد</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Client Information */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-black text-[#2B1810] text-base">{row.clientName}</span>
                        <span className="text-xs font-bold text-[#6F4E37] bg-[#FAF7F2] px-2 py-0.5 rounded-lg">{row.activityField}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#5C4033]">
                        <span>پرسنل: <strong>{row.personnelCount ? toPersianDigits(row.personnelCount) : '-'} نفر</strong></span>
                        <a 
                          href={`tel:${row.phone}`} 
                          className="font-mono font-bold text-[#9C6644] hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{row.phone}</span>
                        </a>
                      </div>
                    </div>

                    {/* Concern */}
                    <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E6DAC8] space-y-1">
                      <span className="text-xs text-[#6F4E37] block font-bold">دغدغه اصلی کارفرما:</span>
                      <p className="text-xs sm:text-sm text-[#2B1810] font-bold leading-relaxed">
                        {row.employerConcern}
                      </p>
                    </div>

                    {/* Follow-up Stages & Result */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="space-y-1">
                        <span className="text-xs text-[#6F4E37] block font-semibold">مراحل ۱ تا ۴:</span>
                        <div className="inline-flex items-center gap-1 bg-[#FAF7F2] p-1.5 rounded-xl border border-[#E6DAC8]">
                          <span title="پیگیری ۱"><FollowUpBadge code={row.followUp1} size="sm" /></span>
                          <span title="پیگیری ۲"><FollowUpBadge code={row.followUp2} size="sm" /></span>
                          <span title="پیگیری ۳"><FollowUpBadge code={row.followUp3} size="sm" /></span>
                          <span title="پیگیری ۴"><FollowUpBadge code={row.followUp4} size="sm" /></span>
                        </div>
                      </div>

                      <div className="space-y-1 text-left">
                        <span className="text-xs text-[#6F4E37] block text-right font-semibold">نتیجه نهایی:</span>
                        {FOLLOW_UP_STATUS_CODES.some(c => c.code === row.followUpResult) ? (
                          <FollowUpBadge code={row.followUpResult} showLabel size="sm" />
                        ) : (
                          <span className="text-xs text-[#2B1810] font-bold bg-[#FAF7F2] px-2.5 py-1 rounded-xl border border-[#DEC8B0] block max-w-[140px] truncate text-right">
                            {row.followUpResult || '—'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Review Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReportDetail(row.parentReport);
                        setFeedbackInput(row.parentReport.managerFeedback || '');
                        setRatingInput(row.parentReport.managerRating || 5);
                      }}
                      className={`w-full py-2.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm font-bold ${
                        isFeedbacked
                          ? 'bg-[#EAF4EC] hover:bg-[#D8F3DC] text-[#1B4332] border border-[#B7E4C7]'
                          : 'bg-[#9C6644] hover:bg-[#7F4F24] text-white shadow-sm'
                      }`}
                    >
                      {isFeedbacked ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
                          <span>مشاهده و ویرایش بازخورد مدیر</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>بررسی و ثبت بازخورد مدیریت</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View: Unified High Legibility Table (lg+) */}
          <div className="hidden lg:block bg-white rounded-3xl border border-[#E6DAC8] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F5EDE2] text-[#2B1810] border-b border-[#E6DAC8]">
                    <th className="py-3.5 px-3.5 font-black">ردیف</th>
                    <th className="py-3.5 px-3.5 font-black">مشاور</th>
                    <th className="py-3.5 px-3.5 font-black">کارفرما / مجموعه</th>
                    <th className="py-3.5 px-3.5 font-black">صنف</th>
                    <th className="py-3.5 px-3.5 font-black text-center">پرسنل</th>
                    <th className="py-3.5 px-3.5 font-black">شماره تماس</th>
                    <th className="py-3.5 px-3.5 font-black">دغدغه اصلی کارفرما</th>
                    <th className="py-3.5 px-3.5 font-black text-center">پیگیری‌ها (۱ تا ۴)</th>
                    <th className="py-3.5 px-3.5 font-black">نتیجه نهایی</th>
                    <th className="py-3.5 px-3.5 font-black text-center">وضعیت بازخورد</th>
                    <th className="py-3.5 px-3.5 font-black text-center">اقدام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DAC8] text-[#2B1810]">
                  {allFlattenedRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-sm font-bold text-[#8D5B4C]">
                        موردی با فیلترهای انتخابی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    allFlattenedRows.map((row, idx) => {
                      const isFeedbacked = row.parentReport.status === 'approved' || !!row.parentReport.managerFeedback;
                      return (
                        <tr key={row.uniqueRowKey} className="hover:bg-[#FAF7F2] transition-colors">
                          <td className="py-3 px-3.5 font-mono font-bold text-[#9C6644]">
                            {toPersianDigits(idx + 1)}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-[#2B1810] block">{row.parentReport.consultantName}</span>
                            <span className="text-xs text-[#8D5B4C] font-mono">کد: {row.parentReport.consultantCode}</span>
                          </td>
                          <td className="py-3 px-3.5 font-black text-[#2B1810]">{row.clientName}</td>
                          <td className="py-3 px-3.5 text-[#5C4033] font-medium">{row.activityField}</td>
                          <td className="py-3 px-3.5 font-mono text-center font-bold">{row.personnelCount ? toPersianDigits(row.personnelCount) : '-'}</td>
                          <td className="py-3 px-3.5 font-mono text-[#2B1810] direction-ltr text-right font-medium">{row.phone}</td>
                          <td className="py-3 px-3.5 text-[#2B1810] font-bold max-w-[200px] truncate" title={row.employerConcern}>
                            {row.employerConcern}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="inline-flex items-center gap-1 bg-[#FAF7F2] p-1.5 rounded-xl border border-[#E6DAC8]">
                              <span title="پیگیری ۱"><FollowUpBadge code={row.followUp1} size="sm" /></span>
                              <span title="پیگیری ۲"><FollowUpBadge code={row.followUp2} size="sm" /></span>
                              <span title="پیگیری ۳"><FollowUpBadge code={row.followUp3} size="sm" /></span>
                              <span title="پیگیری ۴"><FollowUpBadge code={row.followUp4} size="sm" /></span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            {FOLLOW_UP_STATUS_CODES.some(c => c.code === row.followUpResult) ? (
                              <FollowUpBadge code={row.followUpResult} showLabel size="md" />
                            ) : (
                              <span className="text-xs text-[#2B1810] font-bold bg-[#FAF7F2] px-2.5 py-1 rounded-xl border border-[#DEC8B0] block max-w-xs truncate" title={row.followUpResult}>
                                {row.followUpResult || '—'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {isFeedbacked ? (
                              <span className="inline-flex items-center gap-1 bg-[#D8F3DC] text-[#1B4332] border border-[#B7E4C7] px-2.5 py-1 rounded-full text-xs font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                                <span>بازخورد شد</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-[#FFF3CD] text-[#856404] border border-[#FFE69C] px-2.5 py-1 rounded-full text-xs font-bold">
                                <Clock className="w-3.5 h-3.5 text-[#9A6B00]" />
                                <span>بدون بازخورد</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedReportDetail(row.parentReport);
                                setFeedbackInput(row.parentReport.managerFeedback || '');
                                setRatingInput(row.parentReport.managerRating || 5);
                              }}
                              className={`p-2 px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold whitespace-nowrap ${
                                isFeedbacked
                                  ? 'bg-[#EAF4EC] hover:bg-[#D8F3DC] text-[#1B4332] border border-[#B7E4C7]'
                                  : 'bg-[#9C6644] hover:bg-[#7F4F24] text-white shadow-sm'
                              }`}
                            >
                              {isFeedbacked ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                                  <span>مشاهده</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>ثبت بازخورد</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: GEMINI AI EXECUTIVE INSIGHTS (ZERO TECHNICAL JARGON) */}
      {activeTab === 'gemini' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Action Trigger Card */}
          <div className="bg-gradient-to-br from-white via-[#FDFBF7] to-[#F5EDE2] rounded-3xl border-2 border-[#D4A373] p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="p-3 rounded-2xl bg-[#9C6644] text-white shadow-md">
                    <BrainCircuit className="w-6 h-6" />
                  </span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-[#2B1810]">
                      تحلیل استراتژیک هوش مصنوعی کارینو
                    </h3>
                    <span className="text-xs text-[#6F4E37] font-bold">
                      پردازش هوشمند رفتار بازار، دغدغه‌های کارفرمایان و ارزیابی مشاوران
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[#5C4033] max-w-2xl leading-relaxed font-medium">
                  هوش مصنوعی به صورت خودکار رکوردهای ورودی بازه انتخابی ({periodLabels[timePeriod].label}) را بررسی کرده و راهکارهای مدیریتی و نقاط قوت و ضعف عملکردی را استخراج می‌نماید.
                </p>
              </div>

              <button
                onClick={handleTriggerGeminiAnalysis}
                disabled={aiLoading || periodFilteredReports.length === 0}
                className="px-6 py-3.5 bg-[#9C6644] hover:bg-[#7F4F24] text-white font-black rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105 shrink-0 disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال تدوین گزارش مدیریتی...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#FFD166]" />
                    <span>دریافت تحلیل استراتژیک هوش مصنوعی</span>
                  </>
                )}
              </button>
            </div>

            {/* Custom Instruction Box */}
            <div className="space-y-1.5 pt-2 border-t border-[#E6DAC8]">
              <label className="text-xs sm:text-sm font-bold text-[#3E2723]">
                زاویه دید خاص مدیریت برای تحلیل (اختیاری):
              </label>
              <input
                type="text"
                value={customAiPrompt}
                onChange={(e) => setCustomAiPrompt(e.target.value)}
                placeholder="مثال: تمرکز ویژه روی ریسک‌های قانون کار و فرصت‌های جذب قراردادهای خدمات مشاوره"
                className="w-full bg-white border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-[#2B1810] placeholder-[#8D5B4C] focus:outline-none font-medium"
              />
            </div>
          </div>

          {/* AI Result Presentation */}
          {aiResult && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Summary & Performance Score */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E6DAC8] p-6 shadow-sm space-y-3">
                  <h4 className="text-base font-black text-[#2B1810] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#9C6644]" />
                    <span>خلاصه اجرایی و ارزیابی بازار</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-[#3E2723] leading-relaxed text-justify font-medium">
                    {aiResult.summary}
                  </p>
                </div>

                <div className="bg-gradient-to-b from-white to-[#F5EDE2] rounded-3xl border border-[#E6DAC8] p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-2">
                  <span className="text-xs font-bold text-[#6F4E37]">شاخص بهره‌وری کل تیم</span>
                  <div className="text-4xl sm:text-5xl font-black text-[#9C6644]">
                    {toPersianDigits(aiResult.overallScore)}
                    <span className="text-base text-[#6F4E37] font-bold"> / ۱۰۰</span>
                  </div>
                  <span className="text-xs text-[#2D6A4F] font-bold bg-[#D8F3DC] px-3 py-1 rounded-full border border-[#B7E4C7]">
                    سطح عملکرد: بسیار مطلوب
                  </span>
                </div>

              </div>

              {/* Consultant-by-Consultant Evaluations */}
              <div className="space-y-4">
                <h4 className="text-base sm:text-lg font-black text-[#2B1810] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#9C6644]" />
                  <span>ارزیابی تفکیکی تک‌تک مشاورین توسط هوش مصنوعی</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {aiResult.consultantEvaluations.map((evalItem, eIdx) => (
                    <div 
                      key={eIdx}
                      className="bg-white rounded-3xl border border-[#E6DAC8] p-6 shadow-sm space-y-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-[#E6DAC8] pb-3">
                        <div>
                          <h5 className="font-black text-[#2B1810] text-base">{evalItem.consultantName}</h5>
                          <span className="text-xs text-[#8D5B4C] font-mono">کد: {evalItem.consultantCode}</span>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-full font-black bg-[#F5EDE2] text-[#9C6644] border border-[#DEC8B0]">
                          سطح: {evalItem.performanceRating}
                        </span>
                      </div>

                      {/* Strengths */}
                      <div className="space-y-1">
                        <span className="text-xs font-black text-[#2D6A4F] block">نقاط قوت و دستاوردها:</span>
                        <ul className="list-disc list-inside text-xs sm:text-sm text-[#3E2723] space-y-1 pr-1 font-medium">
                          {evalItem.strengths.map((s, sIdx) => (
                            <li key={sIdx}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Weaknesses / Action items */}
                      <div className="space-y-1">
                        <span className="text-xs font-black text-[#9A6B00] block">موارد نیازمند توجه و پیگیری:</span>
                        <ul className="list-disc list-inside text-xs sm:text-sm text-[#3E2723] space-y-1 pr-1 font-medium">
                          {evalItem.weaknessesOrFollowUps.map((w, wIdx) => (
                            <li key={wIdx}>{w}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommendation */}
                      <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#DEC8B0] text-xs sm:text-sm text-[#2B1810]">
                        <strong className="block text-[#9C6644] font-black mb-1">توصیه راهبردی به مدیریت:</strong>
                        <p className="font-medium leading-relaxed">{evalItem.aiRecommendation}</p>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Market Opportunities & Strategic Next Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Market Opportunities */}
                <div className="bg-white rounded-3xl border border-[#E6DAC8] p-6 shadow-sm space-y-3.5">
                  <h4 className="text-sm sm:text-base font-black text-[#9C6644] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#9C6644]" />
                    <span>فرصت‌های کشف‌شده در بازار هدف</span>
                  </h4>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-[#2B1810]">
                    {aiResult.marketOpportunities.map((opp, oIdx) => (
                      <li key={oIdx} className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8] font-medium leading-relaxed">
                        <span className="text-[#9C6644] font-black text-base">•</span>
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Strategic Action Items */}
                <div className="bg-white rounded-3xl border border-[#E6DAC8] p-6 shadow-sm space-y-3.5">
                  <h4 className="text-sm sm:text-base font-black text-[#2D6A4F] flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#2D6A4F]" />
                    <span>اقدامات پیشنهادی برای روز کاری آینده</span>
                  </h4>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-[#2B1810]">
                    {aiResult.strategicActionItems.map((act, aIdx) => (
                      <li key={aIdx} className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8] font-medium leading-relaxed">
                        <span className="text-[#2D6A4F] font-black text-base">•</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 5: 23:00 NIGHTLY ARCHIVE LIBRARY */}
      {activeTab === 'archive' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Executive Manual Archive & Test Suite Hub */}
          <div className="bg-gradient-to-l from-[#F5EDE2] via-[#FAF7F2] to-white rounded-3xl border border-[#DEC8B0] p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-2xl bg-[#9C6644] text-white shadow-sm">
                    <Zap className="w-5 h-5" />
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#2B1810]">
                    میز کار بایگانی دستی و تست جامع مکانیزه سیستم (ساعت ۲۳:۰۰)
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[#6F4E37] font-medium mt-1.5 leading-relaxed max-w-3xl">
                  جهت تست و اعتبارسنجی ثبت در دیتابیس، می‌توانید به صورت دستی ردیف‌های تماس و گزارشات تحلیلی را در هر ۴ دسته‌بندی (تماس‌های روزانه، تحلیلی روزانه، هفتگی پنج‌شنبه و ماهانه استراتژیک) بایگانی کنید و بلافاصله پیش‌نمایش ردیف‌ها را بررسی یا فایل استاندارد اکسل را دریافت نمایید.
                </p>
              </div>

              {/* Master Test Button */}
              <button
                onClick={handleManualArchiveAll}
                className="px-6 py-3.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <Zap className="w-4 h-4 text-[#F3E5F5]" />
                <span>🚀 اجرای دستی و بایگانی همگانی (تست جامع همه دسته‌ها)</span>
              </button>
            </div>

            {/* Individual Category Manual Triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <button
                onClick={() => handleManualArchiveCategory('calls_daily')}
                className="p-3.5 rounded-2xl bg-white hover:bg-[#FDF0ED] border border-[#DEC8B0] hover:border-[#9C6644] text-[#9C6644] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>بایگانی دستی روزانه تماس‌ها</span>
              </button>

              <button
                onClick={() => handleManualArchiveCategory('periodic_daily')}
                className="p-3.5 rounded-2xl bg-white hover:bg-[#E8F5E9] border border-[#DEC8B0] hover:border-[#2E7D32] text-[#2E7D32] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <FileCheck className="w-4 h-4" />
                <span>بایگانی دستی تحلیلی روزانه</span>
              </button>

              <button
                onClick={() => handleManualArchiveCategory('periodic_weekly')}
                className="p-3.5 rounded-2xl bg-white hover:bg-[#E3F2FD] border border-[#DEC8B0] hover:border-[#1565C0] text-[#1565C0] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <CalendarDays className="w-4 h-4" />
                <span>بایگانی دستی هفتگی پنج‌شنبه</span>
              </button>

              <button
                onClick={() => handleManualArchiveCategory('periodic_monthly')}
                className="p-3.5 rounded-2xl bg-white hover:bg-[#F3E5F5] border border-[#DEC8B0] hover:border-[#7B1FA2] text-[#7B1FA2] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Building className="w-4 h-4" />
                <span>بایگانی دستی ماهانه استراتژیک</span>
              </button>
            </div>

            {/* Success toast notification */}
            {archiveSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-[#2E7D32]" />
                <span>{archiveSuccessMsg}</span>
              </div>
            )}

            {/* Archive Type Filters */}
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-[#DEC8B0]">
              <span className="text-xs font-bold text-[#6F4E37] ml-1">فیلتر دسته‌بندی کتابخانه:</span>
              
              <button
                onClick={() => setSelectedArchiveTypeFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedArchiveTypeFilter === 'all'
                    ? 'bg-[#2B1810] text-white shadow-sm font-black'
                    : 'bg-white text-[#5C4033] hover:bg-[#F5EDE2] border border-[#DEC8B0]'
                }`}
              >
                همه بایگانی‌ها ({toPersianDigits(archives.length)})
              </button>

              <button
                onClick={() => setSelectedArchiveTypeFilter('calls_daily')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedArchiveTypeFilter === 'calls_daily'
                    ? 'bg-[#9C6644] text-white shadow-sm font-black'
                    : 'bg-white text-[#5C4033] hover:bg-[#F5EDE2] border border-[#DEC8B0]'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>روزانه تماس‌ها ({toPersianDigits(archives.filter(a => a.archiveType === 'calls_daily' || !a.archiveType).length)})</span>
              </button>

              <button
                onClick={() => setSelectedArchiveTypeFilter('periodic_daily')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedArchiveTypeFilter === 'periodic_daily'
                    ? 'bg-[#2D6A4F] text-white shadow-sm font-black'
                    : 'bg-white text-[#5C4033] hover:bg-[#F5EDE2] border border-[#DEC8B0]'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>تحلیلی روزانه ({toPersianDigits(archives.filter(a => a.archiveType === 'periodic_daily').length)})</span>
              </button>

              <button
                onClick={() => setSelectedArchiveTypeFilter('periodic_weekly')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedArchiveTypeFilter === 'periodic_weekly'
                    ? 'bg-[#1E40AF] text-white shadow-sm font-black'
                    : 'bg-white text-[#5C4033] hover:bg-[#F5EDE2] border border-[#DEC8B0]'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>هفتگی پنج‌شنبه‌ها ({toPersianDigits(archives.filter(a => a.archiveType === 'periodic_weekly').length)})</span>
              </button>

              <button
                onClick={() => setSelectedArchiveTypeFilter('periodic_monthly')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedArchiveTypeFilter === 'periodic_monthly'
                    ? 'bg-[#6B21A8] text-white shadow-sm font-black'
                    : 'bg-white text-[#5C4033] hover:bg-[#F5EDE2] border border-[#DEC8B0]'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>ماهانه استراتژیک ({toPersianDigits(archives.filter(a => a.archiveType === 'periodic_monthly').length)})</span>
              </button>
            </div>
          </div>

          {/* Archive Cards Grid */}
          <div className="space-y-4">
            {(() => {
              const filteredArchives = archives.filter(arch => {
                if (selectedArchiveTypeFilter === 'all') return true;
                const type = arch.archiveType || 'calls_daily';
                return type === selectedArchiveTypeFilter;
              });

              if (filteredArchives.length === 0) {
                return (
                  <div className="bg-white rounded-3xl border border-[#E6DAC8] p-12 text-center text-sm font-bold text-[#8D5B4C]">
                    هیچ پکیج آرشیوی با فیلتر انتخابی یافت نشد.
                  </div>
                );
              }

              return filteredArchives.map((arch) => {
                const type = arch.archiveType || 'calls_daily';
                const isPeriodic = type.startsWith('periodic');
                const isExpanded = expandedArchiveId === arch.id;

                const typeBadgeConfig = {
                  calls_daily: { bg: 'bg-[#FDF0ED]', text: 'text-[#9C6644]', border: 'border-[#F8D5CE]', label: 'تماس‌ها و پیگیری‌ها' },
                  periodic_daily: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', border: 'border-[#C8E6C9]', label: 'گزارش تحلیلی روزانه' },
                  periodic_weekly: { bg: 'bg-[#E3F2FD]', text: 'text-[#1565C0]', border: 'border-[#BBDEFB]', label: 'گزارش هفتگی پنج‌شنبه' },
                  periodic_monthly: { bg: 'bg-[#F3E5F5]', text: 'text-[#7B1FA2]', border: 'border-[#E1BEE7]', label: 'گزارش ماهانه استراتژیک' }
                }[type] || { bg: 'bg-[#FAF7F2]', text: 'text-[#5C4033]', border: 'border-[#DEC8B0]', label: 'بایگانی' };

                return (
                  <div 
                    key={arch.id}
                    className={`bg-white rounded-3xl border transition-all duration-200 shadow-sm ${
                      isExpanded ? 'border-[#9C6644] ring-2 ring-[#9C6644]/15' : 'border-[#E6DAC8] hover:border-[#DEC8B0]'
                    }`}
                  >
                    {/* Card Summary Header */}
                    <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#F5EDE2] text-[#9C6644] flex items-center justify-center border border-[#DEC8B0] shrink-0 mt-1 sm:mt-0">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-[#2B1810] text-sm sm:text-base">{arch.fileName}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeBadgeConfig.bg} ${typeBadgeConfig.text} ${typeBadgeConfig.border}`}>
                              {typeBadgeConfig.label}
                            </span>
                            {arch.autoGenerated ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF7F2] text-[#6F4E37] border border-[#DEC8B0]">
                                مکانیزه ۲۳:۰۰
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                                بایگانی دستی
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[#6F4E37] font-medium flex-wrap">
                            <span>تاریخ شمسی: <strong>{arch.dateShamsi}</strong> ({arch.dayOfWeek || 'روزانه'})</span>
                            <span>•</span>
                            {isPeriodic ? (
                              <>
                                <span>گزارشات تحلیلی: <strong className="text-[#2D6A4F] font-black">{toPersianDigits(arch.overallReports?.length || 0)}</strong></span>
                                <span>•</span>
                                <span>تعداد مشاوران: <strong>{toPersianDigits(arch.totalConsultants || 0)}</strong></span>
                              </>
                            ) : (
                              <>
                                <span>تعداد گزارش: <strong>{toPersianDigits(arch.reports?.length || 0)}</strong></span>
                                <span>•</span>
                                <span>مجموع کارفرمایان ثبت‌شده: <strong className="text-[#9C6644] font-black">{toPersianDigits(arch.totalClientsContacted)}</strong></span>
                              </>
                            )}
                            {arch.periodTitle && (
                              <>
                                <span>•</span>
                                <span className="text-[#8D5B4C] font-bold">{arch.periodTitle}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-2.5 self-end lg:self-center flex-wrap">
                        <button
                          onClick={() => setExpandedArchiveId(isExpanded ? null : arch.id)}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border ${
                            isExpanded 
                              ? 'bg-[#F5EDE2] text-[#7F4F24] border-[#DEC8B0]' 
                              : 'bg-white hover:bg-[#FAF7F2] text-[#5C4033] border-[#DEC8B0]'
                          }`}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              <span>بستن پیش‌نمایش</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              <span>بررسی و پیش‌نمایش ردیف‌ها</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => exportArchiveToExcel(arch)}
                          className="px-4 py-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>دانلود فایل اکسل</span>
                        </button>
                      </div>
                    </div>

                    {/* EXPANDED ROWS INSPECTOR TABLE */}
                    {isExpanded && (
                      <div className="border-t border-[#E6DAC8] bg-[#FAF7F2] p-5 rounded-b-3xl space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <h5 className="font-black text-xs sm:text-sm text-[#2B1810] flex items-center gap-2">
                            <Eye className="w-4 h-4 text-[#9C6644]" />
                            <span>پیش‌نمایش جزئیات ردیف‌های ثبت‌شده در این پکیج</span>
                          </h5>
                          <span className="text-[11px] text-[#6F4E37] font-bold">
                            {isPeriodic 
                              ? `${toPersianDigits(arch.overallReports?.length || 0)} رکورد تحلیلی`
                              : `${toPersianDigits(arch.totalClientsContacted)} ردیف کارفرمایی در ${toPersianDigits(arch.reports?.length || 0)} فرم`
                            }
                          </span>
                        </div>

                        {/* If Calls Daily: Show All Client Rows Table */}
                        {!isPeriodic && (
                          <div className="overflow-x-auto bg-white rounded-2xl border border-[#DEC8B0] shadow-xs max-h-96">
                            <table className="w-full text-right text-xs border-collapse">
                              <thead className="bg-[#F5EDE2] text-[#5C4033] font-black sticky top-0 border-b border-[#DEC8B0]">
                                <tr>
                                  <th className="p-2.5 text-center">#</th>
                                  <th className="p-2.5">مشاور</th>
                                  <th className="p-2.5">صنف</th>
                                  <th className="p-2.5">نام کارفرما</th>
                                  <th className="p-2.5">حوزه فعالیت</th>
                                  <th className="p-2.5 text-center">پرسنل</th>
                                  <th className="p-2.5">تلفن</th>
                                  <th className="p-2.5">دغدغه اصلی کارفرما</th>
                                  <th className="p-2.5 text-center">پ۱</th>
                                  <th className="p-2.5 text-center">پ۲</th>
                                  <th className="p-2.5 text-center">پ۳</th>
                                  <th className="p-2.5 text-center">پ۴</th>
                                  <th className="p-2.5">نتیجه پیگیری</th>
                                  <th className="p-2.5">موضوع جلسه</th>
                                  <th className="p-2.5">یادداشت / آدرس</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E6DAC8]">
                                {(() => {
                                  let counter = 0;
                                  return (arch.reports || []).flatMap(rep => 
                                    (rep.rows || []).map(row => {
                                      counter++;
                                      return (
                                        <tr key={row.id} className="hover:bg-[#FAF7F2] transition-colors">
                                          <td className="p-2.5 text-center font-bold text-[#8D5B4C]">{toPersianDigits(counter)}</td>
                                          <td className="p-2.5 font-bold text-[#2B1810] whitespace-nowrap">{rep.consultantName} ({rep.consultantCode})</td>
                                          <td className="p-2.5 text-[#6F4E37] whitespace-nowrap">{rep.guild || '-'}</td>
                                          <td className="p-2.5 font-bold text-[#2B1810] whitespace-nowrap">{row.clientName}</td>
                                          <td className="p-2.5 text-[#5C4033] whitespace-nowrap">{row.activityField || '-'}</td>
                                          <td className="p-2.5 text-center font-bold text-[#2B1810]">{row.personnelCount ? toPersianDigits(row.personnelCount) : '-'}</td>
                                          <td className="p-2.5 font-mono text-[#5C4033] whitespace-nowrap" dir="ltr">{row.phone || '-'}</td>
                                          <td className="p-2.5 text-[#8D5B4C] font-bold max-w-xs truncate">{row.employerConcern || '-'}</td>
                                          <td className="p-2.5 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                              <FollowUpBadge code={row.followUp1} size="sm" />
                                              {row.followUp1DateShamsi && <span className="text-[10px] text-[#8D5B4C] font-mono">{row.followUp1DateShamsi.slice(5)}</span>}
                                            </div>
                                          </td>
                                          <td className="p-2.5 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                              <FollowUpBadge code={row.followUp2} size="sm" />
                                              {row.followUp2DateShamsi && <span className="text-[10px] text-[#8D5B4C] font-mono">{row.followUp2DateShamsi.slice(5)}</span>}
                                            </div>
                                          </td>
                                          <td className="p-2.5 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                              <FollowUpBadge code={row.followUp3} size="sm" />
                                              {row.followUp3DateShamsi && <span className="text-[10px] text-[#8D5B4C] font-mono">{row.followUp3DateShamsi.slice(5)}</span>}
                                            </div>
                                          </td>
                                          <td className="p-2.5 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                              <FollowUpBadge code={row.followUp4} size="sm" />
                                              {row.followUp4DateShamsi && <span className="text-[10px] text-[#8D5B4C] font-mono">{row.followUp4DateShamsi.slice(5)}</span>}
                                            </div>
                                          </td>
                                          <td className="p-2.5 font-bold text-[#2B1810] whitespace-nowrap">{row.followUpResult || '-'}</td>
                                          <td className="p-2.5 text-[#5C4033] max-w-xs truncate">{row.meetingTopic || '-'}</td>
                                          <td className="p-2.5 text-[#6F4E37] max-w-xs truncate">{row.notes || row.address || '-'}</td>
                                        </tr>
                                      );
                                    })
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* If Periodic: Show Periodic Reports Table */}
                        {isPeriodic && (
                          <div className="overflow-x-auto bg-white rounded-2xl border border-[#DEC8B0] shadow-xs max-h-96">
                            <table className="w-full text-right text-xs border-collapse">
                              <thead className="bg-[#F5EDE2] text-[#5C4033] font-black sticky top-0 border-b border-[#DEC8B0]">
                                <tr>
                                  <th className="p-2.5 text-center">#</th>
                                  <th className="p-2.5">مشاور</th>
                                  <th className="p-2.5">دوره</th>
                                  <th className="p-2.5">عنوان دوره</th>
                                  <th className="p-2.5">خلاصه عملکرد</th>
                                  <th className="p-2.5">دستاوردها</th>
                                  <th className="p-2.5">چالش‌ها</th>
                                  <th className="p-2.5">اولویت‌ها</th>
                                  <th className="p-2.5 text-center">خودارزیابی</th>
                                  <th className="p-2.5 text-center">وضعیت مدیر</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E6DAC8]">
                                {(arch.overallReports || []).map((rep, idx) => (
                                  <tr key={rep.id} className="hover:bg-[#FAF7F2] transition-colors">
                                    <td className="p-2.5 text-center font-bold text-[#8D5B4C]">{toPersianDigits(idx + 1)}</td>
                                    <td className="p-2.5 font-bold text-[#2B1810] whitespace-nowrap">{rep.consultantName} ({rep.consultantCode})</td>
                                    <td className="p-2.5 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                        rep.periodType === 'daily' ? 'bg-[#E8F5E9] text-[#2E7D32]' :
                                        rep.periodType === 'weekly' ? 'bg-[#E3F2FD] text-[#1565C0]' :
                                        'bg-[#F3E5F5] text-[#7B1FA2]'
                                      }`}>
                                        {rep.periodType === 'daily' ? 'روزانه' : rep.periodType === 'weekly' ? 'هفتگی' : 'ماهانه'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-[#6F4E37] font-bold whitespace-nowrap">{rep.periodLabel || '-'}</td>
                                    <td className="p-2.5 text-[#2B1810] max-w-sm truncate">{rep.summary}</td>
                                    <td className="p-2.5 text-[#2E7D32] max-w-xs truncate">{rep.keyAchievements || '-'}</td>
                                    <td className="p-2.5 text-[#C62828] max-w-xs truncate">{rep.challengesOrBarriers || '-'}</td>
                                    <td className="p-2.5 text-[#1565C0] max-w-xs truncate">{rep.plansOrPriorities || '-'}</td>
                                    <td className="p-2.5 text-center font-black text-[#8D5B4C]">{rep.selfRating ? `${toPersianDigits(rep.selfRating)} از ۵` : '-'}</td>
                                    <td className="p-2.5 text-center whitespace-nowrap">
                                      {rep.managerStatus === 'approved' ? (
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#2E7D32]">تایید شده</span>
                                      ) : rep.managerStatus === 'rewarded' ? (
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF9C4] text-[#F57F17]">پاداش ویژه</span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ECEFF1] text-[#455A64]">در انتظار</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>

        </div>
      )}

      {/* TAB 6: SETTINGS & CONCERNS VOCABULARY */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-white rounded-3xl border border-[#E6DAC8] p-6 sm:p-7 shadow-sm space-y-4">
            <h3 className="text-base sm:text-lg font-black text-[#2B1810] flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#9C6644]" />
              <span>فهرست واژگان و سرفصل‌های دغدغه‌های کارفرمایان</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#5C4033] leading-relaxed font-medium">
              این لیست کشویی در فرم ثبت گزارش مشاوران نمایش داده می‌شود و پایه اصلی نمودارهای تحلیلی بازار است.
            </p>

            {/* Add New Concern Form */}
            <form onSubmit={handleAddConcern} className="flex flex-col sm:flex-row gap-2 pt-2">
              <input
                type="text"
                value={newConcernInput}
                onChange={(e) => setNewConcernInput(e.target.value)}
                placeholder="عنوان دغدغه یا چالش جدید کارفرمایان را وارد کنید..."
                className="flex-1 bg-[#FAF7F2] border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#2B1810] placeholder-[#8D5B4C] focus:outline-none font-medium"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#9C6644] hover:bg-[#7F4F24] text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن سرفصل جدید</span>
              </button>
            </form>

            {/* Current Concerns List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
              {concerns.map((cItem, cIdx) => (
                <div key={cIdx} className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8] flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[#9C6644] font-black text-xs">{toPersianDigits(cIdx + 1)}.</span>
                    <span className="text-[#2B1810] font-bold">{cItem}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}

      {/* 4. MODAL: CONSULTANT DRILLDOWN & FULL HISTORY (Master-Detail) */}
      {selectedConsultantDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white border border-[#DEC8B0] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E6DAC8] bg-[#F5EDE2]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#9C6644] text-white flex items-center justify-center font-black text-lg shadow-sm">
                  {selectedConsultantDetail.consultantName.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#2B1810]">
                    پرونده و سوابق عملکرد: {selectedConsultantDetail.consultantName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#6F4E37] font-semibold">
                    <span>کد پرسنلی: <strong>{selectedConsultantDetail.consultantCode}</strong></span>
                    <span>•</span>
                    <span>{selectedConsultantDetail.branch || 'واحد مشاوره'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedConsultantDetail(null)}
                className="p-2 rounded-2xl text-[#6F4E37] hover:text-[#2B1810] hover:bg-[#EBE0D2] cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#2B1810]">
              
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8] text-center space-y-1">
                  <span className="text-xs text-[#6F4E37] font-semibold block">کل گزارشات</span>
                  <span className="text-xl font-black text-[#2B1810] block">{toPersianDigits(selectedConsultantDetail.reports.length)} روز</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8] text-center space-y-1">
                  <span className="text-xs text-[#6F4E37] font-semibold block">کارفرمایان پیگیری‌شده</span>
                  <span className="text-xl font-black text-[#9C6644] block">{toPersianDigits(selectedConsultantDetail.totalClientsContacted)} نفر</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8] text-center space-y-1">
                  <span className="text-xs text-[#6F4E37] font-semibold block">جلسات ست‌شده</span>
                  <span className="text-xl font-black text-[#2D6A4F] block">{toPersianDigits(selectedConsultantDetail.successfulMeetingsCount)} مورد</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E6DAC8] text-center space-y-1">
                  <span className="text-xs text-[#6F4E37] font-semibold block">میانگین امتیاز مدیریت</span>
                  <span className="text-xl font-black text-[#9A6B00] block">{toPersianDigits(selectedConsultantDetail.averageRating)} ★</span>
                </div>
              </div>

              {/* Reports List */}
              <div className="space-y-3">
                <h4 className="text-sm sm:text-base font-black text-[#2B1810]">
                  تاریخچه تمام گزارش‌های ثبت‌شده توسط این مشاور:
                </h4>

                {selectedConsultantDetail.reports.length === 0 ? (
                  <div className="py-8 text-center text-sm font-bold text-[#8D5B4C]">هنوز گزارشی توسط این مشاور ثبت نشده است.</div>
                ) : (
                  selectedConsultantDetail.reports.map((rep) => {
                    const isFeedbacked = rep.status === 'approved' || !!rep.managerFeedback;
                    return (
                      <div 
                        key={rep.id}
                        className="p-4 sm:p-5 rounded-3xl bg-[#FAF7F2] border border-[#E6DAC8] space-y-3"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#DEC8B0] pb-2.5">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#9C6644]" />
                            <span className="font-black text-sm text-[#2B1810]">{rep.dateShamsi} ({rep.dayOfWeekShamsi})</span>
                            <span className="text-xs text-[#8D5B4C] font-mono">ساعت: {rep.submittedAt}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isFeedbacked ? (
                              <span className="inline-flex items-center gap-1 bg-[#D8F3DC] text-[#1B4332] border border-[#B7E4C7] px-2.5 py-0.5 rounded-full text-xs font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                                <span>بازخورد شد</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-[#FFF3CD] text-[#856404] border border-[#FFE69C] px-2.5 py-0.5 rounded-full text-xs font-bold">
                                <Clock className="w-3.5 h-3.5 text-[#9A6B00]" />
                                <span>بدون بازخورد</span>
                              </span>
                            )}

                            <button
                              onClick={() => {
                                setSelectedReportDetail(rep);
                                setFeedbackInput(rep.managerFeedback || '');
                                setRatingInput(rep.managerRating || 5);
                              }}
                              className="px-3 py-1.5 bg-[#9C6644] hover:bg-[#7F4F24] text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>بررسی ریز گزارش و بازخورد</span>
                            </button>
                          </div>
                        </div>

                        {/* Report Snapshot */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#5C4033]">
                          <div>صنف تحت پوشش: <strong>{rep.guild}</strong></div>
                          <div>تعداد کارفرمایان ثبت‌شده: <strong className="text-[#9C6644] font-black">{toPersianDigits(rep.rows.length)} نفر</strong></div>
                        </div>

                        {/* Personal Opinion Snippet */}
                        {rep.personalOpinion && (
                          <div className="p-3 rounded-2xl bg-white border-r-4 border-[#9C6644] text-xs space-y-1">
                            <span className="font-bold text-[#9C6644]">نظر و دیدگاه کارشناسی مشاور:</span>
                            <p className="text-[#3E2723] font-medium leading-relaxed">{rep.personalOpinion}</p>
                          </div>
                        )}

                        {/* Existing Manager Feedback if present */}
                        {isFeedbacked && rep.managerFeedback && (
                          <div className="p-3 rounded-2xl bg-[#EAF4EC] border-r-4 border-[#2D6A4F] text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#2D6A4F] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                دستور و بازخورد ابلاغی مدیریت:
                              </span>
                              {rep.managerRating && (
                                <span className="font-bold text-[#9A6B00]">امتیاز: {toPersianDigits(rep.managerRating)} ★</span>
                              )}
                            </div>
                            <p className="text-[#1B4332] font-medium leading-relaxed">{rep.managerFeedback}</p>
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 5. MODAL: REPORT DETAIL & FEEDBACK SUBMISSION */}
      {selectedReportDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white border border-[#DEC8B0] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DAC8] bg-[#F5EDE2]">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-[#2B1810]">
                    بررسی تفصیلی گزارش: {selectedReportDetail.consultantName}
                  </h3>
                  <span className="text-xs font-bold text-[#5C4033] bg-white px-2.5 py-0.5 rounded-lg border border-[#DEC8B0]">
                    کد: {selectedReportDetail.consultantCode}
                  </span>
                  {(selectedReportDetail.status === 'approved' || !!selectedReportDetail.managerFeedback) ? (
                    <span className="inline-flex items-center gap-1 bg-[#D8F3DC] text-[#1B4332] border border-[#B7E4C7] text-xs px-2.5 py-0.5 rounded-full font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                      بازخورد شد
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-[#FFF3CD] text-[#856404] border border-[#FFE69C] text-xs px-2.5 py-0.5 rounded-full font-bold">
                      <Clock className="w-3.5 h-3.5 text-[#9A6B00]" />
                      بدون بازخورد
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#6F4E37] font-medium block mt-0.5">
                  صنف: {selectedReportDetail.guild} | تاریخ: {selectedReportDetail.dateShamsi} ({selectedReportDetail.dayOfWeekShamsi})
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportSingleReportToExcel(selectedReportDetail)}
                  className="p-2 rounded-2xl bg-white hover:bg-[#FAF7F2] text-[#2D6A4F] border border-[#DEC8B0] cursor-pointer"
                  title="دانلود اکسل"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button
                  onClick={() => printOfficialReport(selectedReportDetail)}
                  className="p-2 rounded-2xl bg-white hover:bg-[#FAF7F2] text-[#9C6644] border border-[#DEC8B0] cursor-pointer"
                  title="چاپ رسمی"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedReportDetail(null)}
                  className="p-2 rounded-2xl text-[#6F4E37] hover:text-[#2B1810] hover:bg-[#EBE0D2] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#2B1810]">
              
              {/* Rows List */}
              <div className="space-y-3">
                <h4 className="text-sm sm:text-base font-black text-[#2B1810]">
                  رکوردهای ثبت‌شده در این گزارش ({toPersianDigits(selectedReportDetail.rows.length)} کارفرما):
                </h4>

                <div className="space-y-3">
                  {selectedReportDetail.rows.map((row, rIdx) => (
                    <div key={rIdx} className="p-4 rounded-3xl bg-[#FAF7F2] border border-[#E6DAC8] space-y-3 text-xs sm:text-sm">
                      <div className="flex items-center justify-between border-b border-[#DEC8B0] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#F5EDE2] text-[#9C6644] font-black flex items-center justify-center border border-[#DEC8B0]">
                            {toPersianDigits(row.rowNumber)}
                          </span>
                          <span className="font-black text-[#2B1810] text-sm sm:text-base">{row.clientName}</span>
                          <span className="text-xs text-[#6F4E37]">({row.activityField})</span>
                        </div>
                        <span className="text-[#2B1810] font-mono font-bold direction-ltr">{row.phone}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#3E2723]">
                        <div><strong>آدرس:</strong> {row.address}</div>
                        <div><strong className="text-[#9C6644]">دغدغه اصلی:</strong> {row.employerConcern}</div>
                        <div><strong>موضوع جلسه:</strong> {row.meetingTopic}</div>
                        <div className="flex items-center gap-2">
                          <strong className="text-[#2D6A4F]">نتیجه پیگیری:</strong>
                          {FOLLOW_UP_STATUS_CODES.some(c => c.code === row.followUpResult) ? (
                            <FollowUpBadge code={row.followUpResult} showLabel size="md" />
                          ) : (
                            <span className="text-xs text-[#2B1810] font-bold bg-white px-2.5 py-1 rounded-xl border border-[#DEC8B0]">
                              {row.followUpResult || 'ثبت نشده'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Follow-up chain with Badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs bg-white p-2.5 rounded-2xl border border-[#E6DAC8]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#6F4E37]">پیگیری ۱:</span>
                          <FollowUpBadge code={row.followUp1} size="sm" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#6F4E37]">پیگیری ۲:</span>
                          <FollowUpBadge code={row.followUp2} size="sm" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#6F4E37]">پیگیری ۳:</span>
                          <FollowUpBadge code={row.followUp3} size="sm" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#6F4E37]">پیگیری ۴:</span>
                          <FollowUpBadge code={row.followUp4} size="sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Opinion Section */}
              <div className="p-4 rounded-3xl bg-[#FAF7F2] border-r-4 border-[#9C6644] space-y-1 text-xs sm:text-sm">
                <span className="text-[#9C6644] font-black block">دیدگاه و نظر کارشناسی مشاور:</span>
                <p className="text-[#2B1810] font-medium leading-relaxed">{selectedReportDetail.personalOpinion}</p>
              </div>

              {/* Manager Feedback Form */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#FAF7F2] to-[#F5EDE2] border border-[#DEC8B0] space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-black text-[#2B1810] text-sm sm:text-base">
                    {(selectedReportDetail.status === 'approved' || !!selectedReportDetail.managerFeedback) 
                      ? 'ویرایش یا به‌روزرسانی بازخورد مدیریت:' 
                      : 'ثبت دستور و بازخورد مدیریت به مشاور:'}
                  </span>
                  
                  {/* Rating Stars */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-[#6F4E37] ml-1">امتیاز عملکرد:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingInput(star)}
                        className="cursor-pointer p-0.5"
                      >
                        <Star className={`w-5 h-5 ${star <= ratingInput ? 'text-[#9A6B00] fill-[#9A6B00]' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="دستور پیگیری، رهنمود حقوقی یا تشویق پرسنل توسط مدیریت..."
                  className="w-full bg-white border border-[#DEC8B0] focus:border-[#9C6644] rounded-2xl p-3.5 text-xs sm:text-sm text-[#2B1810] placeholder-[#8D5B4C] focus:outline-none font-medium"
                />

                {feedbackSuccess && (
                  <div className="text-[#1B4332] text-xs sm:text-sm font-bold flex items-center gap-2 bg-[#D8F3DC] p-3 rounded-2xl border border-[#B7E4C7]">
                    <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
                    <span>بازخورد با موفقیت در سیستم ثبت گردید.</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleSaveFeedback(selectedReportDetail.id)}
                    className="px-6 py-3 bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-black rounded-2xl text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {(selectedReportDetail.status === 'approved' || !!selectedReportDetail.managerFeedback)
                      ? 'به‌روزرسانی و ثبت بازخورد'
                      : 'تایید نهایی گزارش و ابلاغ بازخورد'}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
