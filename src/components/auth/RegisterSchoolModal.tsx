import React, { useState } from 'react';
import { X, Building2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface RegisterSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterSchoolModal: React.FC<RegisterSchoolModalProps> = ({ isOpen, onClose }) => {
  const [form, setForm] = useState({
    name: '',
    npsn: '',
    educationLevel: 'SMA',
    address: '',
    subdistrict: '',
    city: '',
    province: '',
    principalName: '',
    principalNip: '',
    phone: '',
    email: '',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    adminUsername: '',
    adminPassword: '',
    adminFullName: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mendaftarkan sekolah.');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Pendaftaran Sekolah Baru</h3>
            <p className="text-xs text-slate-400">
              Registrasi sekolah ke platform ISTAFA EXAM (memerlukan persetujuan Super Admin)
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Pendaftaran Berhasil Diajukan!</h4>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Sekolah <span className="font-semibold text-white">{form.name}</span> telah terdaftar dalam antrean persetujuan. Akun Admin Sekolah dengan username <span className="font-semibold text-blue-400">@{form.adminUsername}</span> akan aktif segera setelah diverifikasi oleh Super Admin ISTAFA.
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
              >
                Kembali ke Halaman Login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800 pb-1">
              1. Identitas Institusi Sekolah
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Resmi Sekolah *
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Contoh: SMA Negeri 1 Maju Bersama"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  NPSN *
                </label>
                <input
                  type="text"
                  name="npsn"
                  value={form.npsn}
                  onChange={handleChange}
                  placeholder="8 Digit NPSN Resmi"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jenjang Pendidikan
                </label>
                <select
                  name="educationLevel"
                  value={form.educationLevel}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                >
                  <option value="SD">SD (Sekolah Dasar)</option>
                  <option value="MI">MI (Madrasah Ibtidaiyah)</option>
                  <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                  <option value="MTs">MTs (Madrasah Tsanawiyah)</option>
                  <option value="SMA">SMA (Sekolah Menengah Atas)</option>
                  <option value="MA">MA (Madrasah Aliyah)</option>
                  <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                  <option value="Lainnya">Lainnya / Perguruan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  name="principalName"
                  value={form.principalName}
                  onChange={handleChange}
                  placeholder="Nama Lengkap & Gelar"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alamat Lengkap Sekolah
                </label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Jalan, Nomor, RT/RW"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kabupaten / Kota
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Kota / Kabupaten"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Provinsi
                </label>
                <input
                  type="text"
                  name="province"
                  value={form.province}
                  onChange={handleChange}
                  placeholder="Provinsi"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Resmi Sekolah *
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="kontak@sekolah.sch.id"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="08123456789"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800 pb-1 pt-3">
              2. Kredensial Akun Admin Sekolah
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Lengkap Admin Pengelola *
                </label>
                <input
                  type="text"
                  name="adminFullName"
                  value={form.adminFullName}
                  onChange={handleChange}
                  placeholder="Nama Lengkap Penanggung Jawab"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Username Admin Baru *
                </label>
                <input
                  type="text"
                  name="adminUsername"
                  value={form.adminUsername}
                  onChange={handleChange}
                  placeholder="Contoh: admin_sman1"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password Akun Admin *
                </label>
                <input
                  type="password"
                  name="adminPassword"
                  value={form.adminPassword}
                  onChange={handleChange}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Mengirim Pendaftaran...' : 'Ajukan Pendaftaran Sekolah'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
