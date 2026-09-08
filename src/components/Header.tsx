import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getCurrentShamsiDate, getCurrentTimeFormatted } from '../utils/shamsi';
import { 
  Shield, 
  LogOut, 
  Clock, 
  Sparkles, 
  Building2, 
  KeyRound,
  UserCheck,
  Lock
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
  onSwitchUserClick?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onSwitchUserClick,
  activeTab,
  setActiveTab
}) => {
  const [timeStr, setTimeStr] = useState(getCurrentTimeFormatted());
  const [shamsiDate, setShamsiDate] = useState(getCurrentShamsiDate());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(getCurrentTimeFormatted());
      setShamsiDate(getCurrentShamsiDate());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const isManagement = currentUser.role === 'ceo' || currentUser.role === 'it_admin';

  return (
    <header className="sticky top-0 z-40 bg-[#091524]/95 backdrop-blur-md border-b border-amber-500/20 shadow-xl transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
        
        {/* Brand & Logo Section */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div 
            className="flex items-center gap-2.5 group cursor-pointer" 
            onClick={() => setActiveTab(isManagement ? 'dashboard' : 'new_report')}
          >
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
              <div className="w-full h-full bg-[#0a192f] rounded-[10px] flex items-center justify-center">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#091524] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white font-['Playfair_Display']">
                  KARINO
                </span>
                <span className="text-xs sm:text-sm font-black gold-gradient-text whitespace-nowrap">
                  مجموعه کارینو
                </span>
                <span className="text-[9px] sm:text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono whitespace-nowrap">
                  نسخه ۲.۵
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-1">
                سامانه گزارش عملکرد اجرایی و مدیریت حقوق کار
              </p>
            </div>
          </div>

          {/* Mobile Live Time Badge */}
          <div className="flex md:hidden items-center gap-1 bg-[#0e2139] border border-amber-500/20 px-2 py-1 rounded-lg text-[11px] text-amber-300 whitespace-nowrap shrink-0">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className="font-mono">{timeStr}</span>
          </div>
        </div>

        {/* Center: Shamsi Live Calendar & Status Bar (Desktop) */}
        <div className="hidden lg:flex items-center gap-3 bg-[#0d1d33] border border-amber-500/20 px-4 py-1.5 rounded-full text-xs text-slate-300 shadow-inner shrink-0">
          <div className="flex items-center gap-1.5 text-amber-300 font-medium whitespace-nowrap">
            <Clock className="w-3.5 h-3.5" />
            <span>امروز: {shamsiDate.dayOfWeek}، {shamsiDate.formattedWithMonth}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-slate-300 font-mono whitespace-nowrap">
            <span>ساعت:</span>
            <span className="text-amber-200 font-bold">{timeStr}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-emerald-400 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>سرور همگام</span>
          </div>
        </div>

        {/* User Identity & Logout Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto">
          
          {/* User Profile Info Card */}
          <div className="flex items-center gap-2 bg-[#0e223b] border border-amber-500/20 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-right shadow-sm flex-1 sm:flex-initial min-w-0">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-[11px] sm:text-xs shadow shrink-0 ${
              currentUser.role === 'ceo' 
                ? 'bg-purple-600 text-white' 
                : currentUser.role === 'it_admin' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950'
            }`}>
              {currentUser.role === 'ceo' ? 'مدیر' : currentUser.role === 'it_admin' ? 'فاوا' : 'مشاور'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-[180px]">
                  {currentUser.fullName}
                </span>
                <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded font-bold whitespace-nowrap ${
                  currentUser.role === 'ceo' 
                    ? 'bg-purple-950 text-purple-300 border border-purple-500/40' 
                    : currentUser.role === 'it_admin'
                    ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                }`}>
                  {currentUser.role === 'ceo' ? 'مدیریت' : currentUser.role === 'it_admin' ? 'مدیر فاوا' : `کد: ${currentUser.consultantCode}`}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {currentUser.branch || 'تیم اجرایی کارینو'}
              </div>
            </div>
          </div>

          {/* Logout Button (For All Users) */}
          <button
            type="button"
            onClick={onLogout}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 hover:text-rose-100 transition-colors flex items-center gap-1 text-[11px] sm:text-xs font-bold cursor-pointer shadow-sm whitespace-nowrap shrink-0"
            title="خروج امن از حساب کاربری"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>

        </div>
      </div>
    </header>
  );
};



