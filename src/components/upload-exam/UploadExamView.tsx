import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Save,
  Send,
  HelpCircle,
  Check,
  X,
  Layers,
  Settings2,
  MoveRight,
  RefreshCw,
  FileSearch,
  AlertCircle,
  FolderOpen,
  ArrowDownUp,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { QuestionItem } from '../../types';
import { AdminTab } from '../layout/Sidebar';

interface UploadExamViewProps {
  onNavigate: (tab: AdminTab) => void;
}

export const UploadExamView: React.FC<UploadExamViewProps> = ({ onNavigate }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expectedCount, setExpectedCount] = useState<string>('15');
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<'upload' | 'analyzing' | 'review' | 'publish'>('upload');
  const [reviewTab, setReviewTab] = useState<'editor' | 'rawText' | 'allImages'>('editor');

  // Parse result state
  const [parsedData, setParsedData] = useState<{
    fileName: string;
    fileUrl: string;
    questions: any[];
    validationSummary: any;
    rawTextPreview?: string;
    allImages?: string[];
    isScannedPdf?: boolean;
  } | null>(null);

  // Editable questions list
  const [questions, setQuestions] = useState<any[]>([]);

  // Publish Form State
  const [publishForm, setPublishForm] = useState({
    title: '',
    subject: 'Matematika Peminatan',
    gradeClass: 'X IPA 1',
    durationMinutes: 90,
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
    examCode: `EX-${Math.floor(1000 + Math.random() * 9000)}`,
    kkm: 75,
    shuffleQuestions: true,
    shuffleOptions: true,
    lateToleranceMinutes: 15,
  });

  const [savingAction, setSavingAction] = useState(false);
  const [teacherConsent, setTeacherConsent] = useState(false);

  // File drop/selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Start conversion pipeline
  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    setStage('analyzing');
    setProcessing(true);

    const formData = new FormData();
    formData.append('docFile', selectedFile);
    if (expectedCount) {
      formData.append('expectedCount', expectedCount);
    }

    try {
      const result = await apiRequest('/api/questions/upload-doc', {
        method: 'POST',
        body: formData,
      });

      setParsedData(result);
      setQuestions(result.questions || []);
      setPublishForm((prev) => ({
        ...prev,
        title: `Ujian ${selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')}`,
      }));
      setProcessing(false);
      setStage('review');
    } catch (err: any) {
      alert(err.message || 'Gagal memproses dokumen.');
      setProcessing(false);
      setStage('upload');
    }
  };

  // Trigger live re-validation
  const triggerRevalidation = async (updatedQuestions: any[]) => {
    try {
      const res = await apiRequest('/api/questions/validate', {
        method: 'POST',
        body: JSON.stringify({
          questions: updatedQuestions,
          expectedCount: expectedCount ? parseInt(expectedCount, 10) : undefined,
        }),
      });
      if (res.validationSummary && parsedData) {
        setParsedData({
          ...parsedData,
          validationSummary: res.validationSummary,
        });
      }
    } catch (e) {}
  };

  // Question editing handlers
  const handleUpdateQuestion = (index: number, updatedFields: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updatedFields };
    setQuestions(updated);
    triggerRevalidation(updated);
  };

  const handleToggleQuestionType = (index: number) => {
    const updated = [...questions];
    const current = updated[index];
    const newType = current.type === 'multiple_choice' ? 'essay' : 'multiple_choice';

    // If switching to multiple choice and has no options, add initial A-D
    let newOptions = current.options;
    if (newType === 'multiple_choice' && (!newOptions || newOptions.length === 0)) {
      newOptions = [
        { key: 'A', text: 'Pilihan Jawaban A' },
        { key: 'B', text: 'Pilihan Jawaban B' },
        { key: 'C', text: 'Pilihan Jawaban C' },
        { key: 'D', text: 'Pilihan Jawaban D' },
      ];
    }

    updated[index] = {
      ...current,
      type: newType,
      options: newOptions,
      scoreWeight: newType === 'essay' ? 5 : 2,
      correctAnswer: newType === 'essay' ? '' : current.correctAnswer || 'A',
    };
    setQuestions(updated);
    triggerRevalidation(updated);
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, newText: string) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx].text = newText;
    setQuestions(updated);
  };

  const handleAddOptionToQuestion = (qIdx: number) => {
    const updated = [...questions];
    const q = updated[qIdx];
    const existingKeys = (q.options || []).map((o: any) => o.key);
    const availableKeys: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let nextKey = availableKeys.find((k) => !existingKeys.includes(k));
    if (!nextKey) {
      nextKey = String.fromCharCode(65 + (q.options?.length || 0));
    }

    if (!q.options) q.options = [];
    q.options.push({ key: nextKey, text: `Pilihan Jawaban ${nextKey}` });
    q.options.sort((a: any, b: any) => (a.key || '').localeCompare(b.key || ''));
    setQuestions(updated);
    triggerRevalidation(updated);
  };

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options.splice(optIdx, 1);
    setQuestions(updated);
    triggerRevalidation(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    triggerRevalidation(updated);
  };

  const handleAddQuestion = () => {
    const newQ = {
      number: questions.length + 1,
      type: 'multiple_choice',
      text: 'Pertanyaan baru:',
      options: [
        { key: 'A', text: 'Pilihan Jawaban A' },
        { key: 'B', text: 'Pilihan Jawaban B' },
        { key: 'C', text: 'Pilihan Jawaban C' },
        { key: 'D', text: 'Pilihan Jawaban D' },
      ],
      correctAnswer: 'A',
      images: [],
      tables: [],
      scoreWeight: 2,
      explanation: '',
      extractionStatus: 'valid',
    };
    const updated = [...questions, newQ];
    setQuestions(updated);
    triggerRevalidation(updated);
  };

  // Image Assignment Handlers
  const handleMoveImage = (fromQIdx: number, imgIdx: number, targetQIdx: number) => {
    const updated = [...questions];
    if (fromQIdx < 0 || fromQIdx >= updated.length) return;
    if (targetQIdx < 0 || targetQIdx >= updated.length) return;
    const imgUrl = updated[fromQIdx].images[imgIdx];
    updated[fromQIdx].images.splice(imgIdx, 1);

    const targetQ = updated[targetQIdx];
    if (targetQ) {
      if (!targetQ.images) targetQ.images = [];
      targetQ.images.push(imgUrl);
    }
    setQuestions(updated);
  };

  const handleRemoveImageFromQuestion = (qIdx: number, imgIdx: number) => {
    const updated = [...questions];
    updated[qIdx].images.splice(imgIdx, 1);
    setQuestions(updated);
  };

  const handleUploadNewImageToQuestion = async (qIdx: number, file: File) => {
    const formData = new FormData();
    formData.append('imageFile', file);
    try {
      const res = await apiRequest('/api/questions/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (res.imageUrl) {
        const updated = [...questions];
        if (!updated[qIdx].images) updated[qIdx].images = [];
        updated[qIdx].images.push(res.imageUrl);
        setQuestions(updated);
      }
    } catch (e: any) {
      alert(e.message || 'Gagal mengunggah gambar.');
    }
  };

  // Save to Question Bank only
  const handleSaveToBank = async () => {
    setSavingAction(true);
    try {
      await apiRequest('/api/bank-questions/batch', {
        method: 'POST',
        body: JSON.stringify({
          questions,
          subject: publishForm.subject,
          gradeClass: publishForm.gradeClass,
        }),
      });
      alert(`Berhasil menyimpan ${questions.length} butir soal ke Bank Soal permanen.`);
      onNavigate('question_bank');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan ke Bank Soal.');
    } finally {
      setSavingAction(false);
    }
  };

  // Directly Publish Exam
  const handlePublishExam = async () => {
    setSavingAction(true);
    try {
      // 1. Save to Bank Soal
      await apiRequest('/api/bank-questions/batch', {
        method: 'POST',
        body: JSON.stringify({
          questions,
          subject: publishForm.subject,
          gradeClass: publishForm.gradeClass,
        }),
      });

      // 2. Create and Publish Exam
      await apiRequest('/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          ...publishForm,
          status: 'active',
          questions,
        }),
      });

      alert(`Ujian "${publishForm.title}" berhasil diterbitkan dan siap dikerjakan oleh siswa!`);
      onNavigate('manage_exams');
    } catch (err: any) {
      alert(err.message || 'Gagal menerbitkan ujian.');
    } finally {
      setSavingAction(false);
    }
  };

  const valSummary = parsedData?.validationSummary;
  const hasWarnings = valSummary?.warnings && valSummary.warnings.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Modul Konversi & Validasi Naskah Soal
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 uppercase">
              Presisi Tinggi
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Membaca seluruh soal DOCX, PDF, dan Gambar secara presisi. Gambar tertanam dipetakan ke nomor yang tepat tanpa tertinggal.
          </p>
        </div>

        {stage === 'review' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStage('upload')}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
            >
              Upload Ulang
            </button>
            <button
              onClick={handleSaveToBank}
              disabled={savingAction}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Draf Bank Soal</span>
            </button>
            <button
              onClick={() => setStage('publish')}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all hover:scale-102"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Jadikan & Terbitkan Ujian</span>
            </button>
          </div>
        )}
      </div>

      {/* STAGE 1: Upload Dropzone & Configuration */}
      {stage === 'upload' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-500 p-8 sm:p-12 text-center transition-all">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Pilih Dokumen Naskah Soal Ujian
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Mendukung Microsoft Word (.docx, .doc), PDF digital & scan OCR, serta file gambar (JPG/PNG).
            </p>

            {/* Expected Count Setting for Automated Validation */}
            <div className="max-w-xs mx-auto mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs">
              <label className="block font-semibold text-slate-700 mb-1">
                Perkiraan Jumlah Soal pada Dokumen:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={expectedCount}
                  onChange={(e) => setExpectedCount(e.target.value)}
                  placeholder="Contoh: 15 (10 PG + 5 Uraian)"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-hidden"
                />
                <span className="text-slate-400 text-[11px] shrink-0">Butir</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Sistem akan memverifikasi hasil ekstraksi terhadap angka ini untuk mencegah soal hilang.
              </p>
            </div>

            <div className="inline-block">
              <label className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-102 cursor-pointer">
                <FileText className="w-4 h-4" />
                <span>Pilih File Dokumen Soal</span>
                <input
                  type="file"
                  accept=".docx, .doc, .pdf, .jpg, .jpeg, .png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {selectedFile && (
              <div className="mt-6 p-4 max-w-md mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-800">
                <div className="flex items-center gap-2 truncate">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold truncate">{selectedFile.name}</span>
                  <span className="text-slate-400">({Math.round(selectedFile.size / 1024)} KB)</span>
                </div>
                <button
                  onClick={handleStartAnalysis}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors shrink-0"
                >
                  Mulai Analisis Dokumen
                </button>
              </div>
            )}
          </div>

          {/* Engine Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2 font-bold">
                1
              </div>
              <p className="font-bold text-slate-900">Pembacaan Paragraf & Tabel Lengkap</p>
              <p className="text-slate-500 mt-1">
                Seluruh paragraf dan tabel dibaca utuh berurutan. Format pilihan satu baris dipisah otomatis menjadi A-E.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 font-bold">
                2
              </div>
              <p className="font-bold text-slate-900">Pemetaan Gambar ke Soal Terkait</p>
              <p className="text-slate-500 mt-1">
                Gambar tertanam dikaitkan langsung ke nomor soal tempat gambar muncul, bukan pembagian acak.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 font-bold">
                3
              </div>
              <p className="font-bold text-slate-900">Validasi Otomatis Sebelum Terbit</p>
              <p className="text-slate-500 mt-1">
                Mendeteksi nomor melompat, teks kosong, atau opsi yang hilang sebelum disimpan sebagai ujian final.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: Analyzing Pipeline Screen */}
      {stage === 'analyzing' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Sedang Memproses Dokumen: {selectedFile?.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Mesin ISTAFA sedang mengurai struktur tabel, gambar tertanam, nomor urut, dan pilihan jawaban...
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-3 text-left">
            <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Ekstraksi Struktur Paragraf & Tabel Dokumen</span>
            </div>
            <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Ekstraksi Gambar Tertanam dan Pemetaan Posisi</span>
            </div>
            <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pemisahan Nomor Soal, Opsi Jawaban (A-E), dan Format Esai</span>
            </div>
            <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Validasi Kelengkapan Butir Soal</span>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: Review & Edit Extracted Questions */}
      {stage === 'review' && (
        <div className="space-y-6">
          {/* Validation Checklist Banner */}
          <div
            className={`rounded-2xl p-5 border text-xs space-y-3 ${
              hasWarnings
                ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {hasWarnings ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {hasWarnings ? 'Perhatian: Diperlukan Verifikasi Guru' : 'Konversi Dokumen Selesai dengan Sukses'}
                  </h4>
                  <p className="text-[11px] opacity-80">
                    Total {questions.length} butir soal terdeteksi (Target: {expectedCount || questions.length} soal).
                  </p>
                </div>
              </div>

              {/* KPI Badges */}
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800">
                  {valSummary?.multipleChoiceCount || 0} Pilihan Ganda
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800">
                  {valSummary?.essayCount || 0} Soal Uraian/Esai
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800">
                  {valSummary?.imagesExtractedCount || 0} Gambar Terhubung
                </span>
                {valSummary?.missingAnswerKeyCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800">
                    {valSummary.missingAnswerKeyCount} Kunci Belum Diisi
                  </span>
                )}
              </div>
            </div>

            {/* Warning details list */}
            {hasWarnings && (
              <div className="p-3 bg-white/70 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
                <p className="font-bold">Daftar Peringatan Validasi Sistem:</p>
                {valSummary.warnings.map((w: string, i: number) => (
                  <p key={`val-w-${i}`} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Sub-tabs: Editor vs Raw Text vs All Images */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setReviewTab('editor')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                reviewTab === 'editor'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Editor & Perbaikan Soal ({questions.length})
            </button>

            <button
              onClick={() => setReviewTab('rawText')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                reviewTab === 'rawText'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Bandingkan Teks Asli Dokumen</span>
            </button>

            <button
              onClick={() => setReviewTab('allImages')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                reviewTab === 'allImages'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Semua Gambar Terlampir ({parsedData?.allImages?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: Raw Text Comparison View */}
          {reviewTab === 'rawText' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-sm text-slate-900">
                  Pratinjau Teks Asli yang Diekstrak dari Dokumen
                </h4>
                <span className="text-xs text-slate-400">
                  Gunakan untuk membandingkan jika ada kalimat atau opsi yang ragu
                </span>
              </div>
              <textarea
                rows={16}
                readOnly
                value={parsedData?.rawTextPreview || 'Tidak ada teks yang diekstrak.'}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed outline-hidden"
              />
            </div>
          )}

          {/* TAB 2: All Extracted Images Gallery */}
          {reviewTab === 'allImages' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h4 className="font-bold text-sm text-slate-900">
                Galeri Seluruh Gambar yang Berhasil Diekstrak
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {parsedData?.allImages && parsedData.allImages.length > 0 ? (
                  parsedData.allImages.map((imgUrl, i) => (
                    <div key={`all-img-${i}`} className="p-2 border rounded-xl bg-slate-50 text-center space-y-2">
                      <img src={imgUrl} alt={`Gambar ${i + 1}`} className="h-32 object-contain mx-auto" />
                      <p className="text-[10px] text-slate-500 font-mono truncate">{imgUrl}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 col-span-4 text-center py-6">
                    Tidak ada file gambar tertanam dalam dokumen ini.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Main Question Editor Workstation */}
          {reviewTab === 'editor' && (
            <div className="space-y-4">
              {questions.map((q, qIdx) => {
                const isEssay = q.type === 'essay';
                return (
                  <div
                    key={`q-editor-${q.id || q.number || qIdx}-${qIdx}`}
                    className={`bg-white rounded-2xl border p-5 shadow-xs space-y-4 relative transition-all ${
                      q.extractionStatus === 'warning'
                        ? 'border-amber-400 ring-1 ring-amber-300'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                          {q.number || qIdx + 1}
                        </span>

                        {/* Switch Type Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionType(qIdx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            isEssay
                              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                          title="Klik untuk ubah jenis soal"
                        >
                          {isEssay ? 'Esai / Uraian' : 'Pilihan Ganda'}
                        </button>

                        {q.warningMessage && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {q.warningMessage}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="font-semibold">Bobot:</span>
                          <input
                            type="number"
                            value={q.scoreWeight || (isEssay ? 5 : 2)}
                            onChange={(e) =>
                              handleUpdateQuestion(qIdx, { scoreWeight: Number(e.target.value) })
                            }
                            className="w-12 px-2 py-0.5 border rounded-lg text-xs text-center font-bold"
                            min={1}
                          />
                        </div>

                        <button
                          onClick={() => handleDeleteQuestion(qIdx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus Soal Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Teks Pertanyaan Soal:
                      </label>
                      <textarea
                        rows={3}
                        value={q.text}
                        onChange={(e) => handleUpdateQuestion(qIdx, { text: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-blue-500 outline-hidden leading-relaxed"
                        placeholder="Tuliskan teks pertanyaan di sini..."
                      />
                    </div>

                    {/* Attached Images Section */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                          <span>Gambar Terlampir pada Soal #{q.number || qIdx + 1}:</span>
                        </span>

                        {/* Upload local image to this question */}
                        <label className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">
                          + Tambah Gambar Soal
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadNewImageToQuestion(qIdx, e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {q.images && q.images.length > 0 ? (
                        <div className="flex flex-wrap gap-3 pt-1">
                          {q.images.map((imgUrl: string, imgI: number) => (
                            <div key={`q-img-${qIdx}-${imgI}`} className="p-2 border bg-white rounded-xl space-y-2">
                              <img
                                src={imgUrl}
                                alt={`Lampiran Soal ${q.number || qIdx + 1}`}
                                className="h-28 rounded-lg object-contain mx-auto"
                              />
                              <div className="flex items-center justify-between gap-2 pt-1 border-t text-[10px]">
                                {/* Reassign dropdown */}
                                <select
                                  onChange={(e) =>
                                    handleMoveImage(qIdx, imgI, parseInt(e.target.value, 10))
                                  }
                                  value={qIdx}
                                  className="px-1.5 py-0.5 border rounded bg-slate-50 text-[10px]"
                                  title="Pindahkan ke nomor soal lain"
                                >
                                  {questions.map((targetQ, tIdx) => (
                                    <option key={`target-q-${targetQ.number ?? tIdx}-${tIdx}`} value={tIdx}>
                                      Pindah ke Soal #{targetQ.number || tIdx + 1} {targetQ.type === 'essay' ? '(Esai)' : '(PG)'}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveImageFromQuestion(qIdx, imgI)}
                                  className="text-red-500 hover:text-red-700 font-bold"
                                  title="Hapus gambar dari soal ini"
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          Tidak ada gambar terlampir untuk soal ini.
                        </p>
                      )}
                    </div>

                    {/* Options Editor (For Multiple Choice) */}
                    {!isEssay && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-600">
                            Pilihan Jawaban (Klik tombol huruf untuk menentukan Kunci):
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddOptionToQuestion(qIdx)}
                            className="text-[10px] font-bold text-blue-600 hover:underline"
                          >
                            + Tambah Pilihan Jawaban
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt: any, optIdx: number) => {
                            const isCorrect = q.correctAnswer === opt.key;
                            return (
                              <div
                                key={`opt-${opt.key || ''}-${optIdx}`}
                                className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                                  isCorrect
                                    ? 'bg-emerald-50/90 border-emerald-300'
                                    : 'bg-slate-50/70 border-slate-200'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateQuestion(qIdx, { correctAnswer: opt.key })
                                  }
                                  className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                  }`}
                                  title="Klik untuk jadikan kunci jawaban"
                                >
                                  {opt.key}
                                </button>

                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) =>
                                    handleUpdateOption(qIdx, optIdx, e.target.value)
                                  }
                                  className="flex-1 bg-transparent text-xs text-slate-900 outline-hidden"
                                  placeholder={`Teks pilihan ${opt.key}`}
                                />

                                {isCorrect && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    KUNCI
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(qIdx, optIdx)}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                  title="Hapus opsi ini"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Essay Answer Guidelines (For Essay) */}
                    {isEssay && (
                      <div className="space-y-1 pt-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Pedoman Kunci Jawaban / Kriteria Penilaian Esai (Opsional):
                        </label>
                        <textarea
                          rows={2}
                          value={q.correctAnswer || ''}
                          onChange={(e) =>
                            handleUpdateQuestion(qIdx, { correctAnswer: e.target.value })
                          }
                          placeholder="Tuliskan pedoman penilaian atau kata kunci jawaban benar..."
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Question Button */}
          {reviewTab === 'editor' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <button
                onClick={handleAddQuestion}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Butir Soal Baru Manual</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveToBank}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Draf Bank Soal</span>
                </button>

                <button
                  onClick={() => setStage('publish')}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-102"
                >
                  <span>Lanjutkan ke Konfigurasi Ujian</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STAGE 4: Publish Exam Configuration */}
      {stage === 'publish' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Penerbitan Paket Ujian Resmi
              </h3>
              <p className="text-xs text-slate-500">
                Total {questions.length} butir soal ({questions.filter((q) => q.type === 'multiple_choice').length} PG, {questions.filter((q) => q.type === 'essay').length} Esai) siap diterbitkan
              </p>
            </div>
            <button
              onClick={() => setStage('review')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Kembali ke Pemeriksaan Soal
            </button>
          </div>

          {/* Teacher Mandatory Review Acknowledgment */}
          {hasWarnings && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                Persetujuan Sadar Pemeriksaan Guru:
              </p>
              <p className="text-[11px] leading-relaxed">
                Terdapat catatan pada hasil konversi (seperti nomor yang melompat atau kunci jawaban yang belum terisi otomatis). Harap centang persetujuan di bawah sebelum menerbitkan:
              </p>
              <label className="flex items-center gap-2 pt-1 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={teacherConsent}
                  onChange={(e) => setTeacherConsent(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Saya telah memeriksa dan menyetujui seluruh naskah soal ini untuk diterbitkan.</span>
              </label>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judul Ujian Resmi *
              </label>
              <input
                type="text"
                value={publishForm.title}
                onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })}
                className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold text-slate-900"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mata Pelajaran *
                </label>
                <input
                  type="text"
                  value={publishForm.subject}
                  onChange={(e) => setPublishForm({ ...publishForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Kelas Peserta *
                </label>
                <input
                  type="text"
                  value={publishForm.gradeClass}
                  onChange={(e) => setPublishForm({ ...publishForm, gradeClass: e.target.value })}
                  placeholder="Contoh: X IPA 1"
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Waktu Mulai Ujian *
                </label>
                <input
                  type="datetime-local"
                  value={publishForm.startTime}
                  onChange={(e) => setPublishForm({ ...publishForm, startTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Waktu Selesai Ujian *
                </label>
                <input
                  type="datetime-local"
                  value={publishForm.endTime}
                  onChange={(e) => setPublishForm({ ...publishForm, endTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Durasi Pengerjaan (Menit) *
                </label>
                <input
                  type="number"
                  value={publishForm.durationMinutes}
                  onChange={(e) =>
                    setPublishForm({ ...publishForm, durationMinutes: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
                  min={10}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Ujian (Token Masuk Peserta) *
                </label>
                <input
                  type="text"
                  value={publishForm.examCode}
                  onChange={(e) =>
                    setPublishForm({ ...publishForm, examCode: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold text-blue-700 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Standar Nilai KKM
                </label>
                <input
                  type="number"
                  value={publishForm.kkm}
                  onChange={(e) => setPublishForm({ ...publishForm, kkm: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
                  min={0}
                  max={100}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batas Toleransi Keterlambatan (Menit)
                </label>
                <input
                  type="number"
                  value={publishForm.lateToleranceMinutes}
                  onChange={(e) =>
                    setPublishForm({ ...publishForm, lateToleranceMinutes: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
                  min={0}
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishForm.shuffleQuestions}
                  onChange={(e) =>
                    setPublishForm({ ...publishForm, shuffleQuestions: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span>Acak Urutan Soal Tiap Siswa</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishForm.shuffleOptions}
                  onChange={(e) =>
                    setPublishForm({ ...publishForm, shuffleOptions: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span>Acak Pilihan Opsi Jawaban (A-E)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              onClick={() => setStage('review')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Kembali ke Review
            </button>
            <button
              onClick={handlePublishExam}
              disabled={savingAction || (hasWarnings && !teacherConsent)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-102 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{savingAction ? 'Menerbitkan...' : 'Terbitkan & Aktifkan Ujian'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
