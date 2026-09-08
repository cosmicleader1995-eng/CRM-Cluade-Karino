import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { performLogin, registerConsultantOnServer, syncWithServer } from '../services/storage';
import { 
  Shield, 
  Lock, 
  UserCheck, 
  UserPlus, 
  LogIn, 
  Terminal,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'consultant' | 'manager' | 'it' | 'register'>('consultant');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Consultant Form State
  const [cUsername, setCUsername] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cError, setCError] = useState('');

  // Manager Form State
  const [mPassword, setMPassword] = useState('');
  const [mError, setMError] = useState('');

  // IT Form State
  const [itPassword, setItPassword] = useState('');
  const [itError, setItError] = useState('');

  // Register Form State
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBranch, setRegBranch] = useState('تیم اجرایی مشهد');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Sync latest database on mount
  useEffect(() => {
    syncWithServer();
  }, []);

  // Handle Consultant Login
  const handleConsultantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCError('');

    if (!cUsername.trim() || !cPassword.trim()) {
      setCError('لطفاً نام کاربری/کد پرسنلی و کلمه عبور را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await performLogin(cUsername, cPassword, 'consultant');
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setCError(result.message || 'کد کاربری یا کلمه عبور وارد شده نادرست است.');
      }
    } catch (err: any) {
      setCError('خطا در برقراری ارتباط با سرور. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Senior Manager (CEO) Login
  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMError('');

    if (!mPassword.trim()) {
      setMError('لطفاً کلمه عبور مدیریت را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await performLogin('ceo', mPassword, 'ceo');
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setMError(result.message || 'کلمه عبور مدیریت نادرست است.');
      }
    } catch (err: any) {
      setMError('خطا در اعتبارسنجی سرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle IT Manager Login
  const handleITLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setItError('');

    if (!itPassword.trim()) {
      setItError('لطفاً کلمه عبور مدیر فاوا را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await performLogin('it_admin', itPassword, 'it_admin');
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setItError(result.message || 'کلمه عبور مدیر فاوا نادرست است.');
      }
    } catch (err: any) {
      setItError('خطا در اعتبارسنجی سرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Register New Consultant
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regFullName.trim() || !regUsername.trim() || !regCode.trim() || !regPassword.trim()) {
      setRegError('لطفاً تمام فیلدهای ستاره‌دار را تکمیل فرمایید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerConsultantOnServer({
        fullName: regFullName.trim(),
        username: regUsername.trim().toLowerCase(),
        consultantCode: regCode.trim().toUpperCase(),
        password: regPassword.trim(),
        phone: regPhone.trim() || '',
        branch: regBranch.trim() || 'تیم اجرایی'
      });

      if (result.success && result.user) {
        setRegSuccess(`مشاور گرامی «${result.user.fullName}» با موفقیت در پایگاه داده سرور ثبت شد. در حال ورود...`);
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 800);
      } else {
        setRegError(result.message || 'خطا در ثبت مشاور جدید.');
      }
    } catch (err: any) {
      setRegError('خطا در ثبت مشاور بر روی سرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060e18] text-slate-100 font-['Vazirmatn',sans-serif] flex flex-col justify-center items-center p-4 selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Background Subtle Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-[#0a1829]/95 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl gold-border-glow z-10 animate-fadeIn">
        
        {/* Header Branding */}
        <div className="p-6 text-center border-b border-amber-500/20 bg-gradient-to-b from-[#0e223a] to-[#0a1829]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 mb-3">
            <div className="w-full h-full bg-[#081525] rounded-[14px] flex items-center justify-center">
              <Shield className="w-7 h-7 text-amber-400" />
            </div>
          </div>
          
          <h1 className="text-xl font-black text-white font-['Playfair_Display'] tracking-wide">
            KARINO
          </h1>
          <h2 className="text-sm font-bold gold-gradient-text mt-0.5">
            مجموعه حقوقی و مدیریت کارینو
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            سامانه ورود امن و مدیریت گزارشات اجرایی
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-[#071321] p-1.5 gap-1">
          <button
            type="button"
            onClick={() => { setActiveTab('consultant'); setCError(''); }}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'consultant'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>مشاوران</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('manager'); setMError(''); }}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'manager'
                ? 'bg-purple-600 text-white shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>مدیریت</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('it'); setItError(''); }}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'it'
                ? 'bg-blue-600 text-white shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>مدیر فاوا</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('register'); setRegError(''); }}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>مشاور جدید</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          
          {/* TAB 1: CONSULTANT LOGIN */}
          {activeTab === 'consultant' && (
            <form onSubmit={handleConsultantLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  نام کاربری یا کد پرسنلی مشاور:
                </label>
                <input
                  type="text"
                  value={cUsername}
                  onChange={(e) => setCUsername(e.target.value)}
                  placeholder="کد پرسنلی یا نام کاربری"
                  className="w-full bg-[#06111e] border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  dir="ltr"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  کلمه عبور اختصاصی:
                </label>
                <input
                  type="password"
                  value={cPassword}
                  onChange={(e) => setCPassword(e.target.value)}
                  placeholder="کلمه عبور خود را وارد نمایید"
                  className="w-full bg-[#06111e] border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  dir="ltr"
                />
              </div>

              {cError && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{cError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>در حال اعتبارسنجی با سرور مرکزی...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>ورود به پنل مشاور</span>
                  </>
                )}
              </button>

              {/* Test Accounts Quick Select */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold block text-center">
                  دسترسی سریع به حساب‌های تستی مشاورین:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setCUsername('rezaei'); setCPassword('1234'); }}
                    className="px-2 py-1.5 bg-[#0d1f35] hover:bg-[#132c4b] border border-amber-500/20 rounded-lg text-[11px] text-amber-200 text-right transition-colors"
                  >
                    علیرضا رضایی (C-101)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCUsername('mohammadi'); setCPassword('1234'); }}
                    className="px-2 py-1.5 bg-[#0d1f35] hover:bg-[#132c4b] border border-amber-500/20 rounded-lg text-[11px] text-amber-200 text-right transition-colors"
                  >
                    مریم محمدی (C-102)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCUsername('hosseini'); setCPassword('1234'); }}
                    className="px-2 py-1.5 bg-[#0d1f35] hover:bg-[#132c4b] border border-amber-500/20 rounded-lg text-[11px] text-amber-200 text-right transition-colors"
                  >
                    سعید حسینی (C-103)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCUsername('karimi'); setCPassword('1234'); }}
                    className="px-2 py-1.5 bg-[#0d1f35] hover:bg-[#132c4b] border border-amber-500/20 rounded-lg text-[11px] text-amber-200 text-right transition-colors"
                  >
                    ندا کریمی (C-104)
                  </button>
                </div>
              </div>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
                >
                  حساب کاربری ندارید؟ ثبت‌نام مشاور جدید
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MANAGEMENT (CEO) LOGIN */}
          {activeTab === 'manager' && (
            <form onSubmit={handleManagerLogin} className="space-y-4">
              <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl text-xs text-purple-200">
                ورود به پنل استراتژیک مدیریت کارینو (Management Dashboard)
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  کلمه عبور مدیریت:
                </label>
                <input
                  type="password"
                  value={mPassword}
                  onChange={(e) => setMPassword(e.target.value)}
                  placeholder="کلمه عبور مدیریت"
                  className="w-full bg-[#06111e] border border-slate-700 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  dir="ltr"
                  autoFocus
                />
              </div>

              {mError && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{mError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>در حال اعتبارسنجی مدیریت...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>ورود به داشبورد مدیریت</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMPassword('karino2026')}
                  className="text-[11px] text-purple-300 hover:text-purple-200 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  تکمیل خودکار کلمه عبور پیش‌فرض (karino2026)
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: IT DIRECTOR (FAVA) LOGIN */}
          {activeTab === 'it' && (
            <form onSubmit={handleITLogin} className="space-y-4">
              <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs text-blue-200">
                ورود به کنسول نظارت فنی و زیرساخت فناوری اطلاعات (IT Console)
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  کلمه عبور مدیر فناوری اطلاعات (فاوا):
                </label>
                <input
                  type="password"
                  value={itPassword}
                  onChange={(e) => setItPassword(e.target.value)}
                  placeholder="کلمه عبور مدیر فاوا"
                  className="w-full bg-[#06111e] border border-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  dir="ltr"
                  autoFocus
                />
              </div>

              {itError && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{itError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>در حال اعتبارسنجی کنسول فاوا...</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4" />
                    <span>ورود به کنسول فاوا</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setItPassword('it2026')}
                  className="text-[11px] text-blue-300 hover:text-blue-200 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  تکمیل خودکار کلمه عبور پیش‌فرض (it2026)
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: REGISTER NEW CONSULTANT */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-300">
                    نام و نام خانوادگی <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="مثال: علی محمدی"
                    className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-300">
                    کد پرسنلی <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value)}
                    placeholder="مثال: C-101"
                    className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-300">
                    نام کاربری <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="مثال: mohammadi"
                    className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    dir="ltr"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-300">
                    کلمه عبور اختصاصی <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="کلمه عبور امن"
                    className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-300">
                    شماره تماس:
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-300">
                    شعبه / منطقه:
                  </label>
                  <input
                    type="text"
                    value={regBranch}
                    onChange={(e) => setRegBranch(e.target.value)}
                    placeholder="تیم اجرایی"
                    className="w-full bg-[#06111e] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              {regError && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{regSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>در حال ذخیره در دیتابیس سرور و ورود...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>ثبت مشاور و ورود به پنل</span>
                  </>
                )}
              </button>
            </form>
          )}

        </div>

      </div>

    </div>
  );
};
