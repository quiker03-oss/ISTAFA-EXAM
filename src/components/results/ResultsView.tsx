import React, { useState, useEffect } from 'react';
import {
  Award,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit3,
  FileSpreadsheet,
  ChevronDown,
  BarChart3,
  X,
  Save,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { Exam } from '../../types';

interface ResultsViewProps {
  initialExamId?: string;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ initialExamId }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'leger' | 'analysis'>('leger');

  // Essay grading modal state
  const [essayGradingSession, setEssayGradingSession] = useState<any>(null);
  const [essayScores, setEssayScores] = useState<Record<string, number>>({});
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const list = await apiRequest('/api/exams');
        setExams(list);
        if (!selectedExamId && list.length > 0) {
          setSelectedExamId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load exams for results:', err);
      }
    };
    fetchExams();
  }, []);

  const fetchResults = async () => {
    if (!selectedExamId) return;
    try {
      setLoading(true);
      const res = await apiRequest(`/api/exams/${selectedExamId}/results`);
      setData(res);
    } catch (err) {
      console.error('Failed to load exam results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [selectedExamId]);

  const summary = data?.summary || {};
  const results = (data?.results || []).filter((r: any) =>
    r.fullName.toLowerCase().includes(search.toLowerCase()) || r.nis.includes(search)
  );
  const itemAnalysis = data?.itemAnalysis || [];
  const exam = data?.exam;

  // Open Essay Grading Modal
  const handleOpenEssayModal = (sessionResult: any) => {
    setEssayGradingSession(sessionResult);
    const initialScores: Record<string, number> = {};
    if (exam && exam.questions) {
      exam.questions.forEach((q: any) => {
        if (q.type === 'essay') {
          const ans = sessionResult.answers?.[q.id];
          initialScores[q.id] = ans?.scoreAwarded !== undefined ? ans.scoreAwarded : 0;
        }
      });
    }
    setEssayScores(initialScores);
  };

  const handleSaveEssayGrade = async (qId: string) => {
    if (!essayGradingSession) return;
    setSavingGrade(true);
    try {
      await apiRequest(`/api/exams/${selectedExamId}/grade-essay`, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: essayGradingSession.sessionId,
          questionId: qId,
          scoreAwarded: essayScores[qId] || 0,
        }),
      });
      alert('Nilai esai berhasil disimpan.');
      await fetchResults();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan nilai esai.');
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Hasil & Analisis Nilai Ujian</h2>
          <p className="text-xs text-slate-500">
            Koreksi otomatis pilihan ganda, penilaian esai manual, ketuntasan KKM, dan analisis butir soal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-blue-500 outline-hidden max-w-xs"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.gradeClass})
              </option>
            ))}
          </select>

          <a
            href={`/api/exams/${selectedExamId}/export-results`}
            download
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </a>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Leger</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
            Peserta Selesai
          </span>
          <p className="text-xl font-bold text-slate-900">{summary.totalFinished ?? 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
            Rata-rata Nilai
          </span>
          <p className="text-xl font-bold text-blue-700">{summary.avgScore ?? 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">
            Nilai Tertinggi
          </span>
          <p className="text-xl font-bold text-emerald-600">{summary.highestScore ?? 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-red-600 block mb-1">
            Nilai Terendah
          </span>
          <p className="text-xl font-bold text-red-600">{summary.lowestScore ?? 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">
            Tuntas KKM ({exam?.kkm || 75})
          </span>
          <p className="text-xl font-bold text-emerald-600">
            {summary.passedCount ?? 0} ({summary.passingRate ?? 0}%)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-red-600 block mb-1">
            Belum Tuntas
          </span>
          <p className="text-xl font-bold text-red-600">{summary.failedCount ?? 0}</p>
        </div>
      </div>

      {/* Tabs: Leger Nilai vs Analisis Butir Soal */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
        <button
          onClick={() => setActiveTab('leger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'leger'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Leger Nilai Peserta
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'analysis'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Analisis Butir Soal (Daya Serap)
        </button>
      </div>

      {/* TAB 1: Leger Nilai Table */}
      {activeTab === 'leger' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between print:hidden">
            <h3 className="font-bold text-sm text-slate-900">Rekapitulasi Nilai Peserta</h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa atau NIS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 border rounded-xl text-xs outline-hidden w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-500 border-b">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Peserta</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4 text-center">Benar</th>
                  <th className="py-3 px-4 text-center">Salah</th>
                  <th className="py-3 px-4 text-center">Nilai Akhir (0-100)</th>
                  <th className="py-3 px-4 text-center">Status KKM</th>
                  <th className="py-3 px-4 text-right print:hidden">Koreksi Esai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Belum ada hasil ujian yang diselesaikan untuk paket ini.
                    </td>
                  </tr>
                ) : (
                  results.map((r: any, idx: number) => (
                    <tr key={r.sessionId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-medium">{r.nis}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{r.fullName}</td>
                      <td className="py-3 px-4">{r.gradeClass}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">
                        {r.correctCount}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-red-600">
                        {r.wrongCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full font-black text-xs ${
                            r.isPassed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.finalScore}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.isPassed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {r.isPassed ? 'TUNTAS' : 'BELUM TUNTAS'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right print:hidden">
                        <button
                          onClick={() => handleOpenEssayModal(r)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600" />
                          <span>Nilai Esai</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Item Analysis (Analisis Butir Soal) */}
      {activeTab === 'analysis' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Analisis Tingkat Kesukaran Butir Soal</h3>
            <p className="text-xs text-slate-500">
              Menampilkan persentase peserta yang berhasil menjawab benar setiap nomor soal
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-500 border-b">
                <tr>
                  <th className="py-3 px-4">No. Soal</th>
                  <th className="py-3 px-4">Tipe Soal</th>
                  <th className="py-3 px-4 text-center">Kunci</th>
                  <th className="py-3 px-4 text-center">Jumlah Menjawab</th>
                  <th className="py-3 px-4 text-center">Benar</th>
                  <th className="py-3 px-4 text-center">Daya Serap (%)</th>
                  <th className="py-3 px-4 text-center">Kategori Kesukaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemAnalysis.map((item: any, itemIdx: number) => (
                  <tr key={item.questionId ? `ia-${item.questionId}` : `ia-${item.number}-${itemIdx}`} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold">Soal #{item.number}</td>
                    <td className="py-3 px-4 uppercase text-[11px] font-medium text-slate-500">
                      {item.type}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-700">
                      {item.correctAnswer || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">{item.totalAnswered}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">
                      {item.correctCount}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">{item.difficultyRate}%</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.difficultyCategory === 'Mudah'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.difficultyCategory === 'Sedang'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.difficultyCategory}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Koreksi Esai Manual */}
      {essayGradingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl relative space-y-4 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setEssayGradingSession(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-bold text-base text-slate-900">
                Koreksi Manual Esai: {essayGradingSession.fullName}
              </h3>
              <p className="text-xs text-slate-500">
                NIS: {essayGradingSession.nis} • Kelas {essayGradingSession.gradeClass}
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {exam?.questions
                ?.filter((q: any) => q.type === 'essay')
                .map((q: any, qIdx: number) => {
                  const studentAns = essayGradingSession.answers?.[q.id]?.essayAnswer;
                  return (
                    <div key={q.id ? `essay-${q.id}` : `essay-${q.number}-${qIdx}`} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-700">Soal No. {q.number}</span>
                        <span className="text-xs text-slate-500 font-medium">
                          Maksimal: {q.scoreWeight} Poin
                        </span>
                      </div>

                      <p className="text-xs text-slate-900 font-medium">{q.text}</p>

                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Jawaban Siswa:
                        </span>
                        <p className="text-xs text-slate-800 whitespace-pre-wrap">
                          {studentAns || <span className="italic text-slate-400">Tidak ada jawaban siswa.</span>}
                        </p>
                      </div>

                      {q.correctAnswer && (
                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-1">
                            Pedoman Kunci Jawaban:
                          </span>
                          <p className="text-xs text-emerald-900">{q.correctAnswer}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700">Beri Nilai:</label>
                          <input
                            type="number"
                            min={0}
                            max={q.scoreWeight}
                            value={essayScores[q.id] ?? 0}
                            onChange={(e) =>
                              setEssayScores({ ...essayScores, [q.id]: Number(e.target.value) })
                            }
                            className="w-16 px-2.5 py-1 border rounded-lg text-xs font-bold text-center"
                          />
                        </div>

                        <button
                          onClick={() => handleSaveEssayGrade(q.id)}
                          disabled={savingGrade}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1 shadow-sm"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Skor</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
