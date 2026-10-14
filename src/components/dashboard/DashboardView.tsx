import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  PlayCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Award,
  Upload,
  PlusCircle,
  FileUp,
  BarChart2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { AdminTab } from '../layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: AdminTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { school } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/api/school/dashboard');
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const stats = data?.stats || {};
  const recentExams = data?.recentExams || [];
  const recentViolations = data?.recentViolations || [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-blue-800/40">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold mb-3">
            <span>Tahun Pelajaran {school?.academicYear || '2024/2025'}</span>
            <span>•</span>
            <span>Semester {school?.semester || 'Ganjil'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Selamat Datang di {school?.name || 'ISTAFA EXAM'}
          </h2>
          <p className="text-sm text-blue-100/90 mt-2 leading-relaxed">
            Sistem evaluasi & ujian online terpadu berkeamanan tinggi dengan konversi soal otomatis dokumen Word/PDF dan monitoring anti-kecurangan real-time.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => onNavigate('upload_exam')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-102 cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              <span>Upload Dokumen Soal</span>
            </button>

            <button
              onClick={() => onNavigate('students')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Impor Data Siswa</span>
            </button>

            <button
              onClick={() => onNavigate('manage_exams')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Ujian Baru</span>
            </button>

            <button
              onClick={() => onNavigate('results')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer"
            >
              <BarChart2 className="w-4 h-4" />
              <span>Lihat Hasil Nilai</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8 Dynamic KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Siswa */}
        <div
          onClick={() => onNavigate('students')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Jumlah Siswa</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalStudents ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Siswa aktif terdaftar</p>
        </div>

        {/* Total Ujian */}
        <div
          onClick={() => onNavigate('manage_exams')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Ujian</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalExams ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Paket ujian dibuat</p>
        </div>

        {/* Ujian Sedang Berlangsung */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Sedang Berlangsung</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-pulse">
              <PlayCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.ongoingExamsCount ?? 0}</p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">Ujian berstatus Aktif</p>
        </div>

        {/* Ujian Mendatang */}
        <div
          onClick={() => onNavigate('manage_exams')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Akan Datang</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.upcomingExamsCount ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Ujian terjadwal</p>
        </div>

        {/* Siswa Sudah Selesai */}
        <div
          onClick={() => onNavigate('results')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Selesai Ujian</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completedStudentsCount ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sesi selesai dikerjakan</p>
        </div>

        {/* Sedang Mengerjakan */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Sedang Mengerjakan</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.inProgressStudentsCount ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Peserta di ruang ujian</p>
        </div>

        {/* Pelanggaran Ujian */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Pelanggaran Terdeteksi</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalViolationsCount ?? 0}</p>
          <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-medium">
            {stats.unreviewedViolationsCount || 0} belum ditinjau
          </p>
        </div>

        {/* Rata-rata Nilai */}
        <div
          onClick={() => onNavigate('results')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Rata-rata Nilai</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.averageScore ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Skala 0 - 100</p>
        </div>
      </div>

      {/* Main Grid: Recent Exams & Real-time Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exams */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Daftar Ujian Terbaru</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ujian yang sedang aktif atau baru dijadwalkan</p>
            </div>
            <button
              onClick={() => onNavigate('manage_exams')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentExams.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada ujian. Mulai dengan membuat ujian baru atau upload dokumen soal.
              </div>
            ) : (
              recentExams.map((exam: any) => {
                const isActive = exam.status === 'active';
                const isScheduled = exam.status === 'scheduled';
                return (
                  <div key={exam.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{exam.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : isScheduled
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {exam.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{exam.subject}</span>
                        <span>•</span>
                        <span>Kelas {exam.gradeClass}</span>
                        <span>•</span>
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[11px] text-slate-700 dark:text-slate-300">
                          Token: {exam.examCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onNavigate('monitoring')}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Monitor
                      </button>
                      <button
                        onClick={() => onNavigate('results')}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Hasil
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Violation & Monitoring Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Peringatan Terkini</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-800">
                Anti-Cheat
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Log deteksi tab switch, minimize, atau keluar fullscreen dari peserta ujian
            </p>

            <div className="space-y-2.5">
              {recentViolations.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 text-center text-slate-400 text-xs">
                  Tidak ada rekaman pelanggaran baru. Semua peserta tertib.
                </div>
              ) : (
                recentViolations.slice(0, 4).map((v: any) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 flex items-start gap-2.5 text-xs"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{v.studentName}</p>
                      <p className="text-[11px] text-red-600 dark:text-red-400">{v.details}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(v.timestamp).toLocaleTimeString('id-ID')} WIB
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigate('monitoring')}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Buka Ruang Monitoring Real-Time</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
