import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  FileText,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  Sparkles,
  Search,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';

export const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, schoolsData] = await Promise.all([
        apiRequest('/api/super/stats'),
        apiRequest('/api/super/schools'),
      ]);
      setStats(statsData);
      setSchools(schoolsData);
    } catch (err) {
      console.error('Failed to load super admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (schoolId: string) => {
    try {
      setActionLoading(schoolId);
      await apiRequest(`/api/super/schools/${schoolId}/approve`, { method: 'POST' });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyetujui sekolah.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (schoolId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      setActionLoading(schoolId);
      await apiRequest(`/api/super/schools/${schoolId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status sekolah.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.npsn.includes(search) ||
      s.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              ISTAFA EXAM — Super Admin Panel
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-semibold">
                Otoritas Pusat
              </span>
            </h1>
            <p className="text-xs text-slate-400">Pengelolaan multi-sekolah, aktivasi akun, dan pemantauan sistem</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-200">{user?.fullName}</p>
            <p className="text-[10px] text-amber-400">@{user?.username} (Master Super)</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* KPI Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Total Sekolah</span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats?.totalSchools ?? '-'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Sekolah Aktif</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{stats?.activeSchools ?? '-'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Menunggu ACC</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats?.pendingSchools ?? '-'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Total Siswa</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-indigo-400">{stats?.totalStudents ?? '-'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Total Ujian</span>
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-400">{stats?.totalExams ?? '-'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Sesi Berjalan</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-cyan-400">{stats?.totalSessions ?? '-'}</p>
          </div>
        </div>

        {/* Schools Table Section */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Daftar Institusi Sekolah Terdaftar</h2>
              <p className="text-xs text-slate-400">Verifikasi dan kontrol akses tenant sekolah di platform</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari nama / NPSN / kota..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-500 outline-hidden w-64"
                />
              </div>
              <button
                onClick={fetchData}
                className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Muat Ulang Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Sekolah / NPSN</th>
                  <th className="py-3 px-4">Jenjang & Wilayah</th>
                  <th className="py-3 px-4">Kepala Sekolah</th>
                  <th className="py-3 px-4 text-center">Siswa</th>
                  <th className="py-3 px-4 text-center">Ujian</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi Super Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Tidak ada sekolah yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((school) => {
                    const isPending = school.status === 'pending_approval';
                    const isActive = school.status === 'active';
                    const isSuspended = school.status === 'suspended';

                    return (
                      <tr key={school.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white text-sm">{school.name}</p>
                          <p className="text-[11px] text-slate-500">
                            NPSN: <span className="font-mono text-slate-400">{school.npsn}</span> • Akun: @{school.adminUsername}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-blue-900/40 text-blue-300 border border-blue-800 text-[10px] font-semibold">
                            {school.educationLevel}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {school.city || school.province || 'Indonesia'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-200">{school.principalName || '-'}</p>
                          <p className="text-[10px] text-slate-500">{school.phone || school.email}</p>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                          {school.studentCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                          {school.examCount}
                        </td>
                        <td className="py-3.5 px-4">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              Menunggu ACC
                            </span>
                          )}
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle className="w-3 h-3" />
                              Aktif
                            </span>
                          )}
                          {isSuspended && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Ditangguhkan
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {isPending ? (
                            <button
                              onClick={() => handleApprove(school.id)}
                              disabled={actionLoading === school.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors disabled:opacity-50"
                            >
                              {actionLoading === school.id ? 'Memproses...' : 'Setujui Sekolah'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(school.id, school.status)}
                              disabled={actionLoading === school.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                isActive
                                  ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                                  : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                            >
                              {actionLoading === school.id
                                ? '...'
                                : isActive
                                ? 'Tangguhkan'
                                : 'Aktifkan Kembali'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
