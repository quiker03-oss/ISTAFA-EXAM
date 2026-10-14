import React from 'react';
import { Menu, Volume2, VolumeX, ShieldAlert, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSoundAlert } from '../../context/SoundAlertContext';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  title,
}) => {
  const { school, user } = useAuth();
  const { soundEnabled, ttsEnabled, toggleSound, toggleTts } = useSoundAlert();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-18 px-4 lg:px-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors cursor-pointer"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{school?.name || 'ISTAFA EXAM Platform'}</span>
            {school?.academicYear && (
              <>
                <span>•</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  TP {school.academicYear} ({school.semester})
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden xl:inline text-slate-200">Terang</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="hidden xl:inline text-slate-700">Gelap</span>
            </>
          )}
        </button>

        {/* Audio Alerts Toggle */}
        <button
          onClick={toggleSound}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            soundEnabled
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title={soundEnabled ? 'Suara Peringatan Aktif' : 'Suara Peringatan Senyap'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden md:inline">{soundEnabled ? 'Audio On' : 'Audio Off'}</span>
        </button>

        {/* TTS Toggle */}
        <button
          onClick={toggleTts}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            ttsEnabled
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title={ttsEnabled ? 'Suara Pengawas Bicara (TTS) Aktif' : 'TTS Nonaktif'}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{ttsEnabled ? 'Suara Bicara' : 'Bicara Mati'}</span>
        </button>

        {/* Account Info Pill */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
            {user?.fullName?.charAt(0) || 'A'}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">{user?.fullName}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-1">Admin Sekolah</span>
          </div>
        </div>
      </div>
    </header>
  );
};
