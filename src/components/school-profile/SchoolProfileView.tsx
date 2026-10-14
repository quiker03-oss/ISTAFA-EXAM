import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  School as SchoolIcon,
  Phone,
  Mail,
  Globe,
  MapPin,
  UserCheck,
  Trash2,
  Eye,
  Shield,
  Landmark,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { School } from '../../types';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

export const SchoolProfileView: React.FC = () => {
  const { school, updateSchoolProfile } = useAuth();
  const [formData, setFormData] = useState<Partial<School>>({});
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [regionalLogoUploading, setRegionalLogoUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Logo Delete Modal State
  const [logoDeleteModal, setLogoDeleteModal] = useState<{ isOpen: boolean; type: 'school' | 'regional' }>({
    isOpen: false,
    type: 'school',
  });
  const [logoDeleteLoading, setLogoDeleteLoading] = useState(false);

  // Sync initial school data with local storage backup fallback to guarantee persistence
  useEffect(() => {
    if (school) {
      const schoolId = school.id;
      const cachedLogo = localStorage.getItem(`school_logo_${schoolId}`);
      const cachedRegional = localStorage.getItem(`school_regional_logo_${schoolId}`);

      setFormData({
        ...school,
        logoUrl: school.logoUrl || cachedLogo || '',
        regionalLogoUrl: school.regionalLogoUrl || cachedRegional || '',
      });

      // Update local storage cache
      if (school.logoUrl) localStorage.setItem(`school_logo_${schoolId}`, school.logoUrl);
      if (school.regionalLogoUrl) localStorage.setItem(`school_regional_logo_${schoolId}`, school.regionalLogoUrl);
    }
  }, [school]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await apiRequest('/api/school/profile', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      if (res.school) {
        updateSchoolProfile(res.school);
        if (res.school.logoUrl) {
          localStorage.setItem(`school_logo_${res.school.id}`, res.school.logoUrl);
        }
        if (res.school.regionalLogoUrl) {
          localStorage.setItem(`school_regional_logo_${res.school.id}`, res.school.regionalLogoUrl);
        }
        setMessage({ type: 'success', text: 'Identitas, logo, dan format Kop Surat sekolah berhasil disimpan permanen.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan data profil.' });
    } finally {
      setLoading(false);
    }
  };

  // Upload School Logo (Lambang Sekolah / Tut Wuri)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const data = new FormData();
    data.append('logo', file);

    setLogoUploading(true);
    setMessage(null);
    try {
      const res = await apiRequest('/api/school/upload-logo', {
        method: 'POST',
        body: data,
      });
      if (res.logoUrl) {
        setFormData((prev) => ({ ...prev, logoUrl: res.logoUrl }));
        if (school) {
          updateSchoolProfile({ ...school, logoUrl: res.logoUrl });
          localStorage.setItem(`school_logo_${school.id}`, res.logoUrl);
        }
        setMessage({ type: 'success', text: 'Logo Sekolah berhasil diunggah dan disimpan permanen.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal mengunggah logo sekolah.' });
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  // Prompt Remove School Logo
  const promptRemoveLogo = () => {
    setLogoDeleteModal({ isOpen: true, type: 'school' });
  };

  // Prompt Remove Regional Logo
  const promptRemoveRegionalLogo = () => {
    setLogoDeleteModal({ isOpen: true, type: 'regional' });
  };

  // Execute Logo Removal
  const executeRemoveLogo = async () => {
    setLogoDeleteLoading(true);
    setMessage(null);
    try {
      if (logoDeleteModal.type === 'school') {
        await apiRequest('/api/school/remove-logo', { method: 'POST' });
        setFormData((prev) => ({ ...prev, logoUrl: '' }));
        if (school) {
          updateSchoolProfile({ ...school, logoUrl: '' });
          localStorage.removeItem(`school_logo_${school.id}`);
        }
        setMessage({ type: 'success', text: 'Logo sekolah telah berhasil dihapus.' });
      } else {
        await apiRequest('/api/school/remove-regional-logo', { method: 'POST' });
        setFormData((prev) => ({ ...prev, regionalLogoUrl: '' }));
        if (school) {
          updateSchoolProfile({ ...school, regionalLogoUrl: '' });
          localStorage.removeItem(`school_regional_logo_${school.id}`);
        }
        setMessage({ type: 'success', text: 'Logo daerah telah berhasil dihapus dari Kop Surat.' });
      }
      setLogoDeleteModal({ isOpen: false, type: 'school' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal menghapus logo.' });
    } finally {
      setLogoDeleteLoading(false);
    }
  };

  // Upload Regional / Pemda Logo (Logo Daerah / Dinas)
  const handleRegionalLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const data = new FormData();
    data.append('logo', file);

    setRegionalLogoUploading(true);
    setMessage(null);
    try {
      const res = await apiRequest('/api/school/upload-regional-logo', {
        method: 'POST',
        body: data,
      });
      if (res.regionalLogoUrl) {
        setFormData((prev) => ({ ...prev, regionalLogoUrl: res.regionalLogoUrl }));
        if (school) {
          updateSchoolProfile({ ...school, regionalLogoUrl: res.regionalLogoUrl });
          localStorage.setItem(`school_regional_logo_${school.id}`, res.regionalLogoUrl);
        }
        setMessage({ type: 'success', text: 'Logo Daerah/Pemda berhasil diunggah dan disimpan permanen di Kop Surat.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal mengunggah logo daerah.' });
    } finally {
      setRegionalLogoUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Info Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl overflow-hidden shrink-0 shadow-inner">
            {formData.logoUrl ? (
              <img src={formData.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain p-1" />
            ) : (
              <SchoolIcon className="w-8 h-8" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{formData.name || 'Profil Sekolah'}</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              NPSN: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{formData.npsn}</span> • Jenjang: {formData.educationLevel} • TP: {formData.academicYear || '2024/2025'} ({formData.semester || 'Ganjil'})
            </p>
          </div>
        </div>

        {/* Status of Logos */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kelengkapan Kop Surat</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {formData.logoUrl && formData.regionalLogoUrl
                ? '✅ 2 Logo Terpasang Lengkap'
                : formData.logoUrl || formData.regionalLogoUrl
                ? '⚠️ 1 Logo Terpasang'
                : 'Belum Ada Logo'}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 transition-all animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section: Upload Logo Daerah & Logo Sekolah */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-5 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                1. Pengaturan Logo Kop Surat (Daerah & Sekolah)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Tersimpan Permanen</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Logo Daerah (Kiri Kop) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-amber-500" />
                    Logo Daerah / Pemda / Dinas (Sisi Kiri)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Lambang Pemerintah Kab/Kota/Provinsi atau Dinas Pendidikan
                  </p>
                </div>
                {formData.regionalLogoUrl && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                    Aktif
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 pt-1">
                <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {formData.regionalLogoUrl ? (
                    <img
                      src={formData.regionalLogoUrl}
                      alt="Logo Daerah"
                      className="w-full h-full object-contain p-1.5"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <Landmark className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <span className="text-[9px] block mt-1 leading-tight">Belum Ada</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition-colors w-full shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{regionalLogoUploading ? 'Mengunggah...' : formData.regionalLogoUrl ? 'Ganti Logo Daerah' : 'Unggah Logo Daerah'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleRegionalLogoUpload}
                      disabled={regionalLogoUploading}
                      className="hidden"
                    />
                  </label>

                  {formData.regionalLogoUrl && (
                    <button
                      type="button"
                      onClick={promptRemoveRegionalLogo}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus Logo Daerah</span>
                    </button>
                  )}
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Format: PNG, JPG, atau WebP. Tidak akan ter-reset otomatis.
                  </p>
                </div>
              </div>
            </div>

            {/* Box 2: Logo Sekolah (Kanan Kop) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <SchoolIcon className="w-3.5 h-3.5 text-blue-500" />
                    Logo Sekolah / Tut Wuri (Sisi Kanan)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Lambang resmi institusi sekolah atau logo Tut Wuri Handayani
                  </p>
                </div>
                {formData.logoUrl && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                    Aktif
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 pt-1">
                <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo Sekolah"
                      className="w-full h-full object-contain p-1.5"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <SchoolIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <span className="text-[9px] block mt-1 leading-tight">Belum Ada</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors w-full shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{logoUploading ? 'Mengunggah...' : formData.logoUrl ? 'Ganti Logo Sekolah' : 'Unggah Logo Sekolah'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      disabled={logoUploading}
                      className="hidden"
                    />
                  </label>

                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={promptRemoveLogo}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus Logo Sekolah</span>
                    </button>
                  )}
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Format: PNG, JPG, atau WebP. Tidak akan ter-reset otomatis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Live Kop Surat Preview (Pratinjau Resmi) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                2. Pratinjau Kop Surat Resmi (Sesuai Standar Kedinasan)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Tampilan di Kartu, Berita Acara, Naskah Soal & Laporan</span>
          </div>

          <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
            {/* White Paper Simulation */}
            <div className="bg-white text-slate-900 p-6 rounded-xl border border-slate-300 shadow-md max-w-3xl mx-auto">
              {/* Kop Header */}
              <div className="flex items-center justify-between gap-4 pb-3 border-b-4 border-double border-slate-900">
                {/* Logo Daerah (Kiri) */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                  {formData.regionalLogoUrl ? (
                    <img
                      src={formData.regionalLogoUrl}
                      alt="Logo Daerah"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-[10px] p-1 text-center">
                      <Landmark className="w-5 h-5 text-slate-300 mb-0.5" />
                      <span>Logo Daerah</span>
                    </div>
                  )}
                </div>

                {/* Kop Text (Tengah) */}
                <div className="flex-1 text-center font-serif leading-tight px-2">
                  {formData.letterheadText ? (
                    <div className="font-bold text-xs sm:text-sm tracking-wide uppercase whitespace-pre-line text-slate-900">
                      {formData.letterheadText}
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] sm:text-xs uppercase font-bold text-slate-700">
                        PEMERINTAH {formData.province ? `PROVINSI ${formData.province.toUpperCase()}` : 'PROVINSI DAERAH'}
                      </p>
                      <p className="text-[11px] sm:text-xs uppercase font-bold text-slate-700">
                        DINAS PENDIDIKAN DAN KEBUDAYAAN
                      </p>
                      <h4 className="text-sm sm:text-base font-black uppercase text-slate-900 mt-0.5">
                        {formData.name || 'SEKOLAH NEGERI'}
                      </h4>
                    </>
                  )}
                  <p className="text-[10px] sm:text-[11px] font-sans text-slate-600 mt-1 font-normal">
                    {formData.address ? `${formData.address}, ${formData.subdistrict || ''}, ${formData.city || ''}` : 'Alamat Sekolah'}
                    {formData.phone ? ` • Telp: ${formData.phone}` : ''}
                    {formData.email ? ` • Email: ${formData.email}` : ''}
                  </p>
                </div>

                {/* Logo Sekolah (Kanan) */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo Sekolah"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-[10px] p-1 text-center">
                      <SchoolIcon className="w-5 h-5 text-slate-300 mb-0.5" />
                      <span>Logo Sekolah</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Content Watermark */}
              <div className="mt-4 py-3 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-[11px] font-mono">
                [ Isi Dokumen: Kartu Peserta Ujian / Naskah Ujian / Berita Acara / Laporan Nilai ]
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Teks Baris Kop Surat (Gunakan Baris Baru untuk Memisahkan Judul Instansi)
            </label>
            <textarea
              name="letterheadText"
              rows={3}
              value={formData.letterheadText || ''}
              onChange={handleChange}
              className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              placeholder="PEMERINTAH PROVINSI ...&#10;DINAS PENDIDIKAN ...&#10;SEKOLAH ..."
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Contoh baris 1: PEMERINTAH DAERAH PROVINSI JAWA BARAT, baris 2: DINAS PENDIDIKAN CABANG WILAYAH I, baris 3: SMAN 1 TELADAN
            </p>
          </div>
        </div>

        {/* Section: Identitas Umum Sekolah */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              3. Identitas Resmi Sekolah
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Resmi Sekolah *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NPSN (Nomor Pokok Sekolah Nasional) *
              </label>
              <input
                type="text"
                name="npsn"
                value={formData.npsn || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jenjang Pendidikan
              </label>
              <select
                name="educationLevel"
                value={formData.educationLevel || 'SMA'}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              >
                <option value="SD">SD (Sekolah Dasar)</option>
                <option value="MI">MI (Madrasah Ibtidaiyah)</option>
                <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                <option value="MTs">MTs (Madrasah Tsanawiyah)</option>
                <option value="SMA">SMA (Sekolah Menengah Atas)</option>
                <option value="MA">MA (Madrasah Aliyah)</option>
                <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tahun Pelajaran Aktif
              </label>
              <input
                type="text"
                name="academicYear"
                value={formData.academicYear || ''}
                onChange={handleChange}
                placeholder="2024/2025"
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Semester Aktif
              </label>
              <select
                name="semester"
                value={formData.semester || 'Ganjil'}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section: Kepala Sekolah & Kontak */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              4. Kepala Sekolah & Kontak
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Kepala Sekolah (Beserta Gelar)
              </label>
              <input
                type="text"
                name="principalName"
                value={formData.principalName || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                name="principalNip"
                value={formData.principalNip || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Sekolah
              </label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Telepon
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Lengkap Sekolah
              </label>
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kecamatan
              </label>
              <input
                type="text"
                name="subdistrict"
                value={formData.subdistrict || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kabupaten / Kota
              </label>
              <input
                type="text"
                name="city"
                value={formData.city || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Provinsi
              </label>
              <input
                type="text"
                name="province"
                value={formData.province || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Website Resmi
              </label>
              <input
                type="text"
                name="website"
                value={formData.website || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Menyimpan...' : 'Simpan Profil & Format Kop Permanen'}</span>
          </button>
        </div>
      </form>

      {/* Modal Konfirmasi Hapus Logo Kop Surat */}
      <ConfirmDeleteModal
        isOpen={logoDeleteModal.isOpen}
        onClose={() => setLogoDeleteModal({ isOpen: false, type: 'school' })}
        onConfirm={executeRemoveLogo}
        isLoading={logoDeleteLoading}
        title={logoDeleteModal.type === 'school' ? 'Hapus Logo Sekolah' : 'Hapus Logo Daerah'}
        message={
          logoDeleteModal.type === 'school'
            ? 'Apakah Anda yakin ingin menghapus Logo Sekolah? Gambar logo sekolah akan dihilangkan dari kop surat dan kartu peserta ujian.'
            : 'Apakah Anda yakin ingin menghapus Logo Daerah / Pemda? Logo daerah akan dihilangkan dari kop surat resmi.'
        }
        confirmText={logoDeleteModal.type === 'school' ? 'Ya, Hapus Logo Sekolah' : 'Ya, Hapus Logo Daerah'}
      />
    </div>
  );
};
