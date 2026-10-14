import React, { useState, useEffect } from 'react';
import {
  Users,
  Upload,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpRight,
  Edit2,
  Trash2,
  X,
  FileDown,
  RefreshCw,
  Check,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { Student } from '../../types';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

export const StudentsView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk' | 'all';
    student?: Student;
  }>({ isOpen: false, type: 'single' });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nis: '',
    nisn: '',
    fullName: '',
    gender: 'L',
    gradeClass: 'X IPA 1',
    rombel: 'Rombel A',
    academicYear: '2024/2025',
  });

  // Promote Class State
  const [promoteForm, setPromoteForm] = useState({
    currentClass: '',
    targetClass: '',
    newAcademicYear: '2025/2026',
  });

  // Bulk Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/students');
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const classes = Array.from(new Set(students.map((s) => s.gradeClass))).filter(Boolean);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.nis.includes(search) ||
      (s.nisn && s.nisn.includes(search));
    const matchesClass = selectedClass === 'ALL' || s.gradeClass === selectedClass;
    return matchesSearch && matchesClass;
  });

  // Handle Manual Save
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await apiRequest(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest('/api/students', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setIsAddModalOpen(false);
      setEditingStudent(null);
      await fetchStudents();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan siswa.');
    }
  };

  // Open Edit
  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      nis: student.nis,
      nisn: student.nisn || '',
      fullName: student.fullName,
      gender: student.gender,
      gradeClass: student.gradeClass,
      rombel: student.rombel || '',
      academicYear: student.academicYear,
    });
    setIsAddModalOpen(true);
  };

  // Toggle Status
  const handleToggleStatus = async (student: Student) => {
    const newStatus = student.status === 'active' ? 'inactive' : 'active';
    try {
      await apiRequest(`/api/students/${student.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchStudents();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status.');
    }
  };

  // Bulk Import
  const handleBulkImport = async () => {
    if (!uploadFile) return;
    const body = new FormData();
    body.append('file', uploadFile);

    setUploadLoading(true);
    try {
      const res = await apiRequest('/api/students/bulk-import', {
        method: 'POST',
        body,
      });
      setImportSummary(res);
      await fetchStudents();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses file Excel.');
    } finally {
      setUploadLoading(false);
    }
  };

  // Class Promotion
  const handlePromoteClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/students/promote-class', {
        method: 'POST',
        body: JSON.stringify(promoteForm),
      });
      alert(res.message);
      setIsPromoteModalOpen(false);
      await fetchStudents();
    } catch (err: any) {
      alert(err.message || 'Gagal menaikkan kelas.');
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const isAllSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.id));

  // Trigger Delete Modals
  const promptDeleteSingle = (student: Student) => {
    setDeleteModal({ isOpen: true, type: 'single', student });
  };

  const promptDeleteBulk = () => {
    if (selectedStudentIds.length === 0) return;
    setDeleteModal({ isOpen: true, type: 'bulk' });
  };

  const promptDeleteAll = () => {
    setDeleteModal({ isOpen: true, type: 'all' });
  };

  // Execute Deletion
  const handleExecuteDelete = async () => {
    setDeleteLoading(true);
    setFeedback(null);
    try {
      if (deleteModal.type === 'single' && deleteModal.student) {
        await apiRequest(`/api/students/${deleteModal.student.id}`, { method: 'DELETE' });
        setFeedback({
          type: 'success',
          message: `Siswa ${deleteModal.student.fullName} berhasil dihapus.`,
        });
        setSelectedStudentIds((prev) => prev.filter((id) => id !== deleteModal.student!.id));
      } else if (deleteModal.type === 'bulk') {
        const res = await apiRequest('/api/students/bulk-delete', {
          method: 'POST',
          body: JSON.stringify({ studentIds: selectedStudentIds }),
        });
        setFeedback({
          type: 'success',
          message: res.message || `Berhasil menghapus ${selectedStudentIds.length} siswa terpilih.`,
        });
        setSelectedStudentIds([]);
      } else if (deleteModal.type === 'all') {
        const query = selectedClass !== 'ALL' ? `?gradeClass=${encodeURIComponent(selectedClass)}` : '';
        const res = await apiRequest(`/api/students${query}`, { method: 'DELETE' });
        setFeedback({
          type: 'success',
          message: res.message || 'Seluruh data siswa berhasil dihapus.',
        });
        setSelectedStudentIds([]);
      }
      setDeleteModal({ isOpen: false, type: 'single' });
      await fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menghapus data siswa.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium border shadow-xs animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Data Siswa & Peserta Didik</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total {students.length} siswa terdaftar • {students.filter((s) => s.status === 'active').length} aktif
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setEditingStudent(null);
              setFormData({
                nis: '',
                nisn: '',
                fullName: '',
                gender: 'L',
                gradeClass: classes[0] || 'X IPA 1',
                rombel: 'Rombel A',
                academicYear: '2024/2025',
              });
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>

          <button
            onClick={() => {
              setImportSummary(null);
              setUploadFile(null);
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Impor Excel</span>
          </button>

          <button
            onClick={() => setIsPromoteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Kenaikan Kelas</span>
          </button>

          <a
            href="/api/students/export"
            download
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Data</span>
          </a>

          {/* Delete All Option */}
          {students.length > 0 && (
            <button
              onClick={promptDeleteAll}
              className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-500/5 hover:bg-red-500/15 text-red-600 dark:text-red-400 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              title="Hapus seluruh data siswa atau berdasarkan kelas"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Data...</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating / Active Bulk Delete Toolbar */}
      {selectedStudentIds.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 dark:bg-red-950/40 dark:border-red-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center">
              {selectedStudentIds.length}
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {selectedStudentIds.length} siswa telah ditandai / dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedStudentIds([])}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              Batal Pilih
            </button>
            <button
              onClick={promptDeleteBulk}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus {selectedStudentIds.length} Siswa Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIS, atau NISN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 outline-hidden"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={fetchStudents}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Segarkan Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Student Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Pilih Semua Siswa"
                  />
                </th>
                <th className="py-3.5 px-4">NIS / NISN</th>
                <th className="py-3.5 px-4">Nama Lengkap</th>
                <th className="py-3.5 px-4">L/P</th>
                <th className="py-3.5 px-4">Kelas & Rombel</th>
                <th className="py-3.5 px-4">Kode Peserta Ujian</th>
                <th className="py-3.5 px-4">Tahun Ajaran</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data siswa yang cocok.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      selectedStudentIds.includes(s.id) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => handleToggleSelect(s.id)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                      <div>{s.nis}</div>
                      <div className="text-[10px] text-slate-400">{s.nisn || '-'}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{s.fullName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          s.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`}
                      >
                        {s.gender}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{s.gradeClass}</span>
                      {s.rombel && <span className="text-slate-400 text-[10px]"> ({s.rombel})</span>}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-700 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/40 px-2 py-1 rounded inline-block">
                      {s.participantCode}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{s.academicYear}</td>
                    <td className="py-3 px-4">
                      <span
                        onClick={() => handleToggleStatus(s)}
                        className={`cursor-pointer px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                          s.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                        title="Klik untuk ubah status"
                      >
                        {s.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(s)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Siswa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => promptDeleteSingle(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Hapus Siswa Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Siswa */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NIS *</label>
                  <input
                    type="text"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NISN</label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas *</label>
                  <input
                    type="text"
                    value={formData.gradeClass}
                    onChange={(e) => setFormData({ ...formData, gradeClass: e.target.value })}
                    placeholder="Contoh: X IPA 1"
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rombongan Belajar</label>
                  <input
                    type="text"
                    value={formData.rombel}
                    onChange={(e) => setFormData({ ...formData, rombel: e.target.value })}
                    placeholder="Rombel A"
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Pelajaran</label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impor Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900">Impor Data Siswa Massal (Excel / CSV)</h3>
              <p className="text-xs text-slate-500">
                Gunakan template resmi untuk memastikan format kolom NIS, Nama, Jenis Kelamin, dan Kelas sesuai.
              </p>
            </div>

            {/* Template Download Box */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-blue-900">Template Format Siswa Resmi ISTAFA</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Unduh template kosong berformat .xlsx yang siap diisi
                </p>
              </div>
              <a
                href="/api/students/template"
                download
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 shrink-0"
              >
                <FileDown className="w-4 h-4" />
                <span>Unduh Template</span>
              </a>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center space-y-3 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <label className="cursor-pointer">
                  <span className="text-xs font-semibold text-blue-600 hover:underline">
                    Pilih File Excel (.xlsx / .csv)
                  </span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-500 mt-1">
                  {uploadFile ? uploadFile.name : 'Maksimal ukuran file 25 MB'}
                </p>
              </div>
            </div>

            {/* Summary Report */}
            {importSummary && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <p className="font-bold text-slate-900">Laporan Hasil Impor:</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <span className="font-bold text-sm block">{importSummary.successCount}</span> Berhasil
                  </div>
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                    <span className="font-bold text-sm block">{importSummary.duplicateCount}</span> Duplikat
                  </div>
                  <div className="p-2 rounded-lg bg-red-100 text-red-800">
                    <span className="font-bold text-sm block">{importSummary.failedCount}</span> Gagal
                  </div>
                </div>

                {importSummary.issues && importSummary.issues.length > 0 && (
                  <div className="mt-2 text-[11px] text-red-600 max-h-24 overflow-y-auto">
                    {importSummary.issues.map((iss: any, i: number) => (
                      <p key={i}>
                        • Baris {iss.row}: {iss.reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={!uploadFile || uploadLoading}
                onClick={handleBulkImport}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50"
              >
                {uploadLoading ? 'Memproses Baris...' : 'Mulai Impor Siswa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kenaikan Kelas */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsPromoteModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900">Kenaikan Kelas Massal</h3>
              <p className="text-xs text-slate-500">
                Pindahkan seluruh siswa dari satu rombel ke rombel tingkat selanjutnya tanpa menggandakan profil siswa.
              </p>
            </div>

            <form onSubmit={handlePromoteClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas Asal *</label>
                <select
                  value={promoteForm.currentClass}
                  onChange={(e) => setPromoteForm({ ...promoteForm, currentClass: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                  required
                >
                  <option value="">Pilih Kelas Asal</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas Tujuan Baru *</label>
                <input
                  type="text"
                  value={promoteForm.targetClass}
                  onChange={(e) => setPromoteForm({ ...promoteForm, targetClass: e.target.value })}
                  placeholder="Contoh: XI IPA 1"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Pelajaran Baru</label>
                <input
                  type="text"
                  value={promoteForm.newAcademicYear}
                  onChange={(e) => setPromoteForm({ ...promoteForm, newAcademicYear: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Konfirmasi Kenaikan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Data Siswa */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: 'single' })}
        onConfirm={handleExecuteDelete}
        isLoading={deleteLoading}
        title={
          deleteModal.type === 'single'
            ? 'Hapus Data Siswa'
            : deleteModal.type === 'bulk'
            ? `Hapus ${selectedStudentIds.length} Siswa Terpilih`
            : selectedClass === 'ALL'
            ? 'Hapus Seluruh Data Siswa'
            : `Hapus Seluruh Siswa Kelas ${selectedClass}`
        }
        message={
          deleteModal.type === 'single'
            ? 'Apakah Anda yakin ingin menghapus data siswa ini? Riwayat sesi pengerjaan ujian dan kartu peserta terkait juga akan terhapus.'
            : deleteModal.type === 'bulk'
            ? `Apakah Anda yakin ingin menghapus ${selectedStudentIds.length} data siswa yang dipilih? Tindakan ini tidak dapat dibatalkan.`
            : selectedClass === 'ALL'
            ? 'PERINGATAN: Seluruh data siswa terdaftar di sekolah ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.'
            : `Apakah Anda yakin ingin menghapus semua data siswa pada kelas ${selectedClass}? Tindakan ini tidak dapat dibatalkan.`
        }
        itemName={
          deleteModal.type === 'single' && deleteModal.student
            ? `${deleteModal.student.fullName} (NIS: ${deleteModal.student.nis} - Kelas: ${deleteModal.student.gradeClass})`
            : undefined
        }
        confirmText={
          deleteModal.type === 'single'
            ? 'Ya, Hapus Siswa'
            : deleteModal.type === 'bulk'
            ? `Hapus ${selectedStudentIds.length} Siswa`
            : 'Ya, Bersihkan Data'
        }
      />
    </div>
  );
};
