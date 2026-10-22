import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  Building2, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { logoutUser } from '../services/authService';
import {
  Dashboard3DIcon,
  Booking3DIcon,
  Kasir3DIcon,
  Akademi3DIcon,
  Event3DIcon,
  Keuangan3DIcon,
  AIInsight3DIcon,
  Pengaturan3DIcon
} from './icons/App3DIcons';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', name: 'Dashboard', icon: Dashboard3DIcon },
  { path: '/booking', label: 'Booking', name: 'Booking', icon: Booking3DIcon },
  { path: '/kasir', label: 'Kasir', name: 'Kasir', icon: Kasir3DIcon },
  { path: '/akademi', label: 'Akademi', name: 'Akademi', icon: Akademi3DIcon },
  { path: '/events', label: 'Event & Turnamen', name: 'Event & Turnamen', icon: Event3DIcon },
  { path: '/keuangan', label: 'Keuangan', name: 'Keuangan', icon: Keuangan3DIcon },
  { path: '/intelligence', label: 'AI Insight', name: 'AI Insight', icon: AIInsight3DIcon },
  { path: '/pengaturan', label: 'Profil', name: 'Profil', icon: Pengaturan3DIcon },
];

export default function Layout({ userProfile }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const tenantName = userProfile?.tenant?.name || 'Arena & Akademi Core';
  const roleDisplay = userProfile?.role === 'superadmin' ? 'Super Admin' : 'Tenant Owner';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-800 text-sm overflow-x-hidden">
      
      {/* DESKTOP SIDEBAR (>= 1024px) */}
      <aside className={`hidden lg:flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 fixed top-0 bottom-0 left-0 z-30 shadow-sm transition-all duration-300 select-none`}>
        {/* Sidebar Header with Toggle */}
        <div className={`py-3.5 border-b border-slate-100 flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'flex-col gap-2 px-2 justify-center' : 'px-4 justify-between'}`}>
          {!isSidebarCollapsed ? (
            <img src="/logo_2.jpg" alt="CHUA SPORT CORE" className="w-32 h-auto object-contain" />
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs rounded-xl flex items-center justify-center shadow-xs">
              CSC
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
            title={isSidebarCollapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
            aria-label="Toggle Sidebar"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Tenant Profile Banner */}
        <div className={`m-3 p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'}`} title={tenantName}>
          <div className="w-8 h-8 bg-white border border-blue-200 rounded-lg flex items-center justify-center text-blue-600 shrink-0 font-bold shadow-2xs">
            <Building2 className="w-4 h-4" />
          </div>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{tenantName}</p>
              <p className="text-[10px] text-blue-600 font-semibold">{roleDisplay}</p>
            </div>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={isSidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3 py-2'} rounded-xl text-xs transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs ' + (isSidebarCollapsed ? 'ring-2 ring-blue-500/20' : 'border-r-4 border-blue-600')
                      : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors font-medium'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer & Logout */}
        <div className={`p-3 border-t border-slate-100 bg-slate-50/70 transition-all duration-300 ${isSidebarCollapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center space-x-2.5 overflow-hidden mb-2.5">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="Avatar" className="w-7 h-7 rounded-full border border-slate-200 shrink-0" />
                ) : (
                  <div className="w-7 h-7 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                    {userProfile?.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{userProfile?.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{userProfile?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Sistem</span>
              </button>
            </>
          ) : (
            <>
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Avatar" title={userProfile?.displayName} className="w-8 h-8 rounded-full border border-slate-200 shrink-0" />
              ) : (
                <div title={userProfile?.displayName} className="w-8 h-8 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {userProfile?.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <button
                onClick={handleLogout}
                title="Keluar Sistem"
                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg transition-colors cursor-pointer"
                aria-label="Keluar Sistem"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* MOBILE HEADER (< 1024px) */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          <img src="/logo_2.jpg" alt="CHUA SPORT CORE" className="h-8 w-auto object-contain shrink-0" />
          <div className="overflow-hidden border-l border-slate-200 pl-2.5">
            <h1 className="font-bold text-xs text-slate-800 leading-tight truncate max-w-[170px]">{tenantName}</h1>
            <span className="text-[9px] text-blue-600 font-semibold">{roleDisplay}</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* MOBILE SLIDE-OUT MENU OVERLAY (3-COLUMN GRID) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-4/5 max-w-sm bg-slate-50 z-50 p-5 flex flex-col justify-between lg:hidden shadow-2xl overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 bg-white -mx-5 -mt-5 p-5 mb-4 shadow-2xs">
                  <img src="/logo_2.jpg" alt="CHUA SPORT CORE" className="h-9 w-auto object-contain" />
                  <button 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer"
                    aria-label="Tutup Menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Menu Utama Navigasi</p>
                  
                  {/* GRID 3 KOLOM SESUAI INSTRUKSI */}
                  <div className="grid grid-cols-3 gap-4 mt-8 px-4">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex flex-col items-center justify-center p-4 rounded-2xl bg-white border shadow-sm text-center transition-all ${
                              isActive
                                ? 'bg-blue-50 text-blue-600 border-blue-300 font-semibold ring-2 ring-blue-500/20'
                                : 'border-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                            }`
                          }
                        >
                          <Icon className="w-7 h-7 mb-2" />
                          <span className="text-[10px] text-center font-medium leading-tight">
                            {item.name}
                          </span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-3 bg-white -mx-5 -mb-5 p-5 mt-6 shadow-2xs">
                <div className="flex items-center space-x-3 px-1">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="Avatar" className="w-9 h-9 rounded-full border border-slate-200" />
                  ) : (
                    <div className="w-9 h-9 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center font-bold text-xs">
                      {userProfile?.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 truncate">{userProfile?.displayName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{userProfile?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar Sistem</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} transition-all duration-300 min-w-0 max-w-full overflow-x-hidden pb-8 pt-4 lg:pt-6 px-3 sm:px-6 lg:px-8`}>
        <div className="max-w-7xl mx-auto w-full min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
