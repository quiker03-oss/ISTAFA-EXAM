import React, { useState } from 'react';
import { ShieldCheck, User, Lock, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';

export const AccountSecurityView: React.FC = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    setLoading(true);
    // Simulating password update
    setTimeout(() => {
      setLoading(false);
      setMsg({ type: 'success', text: 'Informasi akun dan keamanan berhasil diperbarui.' });
      setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">Profil & Keamanan Akun Admin</h2>
        <p className="text-xs text-slate-500">
          Kelola informasi nama penanggung jawab dan perbarui kata sandi secara aman
        </p>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Username (Tetap)</label>
          <input
            type="text"
            value={user?.username || ''}
            disabled
            className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Pengelola</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
            required
          />
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-4">
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ganti Kata Sandi (Opsional)</p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password Saat Ini</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password Baru</label>
              <input
                type="password"
                placeholder="Minimal 6 karakter"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi Password Baru</label>
              <input
                type="password"
                placeholder="Ulangi password baru"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Menyimpan...' : 'Perbarui Profil'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
