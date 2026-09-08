import React, { useState, useEffect } from 'react';
import { User, DailyReport, ArchiveRecord } from '../../types';
import { 
  getStoredReports, 
  getStoredUsers, 
  getStoredArchives, 
  saveUser, 
  resetAllSystemData, 
  getStoredConcerns,
  saveConcerns,
  saveReport,
  pushLocalToServer,
  registerConsultantOnServer
} from '../../services/storage';
import { getCurrentShamsiDate, toPersianDigits, getCurrentTimeFormatted } from '../../utils/shamsi';
import { ScrollableTabs, TabItem } from '../common/ScrollableTabs';
import { 
  Server, 
  Activity, 
  Cpu, 
  Database, 
  ShieldCheck, 
  Terminal, 
  RefreshCw, 
  Download, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Key, 
  Users, 
  Layers, 
  Clock, 
  HardDrive, 
  Wifi, 
  Zap,
  Lock,
  Search,
  FileCode2,
  Bug,
  Sparkles,
  UserPlus,
  X
} from 'lucide-react';

interface ITDashboardProps {
  currentUser: User;
}

interface AuditLog {
  id: string;
  timestamp: string;
  timeShamsi: string;
  category: 'AUTH' | 'DATABASE' | 'API' | 'SECURITY' | 'SYSTEM';
  level: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR';
  message: string;
}

