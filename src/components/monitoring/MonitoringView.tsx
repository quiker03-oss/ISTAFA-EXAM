import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Search,
  Filter,
  Volume,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { useSoundAlert } from '../../context/SoundAlertContext';
import { Exam } from '../../types';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface MonitoringViewProps {
  initialExamId?: string;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({ initialExamId }) => {
  const { soundEnabled, ttsEnabled, toggleSound, toggleTts, playAlertSound, speakAlert } = useSoundAlert();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const lastViolationsCountRef = useRef<number>(0);
  const [sessionActionModal, setSessionActionModal] = useState<{
    isOpen: boolean;
    type: 'unlock' | 'delete';
    sessionId?: string;
    studentName?: string;
  }>({ isOpen: false, type: 'unlock' });
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch available exams
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const examList = await apiRequest('/api/exams');
        setExams(examList);
        if (!selectedExamId && examList.length > 0) {
          // Default to active or first exam
          const activeExam = examList.find((e: Exam) => e.status === 'active') || examList[0];
          setSelectedExamId(activeExam.id);
        }
      } catch (err) {
        console.error('Failed to load exams for monitoring:', err);
      }
    };
    fetchExams();
  }, []);

  // Poll monitoring data
  const fetchMonitoringData = async (isManual = false) => {
    if (!selectedExamId) return;
    if (isManual) setLoading(true);

    try {
      const res = await apiRequest(`/api/exams/${selectedExamId}/monitoring`);
      setData(res);

      // Check if new violations occurred
      const newViolationsCount = res.metrics?.totalViolations || 0;
      if (newViolationsCount > lastViolationsCountRef.current && lastViolationsCountRef.current !== 0) {
        playAlertSound('critical');
        if (res.recentViolations && res.recentViolations[0]) {
          const latestV = res.recentViolations[0];
          speakAlert(`Peringatan pengawas! Peserta ${latestV.studentName} melakukan pelanggaran.`);
        }
      }
      lastViolationsCountRef.current = newViolationsCount;
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
    } finally {
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData(true);
    const interval = setInterval(() => {
      fetchMonitoringData(false);
    }, 4000); // Poll every 4 seconds

    return () => clearInterval(interval);
  }, [selectedExamId]);

  // Prompt actions
  const promptUnlockSession = (sessionId: string, studentName: string) => {
    setSessionActionModal({ isOpen: true, type: 'unlock', sessionId, studentName });
  };

  const promptDeleteSession = (sessionId: string, studentName: string) => {
    setSessionActionModal({ isOpen: true, type: 'delete', sessionId, studentName });
  };

  // Execute session action
  const executeSessionAction = async () => {
    if (!sessionActionModal.sessionId) return;
    setActionLoading(true);
    setToastMessage(null);
    try {
      if (sessionActionModal.type === 'unlock') {
        await apiRequest('/api/monitoring/reset-session', {
          method: 'POST',
          body: JSON.stringify({ sessionId: sessionActionModal.sessionId }),
        });
        setToastMessage({
          type: 'success',
          text: `Sesi ${sessionActionModal.studentName} berhasil dipulihkan & kunci dibuka.`,
        });
      } else {
        await apiRequest('/api/monitoring/delete-session', {
          method: 'POST',
          body: JSON.stringify({ sessionId: sessionActionModal.sessionId }),
        });
        setToastMessage({
          type: 'success',
          text: `Sesi ujian ${sessionActionModal.studentName} berhasil direset/dihapus total. Siswa dapat login kembali dari awal.`,
        });
      }
      setSessionActionModal({ isOpen: false, type: 'unlock' });
      await fetchMonitoringData(false);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Gagal memproses sesi ujian.' });
    } finally {
      setActionLoading(false);
    }
  };

  const metrics = data?.metrics || {};
  const participants = (data?.participants || []).filter((p: any) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(search.toLowerCase()) || p.nis.includes(search);
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'online' && p.connectionStatus === 'online') ||
      (statusFilter === 'completed' && p.sessionStatus === 'completed') ||
      (statusFilter === 'disconnected' && p.connectionStatus === 'disconnected') ||
      (statusFilter === 'violation' && p.violationsCount > 0);
    return matchesSearch && matchesStatus;
  });
  const recentViolations = data?.recentViolations || [];

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Monitoring Ujian Real-Time
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 uppercase tracking-wider">
                LIVE HEARTBEAT
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Pengawasan otomatis status koneksi, pengerjaan, dan deteksi kecurangan peserta
            </p>
          </div>
        </div>

        {/* Exam Picker & Audio Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-blue-500 outline-hidden max-w-xs"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.gradeClass}) - {ex.status.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
            title="Toggle Notifikasi Suara"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => fetchMonitoringData(true)}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Segarkan Sekarang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
            Total Terdaftar
          </span>
          <p className="text-xl font-bold text-slate-900">{metrics.totalEligible ?? 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
            Belum Mulai
          </span>
          <p className="text-xl font-bold text-slate-500">{metrics.notStartedCount ?? 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-600 block mb-1">
            Mengerjakan (Aktif)
          </span>
          <p className="text-xl font-bold text-blue-600">{metrics.inProgressCount ?? 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">
            Selesai Ujian
          </span>
          <p className="text-xl font-bold text-emerald-600">{metrics.completedCount ?? 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-600 block mb-1">
            Terputus Jaringan
          </span>
          <p className="text-xl font-bold text-amber-600">{metrics.disconnectedCount ?? 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-red-600 block mb-1">
            Total Pelanggaran
          </span>
          <p className="text-xl font-bold text-red-600">{metrics.totalViolations ?? 0}</p>
        </div>
      </div>

      {/* Main Monitoring Section: Student Grid & Violation Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Participant Live Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-base text-slate-900">Status Peserta Ujian</h3>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari siswa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-hidden w-40"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs outline-hidden"
              >
                <option value="ALL">Semua Status</option>
                <option value="online">Online (Mengerjakan)</option>
                <option value="completed">Selesai</option>
                <option value="disconnected">Terputus</option>
                <option value="violation">Ada Pelanggaran</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b">
                <tr>
                  <th className="py-3 px-3">Peserta / NIS</th>
                  <th className="py-3 px-3">Koneksi</th>
                  <th className="py-3 px-3">Progress Soal</th>
                  <th className="py-3 px-3 text-center">Pelanggaran</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tidak ada peserta yang cocok.
                    </td>
                  </tr>
                ) : (
                  participants.map((p: any, pIdx: number) => {
                    const isOnline = p.connectionStatus === 'online';
                    const isCompleted = p.sessionStatus === 'completed';
                    const isDisconnected = p.connectionStatus === 'disconnected';

                    return (
                      <tr key={p.studentId ? `part-${p.studentId}` : `part-idx-${pIdx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{p.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            NIS: {p.nis} • {p.participantCode}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          {isOnline && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              Online
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-slate-500" />
                              Selesai
                            </span>
                          )}
                          {isDisconnected && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <WifiOff className="w-3 h-3 text-amber-600" />
                              Terputus
                            </span>
                          )}
                          {!isOnline && !isCompleted && !isDisconnected && (
                            <span className="text-slate-400 text-[11px]">Belum Masuk</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full transition-all"
                                style={{
                                  width: `${
                                    p.totalQuestions > 0
                                      ? Math.round((p.answeredCount / p.totalQuestions) * 100)
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="font-semibold text-slate-800 text-[11px]">
                              {p.answeredCount}/{p.totalQuestions}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {p.violationsCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px] border border-red-200">
                              {p.violationsCount}x
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">0</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {p.sessionId && (
                            <button
                              onClick={() => handleResetSession(p.sessionId, p.fullName)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-[11px] font-semibold inline-flex items-center gap-1"
                              title="Izinkan kembali jika terkunci"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Buka Kunci</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Real-time Anti-Cheat Violation Event Stream */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm text-slate-900">Deteksi Pelanggaran Real-Time</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-bold border border-red-200">
                Anti-Cheat Stream
              </span>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {recentViolations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada log pelanggaran. Semua siswa mengikuti ujian dengan tertib.
                </div>
              ) : (
                recentViolations.map((v: any, vIdx: number) => (
                  <div
                    key={v.id ? `v-${v.id}` : `v-idx-${vIdx}-${v.timestamp}`}
                    className="p-3 rounded-xl bg-red-50/70 border border-red-100 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate">{v.studentName}</span>
                      <span className="text-[10px] text-red-600 font-mono">
                        {new Date(v.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                    <p className="text-[11px] text-red-700">{v.details}</p>
                    <p className="text-[10px] text-slate-400">{v.gradeClass}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 italic">
              Sistem memantau event visibilityChange, blur, dan fullscreenChange dari peramban siswa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
