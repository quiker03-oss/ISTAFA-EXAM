import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  BookOpen,
  FileSpreadsheet,
  FileText,
  Activity,
  Award,
  FileCheck2,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export type AdminTab =
  | 'dashboard'
  | 'school_profile'
  | 'students'
  | 'participant_cards'
  | 'question_bank'
  | 'upload_exam'
  | 'manage_exams'
  | 'monitoring'
  | 'results'
  | 'berita_acara'
  | 'reports'
  | 'settings'
  | 'account_security';

interface SidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { school, user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'school_profile', label: 'Data Sekolah', icon: Building2 },
    { id: 'students', label: 'Data Siswa', icon: Users },
    { id: 'participant_cards', label: 'Kartu Peserta Ujian', icon: CreditCard },
    { id: 'upload_exam', label: 'Upload Dokumen Soal', icon: FileSpreadsheet, highlight: true },
    { id: 'question_bank', label: 'Bank Soal', icon: BookOpen },
    { id: 'manage_exams', label: 'Ujian & Akses Siswa', icon: FileText },
    { id: 'monitoring', label: 'Monitoring Ujian', icon: Activity, badge: 'Live' },
    { id: 'results', label: 'Hasil & Analisis Nilai', icon: Award },
    { id: 'berita_acara', label: 'Berita Acara Ujian', icon: FileCheck2 },
    { id: 'reports', label: 'Laporan', icon: BarChart3 },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
    { id: 'account_security', label: 'Profil & Keamanan', icon: ShieldCheck },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id as AdminTab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-200 border-r border-slate-800 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-72'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-18 px-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold tracking-tight text-white truncate">
                  ISTAFA EXAM
                </span>
                <span className="text-xs font-medium text-blue-400 truncate uppercase tracking-wider">
                  Multi-Sekolah Pro
                </span>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* School Info Badge */}
        {!collapsed && school && (
          <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0 text-blue-400 font-bold text-xs">
              {school.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate">{school.name}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span>NPSN: {school.npsn}</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">TP {school.academicYear}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : item.highlight
                    ? 'text-blue-300 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                {!collapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Theme Mode Switcher */}
        <div className="px-3 py-2 border-t border-slate-800">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              collapsed ? 'justify-center' : 'justify-between'
            } text-slate-400 hover:text-slate-100 hover:bg-slate-800/80`}
            title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            <div className="flex items-center gap-2.5">
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
              {!collapsed && <span>{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>}
            </div>
            {!collapsed && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {isDark ? 'DARK' : 'LIGHT'}
              </span>
            )}
          </button>
        </div>

        {/* Footer User & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-slate-800/60 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-200 shrink-0">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-200 truncate">{user?.fullName}</span>
                  <span className="text-[10px] text-slate-400 truncate">@{user?.username}</span>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Keluar dari Sistem"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
