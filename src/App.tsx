import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SoundAlertProvider } from './context/SoundAlertContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar, AdminTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SchoolLogin } from './components/auth/SchoolLogin';
import { SuperAdminModal } from './components/auth/SuperAdminModal';
import { RegisterSchoolModal } from './components/auth/RegisterSchoolModal';
import { SuperAdminDashboard } from './components/super-admin/SuperAdminDashboard';
import { DashboardView } from './components/dashboard/DashboardView';
import { SchoolProfileView } from './components/school-profile/SchoolProfileView';
import { StudentsView } from './components/students/StudentsView';
import { ParticipantCardsView } from './components/cards/ParticipantCardsView';
import { UploadExamView } from './components/upload-exam/UploadExamView';
import { QuestionBankView } from './components/bank-questions/QuestionBankView';
import { ExamsView } from './components/exams/ExamsView';
import { MonitoringView } from './components/monitoring/MonitoringView';
import { ResultsView } from './components/results/ResultsView';
import { BeritaAcaraView } from './components/berita-acara/BeritaAcaraView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { AccountSecurityView } from './components/account/AccountSecurityView';
import { StudentPortal } from './components/student-portal/StudentPortal';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Deep-link exam ID parameter
  const [activeExamId, setActiveExamId] = useState<string | undefined>(undefined);

  // Student Portal Mode
  const [showStudentPortal, setShowStudentPortal] = useState(false);

  // Public Modals
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [isRegisterSchoolModalOpen, setIsRegisterSchoolModalOpen] = useState(false);

  // Check URL query parameters for student portal QR scans e.g. `?portal=student` or `?verify=...`
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal') === 'student' || params.get('verify') || params.get('token')) {
      setShowStudentPortal(true);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Memuat ISTAFA EXAM...</p>
      </div>
    );
  }

  // 1. Direct Student Exam Portal
  if (showStudentPortal) {
    const params = new URLSearchParams(window.location.search);
    const initialNis = params.get('nis') || '';
    const initialToken = params.get('token') || '';

    return (
      <StudentPortal
        onBackToHome={() => setShowStudentPortal(false)}
        initialNis={initialNis}
        initialToken={initialToken}
      />
    );
  }

  // 2. Unauthenticated: Public Front Page (School Admin Login)
  if (!isAuthenticated) {
    return (
      <>
        <SchoolLogin
          onOpenSuperAdmin={() => setIsSuperAdminModalOpen(true)}
          onOpenRegisterSchool={() => setIsRegisterSchoolModalOpen(true)}
        />

        <SuperAdminModal
          isOpen={isSuperAdminModalOpen}
          onClose={() => setIsSuperAdminModalOpen(false)}
          onSuccess={() => {}}
        />

        <RegisterSchoolModal
          isOpen={isRegisterSchoolModalOpen}
          onClose={() => setIsRegisterSchoolModalOpen(false)}
        />
      </>
    );
  }

  // 3. Super Admin ISTAFA Dashboard
  if (user?.role === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  // 4. Authenticated School Admin Dashboard & Management System
  const getTabTitle = (tab: AdminTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard Utama';
      case 'school_profile':
        return 'Identitas & Profil Sekolah';
      case 'students':
        return 'Data Siswa & Rombel';
      case 'participant_cards':
        return 'Kartu Peserta Ujian Resmi';
      case 'upload_exam':
        return 'Konversi Dokumen Soal (DOCX/PDF)';
      case 'question_bank':
        return 'Bank Soal Sekolah';
      case 'manage_exams':
        return 'Ujian & Akses Siswa';
      case 'monitoring':
        return 'Ruang Pengawasan Ujian Real-Time';
      case 'results':
        return 'Hasil & Analisis Nilai Ujian';
      case 'berita_acara':
        return 'Berita Acara Resmi Ujian';
      case 'reports':
        return 'Laporan & Arsip Evaluasi';
      case 'settings':
        return 'Pengaturan Sistem Ujian';
      case 'account_security':
        return 'Profil & Keamanan Akun';
      default:
        return 'ISTAFA EXAM';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setActiveExamId(undefined);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          title={getTabTitle(currentTab)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'dashboard' && <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />}
          {currentTab === 'school_profile' && <SchoolProfileView />}
          {currentTab === 'students' && <StudentsView />}
          {currentTab === 'participant_cards' && <ParticipantCardsView />}
          {currentTab === 'upload_exam' && (
            <UploadExamView onNavigate={(tab) => setCurrentTab(tab)} />
          )}
          {currentTab === 'question_bank' && <QuestionBankView />}
          {currentTab === 'manage_exams' && (
            <ExamsView
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenExamMonitoring={(examId) => {
                setActiveExamId(examId);
                setCurrentTab('monitoring');
              }}
              onOpenExamResults={(examId) => {
                setActiveExamId(examId);
                setCurrentTab('results');
              }}
              onOpenBeritaAcara={(examId) => {
                setActiveExamId(examId);
                setCurrentTab('berita_acara');
              }}
            />
          )}
          {currentTab === 'monitoring' && <MonitoringView initialExamId={activeExamId} />}
          {currentTab === 'results' && <ResultsView initialExamId={activeExamId} />}
          {currentTab === 'berita_acara' && <BeritaAcaraView initialExamId={activeExamId} />}
          {currentTab === 'reports' && <ReportsView />}
          {currentTab === 'settings' && <SettingsView />}
          {currentTab === 'account_security' && <AccountSecurityView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SoundAlertProvider>
          <AppContent />
        </SoundAlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
