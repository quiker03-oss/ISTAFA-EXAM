import React, { useState, useEffect } from 'react';
import {
  FileText,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Activity,
  Award,
  FileCheck2,
  Trash2,
  Edit2,
  Plus,
  Search,
  KeyRound,
  ExternalLink,
  Users,
  QrCode as QrCodeIcon,
  Share2,
  Copy,
  Printer,
  Download,
  RotateCcw,
  ShieldAlert,
  Power,
  X,
  Check,
  Send,
  AlertCircle,
  Info,
  BookOpen,
  Filter,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { Exam, Student, QuestionItem } from '../../types';
import { AdminTab } from '../layout/Sidebar';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface ExamsViewProps {
  onNavigate: (tab: AdminTab, examId?: string) => void;
  onOpenExamMonitoring: (examId: string) => void;
  onOpenExamResults: (examId: string) => void;
  onOpenBeritaAcara: (examId: string) => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  onNavigate,
  onOpenExamMonitoring,
  onOpenExamResults,
  onOpenBeritaAcara,
}) => {
  const { school } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [bankQuestions, setBankQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedLinkExamId, setCopiedLinkExamId] = useState<string | null>(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [shareModalExam, setShareModalExam] = useState<Exam | null>(null);
  const [shareQrDataUrl, setShareQrDataUrl] = useState<string>('');
  const [participantsModalExam, setParticipantsModalExam] = useState<Exam | null>(null);
  const [participantsData, setParticipantsData] = useState<any>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantFilterStatus, setParticipantFilterStatus] = useState('ALL');

  // Form State for Create / Edit Exam
  const [formData, setFormData] = useState({
    title: '',
    subject: 'Matematika',
    gradeClass: '',
    allowedClasses: [] as string[],
    allowedStudentIds: [] as string[],
    startTime: '',
    endTime: '',
    durationMinutes: 90,
    lateToleranceMinutes: 15,
    examCode: '',
    kkm: 75,
    maxScore: 100,
    shuffleQuestions: true,
    shuffleOptions: true,
    showScoreToStudent: true,
    status: 'scheduled' as 'draft' | 'scheduled' | 'active' | 'finished',
    tokenActive: true,
    questionSource: 'bank' as 'bank' | 'blank',
  });

  // Filter state for student recommendation in create exam modal
  const [studentSearchInForm, setStudentSearchInForm] = useState('');
  const [activeClassTabInForm, setActiveClassTabInForm] = useState<string>('ALL');

  // Delete & Action Modal States
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; exam?: Exam }>({ isOpen: false });
  const [regenTokenModal, setRegenTokenModal] = useState<{ isOpen: boolean; examId?: string; examTitle?: string }>({ isOpen: false });
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/exams');
      setExams(data);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsAndQuestions = async () => {
    try {
      const [studData, qData] = await Promise.all([
        apiRequest('/api/students').catch(() => []),
        apiRequest('/api/questions').catch(() => []),
      ]);
      setStudents(studData);
      setBankQuestions(qData);
    } catch (e) {
      console.error('Error fetching students or bank questions:', e);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchStudentsAndQuestions();
  }, []);

  // Distinct classes from student records
  const availableClasses = Array.from(new Set(students.map((s) => s.gradeClass))).filter(Boolean);

  // Generate Unique Exam Code Helper
  const generateRandomToken = (subject: string = 'EXM') => {
    const prefix = (subject.replace(/[^a-zA-Z]/g, '').substring(0, 3) || 'EXM').toUpperCase();
    const chars = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${chars}`;
  };

  // Open Create Exam Modal
  const handleOpenCreateModal = () => {
    setEditingExam(null);
    const now = new Date();
    const today8am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0);
    const today4pm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0);

    const defaultClass = availableClasses[0] || 'X IPA 1';

    // Auto-recommend active students of first available class
    const initialEligible = students.filter((s) => s.gradeClass === defaultClass && s.status === 'active');

    setFormData({
      title: 'Ujian Penilaian Tengah Semester',
      subject: 'Matematika',
      gradeClass: defaultClass,
      allowedClasses: [defaultClass],
      allowedStudentIds: initialEligible.map((s) => s.id),
      startTime: today8am.toISOString().slice(0, 16),
      endTime: today4pm.toISOString().slice(0, 16),
      durationMinutes: 90,
      lateToleranceMinutes: 15,
      examCode: generateRandomToken('MTK'),
      kkm: 75,
      maxScore: 100,
      shuffleQuestions: true,
      shuffleOptions: true,
      showScoreToStudent: true,
      status: 'scheduled',
      tokenActive: true,
      questionSource: 'bank',
    });
    setStudentSearchInForm('');
    setActiveClassTabInForm('ALL');
    setIsFormModalOpen(true);
  };

  // Open Edit Exam Modal
  const handleOpenEditModal = (exam: Exam) => {
    setEditingExam(exam);
    const initialClasses = exam.allowedClasses && exam.allowedClasses.length > 0 ? exam.allowedClasses : [exam.gradeClass];
    setFormData({
      title: exam.title,
      subject: exam.subject,
      gradeClass: exam.gradeClass,
      allowedClasses: initialClasses,
      allowedStudentIds: exam.allowedStudentIds || [],
      startTime: exam.startTime ? new Date(exam.startTime).toISOString().slice(0, 16) : '',
      endTime: exam.endTime ? new Date(exam.endTime).toISOString().slice(0, 16) : '',
      durationMinutes: exam.durationMinutes || 90,
      lateToleranceMinutes: exam.lateToleranceMinutes || 15,
      examCode: exam.examCode,
      kkm: exam.kkm || 75,
      maxScore: exam.maxScore || 100,
      shuffleQuestions: exam.shuffleQuestions !== false,
      shuffleOptions: exam.shuffleOptions !== false,
      showScoreToStudent: exam.showScoreToStudent !== false,
      status: exam.status,
      tokenActive: exam.tokenActive !== false,
      questionSource: 'bank',
    });
    setStudentSearchInForm('');
    setActiveClassTabInForm('ALL');
    setIsFormModalOpen(true);
  };

  // Toggle Class selection in Create/Edit Form
  const handleToggleClassSelection = (cls: string) => {
    const isSelected = formData.allowedClasses.includes(cls);
    let updatedClasses: string[];

    if (isSelected) {
      updatedClasses = formData.allowedClasses.filter((c) => c !== cls);
      // Remove students that belong ONLY to this unselected class
      const remainingStudents = students.filter(
        (s) => updatedClasses.includes(s.gradeClass) && formData.allowedStudentIds.includes(s.id)
      );
      setFormData((prev) => ({
        ...prev,
        allowedClasses: updatedClasses,
        gradeClass: updatedClasses[0] || '',
        allowedStudentIds: remainingStudents.map((s) => s.id),
      }));
    } else {
      updatedClasses = [...formData.allowedClasses, cls];
      // Auto-recommend active students of newly selected class
      const newlyAddedStudents = students.filter((s) => s.gradeClass === cls && s.status === 'active');
      const mergedIds = Array.from(new Set([...formData.allowedStudentIds, ...newlyAddedStudents.map((s) => s.id)]));
      setFormData((prev) => ({
        ...prev,
        allowedClasses: updatedClasses,
        gradeClass: updatedClasses[0] || cls,
        allowedStudentIds: mergedIds,
      }));
    }
  };

  // Toggle single student participant
  const handleToggleStudentSelection = (studentId: string) => {
    setFormData((prev) => {
      const exists = prev.allowedStudentIds.includes(studentId);
      const updated = exists
        ? prev.allowedStudentIds.filter((id) => id !== studentId)
        : [...prev.allowedStudentIds, studentId];
      return { ...prev, allowedStudentIds: updated };
    });
  };

  // Select all or deselect all recommended students
  const handleSelectAllClassStudents = (select: boolean) => {
    const eligibleStudents = students.filter(
      (s) => formData.allowedClasses.includes(s.gradeClass) && s.status === 'active'
    );
    setFormData((prev) => ({
      ...prev,
      allowedStudentIds: select ? eligibleStudents.map((s) => s.id) : [],
    }));
  };

  // Save Exam Form (Create or Update)
  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.subject || formData.allowedClasses.length === 0) {
      alert('Harap lengkapi judul ujian, mata pelajaran, dan pilih minimal 1 kelas peserta.');
      return;
    }

    try {
      // Questions to attach
      let questionsPayload: QuestionItem[] = editingExam?.questions || [];
      if (questionsPayload.length === 0 && formData.questionSource === 'bank') {
        // Grab questions matching subject or fallback to all available
        const matchingBank = bankQuestions.filter(
          (q) => q.subject.toLowerCase() === formData.subject.toLowerCase()
        );
        questionsPayload = matchingBank.length > 0 ? matchingBank : bankQuestions.slice(0, 15);
      }

      const payload = {
        ...formData,
        gradeClass: formData.allowedClasses[0] || formData.gradeClass,
        questions: questionsPayload,
      };

      if (editingExam) {
        await apiRequest(`/api/exams/${editingExam.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        alert('Data ujian berhasil diperbarui.');
      } else {
        await apiRequest('/api/exams', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        alert('Ujian baru berhasil dibuat dan disimpan.');
      }

      setIsFormModalOpen(false);
      await fetchExams();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan ujian.');
    }
  };

  // Toggle Exam Status (Aktifkan / Tutup)
  const handleToggleStatus = async (exam: Exam, newStatus: string) => {
    try {
      await apiRequest(`/api/exams/${exam.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchExams();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status ujian.');
    }
  };

  // Prompt Regenerate Token
  const promptRegenerateToken = (exam: Exam) => {
    setRegenTokenModal({ isOpen: true, examId: exam.id, examTitle: exam.title });
  };

  const executeRegenerateToken = async () => {
    if (!regenTokenModal.examId) return;
    setActionLoading(true);
    try {
      const res = await apiRequest(`/api/exams/${regenTokenModal.examId}/regenerate-token`, { method: 'POST' });
      setToastMessage({ type: 'success', text: `Token ujian berhasil diperbarui: ${res.examCode}` });
      await fetchExams();
      if (shareModalExam?.id === regenTokenModal.examId) {
        handleOpenShareModal(res.exam);
      }
      setRegenTokenModal({ isOpen: false });
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Gagal meregenerasi token.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Token / Link Active status
  const handleToggleTokenActive = async (examId: string, currentActive: boolean) => {
    try {
      const res = await apiRequest(`/api/exams/${examId}/toggle-token`, {
        method: 'POST',
        body: JSON.stringify({ active: !currentActive }),
      });
      await fetchExams();
      if (shareModalExam?.id === examId) {
        setShareModalExam(res.exam);
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Gagal mengubah status token.' });
    }
  };

  // Prompt Delete Exam
  const promptDeleteExam = (exam: Exam) => {
    setDeleteModal({ isOpen: true, exam });
  };

  // Execute Delete Exam
  const executeDeleteExam = async () => {
    if (!deleteModal.exam) return;
    setActionLoading(true);
    try {
      await apiRequest(`/api/exams/${deleteModal.exam.id}`, { method: 'DELETE' });
      setToastMessage({
        type: 'success',
        text: `Paket ujian "${deleteModal.exam.title}" berhasil dihapus.`,
      });
      setDeleteModal({ isOpen: false });
      await fetchExams();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Gagal menghapus ujian.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Share Link & QR Code Modal
  const handleOpenShareModal = async (exam: Exam) => {
    setShareModalExam(exam);
    const examUrl = `${window.location.origin}/?examId=${exam.id}&token=${exam.examCode}&portal=student`;
    try {
      const qrData = await QRCode.toDataURL(examUrl, {
        width: 360,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setShareQrDataUrl(qrData);
    } catch (e) {
      console.error('Failed to generate QR code:', e);
    }
  };

  // Copy Exam Link
  const handleCopyExamLink = (exam: Exam) => {
    const examUrl = `${window.location.origin}/?examId=${exam.id}&token=${exam.examCode}&portal=student`;
    navigator.clipboard.writeText(examUrl);
    setCopiedLinkExamId(exam.id);
    setTimeout(() => setCopiedLinkExamId(null), 2500);
  };

  // Share to WhatsApp
  const handleShareToWhatsApp = (exam: Exam) => {
    const examUrl = `${window.location.origin}/?examId=${exam.id}&token=${exam.examCode}&portal=student`;
    const message = `*PEMBERITAHUAN UJIAN ONLINE RESMI*\n` +
      `Sekolah: ${school?.name || 'ISTAFA EXAM'}\n` +
      `Ujian: ${exam.title}\n` +
      `Mata Pelajaran: ${exam.subject}\n` +
      `Kelas: ${exam.allowedClasses?.join(', ') || exam.gradeClass}\n` +
      `Durasi: ${exam.durationMinutes} Menit\n\n` +
      `*KODE TOKEN UJIAN:* ${exam.examCode}\n\n` +
      `Silakan buka tautan berikut melalui peramban ponsel atau laptop Anda:\n` +
      `${examUrl}\n\n` +
      `_Harap kerjakan dengan jujur dan tepat waktu._`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Download QR Code PNG
  const handleDownloadQrCode = (exam: Exam) => {
    if (!shareQrDataUrl) return;
    const a = document.createElement('a');
    a.href = shareQrDataUrl;
    a.download = `QR_Ujian_${exam.examCode}_${exam.subject}.png`;
    a.click();
  };

  // Print QR Code Flyer
  const handlePrintQrCode = (exam: Exam) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const examUrl = `${window.location.origin}/?examId=${exam.id}&token=${exam.examCode}&portal=student`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak QR Code Ujian - ${exam.title}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; color: #0f172a; }
            .kop { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 24px; gap: 16px; }
            .kop-logo { width: 70px; height: 70px; object-contain: contain; }
            .kop-text { flex: 1; text-align: center; font-family: serif; }
            .kop-text h2 { margin: 0; font-size: 18px; text-transform: uppercase; font-weight: 900; }
            .kop-text p { margin: 3px 0 0; font-size: 11px; color: #475569; font-family: sans-serif; }
            .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 12px; margin-bottom: 12px; }
            .title { font-size: 22px; font-weight: 800; margin: 8px 0; }
            .details { font-size: 14px; color: #334155; margin-bottom: 20px; }
            .qr-box { margin: 20px auto; border: 2px dashed #cbd5e1; padding: 16px; display: inline-block; border-radius: 16px; }
            .qr-box img { width: 260px; height: 260px; display: block; }
            .token-box { margin: 16px auto; background: #f8fafc; border: 2px solid #0284c7; padding: 12px 24px; border-radius: 12px; display: inline-block; }
            .token-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .token-code { font-size: 28px; font-family: monospace; font-weight: 900; color: #0369a1; letter-spacing: 2px; }
            .instruction { max-width: 500px; margin: 24px auto; text-align: left; font-size: 12px; color: #475569; line-height: 1.6; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="kop">
            ${school?.regionalLogoUrl ? `<img src="${school.regionalLogoUrl}" class="kop-logo" alt="Logo Daerah" />` : school?.logoUrl ? `<img src="${school.logoUrl}" class="kop-logo" alt="Logo Sekolah" />` : '<div style="width:70px"></div>'}
            <div class="kop-text">
              ${school?.letterheadText ? `<div style="font-weight:bold;font-size:13px;white-space:pre-line;">${school.letterheadText}</div>` : `<h2>${school?.name || 'SEKOLAH NEGERI'}</h2>`}
              <p>${school?.address || 'Indonesia'} • Tahun Ajaran ${exam.academicYear || school?.academicYear || '2024/2025'}</p>
            </div>
            ${school?.regionalLogoUrl && school?.logoUrl ? `<img src="${school.logoUrl}" class="kop-logo" alt="Logo Sekolah" />` : '<div style="width:70px"></div>'}
          </div>

          <div class="badge">KARTU AKSES PESERTA UJIAN ONLINE</div>
          <div class="title">${exam.title}</div>
          <div class="details">
            Mata Pelajaran: <strong>${exam.subject}</strong> | Kelas: <strong>${exam.allowedClasses?.join(', ') || exam.gradeClass}</strong> | Durasi: <strong>${exam.durationMinutes} Menit</strong>
          </div>

          <div class="qr-box">
            <img src="${shareQrDataUrl}" alt="QR Code Ujian" />
          </div>

          <div class="token-box">
            <div class="token-title">KODE TOKEN UJIAN</div>
            <div class="token-code">${exam.examCode}</div>
          </div>

          <div class="instruction">
            <strong>Petunjuk Siswa:</strong>
            <ol style="margin: 8px 0 0; padding-left: 20px;">
              <li>Pindai QR Code di atas menggunakan kamera ponsel atau peramban Anda.</li>
              <li>Masukkan Kode Token: <strong>${exam.examCode}</strong>.</li>
              <li>Pilih kelas dan nama Anda yang terdaftar pada daftar peserta ujian.</li>
              <li>Selesaikan ujian dalam mode Layar Penuh (Fullscreen).</li>
            </ol>
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Open Participants List Modal
  const handleOpenParticipantsModal = async (exam: Exam) => {
    setParticipantsModalExam(exam);
    setParticipantsLoading(true);
    setParticipantSearch('');
    setParticipantFilterStatus('ALL');
    try {
      const data = await apiRequest(`/api/exams/${exam.id}/participants-status`);
      setParticipantsData(data);
    } catch (err: any) {
      alert(err.message || 'Gagal memuat daftar peserta ujian.');
    } finally {
      setParticipantsLoading(false);
    }
  };

  // Filtered Exams in main list
  const filteredExams = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.subject.toLowerCase().includes(search.toLowerCase()) ||
      e.examCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium border shadow-xs animate-in fade-in duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Bar Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Ujian & Akses Siswa</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 uppercase">
              Akses Terkendali
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Kelola paket ujian, token unik, tautan siswa, QR Code, dan izin rombel peserta
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari judul, mapel, token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-blue-500 outline-hidden w-56"
            />
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all hover:scale-102 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Ujian Baru</span>
          </button>

          <button
            onClick={() => onNavigate('upload_exam')}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Konversi soal Word/PDF otomatis"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="hidden md:inline">Upload DOCX/PDF</span>
          </button>
        </div>
      </div>

      {/* Warning banner if school has 0 students */}
      {students.length === 0 && !loading && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Data Siswa Belum Tersedia di Sekolah Anda</p>
              <p className="text-[11px] text-amber-700">
                Siswa tidak dapat memilih identitas ujian sebelum data siswa diimpor atau ditambahkan.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('students')}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            Ke Menu Data Siswa &rarr;
          </button>
        </div>
      )}

      {/* Exam Cards Grid */}
      <div className="space-y-4">
        {filteredExams.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-medium">Tidak ada paket ujian yang cocok.</p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Ujian Baru Sekarang</span>
            </button>
          </div>
        ) : (
          filteredExams.map((exam, exIdx) => {
            const isActive = exam.status === 'active';
            const isScheduled = exam.status === 'scheduled';
            const isFinished = exam.status === 'finished';
            const isTokenActive = exam.tokenActive !== false;
            const assignedCount = exam.allowedStudentIds?.length || 'Semua Siswa';

            return (
              <div
                key={exam.id ? `exam-${exam.id}` : `exam-idx-${exIdx}`}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all hover:border-slate-300 ${
                  isActive ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200/80'
                }`}
              >
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 truncate">{exam.title}</h3>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                          : isScheduled
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : isFinished
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isActive ? 'Aktif' : isScheduled ? 'Terjadwal' : isFinished ? 'Selesai' : 'Draf'}
                    </span>

                    {/* Token Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        isTokenActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      <span>{isTokenActive ? 'Link Aktif' : 'Link Nonaktif'}</span>
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{exam.subject}</span>
                    <span>•</span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                      Kelas {exam.allowedClasses?.join(', ') || exam.gradeClass}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {exam.durationMinutes} Menit
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-700">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {assignedCount} Peserta
                    </span>
                    <span>•</span>
                    <span>{exam.questions?.length || 0} Soal</span>
                  </div>

                  {/* Token & Schedule Badges */}
                  <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-mono font-bold">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      <span>TOKEN: {exam.examCode}</span>
                      <button
                        onClick={() => handleCopyExamLink(exam)}
                        className="text-blue-600 hover:text-blue-800 ml-1 p-0.5 rounded"
                        title="Salin Link Siswa Lengkap dengan Token"
                      >
                        {copiedLinkExamId === exam.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(exam.startTime).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {new Date(exam.endTime).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* All Functional Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {/* 1 & 10. Status Toggle: Aktifkan / Tutup Ujian */}
                  {isActive ? (
                    <button
                      onClick={() => handleToggleStatus(exam, 'finished')}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="10. Tutup Ujian"
                    >
                      <PauseCircle className="w-4 h-4 text-slate-500" />
                      <span>Tutup Ujian</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus(exam, 'active')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors cursor-pointer"
                      title="2. Aktifkan Ujian"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Aktifkan Ujian</span>
                    </button>
                  )}

                  {/* 3, 4, 5. Bagikan Link & QR Code Modal */}
                  <button
                    onClick={() => handleOpenShareModal(exam)}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Bagikan Tautan, WhatsApp, dan QR Code Siswa"
                  >
                    <QrCodeIcon className="w-4 h-4 text-blue-600" />
                    <span>Akses Siswa & QR</span>
                  </button>

                  {/* 3. Salin Link Ujian Langsung */}
                  <button
                    onClick={() => handleCopyExamLink(exam)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                    title="3. Salin Link Ujian Siswa"
                  >
                    {copiedLinkExamId === exam.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  {/* 8. Lihat Peserta */}
                  <button
                    onClick={() => handleOpenParticipantsModal(exam)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="8. Lihat Peserta Ujian"
                  >
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>Lihat Peserta</span>
                  </button>

                  {/* 9. Pantau Ujian (Monitoring) */}
                  <button
                    onClick={() => onOpenExamMonitoring(exam.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="9. Ruang Pengawasan Live"
                  >
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Pantau Ujian</span>
                  </button>

                  {/* Hasil Nilai */}
                  <button
                    onClick={() => onOpenExamResults(exam.id)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                    title="Hasil & Analisis Nilai"
                  >
                    <Award className="w-4 h-4 text-slate-500" />
                  </button>

                  {/* Berita Acara */}
                  <button
                    onClick={() => onOpenBeritaAcara(exam.id)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                    title="Berita Acara Resmi Ujian"
                  >
                    <FileCheck2 className="w-4 h-4 text-slate-500" />
                  </button>

                  {/* Edit Exam */}
                  <button
                    onClick={() => handleOpenEditModal(exam)}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Edit Pengaturan Ujian"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete Exam */}
                  <button
                    onClick={() => promptDeleteExam(exam)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Hapus Ujian"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =========================================
          MODAL 1: CREATE / EDIT EXAM FORM
         ========================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {editingExam ? 'Edit Pengaturan Ujian' : 'Buat Jadwal Ujian Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Tentukan judul, kelas rombel, peserta rekomendasi otomatis, dan jadwal pengerjaan
                </p>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-5">
              {/* Row 1: Title & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Judul Ujian *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Penilaian Akhir Semester Ganjil"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mata Pelajaran *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Contoh: Matematika, Bahasa Indonesia"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Class Selection & Automatic Student Recommendation */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pilih Kelas Peserta (Bisa Lebih Dari Satu) *
                  </label>
                  <span className="text-[11px] text-blue-600 font-semibold">
                    {formData.allowedClasses.length} Kelas Dipilih
                  </span>
                </div>

                {availableClasses.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                    Belum ada data siswa terdaftar. Silakan tambahkan data siswa di menu Data Siswa.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableClasses.map((cls) => {
                      const isSelected = formData.allowedClasses.includes(cls);
                      return (
                        <button
                          key={`class-select-${cls}`}
                          type="button"
                          onClick={() => handleToggleClassSelection(cls)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>Kelas {cls}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Automatic Student Recommendation Section */}
                {formData.allowedClasses.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800">
                          Rekomendasi Peserta Ujian:
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Sistem otomatis merekomendasikan siswa aktif pada kelas terpilih ({formData.allowedStudentIds.length} dipilih).
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAllClassStudents(true)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectAllClassStudents(false)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 text-[11px] font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Batal Semua
                        </button>
                      </div>
                    </div>

                    {/* Filter & Search */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={studentSearchInForm}
                          onChange={(e) => setStudentSearchInForm(e.target.value)}
                          placeholder="Cari nama siswa / NIS..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                        />
                      </div>

                      {formData.allowedClasses.length > 1 && (
                        <select
                          value={activeClassTabInForm}
                          onChange={(e) => setActiveClassTabInForm(e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-hidden"
                        >
                          <option value="ALL">Semua Kelas Terpilih</option>
                          {formData.allowedClasses.map((c) => (
                            <option key={`tab-${c}`} value={c}>
                              Kelas {c}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Recommended Student List with Checkboxes */}
                    {(() => {
                      const eligible = students.filter((s) => {
                        const inChosenClasses = formData.allowedClasses.includes(s.gradeClass);
                        const inActiveTab =
                          activeClassTabInForm === 'ALL' || s.gradeClass === activeClassTabInForm;
                        const matchSearch =
                          !studentSearchInForm ||
                          s.fullName.toLowerCase().includes(studentSearchInForm.toLowerCase()) ||
                          s.nis.includes(studentSearchInForm);
                        return inChosenClasses && inActiveTab && matchSearch && s.status === 'active';
                      });

                      if (eligible.length === 0) {
                        return (
                          <div className="py-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                            Tidak ada siswa yang cocok di kelas ini.
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-white border border-slate-200 rounded-xl">
                          {eligible.map((s) => {
                            const isChecked = formData.allowedStudentIds.includes(s.id);
                            return (
                              <label
                                key={`rec-student-${s.id}`}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-blue-50/70 border-blue-300 text-blue-950'
                                    : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleStudentSelection(s.id)}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold truncate leading-tight">{s.fullName}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    NIS: {s.nis} • {s.gradeClass}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Row 3: Schedule & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Waktu Mulai *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Waktu Selesai *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Durasi (Menit) *
                  </label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    min={10}
                    max={360}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Row 4: Token Ujian & Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                      Kode Token Ujian *
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, examCode: generateRandomToken(formData.subject) })}
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Acak Token</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.examCode}
                    onChange={(e) => setFormData({ ...formData, examCode: e.target.value.toUpperCase() })}
                    placeholder="Contoh: MTK-8X2K"
                    className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-sm font-mono font-bold text-blue-700 uppercase tracking-wider outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                    Status Akses Siswa
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={formData.tokenActive}
                      onChange={(e) => setFormData({ ...formData, tokenActive: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Tautan & Token Ujian Aktif (Dapat Dikerjakan Siswa)
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingExam ? 'Simpan Perubahan' : 'Terbitkan Ujian Sekarang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 2: BAGIKAN LINK & QR CODE UJIAN
         ========================================= */}
      {shareModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-6 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="text-left">
                <h3 className="font-bold text-base text-slate-900">Akses Ujian & QR Code Siswa</h3>
                <p className="text-xs text-slate-500">{shareModalExam.title}</p>
              </div>
              <button
                onClick={() => setShareModalExam(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Token Badge */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                KODE TOKEN UJIAN SISWA
              </span>
              <p className="text-2xl font-mono font-black text-blue-600 tracking-wider">
                {shareModalExam.examCode}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    shareModalExam.tokenActive !== false
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {shareModalExam.tokenActive !== false ? 'Link Aktif' : 'Link Dinonaktifkan'}
                </span>
                <span>•</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Kelas {shareModalExam.allowedClasses?.join(', ') || shareModalExam.gradeClass}
                </span>
              </div>
            </div>

            {/* QR Code Preview */}
            <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl inline-block shadow-xs">
              {shareQrDataUrl ? (
                <img
                  src={shareQrDataUrl}
                  alt="QR Code Siswa"
                  className="w-56 h-56 object-contain mx-auto"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                  Membuat QR Code...
                </div>
              )}
            </div>

            {/* Link Text Box */}
            <div className="flex items-center gap-2 p-2 bg-slate-100 border border-slate-200 rounded-xl text-left">
              <span className="text-[11px] font-mono text-slate-700 truncate flex-1 px-1">
                {`${window.location.origin}/?examId=${shareModalExam.id}&token=${shareModalExam.examCode}&portal=student`}
              </span>
              <button
                onClick={() => handleCopyExamLink(shareModalExam)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedLinkExamId === shareModalExam.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>

            {/* Share & Print Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              {/* WhatsApp */}
              <button
                onClick={() => handleShareToWhatsApp(shareModalExam)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim WhatsApp</span>
              </button>

              {/* Unduh QR Code */}
              <button
                onClick={() => handleDownloadQrCode(shareModalExam)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Unduh QR</span>
              </button>

              {/* Cetak QR Code */}
              <button
                onClick={() => handlePrintQrCode(shareModalExam)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Cetak Lembar</span>
              </button>
            </div>

            {/* Token Management (Regenerate / Deactivate) */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
              <button
                onClick={() => promptRegenerateToken(shareModalExam)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerasi Token Baru</span>
              </button>

              <button
                onClick={() =>
                  handleToggleTokenActive(shareModalExam.id, shareModalExam.tokenActive !== false)
                }
                className={`text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  shareModalExam.tokenActive !== false
                    ? 'text-red-600 hover:underline'
                    : 'text-emerald-600 hover:underline'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>
                  {shareModalExam.tokenActive !== false ? 'Nonaktifkan Link' : 'Aktifkan Link'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 3: LIHAT PESERTA UJIAN (STATUS LIVE)
         ========================================= */}
      {participantsModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Daftar Peserta Ujian: {participantsModalExam.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Mata Pelajaran: {participantsModalExam.subject} • TOKEN: {participantsModalExam.examCode}
                </p>
              </div>
              <button
                onClick={() => setParticipantsModalExam(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {participantsLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Memuat status peserta ujian...</p>
              </div>
            ) : participantsData ? (
              <div className="space-y-5">
                {/* Metrics Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Ditugaskan</span>
                    <span className="text-xl font-bold text-slate-900">{participantsData.summary.totalAssigned}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Belum Masuk</span>
                    <span className="text-xl font-bold text-slate-600">{participantsData.summary.notStartedCount}</span>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-blue-700 block">Sedang Mengerjakan</span>
                    <span className="text-xl font-bold text-blue-700">{participantsData.summary.inProgressCount}</span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Selesai Ujian</span>
                    <span className="text-xl font-bold text-emerald-700">{participantsData.summary.completedCount}</span>
                  </div>

                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-red-700 block">Pelanggaran</span>
                    <span className="text-xl font-bold text-red-700">{participantsData.summary.violationsCount}</span>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      placeholder="Cari nama peserta atau NIS..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs text-slate-800 outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={participantFilterStatus}
                    onChange={(e) => setParticipantFilterStatus(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs text-slate-800 outline-hidden"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="not_started">Belum Masuk</option>
                    <option value="in_progress">Sedang Mengerjakan</option>
                    <option value="completed">Selesai</option>
                  </select>
                </div>

                {/* Participants Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-500 border-b">
                      <tr>
                        <th className="py-3 px-3">Peserta & NIS</th>
                        <th className="py-3 px-3">Kelas</th>
                        <th className="py-3 px-3">Status Sesi</th>
                        <th className="py-3 px-3 text-center">Soal Terjawab</th>
                        <th className="py-3 px-3 text-center">Pelanggaran</th>
                        <th className="py-3 px-3 text-center">Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const filtered = (participantsData.participants || []).filter((p: any) => {
                          const matchSearch =
                            !participantSearch ||
                            p.fullName.toLowerCase().includes(participantSearch.toLowerCase()) ||
                            p.nis.includes(participantSearch);
                          const matchStatus =
                            participantFilterStatus === 'ALL' || p.sessionStatus === participantFilterStatus;
                          return matchSearch && matchStatus;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                                Tidak ada data peserta yang cocok.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((p: any) => (
                          <tr key={`p-row-${p.id}`} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-900">{p.fullName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                NIS: {p.nis} • {p.participantCode}
                              </p>
                            </td>

                            <td className="py-2.5 px-3 font-semibold text-slate-700">
                              {p.gradeClass}
                            </td>

                            <td className="py-2.5 px-3">
                              {p.sessionStatus === 'completed' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Selesai
                                </span>
                              ) : p.sessionStatus === 'in_progress' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  {p.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                                  Sedang Mengerjakan
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                                  Belum Masuk
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center font-bold">
                              {p.answeredCount} / {p.totalQuestions}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              {p.totalViolations > 0 ? (
                                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                  {p.totalViolations} Kali
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                              {p.finalScore !== null ? p.finalScore : '-'}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => onOpenExamMonitoring(participantsModalExam.id)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Activity className="w-4 h-4" />
                <span>Buka Ruang Monitoring Pengawas &rarr;</span>
              </button>

              <button
                onClick={() => setParticipantsModalExam(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Paket Ujian */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        onConfirm={executeDeleteExam}
        isLoading={actionLoading}
        title="Hapus Paket Ujian"
        message="Apakah Anda yakin ingin menghapus paket ujian ini? Seluruh data soal dalam paket, jadwal akses, dan sesi pengerjaan siswa pada ujian ini akan terhapus."
        itemName={deleteModal.exam ? `${deleteModal.exam.title} (Kode: ${deleteModal.exam.examCode} - Kelas: ${deleteModal.exam.gradeClass})` : undefined}
        confirmText="Ya, Hapus Ujian"
      />

      {/* Modal Konfirmasi Regenerasi Token */}
      <ConfirmDeleteModal
        isOpen={regenTokenModal.isOpen}
        onClose={() => setRegenTokenModal({ isOpen: false })}
        onConfirm={executeRegenerateToken}
        isLoading={actionLoading}
        dangerLevel="warning"
        title="Regenerasi Token Ujian Baru"
        message="Token ujian saat ini akan segera kadaluarsa dan diganti dengan token 6 digit baru. Siswa yang belum mulai harus menggunakan token baru."
        itemName={regenTokenModal.examTitle}
        confirmText="Ya, Regenerasi Token"
      />
    </div>
  );
};
