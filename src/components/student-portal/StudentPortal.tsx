import React, { useState, useEffect, useRef } from 'react';
import {
  School,
  Lock,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Maximize,
  HelpCircle,
  Sparkles,
  Wifi,
  Send,
  Flag,
  RotateCcw,
  X,
  Search,
  User,
  KeyRound,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';

interface StudentPortalProps {
  onBackToHome?: () => void;
  initialNis?: string;
  initialToken?: string;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  onBackToHome,
  initialNis = '',
  initialToken = '',
}) => {
  const { isDark, toggleTheme } = useTheme();
  // Public exam header info from link / QR
  const [examPublicInfo, setExamPublicInfo] = useState<any>(null);
  const [publicInfoLoading, setPublicInfoLoading] = useState(false);

  // Step 1: Token verification state
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Step 2: Identity selection states (only available after token verification)
  const [tokenData, setTokenData] = useState<any>(null);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Portal Stage: 'token_input' -> 'select_identity' -> 'rules' -> 'exam' -> 'finished'
  const [stage, setStage] = useState<'token_input' | 'select_identity' | 'rules' | 'exam' | 'finished'>('token_input');

  // Active exam state
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [examInfo, setExamInfo] = useState<any>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Anti-cheat warning modal state
  const [violationWarning, setViolationWarning] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);

  // Finish confirmation modal
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finishResult, setFinishResult] = useState<any>(null);

  // Fetch Public Exam Info on initial load (if link has examId or token)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qExamId = params.get('examId') || '';
    const qToken = params.get('token') || initialToken || '';

    if (qToken && !tokenInput) {
      setTokenInput(qToken);
    }

    if (qExamId || qToken) {
      setPublicInfoLoading(true);
      apiRequest(`/api/student-exam/public-info?examId=${encodeURIComponent(qExamId)}&token=${encodeURIComponent(qToken)}`)
        .then((info) => {
          setExamPublicInfo(info);
        })
        .catch((err) => {
          console.warn('Could not load public exam info:', err);
        })
        .finally(() => {
          setPublicInfoLoading(false);
        });
    }
  }, []);

  // STEP 1: Verify Exam Token (Backend Rate-Limited)
  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    if (!tokenInput.trim()) {
      setVerifyError('Harap masukkan Kode Token Ujian yang diberikan Pengawas.');
      return;
    }

    setVerifying(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const qExamId = params.get('examId') || examPublicInfo?.examId || '';

      const res = await apiRequest('/api/student-exam/validate-token', {
        method: 'POST',
        body: JSON.stringify({
          examId: qExamId || undefined,
          examCode: tokenInput.trim().toUpperCase(),
        }),
      });

      setTokenData(res);
      setAvailableClasses(res.classes || []);
      setParticipants(res.participants || []);

      // If initial NIS is provided, check if matching student exists
      if (initialNis) {
        const found = res.participants.find((p: any) => p.nis === initialNis);
        if (found) {
          setSelectedClass(found.gradeClass);
          setSelectedStudent(found);
          setStage('rules');
          return;
        }
      }

      if (res.classes && res.classes.length === 1) {
        setSelectedClass(res.classes[0]);
      }

      setStage('select_identity');
    } catch (err: any) {
      setVerifyError(err.message || 'Verifikasi token gagal. Periksa kembali token Anda.');
    } finally {
      setVerifying(false);
    }
  };

  // STEP 2: Proceed from Student Selection to Rules Confirmation
  const handleConfirmStudent = (student: any) => {
    if (student.isCompleted) {
      alert('Siswa ini sudah menyelesaikan ujian dan tidak diizinkan masuk kembali.');
      return;
    }
    setSelectedStudent(student);
    setStage('rules');
  };

  // STEP 3: Start Exam Session (Full Screen Request & Server Session Initialization)
  const handleStartExam = async () => {
    if (!selectedStudent || !tokenData) return;
    try {
      // Request fullscreen if supported
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }

      const res = await apiRequest('/api/student-exam/start', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudent.id,
          examId: tokenData.exam.id,
          examCode: tokenInput.trim().toUpperCase(),
        }),
      });

      setSession(res.session);
      setQuestions(res.questions);
      setExamInfo(res.exam);
      setAnswers(res.session.answers || {});

      // Calculate timer from server deadline
      const deadline = new Date(res.session.serverDeadline).getTime();
      const now = Date.now();
      const secs = Math.max(0, Math.floor((deadline - now) / 1000));
      setRemainingSeconds(secs);

      setStage('exam');
    } catch (err: any) {
      alert(err.message || 'Gagal memulai sesi ujian.');
    }
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (stage !== 'exam') return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage]);

  // Periodic heartbeat every 20 seconds to keep connection alive
  useEffect(() => {
    if (stage !== 'exam' || !session?.id) return;

    const heartbeatInterval = setInterval(async () => {
      try {
        const res = await apiRequest(`/api/student-exam/session/${session.id}`);
        if (res.status === 'completed' || res.status === 'timed_out') {
          handleAutoSubmitTimeOut();
        }
      } catch (e) {}
    }, 20000);

    return () => clearInterval(heartbeatInterval);
  }, [stage, session]);

  // Anti-Cheat Detection: visibilitychange, blur, fullscreenchange
  useEffect(() => {
    if (stage !== 'exam' || !session?.id) return;

    const recordViolation = async (type: string, details: string) => {
      try {
        const res = await apiRequest('/api/student-exam/violation', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: session.id,
            type,
            details,
          }),
        });
        setViolationCount(res.violationCount || 1);
        setViolationWarning(
          `Peringatan Pelanggaran #${res.violationCount}: Anda terdeteksi ${details}. Aktivitas ini telah dicatat dan dilaporkan kepada Pengawas Ujian!`
        );
      } catch (e) {}
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('tab_switch', 'berpindah tab atau meminimalkan layar peramban');
      }
    };

    const handleWindowBlur = () => {
      recordViolation('window_blur', 'kehilangan fokus layar ujian');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation('fullscreen_exit', 'keluar dari mode layar penuh (fullscreen)');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [stage, session]);

  // Auto-Save Answer
  const handleSelectOption = async (optionKey: string) => {
    if (!questions[currentQIndex]) return;
    const qId = questions[currentQIndex].id;

    const updatedAnswers = {
      ...answers,
      [qId]: {
        ...answers[qId],
        questionId: qId,
        selectedOption: optionKey,
        markedForReview: answers[qId]?.markedForReview || false,
      },
    };
    setAnswers(updatedAnswers);
    setSaveStatus('saving');

    try {
      await apiRequest('/api/student-exam/save-answer', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: session.id,
          questionId: qId,
          selectedOption: optionKey,
          markedForReview: answers[qId]?.markedForReview || false,
        }),
      });
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
    }
  };

  const handleUpdateEssay = async (text: string) => {
    if (!questions[currentQIndex]) return;
    const qId = questions[currentQIndex].id;

    const updatedAnswers = {
      ...answers,
      [qId]: {
        ...answers[qId],
        questionId: qId,
        essayAnswer: text,
        markedForReview: answers[qId]?.markedForReview || false,
      },
    };
    setAnswers(updatedAnswers);
    setSaveStatus('saving');

    try {
      await apiRequest('/api/student-exam/save-answer', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: session.id,
          questionId: qId,
          essayAnswer: text,
          markedForReview: answers[qId]?.markedForReview || false,
        }),
      });
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
    }
  };

  const handleToggleReview = async () => {
    if (!questions[currentQIndex]) return;
    const qId = questions[currentQIndex].id;
    const currentReview = answers[qId]?.markedForReview || false;

    const updatedAnswers = {
      ...answers,
      [qId]: {
        ...answers[qId],
        questionId: qId,
        markedForReview: !currentReview,
      },
    };
    setAnswers(updatedAnswers);

    try {
      await apiRequest('/api/student-exam/save-answer', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: session.id,
          questionId: qId,
          selectedOption: answers[qId]?.selectedOption,
          essayAnswer: answers[qId]?.essayAnswer,
          markedForReview: !currentReview,
        }),
      });
    } catch (e) {}
  };

  // Submit Exam
  const handleFinishExam = async () => {
    setSubmitting(true);
    try {
      const res = await apiRequest('/api/student-exam/finish', {
        method: 'POST',
        body: JSON.stringify({ sessionId: session.id }),
      });
      setFinishResult(res);
      setIsFinishModalOpen(false);
      setStage('finished');
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengirimkan ujian.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmitTimeOut = async () => {
    if (!session?.id) return;
    try {
      const res = await apiRequest('/api/student-exam/finish', {
        method: 'POST',
        body: JSON.stringify({ sessionId: session.id }),
      });
      setFinishResult(res);
      setStage('finished');
    } catch (e) {}
  };

  // Format seconds to HH:MM:SS
  const formatTimer = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentQIndex];
  const currentAns = currentQ ? answers[currentQ.id] : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col select-none">
      {/* =========================================
          STAGE 1: TOKEN INPUT & EXAM INFO
         ========================================= */}
      {stage === 'token_input' && (
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-6">
          <div className="w-full max-w-lg mx-auto flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-600/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">ISTAFA EXAM</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
                title={isDark ? 'Mode Terang' : 'Mode Gelap'}
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
              </button>

              {onBackToHome && (
                <button
                  onClick={onBackToHome}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Halaman Utama
                </button>
              )}
            </div>
          </div>

          <div className="w-full max-w-lg mx-auto my-auto bg-slate-950 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* School & Exam Header */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                {examPublicInfo?.school?.regionalLogoUrl && (
                  <img
                    src={examPublicInfo.school.regionalLogoUrl}
                    alt="Logo Daerah"
                    className="w-13 h-13 object-contain rounded-xl border border-slate-800 bg-slate-900 p-1 shadow-md"
                  />
                )}
                {examPublicInfo?.school?.logoUrl ? (
                  <img
                    src={examPublicInfo.school.logoUrl}
                    alt="Logo Sekolah"
                    className="w-13 h-13 object-contain rounded-xl border border-slate-800 bg-slate-900 p-1 shadow-md"
                  />
                ) : !examPublicInfo?.school?.regionalLogoUrl ? (
                  <div className="w-13 h-13 rounded-2xl bg-blue-600/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-inner">
                    <School className="w-6 h-6" />
                  </div>
                ) : null}
              </div>

              <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                {examPublicInfo?.school?.name || 'PORTAL RESMI UJIAN SISWA'}
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {examPublicInfo?.title || 'Akses Ujian Berbasis Komputer (CBT)'}
              </h2>
              {examPublicInfo?.subject && (
                <p className="text-xs text-slate-300 font-medium">
                  Mata Pelajaran: <span className="text-blue-400 font-bold">{examPublicInfo.subject}</span>
                  {examPublicInfo.durationMinutes && (
                    <span> • Durasi: {examPublicInfo.durationMinutes} Menit</span>
                  )}
                </p>
              )}
            </div>

            {/* Error Message */}
            {verifyError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Token Form */}
            <form onSubmit={handleVerifyToken} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Kode Token Ujian *
                  </label>
                  <span className="text-[10px] text-slate-400">Diberikan oleh Pengawas / Proktor</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="Contoh: MTK-8X2K"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-base font-mono font-bold text-blue-400 uppercase tracking-wider focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden transition-all"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {verifying ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verifikasi Token & Pilih Peserta</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* General Instructions Box */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300 block">Petunjuk Akses Peserta:</span>
              <ul className="list-disc pl-4 space-y-1">
                <li>Pastikan Anda mendapatkan tautan resmi dan token dari Admin Sekolah.</li>
                <li>Setelah token valid, Anda akan memilih kelas dan nama Anda yang terdaftar sebagai peserta ujian.</li>
                <li>Jika token Anda tidak aktif atau kadaluwarsa, silakan lapor kepada pengawas ruang.</li>
              </ul>
            </div>
          </div>

          <div className="text-center text-xs text-slate-600 py-3">
            &copy; {new Date().getFullYear()} ISTAFA EXAM — Platform Ujian Daring Terpadu
          </div>
        </div>
      )}

      {/* =========================================
          STAGE 2: CLASS & STUDENT IDENTITY SELECTION
         ========================================= */}
      {stage === 'select_identity' && tokenData && (
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-6">
          <div className="w-full max-w-2xl mx-auto flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white block">ISTAFA EXAM</span>
                <span className="text-[10px] text-slate-400">{tokenData.school?.name}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setStage('token_input');
                setSelectedStudent(null);
              }}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ganti Token</span>
            </button>
          </div>

          <div className="w-full max-w-2xl mx-auto my-auto bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Token Terverifikasi
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold text-blue-400">
                    {tokenInput}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{tokenData.exam?.title}</h3>
                <p className="text-xs text-slate-400">
                  Mata Pelajaran: <span className="text-slate-200 font-semibold">{tokenData.exam?.subject}</span> • Durasi: {tokenData.exam?.durationMinutes} Menit
                </p>
              </div>
            </div>

            {/* Step A: Select Class */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                1. Pilih Kelas Peserta Ujian:
              </label>

              {availableClasses.length === 0 ? (
                <p className="text-xs text-amber-400 italic">
                  Tidak ada kelas peserta yang terdaftar untuk ujian ini.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableClasses.map((cls) => {
                    const isSelected = selectedClass === cls;
                    return (
                      <button
                        key={`cls-btn-${cls}`}
                        type="button"
                        onClick={() => {
                          setSelectedClass(cls);
                          setSelectedStudent(null);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500 scale-102'
                            : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        Kelas {cls}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step B: Select Student from Roster */}
            {selectedClass && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    2. Pilih Nama Anda dari Daftar Peserta ({selectedClass}):
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Hanya menampilkan peserta yang terdaftar pada ujian ini
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="Ketik nama lengkap atau NIS Anda..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-blue-500 outline-hidden"
                  />
                </div>

                {/* Student list */}
                {(() => {
                  const filtered = participants.filter((p: any) => {
                    const matchClass = p.gradeClass === selectedClass;
                    const matchSearch =
                      !searchStudent ||
                      p.fullName.toLowerCase().includes(searchStudent.toLowerCase()) ||
                      p.nis.includes(searchStudent);
                    return matchClass && matchSearch;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center bg-slate-900/60 border border-slate-850 rounded-2xl text-xs text-slate-400">
                        Tidak ada peserta yang cocok dengan pencarian di kelas ini.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                      {filtered.map((student: any) => {
                        const isChosen = selectedStudent?.id === student.id;
                        const isDone = student.isCompleted;
                        const inProg = student.isInProgress;

                        return (
                          <button
                            key={`stud-${student.id}`}
                            type="button"
                            disabled={isDone}
                            onClick={() => !isDone && setSelectedStudent(student)}
                            className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                              isDone
                                ? 'bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed'
                                : isChosen
                                ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50 shadow-md shadow-blue-500/10'
                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isChosen
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {student.fullName.charAt(0)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-white truncate leading-tight">
                                {student.fullName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                NIS: {student.nis} • {student.participantCode}
                              </p>

                              <div className="mt-1 flex items-center gap-1.5">
                                {isDone && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                                    Sudah Selesai
                                  </span>
                                )}
                                {inProg && !isDone && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                                    Sedang Mengerjakan
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Next Step Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={!selectedStudent || selectedStudent?.isCompleted}
                onClick={() => handleConfirmStudent(selectedStudent)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <span>
                  {selectedStudent
                    ? `Lanjutkan sebagai ${selectedStudent.fullName}`
                    : 'Pilih Nama Anda untuk Melanjutkan'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-600 py-3">
            &copy; {new Date().getFullYear()} ISTAFA EXAM — Ujian Daring Terpadu
          </div>
        </div>
      )}

      {/* =========================================
          STAGE 3: VERIFICATION SUCCESS & EXAM RULES
         ========================================= */}
      {stage === 'rules' && selectedStudent && tokenData && (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xl shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Identitas Peserta Terverifikasi
                </span>
                <h3 className="text-lg font-bold text-white truncate">{selectedStudent.fullName}</h3>
                <p className="text-xs text-slate-400">
                  NIS: <span className="font-mono text-slate-200 font-bold">{selectedStudent.nis}</span> • Kelas: {selectedStudent.gradeClass} • No. Peserta: {selectedStudent.participantCode}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStage('select_identity')}
                className="px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white shrink-0 hover:bg-slate-900 transition-colors"
                title="Ganti Pilihan Siswa"
              >
                Ganti
              </button>
            </div>

            {/* Exam Information Box */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Sekolah:</span>
                <span className="font-bold text-white">{tokenData.school?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mata Pelajaran:</span>
                <span className="font-bold text-white">{tokenData.exam?.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paket Ujian:</span>
                <span className="font-bold text-white">{tokenData.exam?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jumlah Soal:</span>
                <span className="font-bold text-white">{tokenData.exam?.totalQuestions} Soal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Durasi Pengerjaan:</span>
                <span className="font-bold text-white">{tokenData.exam?.durationMinutes} Menit</span>
              </div>
            </div>

            {/* Code of Conduct / Rules */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                Tata Tertib & Peringatan Keamanan Ujian:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed text-amber-200/80">
                <li>Ujian wajib dikerjakan dalam mode Layar Penuh (Fullscreen).</li>
                <li>Dilarang berpindah tab peramban, meminimalkan jendela, atau membuka aplikasi lain.</li>
                <li>Setiap perpindahan jendela dicatat otomatis dan dilaporkan secara real-time ke Pengawas.</li>
                <li>Jawaban tersimpan otomatis secara berkala setiap kali Anda memilih opsi.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStage('select_identity')}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Pilih Siswa Lain
              </button>
              <button
                type="button"
                onClick={handleStartExam}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                <Maximize className="w-4 h-4" />
                <span>Mulai Kerjakan Ujian Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          STAGE 3: ACTIVE EXAM SCREEN
         ========================================= */}
      {stage === 'exam' && currentQ && (
        <div className="flex-1 flex flex-col bg-slate-950 text-slate-100">
          {/* Top Exam Header */}
          <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                {currentQ.number || currentQIndex + 1}
              </span>
              <div>
                <p className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                  {examInfo?.title}
                </p>
                <p className="text-[10px] text-slate-400">
                  {selectedStudent?.fullName} ({selectedStudent?.nis}) • Kelas {selectedStudent?.gradeClass}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-save Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                {saveStatus === 'saved' ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Tersimpan
                  </span>
                ) : saveStatus === 'saving' ? (
                  <span className="text-blue-400 animate-pulse">Menyinkronkan...</span>
                ) : (
                  <span className="text-red-400">Gagal Simpan (Mencoba ulang)</span>
                )}
              </div>

              {/* Countdown Timer synced with server deadline */}
              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-mono font-bold text-xs ${
                  remainingSeconds < 300
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                    : 'bg-slate-800 text-blue-400 border-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(remainingSeconds)}</span>
              </div>
            </div>
          </header>

          {/* Main Content: Question Body + Navigation Grid */}
          <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Question Workspace (Col 1-3) */}
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div>
                {/* Question Info Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 text-xs">
                  <span className="font-bold text-blue-400 uppercase tracking-wider">
                    Soal Nomor {currentQIndex + 1} dari {questions.length}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-semibold">
                    Bobot: {currentQ.scoreWeight} Poin
                  </span>
                </div>

                {/* Question Text */}
                <div className="text-sm sm:text-base text-slate-100 font-normal leading-relaxed mb-6">
                  {currentQ.text}
                </div>

                {/* Question Images if available */}
                {currentQ.images && currentQ.images.length > 0 && (
                  <div className="mb-6 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <img
                      src={currentQ.images[0]}
                      alt="Gambar Soal"
                      className="max-h-72 rounded-xl object-contain mx-auto"
                    />
                  </div>
                )}

                {/* Multiple Choice Options */}
                {currentQ.type === 'multiple_choice' ? (
                  <div className="space-y-3">
                    {currentQ.options.map((opt: any, optIdx: number) => {
                      const isSelected = currentAns?.selectedOption === opt.key;
                      return (
                        <button
                          key={`portal-opt-${opt.key || ''}-${optIdx}`}
                          onClick={() => handleSelectOption(opt.key)}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="text-xs sm:text-sm pt-0.5 leading-relaxed">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Essay Answer Area */
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      Tuliskan Jawaban Uraian Anda:
                    </label>
                    <textarea
                      rows={6}
                      value={currentAns?.essayAnswer || ''}
                      onChange={(e) => handleUpdateEssay(e.target.value)}
                      placeholder="Ketik jawaban esai secara lengkap di sini..."
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 outline-hidden leading-relaxed"
                    />
                  </div>
                )}
              </div>

              {/* Bottom Nav Controls */}
              <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-2 disabled:opacity-40"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                {/* Ragu-ragu (Mark for review) */}
                <button
                  onClick={handleToggleReview}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                    currentAns?.markedForReview
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Flag className="w-4 h-4" />
                  <span>{currentAns?.markedForReview ? 'Ditandai Ragu' : 'Ragu-ragu'}</span>
                </button>

                {currentQIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQIndex((prev) => prev + 1)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-blue-600/30"
                  >
                    <span>Selanjutnya</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsFinishModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/30"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Selesai Ujian</span>
                  </button>
                )}
              </div>
            </div>

            {/* Question Navigation Palette (Col 4) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800">
                  Daftar Nomor Soal
                </h4>

                <div className="grid grid-cols-5 gap-2 pt-3 max-h-80 overflow-y-auto">
                  {questions.map((q, idx) => {
                    const ans = answers[q.id];
                    const isAnswered = ans && (ans.selectedOption || ans.essayAnswer);
                    const isReview = ans?.markedForReview;
                    const isCurrent = currentQIndex === idx;

                    return (
                      <button
                        key={q.id ? `q-nav-${q.id}` : `q-nav-idx-${idx}`}
                        onClick={() => setCurrentQIndex(idx)}
                        className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                          isCurrent
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                            : ''
                        } ${
                          isReview
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : isAnswered
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Palette Legend */}
              <div className="pt-3 border-t border-slate-800 text-[10px] space-y-1.5 text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-blue-600" />
                  <span>Sudah Terjawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-amber-500" />
                  <span>Ragu-ragu</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-slate-800" />
                  <span>Belum Terjawab</span>
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => setIsFinishModalOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kirimkan Jawaban</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          VIOLATION WARNING POPUP MODAL
         ========================================= */}
      {violationWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-950 border-2 border-red-500 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-red-400">Peringatan Integritas Ujian!</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{violationWarning}</p>

            <button
              onClick={() => {
                setViolationWarning(null);
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-600/30 cursor-pointer"
            >
              Saya Mengerti & Kembali ke Ujian
            </button>
          </div>
        </div>
      )}

      {/* =========================================
          CONFIRM FINISH MODAL
         ========================================= */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Konfirmasi Pengumpulan Jawaban</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menyelesaikan ujian ini? Pastikan seluruh soal telah diperiksa dengan seksama. Setelah dikirim, jawaban tidak dapat diubah kembali.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between">
              <span className="text-slate-400">Terjawab:</span>
              <span className="font-bold text-emerald-400">
                {Object.values(answers).filter((a: any) => a.selectedOption || a.essayAnswer).length}{' '}
                dari {questions.length} Soal
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Lanjutkan Mengerjakan
              </button>

              <button
                onClick={handleFinishExam}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Mengirimkan...' : 'Ya, Selesaikan Ujian'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          STAGE 4: FINISHED / COMPLETION CERTIFICATE
         ========================================= */}
      {stage === 'finished' && (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Ujian Berhasil Diselesaikan!</h2>
              <p className="text-xs text-slate-400 mt-1">
                Seluruh jawaban Anda telah tersimpan secara permanen pada sistem ISTAFA EXAM.
              </p>
            </div>

            {finishResult?.showScore && finishResult?.score !== undefined && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400">Nilai Sementara:</span>
                <p className="text-3xl font-black text-blue-400 mt-1">{finishResult.score}</p>
                <p className="text-[10px] text-slate-500 mt-1">Skala 0 - 100</p>
              </div>
            )}

            <div className="text-xs text-slate-500 pt-2">
              <p>Terima kasih telah mengikuti evaluasi dengan jujur dan tertib.</p>
              <p className="mt-1">Anda sekarang dapat menutup halaman ini.</p>
            </div>

            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="px-6 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Kembali ke Beranda
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
