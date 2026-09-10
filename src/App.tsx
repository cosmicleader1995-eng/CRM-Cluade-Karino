import React, { useState, useEffect } from 'react';
import { User } from './types';
import { getCurrentUser, setCurrentUser as saveCurrentUser, logoutUser, checkAndTriggerNightlyArchive } from './services/storage';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { ConsultantDashboard } from './components/ConsultantPanel/ConsultantDashboard';
import { ManagerDashboard } from './components/ManagerPanel/ManagerDashboard';
import { ITDashboard } from './components/ITPanel/ITDashboard';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<User | null>(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState('dashboard');

  // Background 23:00 archive watcher (checks periodically without redundant duplicates)
  useEffect(() => {
    checkAndTriggerNightlyArchive();
    const interval = setInterval(() => {
      checkAndTriggerNightlyArchive();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUserState(user);
    saveCurrentUser(user);
    setActiveTab(user.role === 'consultant' ? 'new_report' : 'dashboard');
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUserState(null);
  };

  // If not logged in, show secure login page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#070e17] text-slate-100 font-['Vazirmatn',sans-serif] subtle-mesh flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container Based on Role */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6">
        {currentUser.role === 'it_admin' ? (
          <ITDashboard currentUser={currentUser} />
        ) : currentUser.role === 'ceo' ? (
          <ManagerDashboard currentUser={currentUser} />
        ) : (
          <ConsultantDashboard currentUser={currentUser} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#050c14] py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>سامانه مدیریت عملکرد و گزارشات اجرایی مجموعه حقوقی و مدیریت کارینو © ۱۴۰۳</span>
          <div className="flex items-center gap-2 text-slate-400">
            <span>طراحی شده برای انطباق ۱۰۰٪ با استانداردهای مدیریت</span>
            <span>•</span>
            <span className="text-blue-400 font-bold">واحد فناوری اطلاعات و فاوا</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
