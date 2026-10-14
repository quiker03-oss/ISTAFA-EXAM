import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Smartphone,
  Tablet,
  Monitor,
  Trash2,
  Edit2,
  CheckCircle2,
  Image as ImageIcon,
  X,
  Eye,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { QuestionItem } from '../../types';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

export const QuestionBankView: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Preview Modal State
  const [previewQuestion, setPreviewQuestion] = useState<QuestionItem | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  // Delete State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk' | 'all';
    question?: QuestionItem;
  }>({ isOpen: false, type: 'single' });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/bank-questions');
      setQuestions(data);
    } catch (err) {
      console.error('Failed to load bank questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const subjects = Array.from(new Set(questions.map((q) => q.subject))).filter(Boolean);

  const filteredQuestions = questions.filter((q) => {
    const matchesSubject = selectedSubject === 'ALL' || q.subject === selectedSubject;
    const matchesSearch =
      q.text.toLowerCase().includes(search.toLowerCase()) ||
      q.subject.toLowerCase().includes(search.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestionIds(filteredQuestions.map((q) => q.id));
    } else {
      setSelectedQuestionIds([]);
    }
  };

  const isAllSelected =
    filteredQuestions.length > 0 &&
    filteredQuestions.every((q) => selectedQuestionIds.includes(q.id));

  // Prompt delete
  const promptDeleteSingle = (q: QuestionItem) => {
    setDeleteModal({ isOpen: true, type: 'single', question: q });
  };

  const promptDeleteBulk = () => {
    if (selectedQuestionIds.length === 0) return;
    setDeleteModal({ isOpen: true, type: 'bulk' });
  };

  const promptDeleteAll = () => {
    setDeleteModal({ isOpen: true, type: 'all' });
  };

  // Execute delete
  const executeDelete = async () => {
    setDeleteLoading(true);
    setToastMessage(null);
    try {
      if (deleteModal.type === 'single' && deleteModal.question) {
        await apiRequest(`/api/bank-questions/${deleteModal.question.id}`, { method: 'DELETE' });
        setToastMessage({ type: 'success', text: 'Soal berhasil dihapus dari bank soal.' });
        setSelectedQuestionIds((prev) => prev.filter((id) => id !== deleteModal.question!.id));
      } else if (deleteModal.type === 'bulk') {
        const res = await apiRequest('/api/bank-questions/bulk-delete', {
          method: 'POST',
          body: JSON.stringify({ questionIds: selectedQuestionIds }),
        });
        setToastMessage({ type: 'success', text: res.message || `Berhasil menghapus ${selectedQuestionIds.length} butir soal.` });
        setSelectedQuestionIds([]);
      } else if (deleteModal.type === 'all') {
        const query = selectedSubject !== 'ALL' ? `?subject=${encodeURIComponent(selectedSubject)}` : '';
        const res = await apiRequest(`/api/bank-questions${query}`, { method: 'DELETE' });
        setToastMessage({ type: 'success', text: res.message || 'Bank soal berhasil dikosongkan.' });
        setSelectedQuestionIds([]);
      }
      setDeleteModal({ isOpen: false, type: 'single' });
      await fetchQuestions();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Gagal menghapus soal.' });
    } finally {
      setDeleteLoading(false);
    }
  };

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
            <CheckCircle2 className="w-4 h-4 shrink-0" />
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

      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Bank Soal Sekolah</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total {questions.length} butir soal tersimpan permanen dan dapat digunakan kembali untuk paket ujian
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 outline-hidden"
            >
              <option value="ALL">Semua Mata Pelajaran ({questions.length})</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari teks soal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 outline-hidden w-48"
            />
          </div>

          {questions.length > 0 && (
            <button
              onClick={promptDeleteAll}
              className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-500/5 hover:bg-red-500/15 text-red-600 dark:text-red-400 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              title="Bersihkan bank soal"
            >
              <Trash2 className="w-4 h-4" />
              <span>Bersihkan...</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating / Active Bulk Delete Toolbar */}
      {selectedQuestionIds.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 dark:bg-red-950/40 dark:border-red-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center">
              {selectedQuestionIds.length}
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {selectedQuestionIds.length} butir soal dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedQuestionIds([])}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              Batal Pilih
            </button>
            <button
              onClick={promptDeleteBulk}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus {selectedQuestionIds.length} Soal Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Select All Checkbox bar */}
      {filteredQuestions.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Pilih Semua Soal ({filteredQuestions.length})</span>
          </label>
        </div>
      )}

      {/* Question Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredQuestions.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            Belum ada soal di Bank Soal. Gunakan menu "Upload Dokumen Soal" untuk mengonversi naskah Word/PDF Anda.
          </div>
        ) : (
          filteredQuestions.map((q, idx) => (
            <div
              key={q.id || `bank-q-${idx}`}
              className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 transition-colors ${
                selectedQuestionIds.includes(q.id) ? 'ring-2 ring-blue-500/40 bg-blue-50/10 dark:bg-blue-950/20' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.includes(q.id)}
                      onChange={() => handleToggleSelect(q.id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{q.subject}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                      {q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Esai'}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Bobot: {q.scoreWeight}</span>
                </div>

                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium mb-3">{q.text}</p>

                {/* Attached Images */}
                {q.images && q.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {q.images.map((imgUrl, i) => (
                      <img
                        key={`q-img-${q.id || idx}-${i}`}
                        src={imgUrl}
                        alt="Lampiran"
                        className="h-20 rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-slate-50 dark:bg-slate-800"
                      />
                    ))}
                  </div>
                )}

                {/* Options Preview */}
                {q.type === 'multiple_choice' && (
                  <div className="space-y-1.5 pt-1">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctAnswer === opt.key;
                      return (
                        <div
                          key={`q-opt-${opt.key || ''}-${optIdx}`}
                          className={`text-xs p-2 rounded-xl flex items-center gap-2 border transition-colors ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                              : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="truncate">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => setPreviewQuestion(q)}
                  className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pratinjau Layar Siswa</span>
                </button>

                <button
                  onClick={() => promptDeleteSingle(q)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  title="Hapus Soal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Student Viewport Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setPreviewQuestion(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Pratinjau Tampilan Sisi Siswa</h3>
                <p className="text-xs text-slate-400">
                  Simulasi interaktif bagaimana soal ini akan dirender pada layar perangkat peserta
                </p>
              </div>

              {/* Viewport Device Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    previewDevice === 'mobile' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>HP Mobile</span>
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    previewDevice === 'tablet' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span>Tablet</span>
                </button>
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    previewDevice === 'desktop' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
              </div>
            </div>

            {/* Simulated Frame */}
            <div className="flex justify-center py-4 bg-slate-950 rounded-2xl p-4 overflow-hidden">
              <div
                className={`bg-white text-slate-900 rounded-2xl shadow-xl p-6 transition-all ${
                  previewDevice === 'mobile'
                    ? 'w-[375px]'
                    : previewDevice === 'tablet'
                    ? 'w-[640px]'
                    : 'w-full max-w-2xl'
                }`}
              >
                {/* Simulated Exam Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 text-xs">
                  <span className="font-bold text-blue-700">Soal No. {previewQuestion.number}</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                    Bobot: {previewQuestion.scoreWeight} Poin
                  </span>
                </div>

                {/* Question Text */}
                <p className="text-sm font-medium text-slate-900 leading-relaxed mb-4">
                  {previewQuestion.text}
                </p>

                {/* Images */}
                {previewQuestion.images && previewQuestion.images.length > 0 && (
                  <div className="mb-4">
                    <img
                      src={previewQuestion.images[0]}
                      alt="Soal"
                      className="max-h-48 rounded-xl border border-slate-200 object-contain mx-auto"
                    />
                  </div>
                )}

                {/* Options Buttons */}
                {previewQuestion.type === 'multiple_choice' ? (
                  <div className="space-y-2">
                    {previewQuestion.options.map((opt, optIdx) => (
                      <button
                        key={`prev-opt-${opt.key || ''}-${optIdx}`}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex items-center gap-3 text-xs transition-colors cursor-pointer"
                      >
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                          {opt.key}
                        </span>
                        <span className="text-slate-800">{opt.text}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    placeholder="Tuliskan jawaban uraian Anda di sini..."
                    className="w-full p-3 border border-slate-300 rounded-xl text-xs outline-hidden"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Bank Soal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: 'single' })}
        onConfirm={executeDelete}
        isLoading={deleteLoading}
        title={
          deleteModal.type === 'single'
            ? 'Hapus Soal dari Bank Soal'
            : deleteModal.type === 'bulk'
            ? `Hapus ${selectedQuestionIds.length} Soal Terpilih`
            : selectedSubject === 'ALL'
            ? 'Bersihkan Seluruh Bank Soal'
            : `Hapus Seluruh Soal Mapel ${selectedSubject}`
        }
        message={
          deleteModal.type === 'single'
            ? 'Apakah Anda yakin ingin menghapus butir soal ini dari bank soal? Soal ini tidak akan lagi tersedia saat menyusun paket ujian baru.'
            : deleteModal.type === 'bulk'
            ? `Apakah Anda yakin ingin menghapus ${selectedQuestionIds.length} butir soal yang dipilih? Tindakan ini tidak dapat dibatalkan.`
            : selectedSubject === 'ALL'
            ? 'PERINGATAN: Semua soal di bank soal sekolah akan dihapus. Paket ujian yang sudah dijadwalkan tidak akan terpengaruh.'
            : `Apakah Anda yakin ingin menghapus semua butir soal dengan mata pelajaran ${selectedSubject}?`
        }
        itemName={
          deleteModal.type === 'single' && deleteModal.question
            ? `${deleteModal.question.subject}: "${deleteModal.question.text.slice(0, 100)}${deleteModal.question.text.length > 100 ? '...' : ''}"`
            : undefined
        }
        confirmText={
          deleteModal.type === 'single'
            ? 'Ya, Hapus Soal'
            : deleteModal.type === 'bulk'
            ? `Hapus ${selectedQuestionIds.length} Soal`
            : 'Ya, Bersihkan Bank Soal'
        }
      />
    </div>
  );
};
