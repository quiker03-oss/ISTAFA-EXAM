import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Printer,
  Save,
  CheckCircle2,
  Building2,
  Calendar,
  Clock,
  School as SchoolIcon,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { Exam, BeritaAcara, School } from '../../types';

interface BeritaAcaraViewProps {
  initialExamId?: string;
}

export const BeritaAcaraView: React.FC<BeritaAcaraViewProps> = ({ initialExamId }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || '');
  const [beritaAcara, setBeritaAcara] = useState<BeritaAcara | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const list = await apiRequest('/api/exams');
        setExams(list);
        if (!selectedExamId && list.length > 0) {
          setSelectedExamId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load exams:', err);
      }
    };
    fetchExams();
  }, []);

  const fetchBeritaAcara = async () => {
    if (!selectedExamId) return;
    try {
      setLoading(true);
      const res = await apiRequest(`/api/exams/${selectedExamId}/berita-acara`);
      setBeritaAcara(res.beritaAcara);
      setSchool(res.school);
    } catch (err) {
      console.error('Failed to load berita acara:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeritaAcara();
  }, [selectedExamId]);

  const handleSave = async () => {
    if (!beritaAcara) return;
    setSaving(true);
    try {
      await apiRequest(`/api/exams/${selectedExamId}/berita-acara`, {
        method: 'PUT',
        body: JSON.stringify(beritaAcara),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan berita acara.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Controls (Hidden in Print) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden transition-colors">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Berita Acara Pelaksanaan Ujian</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dokumen resmi berita acara yang terisi otomatis berdasarkan data presensi aktual peserta
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-blue-500 outline-hidden max-w-xs"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.gradeClass})
              </option>
            ))}
          </select>

          <button
            onClick={handleSave}
            disabled={saving || !beritaAcara}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Berita Acara'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-transparent dark:border-slate-700"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Resmi (A4)</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Perubahan Berita Acara berhasil disimpan permanen.</span>
        </div>
      )}

      {/* Official Printable Document Container */}
      {beritaAcara && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 p-8 sm:p-12 shadow-sm max-w-4xl mx-auto text-slate-900 print:border-none print:shadow-none print:p-0">
          {/* Official Letterhead (Kop Surat Resmi Standar Nasional) */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b-4 border-double border-slate-900 mb-6">
            {/* Left Logo: Logo Daerah (or School logo if no regional logo) */}
            <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
              {school?.regionalLogoUrl ? (
                <img src={school.regionalLogoUrl} alt="Logo Daerah" className="w-full h-full object-contain" />
              ) : school?.logoUrl ? (
                <img src={school.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain" />
              ) : (
                <SchoolIcon className="w-10 h-10 text-slate-700" />
              )}
            </div>

            {/* Center Letterhead Text */}
            <div className="flex-1 text-center font-serif leading-tight px-2">
              {school?.letterheadText ? (
                <div className="font-bold text-sm tracking-wide uppercase whitespace-pre-line text-slate-900">
                  {school.letterheadText}
                </div>
              ) : (
                <>
                  <p className="text-xs uppercase font-bold text-slate-700">
                    PEMERINTAH {school?.province ? `PROVINSI ${school.province.toUpperCase()}` : 'PROVINSI DAERAH'}
                  </p>
                  <p className="text-xs uppercase font-bold text-slate-700">DINAS PENDIDIKAN DAN KEBUDAYAAN</p>
                  <h3 className="text-base font-black uppercase text-slate-900 mt-0.5">{school?.name}</h3>
                </>
              )}
              <p className="text-[11px] font-sans text-slate-600 mt-1 font-normal">
                {school?.address}, {school?.city}, {school?.province} • Telp: {school?.phone || '-'} • Email: {school?.email || '-'}
              </p>
            </div>

            {/* Right Logo: Logo Sekolah (if regional logo is present) */}
            <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
              {school?.regionalLogoUrl && school?.logoUrl ? (
                <img src={school.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-6">
            <h3 className="text-base font-black tracking-wider uppercase underline font-serif">
              BERITA ACARA PELAKSANAAN UJIAN
            </h3>
            <p className="text-xs font-mono font-medium text-slate-600 mt-1">
              NOMOR: BA-{selectedExamId.toUpperCase()}-{new Date().getFullYear()}
            </p>
          </div>

          {/* Body Content */}
          <div className="space-y-4 text-xs font-serif leading-relaxed text-slate-800">
            <p>
              Pada hari ini, <span className="font-bold font-sans">{beritaAcara.dayDate}</span>, telah dilaksanakan Ujian Resmi berbasis komputer dan daring (Computer Based Test) melalui platform ISTAFA EXAM dengan rincian sebagai berikut:
            </p>

            <div className="pl-6 space-y-1.5 font-sans text-xs">
              <div className="grid grid-cols-4 gap-2">
                <span className="font-medium text-slate-600">1. Nama Ujian</span>
                <span className="col-span-3 font-bold text-slate-900">: {beritaAcara.examTitle}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <span className="font-medium text-slate-600">2. Mata Pelajaran</span>
                <span className="col-span-3 font-bold text-slate-900">: {beritaAcara.subject}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <span className="font-medium text-slate-600">3. Tingkat / Kelas</span>
                <span className="col-span-3 font-bold text-slate-900">: {beritaAcara.gradeClass}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <span className="font-medium text-slate-600">4. Waktu Pelaksanaan</span>
                <span className="col-span-3 font-semibold text-slate-900">: {beritaAcara.timeRange}</span>
              </div>
            </div>

            <p className="font-bold pt-2">Laporan Kehadiran Peserta Ujian:</p>
            <div className="pl-6 space-y-1.5 font-sans text-xs">
              <div className="grid grid-cols-4 gap-2">
                <span className="font-medium text-slate-600">Jumlah Peserta Terdaftar</span>
                <span className="col-span-3 font-bold">: {beritaAcara.totalRegistered} Siswa</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <span className="font-medium text-slate-600">Jumlah Peserta Hadir</span>
                <span className="col-span-3 font-bold text-emerald-700">: {beritaAcara.totalPresent} Siswa</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <span className="font-medium text-slate-600">Jumlah Peserta Tidak Hadir</span>
                <span className="col-span-3 font-bold text-red-700">: {beritaAcara.totalAbsent} Siswa</span>
              </div>
            </div>

            {/* Editable Notes Section */}
            <div className="pt-2 font-sans">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Catatan Peserta Tidak Hadir:
              </label>
              <input
                type="text"
                value={beritaAcara.absentStudentsNote}
                onChange={(e) => setBeritaAcara({ ...beritaAcara, absentStudentsNote: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="pt-2 font-sans">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Catatan Kejadian / Kendala Selama Ujian Berlangsung:
              </label>
              <textarea
                rows={2}
                value={beritaAcara.incidentNotes}
                onChange={(e) => setBeritaAcara({ ...beritaAcara, incidentNotes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <p className="pt-3">
              Demikian Berita Acara ini dibuat dengan sebenarnya sesuai dengan pelaksanaan teknis dan pengawasan di lapangan untuk dapat dipergunakan sebagaimana mestinya.
            </p>
          </div>

          {/* Signatures Columns */}
          <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs font-sans">
            <div>
              <p className="text-slate-600">Pengawas / Ketua Panitia Ujian,</p>
              <div className="h-16" />
              <input
                type="text"
                value={beritaAcara.headProctorName}
                onChange={(e) => setBeritaAcara({ ...beritaAcara, headProctorName: e.target.value })}
                className="w-48 text-center font-bold border-b border-dashed border-slate-400 mx-auto block text-xs outline-hidden"
              />
              <p className="text-[10px] text-slate-500 mt-1">NIP. {beritaAcara.proctorNip || '-'}</p>
            </div>

            <div>
              <p className="text-slate-600">Mengetahui,</p>
              <p className="font-semibold text-slate-700">Kepala {school?.name || 'Sekolah'}</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">{school?.principalName || 'Kepala Sekolah'}</p>
              <p className="text-[10px] text-slate-500 mt-1">{school?.principalNip ? `NIP. ${school.principalNip}` : ''}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
