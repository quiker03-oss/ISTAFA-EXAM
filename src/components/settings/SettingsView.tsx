import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldAlert,
  Volume2,
  Database,
  Download,
  Save,
  CheckCircle2,
  Lock,
  Eye,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { SchoolSettings } from '../../types';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<Partial<SchoolSettings>>({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiRequest('/api/school/settings');
        setSettings(data);
      } catch (err) {
        console.error('Failed to load school settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/api/school/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const data = await apiRequest('/api/school/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_Data_Sekolah_${Date.now()}.json`;
      a.click();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat backup data.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">Pengaturan Sistem Ujian & Anti-Kecurangan</h2>
        <p className="text-xs text-slate-500">
          Konfigurasi toleransi deteksi pelanggaran peramban, alarm audio proctor, dan backup data permanen
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan sistem berhasil disimpan.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Anti-cheat Policy */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Kebijakan Anti-Kecurangan (Anti-Cheat Engine)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tingkat Sensitivitas Pengawasan
              </label>
              <select
                value={settings.antiCheatSensitivity || 'medium'}
                onChange={(e) =>
                  setSettings({ ...settings, antiCheatSensitivity: e.target.value as any })
                }
                className="w-full px-3 py-2 border rounded-xl text-xs text-slate-900"
              >
                <option value="low">Rendah (Hanya catat tab switch)</option>
                <option value="medium">Sedang (Rekomendasi - Tab switch & Fullscreen)</option>
                <option value="strict">Ketat (Peringatan instan & batas lockout)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Toleransi Pelanggaran Sebelum Peringatan Muncul
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={settings.maxViolationsBeforeWarning || 1}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxViolationsBeforeWarning: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batas Maksimal Pelanggaran Sebelum Terkunci
              </label>
              <input
                type="number"
                min={2}
                max={10}
                value={settings.maxViolationsBeforeLockout || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxViolationsBeforeLockout: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded-xl text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="pt-2 space-y-2 text-xs font-medium text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireFullscreen !== false}
                onChange={(e) => setSettings({ ...settings, requireFullscreen: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span>Wajibkan Layar Penuh (Fullscreen Mode) saat siswa mengerjakan</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowResumeOnDisconnect !== false}
                onChange={(e) =>
                  setSettings({ ...settings, allowResumeOnDisconnect: e.target.checked })
                }
                className="w-4 h-4 rounded text-blue-600"
              />
              <span>Izinkan pemulihan sesi ujian jika koneksi internet siswa sempat terputus</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.watermarkOnExamScreen !== false}
                onChange={(e) =>
                  setSettings({ ...settings, watermarkOnExamScreen: e.target.checked })
                }
                className="w-4 h-4 rounded text-blue-600"
              />
              <span>Tampilkan watermark samar nama & NIS peserta pada latar belakang soal ujian</span>
            </label>
          </div>
        </div>

        {/* Audio Alerts Preference */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Volume2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Preferensi Alarm Suara Pengawas
            </h3>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableSoundAlerts !== false}
                onChange={(e) => setSettings({ ...settings, enableSoundAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span>Bunyikan nada peringatan di dashboard proctor saat ada pelanggaran baru</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableTtsAlerts !== false}
                onChange={(e) => setSettings({ ...settings, enableTtsAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span>Aktifkan suara pengawas otomatis (Text-to-Speech) menyebutkan nama siswa</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </form>

      {/* Database Backup Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Database className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            3. Pencadangan Data Sekolah (Backup & Restore)
          </h3>
        </div>

        <p className="text-xs text-slate-600">
          Unduh salinan arsip data sekolah, siswa, bank soal, dan paket ujian Anda dalam format terenkripsi JSON untuk keperluan arsip permanen.
        </p>

        <button
          onClick={handleDownloadBackup}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Unduh File Cadangan Database Sekolah (.json)</span>
        </button>
      </div>
    </div>
  );
};