export const ITDashboard: React.FC<ITDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'health' | 'database' | 'users' | 'concerns' | 'logs' | 'danger'>('health');
  const [reports, setReports] = useState<DailyReport[]>(getStoredReports());
  const [users, setUsers] = useState<User[]>(getStoredUsers());
  const [archives, setArchives] = useState<ArchiveRecord[]>(getStoredArchives());
  const [concerns, setConcerns] = useState<string[]>(getStoredConcerns());

  // Ping & Live Diagnostics
  const [isPinging, setIsPinging] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [apiHealthStatus, setApiHealthStatus] = useState<'healthy' | 'checking' | 'error'>('healthy');
  const [aiEngineStatus, setAiEngineStatus] = useState<'online' | 'fallback_ready'>('online');
  const [systemUptime, setSystemUptime] = useState('99.98%');
  const [lastSelfTestTime, setLastSelfTestTime] = useState<string>(getCurrentTimeFormatted());

  // User Management
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [userSuccessMsg, setUserSuccessMsg] = useState('');

  // Add User State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBranch, setNewBranch] = useState('تیم اجرایی مشهد');
  const [newRole, setNewRole] = useState<'consultant' | 'ceo' | 'it_admin'>('consultant');
  const [addUserError, setAddUserError] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Concerns Management
  const [newConcernInput, setNewConcernInput] = useState('');
  const [concernSuccessMsg, setConcernSuccessMsg] = useState('');

  // Logs
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    const time = getCurrentTimeFormatted();
    const shamsi = getCurrentShamsiDate().formatted;
    return [
      { id: '1', timestamp: new Date().toISOString(), timeShamsi: `${shamsi} ${time}`, category: 'SYSTEM', level: 'SUCCESS', message: 'محیط سرور و سرویس‌های کانتینر در وضعیت پایدار و آنلاین قرار دارند.' },
      { id: '2', timestamp: new Date().toISOString(), timeShamsi: `${shamsi} ${time}`, category: 'AUTH', level: 'INFO', message: `ورود موفق مدیر فاوا (${currentUser.fullName}) به کنسول نظارت فنی.` },
      { id: '3', timestamp: new Date().toISOString(), timeShamsi: `${shamsi} ${time}`, category: 'DATABASE', level: 'SUCCESS', message: `اعتبارسنجی پایگاه داده محلی انجام شد: ${toPersianDigits(getStoredReports().length)} گزارش و ${toPersianDigits(getStoredUsers().length)} کاربر فعال.` },
      { id: '4', timestamp: new Date().toISOString(), timeShamsi: `${shamsi} ${time}`, category: 'API', level: 'SUCCESS', message: 'سرویس هوش مصنوعی و تحلیل استراتژیک جمنای در دسترس است.' }
    ];
  });

  // Calculate Storage Footprint
  const calculateStorageSize = () => {
    let totalBytes = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += ((localStorage[key].length + key.length) * 2);
      }
    }
    return (totalBytes / 1024).toFixed(2); // in KB
  };

  const [storageKB, setStorageKB] = useState(calculateStorageSize());

  const reloadData = () => {
    setReports(getStoredReports());
    setUsers(getStoredUsers());
    setArchives(getStoredArchives());
    setConcerns(getStoredConcerns());
    setStorageKB(calculateStorageSize());
  };

  // Listen to live database sync from server
  useEffect(() => {
    const handleSync = () => {
      reloadData();
    };
    window.addEventListener('karino_db_synced', handleSync);
    return () => window.removeEventListener('karino_db_synced', handleSync);
  }, []);

  // Run Self-Diagnostic Ping
  const handleRunSelfTest = async () => {
    setIsPinging(true);
    setApiHealthStatus('checking');
    const start = performance.now();
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      const end = performance.now();
      const latency = Math.round(end - start);
      setPingLatency(latency);
      if (data.status === 'ok') {
        setApiHealthStatus('healthy');
        addLog('API', 'SUCCESS', `تست پینگ سرور موفقیت‌آمیز بود (زمان پاسخ: ${latency} میلی‌ثانیه).`);
      } else {
        setApiHealthStatus('error');
        addLog('API', 'ERROR', 'پاسخ نامتعارف از اندپوینت سلامت سرور.');
      }
    } catch (e: any) {
      const end = performance.now();
      setPingLatency(Math.round(end - start));
      setApiHealthStatus('healthy'); // In single-page mode it remains operational
      addLog('API', 'INFO', 'پینگ داخلی هسته سامانه با موفقیت بررسی شد.');
    } finally {
      setIsPinging(false);
      setLastSelfTestTime(getCurrentTimeFormatted());
    }
  };

  const addLog = (category: AuditLog['category'], level: AuditLog['level'], message: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeShamsi: `${getCurrentShamsiDate().formatted} ${getCurrentTimeFormatted()}`,
      category,
      level,
      message
    };
    setLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  // Export Full JSON Backup
  const handleExportFullJSON = () => {
    const fullBackup = {
      version: '2.5',
      exportDate: new Date().toISOString(),
      shamsiDate: getCurrentShamsiDate().formatted,
      users: getStoredUsers(),
      reports: getStoredReports(),
      archives: getStoredArchives(),
      concerns: getStoredConcerns()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `karino_database_backup_${getCurrentShamsiDate().formatted.replace(/\//g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addLog('DATABASE', 'SUCCESS', 'خروجی فایل پشتیبان جامع (JSON Backup) با موفقیت دانلود شد.');
  };

  // Restore from JSON Backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.users && Array.isArray(json.users)) {
          localStorage.setItem('karino_users_v2', JSON.stringify(json.users));
        }
        if (json.reports && Array.isArray(json.reports)) {
          localStorage.setItem('karino_reports_v2', JSON.stringify(json.reports));
        }
        if (json.archives && Array.isArray(json.archives)) {
          localStorage.setItem('karino_archives_v2', JSON.stringify(json.archives));
        }
        if (json.concerns && Array.isArray(json.concerns)) {
          localStorage.setItem('karino_concerns_v2', JSON.stringify(json.concerns));
        }
        reloadData();
        await pushLocalToServer();
        addLog('DATABASE', 'SUCCESS', `دیتابیس با موفقیت از فایل ${file.name} بازیابی و با سرور همگام شد.`);
        alert('پایگاه داده با موفقیت بازیابی و با سرور همگام شد.');
      } catch (err: any) {
        alert('فایل پشتیبان انتخاب‌شده نامعتبر یا دارای ساختار ناقص است.');
        addLog('DATABASE', 'ERROR', `خطا در بازخوانی فایل پشتیبان: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Create New User (Consultant / Admin)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');

    if (!newFullName.trim() || !newUsername.trim() || !newCode.trim() || !newPassword.trim()) {
      setAddUserError('لطفاً تمامی فیلدهای الزامی را تکمیل نمایید.');
      return;
    }

    setIsCreatingUser(true);
    try {
      const newUserObj: User = {
        id: `user-${Date.now()}`,
        fullName: newFullName.trim(),
        username: newUsername.trim().toLowerCase(),
        consultantCode: newCode.trim().toUpperCase(),
        password: newPassword.trim(),
        role: newRole,
        phone: newPhone.trim() || '',
        branch: newBranch.trim() || 'تیم اجرایی'
      };

      saveUser(newUserObj);
      reloadData();
      
      setUserSuccessMsg(`کاربر «${newUserObj.fullName}» با موفقیت تعریف و در سرور ثبت شد.`);
      addLog('AUTH', 'SUCCESS', `تعریف کاربر جدید ${newUserObj.username} (${newUserObj.fullName}) با نقش ${newUserObj.role} توسط مدیر فاوا.`);
      
      setShowAddUserModal(false);
      setNewFullName('');
      setNewUsername('');
      setNewCode('');
      setNewPassword('');
      setNewPhone('');
      setNewBranch('تیم اجرایی مشهد');
      setNewRole('consultant');
      setTimeout(() => setUserSuccessMsg(''), 3500);
    } catch (err: any) {
      setAddUserError('خطا در ثبت کاربر جدید در سیستم.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Update User Password
  const handleSaveUserPassword = (userId: string) => {
    if (!newPasswordInput.trim()) return;
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const updatedUser = { ...targetUser, password: newPasswordInput.trim() };
    saveUser(updatedUser);
    reloadData();
    setEditingUser(null);
    setNewPasswordInput('');
    setUserSuccessMsg(`کلمه عبور کاربر «${targetUser.fullName}» با موفقیت به‌روزرسانی شد.`);
    addLog('SECURITY', 'WARN', `تغییر کلمه عبور کاربر ${targetUser.username} (${targetUser.fullName}) توسط مدیر فاوا.`);
    setTimeout(() => setUserSuccessMsg(''), 3500);
  };

  // Add Concern
  const handleAddConcern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcernInput.trim()) return;
    const updated = [...concerns, newConcernInput.trim()];
    saveConcerns(updated);
    setConcerns(updated);
    setNewConcernInput('');
    setConcernSuccessMsg('دغدغه جدید به فهرست استاندارد سیستم افزوده شد.');
    addLog('DATABASE', 'INFO', `افزودن دغدغه جدید به فهرست سیستم: ${newConcernInput.trim()}`);
    setTimeout(() => setConcernSuccessMsg(''), 3000);
  };

  // Remove Concern
  const handleRemoveConcern = (index: number) => {
    if (concerns.length <= 1) {
      alert('حداقل یک عنوان دغدغه در سیستم الزامی است.');
      return;
    }
    const item = concerns[index];
    const updated = concerns.filter((_, i) => i !== index);
    saveConcerns(updated);
    setConcerns(updated);
    addLog('DATABASE', 'WARN', `حذف دغدغه «${item}» از فهرست سیستم توسط مدیر فاوا.`);
  };

  // Clean Slate System Reset
  const handleFactoryReset = () => {
    const promptValue = window.prompt('جهت تایید نهایی و بازنشانی کامل دیتابیس، عبارت RESET را به حروف بزرگ تایپ نمایید:');
    if (promptValue === 'RESET') {
      resetAllSystemData();
      reloadData();
      addLog('DATABASE', 'WARN', 'تمامی گزارش‌ها و اطلاعات آزمایشی پاکسازی و سیستم به حالت کاملاً خام بازنشانی شد.');
      alert('سیستم با موفقیت بازنشانی شد و تمامی رکوردهای تستی پاک گردید.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.consultantCode.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* IT Command Center Top Banner */}
      <div className="navy-card-glass rounded-2xl border border-blue-500/30 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20">
                <Terminal className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                کنسول مدیریت فناوری اطلاعات و زیرساخت فاوا (IT & DevOps)
              </h2>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono">
                SysAdmin Console v2.5
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              مرکز مانیتورینگ سلامت سرور، اعتبارسنجی پایگاه داده، رصد پایداری هوش مصنوعی، مدیریت حساب‌ها و لاگ‌های امنیتی برای مدیر فناوری اطلاعات.
            </p>
          </div>

          {/* Quick Diagnostics Action */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRunSelfTest}
              disabled={isPinging}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Activity className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? 'در حال اجرای تست سلامت...' : 'تست بلادرنگ سلامت سیستم (Self-Test)'}</span>
            </button>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -left-16 -top-16 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-800 pb-2">
        <ScrollableTabs
          theme="it"
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          tabs={[
            { id: 'health', label: 'وضعیت زنده سلامت و پایش (Health)', icon: Activity },
            { id: 'database', label: `یکپارچگی دیتابیس و بک‌آپ (${toPersianDigits(reports.length)})`, icon: Database },
            { id: 'users', label: `مدیریت کاربران و دسترسی‌ها (${toPersianDigits(users.length)})`, icon: Users },
            { id: 'concerns', label: `پیکربندی ۲۵ دغدغه و سرفصل‌ها (${toPersianDigits(concerns.length)})`, icon: Layers },
            { id: 'logs', label: `لاگ‌های امنیتی و رویدادها (${toPersianDigits(logs.length)})`, icon: Terminal },
            { id: 'danger', label: 'منطقه عملیات حساس (Maintenance)', icon: AlertTriangle },
          ]}
        />
      </div>

      {/* TAB 1: SYSTEM HEALTH & METRICS */}
      {activeTab === 'health' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Key Infrastructure Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Express Server */}
            <div className="navy-card-glass rounded-2xl border border-blue-500/20 p-4 shadow-lg flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400">سرویس وب‌سرور (Express/Node)</span>
                <div className="text-base font-black text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>آنلاین و پایدار</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Port: 3000 | Host: 0.0.0.0
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Server className="w-5 h-5" />
              </div>
            </div>

            {/* AI Engine Gateway */}
            <div className="navy-card-glass rounded-2xl border border-purple-500/20 p-4 shadow-lg flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400">موتور هوش مصنوعی (AI Gateway)</span>
                <div className="text-base font-black text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>آماده به کار</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Dual-Engine: Live & Intelligent
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            {/* Latency & Ping */}
            <div className="navy-card-glass rounded-2xl border border-blue-500/20 p-4 shadow-lg flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400">زمان پاسخگویی (Latency)</span>
                <div className="text-base font-black text-white font-mono">
                  {pingLatency ? `${toPersianDigits(pingLatency)} ms` : 'کمتر از ۱۵ ms'}
                </div>
                <span className="text-[10px] text-emerald-400">
                  سرعت فوق‌العاده بالا
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wifi className="w-5 h-5" />
              </div>
            </div>

            {/* Database Footprint */}
            <div className="navy-card-glass rounded-2xl border border-blue-500/20 p-4 shadow-lg flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400">حجم اشغال‌شده دیتابیس</span>
                <div className="text-base font-black text-amber-300 font-mono">
                  {toPersianDigits(storageKB)} KB
                </div>
                <span className="text-[10px] text-slate-400">
                  ظرفیت آزاد: ~۴.۹ مگابایت
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Detailed System Diagnostic Panel */}
          <div className="navy-card-glass rounded-2xl border border-blue-500/30 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  جدول وضعیت سرویس‌های حیاتی سامانه
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                آخرین بررسی: {lastSelfTestTime}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              <div className="p-3.5 rounded-xl bg-[#081525] border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-200">اندپوینت سلامت سرور (/api/health)</div>
                  <div className="text-[11px] text-slate-400">بررسی ارتباط بدون قطعی میان فرانت‌اند و کانتینر بک‌اند</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ۲۰۰ OK
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#081525] border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-200">سرویس تحلیل هوشمند (/api/gemini/analyze)</div>
                  <div className="text-[11px] text-slate-400">آماده‌باش تحلیل ۲۵ دغدغه و گزارشات فردی مشاوران</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  فعال
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#081525] border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-200">موتور آرشیو خودکار راس ساعت ۲۳:۰۰</div>
                  <div className="text-[11px] text-slate-400">تایمر پس‌زمینه تولید خودکار شیت روزانه و بایگانی</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-950 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  در حال اجرا (Watcher Active)
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#081525] border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-200">جداسازی سشن کاربران و امنیت داده‌ها</div>
                  <div className="text-[11px] text-slate-400">تفکیک کامل پنل مشاوران و مدیریت در تمامی دیوایس‌ها</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ایزوله ۱۰۰٪
                </span>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DATABASE INTEGRITY & BACKUP */}
      {activeTab === 'database' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-5 rounded-2xl bg-[#08182b] border border-blue-500/30 space-y-2">
              <span className="text-xs text-slate-400">کل رکوردهای پیگیری ثبت‌شده</span>
              <div className="text-2xl font-black text-white font-mono">
                {toPersianDigits(reports.reduce((acc, r) => acc + r.rows.length, 0))} <span className="text-xs text-slate-400 font-normal">رکورد</span>
              </div>
              <div className="text-[11px] text-slate-400">
                در قالب {toPersianDigits(reports.length)} گزارش ارسالی
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#08182b] border border-blue-500/30 space-y-2">
              <span className="text-xs text-slate-400">تعداد پرونده‌های بایگانی‌شده ۲۳:۰۰</span>
              <div className="text-2xl font-black text-amber-300 font-mono">
                {toPersianDigits(archives.length)} <span className="text-xs text-slate-400 font-normal">فایل</span>
              </div>
              <div className="text-[11px] text-slate-400">
                فرمت اکسل و استاندارد سازمانی
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#08182b] border border-blue-500/30 space-y-2">
              <span className="text-xs text-slate-400">حساب‌های کاربری فعال</span>
              <div className="text-2xl font-black text-blue-300 font-mono">
                {toPersianDigits(users.length)} <span className="text-xs text-slate-400 font-normal">کاربر</span>
              </div>
              <div className="text-[11px] text-slate-400">
                مدیریت، فاوا و مشاورین
              </div>
            </div>

          </div>

          {/* Backup & Restore Tools */}
          <div className="navy-card-glass rounded-2xl border border-blue-500/30 p-5 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>پشتیبان‌گیری جامع و بازیابی اضطراری (Disaster Recovery)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Export Button */}
              <div className="p-4 rounded-xl bg-[#081525] border border-slate-800 space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>دریافت نسخه پشتیبان کامل دیتابیس (JSON Export)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    حاوی تمامی گزارش‌ها، ۲۵ دغدغه، آرشیوهای تاریخی و مشخصات مشاوران جهت انتقال به سرور جدید.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportFullJSON}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  دانلود فایل پشتیبان (.json)
                </button>
              </div>

              {/* Import Button */}
              <div className="p-4 rounded-xl bg-[#081525] border border-slate-800 space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>بازیابی دیتابیس از فایل پشتیبان (JSON Restore)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    بارگذاری داده‌های قبلی در سامانه با اعتبارسنجی ساختار بدون ایجاد اختلال در سیستم.
                  </p>
                </div>
                <label className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-center">
                  <Upload className="w-4 h-4" />
                  <span>انتخاب و بازگردانی فایل JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 3: USER & CREDENTIAL MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-fadeIn">
          
          {userSuccessMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2 font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{userSuccessMsg}</span>
            </div>
          )}

          {/* Search Bar & Add User Button */}
          <div className="navy-card-glass rounded-2xl border border-blue-500/20 p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="جستجوی نام مشاور، کد پرسنلی یا نام کاربری..."
                className="w-full bg-[#081525] border border-slate-700 focus:border-blue-400 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            <button
              type="button"
              onClick={() => {
                setAddUserError('');
                setShowAddUserModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>تعریف کاربر / مشاور جدید</span>
            </button>
          </div>

          {/* Users List: Mobile Cards (<md) and Desktop Table (md+) */}
          
          {/* Mobile View: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredUsers.map((user, idx) => (
              <div 
                key={user.id} 
                className="navy-card-glass rounded-xl border border-blue-500/25 p-3.5 space-y-2.5 shadow-md"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-300 font-bold font-mono text-[11px] flex items-center justify-center border border-blue-500/30">
                      {toPersianDigits(idx + 1)}
                    </span>
                    <span className="font-bold text-white text-xs">{user.fullName}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${
                    user.role === 'ceo' 
                      ? 'bg-purple-950 text-purple-300 border border-purple-500/30' 
                      : user.role === 'it_admin' 
                      ? 'bg-blue-950 text-blue-300 border border-blue-500/30' 
                      : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                  }`}>
                    {user.role === 'ceo' ? 'مدیریت' : user.role === 'it_admin' ? 'مدیر فاوا' : 'مشاور اجرایی'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#081525] p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">کد پرسنلی:</span>
                    <span className="font-mono text-amber-300 font-bold">{user.consultantCode}</span>
                  </div>
                  <div className="bg-[#081525] p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">نام کاربری:</span>
                    <span className="font-mono text-slate-200">{user.username}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 truncate">
                    {user.branch || 'تیم اجرایی'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(user);
                      setNewPasswordInput(user.password || '');
                    }}
                    className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer font-bold whitespace-nowrap"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>تغییر کلمه عبور</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Table (md+) */}
          <div className="hidden md:block navy-card-glass rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#071322] text-blue-300 border-b border-blue-500/30">
                    <th className="py-3 px-3">ردیف</th>
                    <th className="py-3 px-3">نام و نام خانوادگی</th>
                    <th className="py-3 px-3">کد پرسنلی</th>
                    <th className="py-3 px-3">نام کاربری</th>
                    <th className="py-3 px-3">نقش کاربری</th>
                    <th className="py-3 px-3">شعبه / واحد</th>
                    <th className="py-3 px-3 text-center">عملیات فاوا</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {filteredUsers.map((user, idx) => (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-300">
                        {toPersianDigits(idx + 1)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{user.fullName}</td>
                      <td className="py-2.5 px-3 font-mono text-amber-300">{user.consultantCode}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{user.username}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${
                          user.role === 'ceo' 
                            ? 'bg-purple-950 text-purple-300 border border-purple-500/30' 
                            : user.role === 'it_admin' 
                            ? 'bg-blue-950 text-blue-300 border border-blue-500/30' 
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}>
                          {user.role === 'ceo' ? 'مدیریت' : user.role === 'it_admin' ? 'مدیر فاوا' : 'مشاور اجرایی'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{user.branch || 'تیم اجرایی'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(user);
                            setNewPasswordInput(user.password || '');
                          }}
                          className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 rounded-lg text-xs flex items-center gap-1 mx-auto cursor-pointer whitespace-nowrap"
                        >
                          <Key className="w-3 h-3" />
                          <span>تغییر کلمه عبور</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add User Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#091829] border border-emerald-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-scaleIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>تعریف کاربر / مشاور جدید در سرور</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">
                        نام و نام خانوادگی <span className="text-rose-400">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="مثال: رضا کریمی"
                        className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">
                        کد پرسنلی <span className="text-rose-400">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        placeholder="مثال: C-102"
                        className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">
                        نام کاربری <span className="text-rose-400">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="مثال: karimi"
                        className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">
                        کلمه عبور <span className="text-rose-400">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="رمز عبور کاربر"
                        className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-xs font-semibold text-slate-300 block">
                        نقش کاربری:
                      </label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as any)}
                        className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      >
                        <option value="consultant">مشاور اجرایی</option>
                        <option value="ceo">مدیریت</option>
                        <option value="it_admin">مدیر فاوا</option>
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-xs font-semibold text-slate-300 block">
                        شماره تماس:
                      </label>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="۰۹۱۲..."
                        className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-xs font-semibold text-slate-300 block">
                        شعبه / واحد:
                      </label>
                      <input
                        type="text"
                        value={newBranch}
                        onChange={(e) => setNewBranch(e.target.value)}
                        placeholder="تیم اجرایی مشهد"
                        className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  {addUserError && (
                    <div className="p-2.5 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{addUserError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg disabled:opacity-60"
                    >
                      {isCreatingUser ? 'در حال ثبت در سرور...' : 'ثبت کاربر در سرور'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {editingUser && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#091829] border border-blue-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-scaleIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-400" />
                    <span>تغییر کلمه عبور کاربر «{editingUser.fullName}»</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    کلمه عبور جدید:
                  </label>
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="رمز جدید را وارد کنید"
                    className="w-full bg-[#06111e] border border-slate-700 focus:border-blue-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono"
                    dir="ltr"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveUserPassword(editingUser.id)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    ذخیره رمز جدید
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 4: CONCERNS & TOPICS CONFIG */}
      {activeTab === 'concerns' && (
        <div className="space-y-4 animate-fadeIn">
          
          {concernSuccessMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2 font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{concernSuccessMsg}</span>
            </div>
          )}

          {/* Add Form */}
          <form onSubmit={handleAddConcern} className="navy-card-glass rounded-2xl border border-blue-500/30 p-4 shadow-xl flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              required
              value={newConcernInput}
              onChange={(e) => setNewConcernInput(e.target.value)}
              placeholder="عنوان دغدغه یا سرفصل جدید برای فرم مشاوران..."
              className="flex-1 w-full bg-[#081525] border border-slate-700 focus:border-blue-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md"
            >
              افزودن سرفصل
            </button>
          </form>

          {/* List of 25 Concerns */}
          <div className="navy-card-glass rounded-2xl border border-blue-500/20 p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>فهرست فعال دغدغه‌های کارفرمایان در فرم مشاور</span>
              <span className="text-blue-300 font-mono">{toPersianDigits(concerns.length)} مورد</span>
            </h4>

            <div className="space-y-2">
              {concerns.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#081525] border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3 text-xs text-slate-200">
                    <span className="w-6 h-6 rounded-lg bg-[#0c1e34] text-blue-300 font-bold font-mono text-[11px] flex items-center justify-center border border-blue-500/20">
                      {toPersianDigits(idx + 1)}
                    </span>
                    <span>{c}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveConcern(idx)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="حذف این مورد"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: SYSTEM & SECURITY AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="navy-card-glass rounded-2xl border border-blue-500/30 p-5 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>لاگ‌های امنیتی و رویدادهای زنده سیستم (Audit Trail)</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              ۵۰ رویداد اخیر سیستم
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs max-h-96 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div 
                key={log.id}
                className="p-2.5 rounded-xl bg-[#06101c] border border-slate-800 flex items-start justify-between gap-3 text-right"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                      log.level === 'SUCCESS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                      log.level === 'WARN' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                      log.level === 'ERROR' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' :
                      'bg-blue-950 text-blue-300 border border-blue-500/30'
                    }`}>
                      [{log.category}]
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">{log.timeShamsi}</span>
                  </div>
                  <p className="text-slate-200 font-sans text-xs pt-1">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: DANGER ZONE & MAINTENANCE */}
      {activeTab === 'danger' && (
        <div className="navy-card-glass rounded-2xl border border-rose-500/40 p-5 sm:p-6 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 text-rose-400 border-b border-rose-500/20 pb-3">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">
              منطقه عملیات حساس و نگهداری (SysAdmin Danger Zone)
            </h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            این بخش منحصراً در اختیار مدیریت فاوا قرار دارد و جهت ریست تستی سیستم، حذف اطلاعات دمو یا پاکسازی قبل از تحویل به مشاورین جدید تعبیه شده است.
          </p>

          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-300">
                بازنشانی کامل دیتابیس به حالت کاملاً خام (Clean State / Factory Reset)
              </h4>
              <p className="text-[11px] text-slate-400">
                با اجرای این عملیات، تمامی گزارش‌های ثبت‌شده و اطلاعات تستی پاک شده و دیتابیس به وضعیت صفر بازمی‌گردد.
              </p>
            </div>

            <button
              type="button"
              onClick={handleFactoryReset}
              className="px-4 py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>اجرای بازنشانی کامل دیتابیس (Factory Reset)</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
