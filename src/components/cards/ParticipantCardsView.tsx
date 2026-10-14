import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Printer,
  Filter,
  Search,
  Download,
  School as SchoolIcon,
  User,
  QrCode as QrCodeIcon,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { Student } from '../../types';

export const ParticipantCardsView: React.FC = () => {
  const { school } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [search, setSearch] = useState('');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const data = await apiRequest('/api/students');
        setStudents(data);

        // Generate QR codes for all students
        const qrs: Record<string, string> = {};
        for (const s of data) {
          const verificationUrl = `${window.location.origin}/?verify=${s.participantCode}&nis=${s.nis}`;
          const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
            width: 160,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          qrs[s.id] = qrDataUrl;
        }
        setQrMap(qrs);
      } catch (err) {
        console.error('Failed to load students for cards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const classes = Array.from(new Set(students.map((s) => s.gradeClass))).filter(Boolean);

  const filteredStudents = students.filter((s) => {
    const matchesClass = selectedClass === 'ALL' || s.gradeClass === selectedClass;
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.nis.includes(search) ||
      s.participantCode.includes(search);
    return matchesClass && matchesSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Print Action (Hidden on Print) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden transition-colors">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Kartu Peserta Ujian Resmi</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cetak kartu ujian berstandar resmi dilengkapi QR code autentikasi peserta
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 outline-hidden"
            >
              <option value="ALL">Semua Kelas ({students.length})</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa / NIS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 outline-hidden w-48"
            />
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kartu Ujian (A4)</span>
          </button>
        </div>
      </div>

      {/* Grid of Participant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:p-0">
        {filteredStudents.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Tidak ada siswa untuk ditampilkan kartu ujian.
          </div>
        ) : (
          filteredStudents.map((s) => {
            const qrUrl = qrMap[s.id];
            return (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden print:bg-white print:border-slate-800 print:text-black print:shadow-none print:break-inside-avoid transition-colors"
                style={{ minHeight: '260px' }}
              >
                {/* Header Kop Kartu */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b-2 border-slate-900 dark:border-slate-300 print:border-slate-900 mb-3">
                  {/* Left Logo: Logo Daerah (or Logo Sekolah if no regional logo) */}
                  <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-slate-800 print:bg-transparent border border-blue-200 dark:border-slate-700 print:border-none flex items-center justify-center shrink-0 overflow-hidden">
                    {school?.regionalLogoUrl ? (
                      <img src={school.regionalLogoUrl} alt="Logo Daerah" className="w-full h-full object-contain" />
                    ) : school?.logoUrl ? (
                      <img src={school.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain" />
                    ) : (
                      <SchoolIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>

                  {/* Center Text */}
                  <div className="flex-1 text-center px-1">
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 print:text-slate-600 uppercase tracking-wider">
                      KARTU PESERTA UJIAN ONLINE
                    </p>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white print:text-black uppercase leading-tight line-clamp-1">
                      {school?.name || 'SEKOLAH NEGERI'}
                    </h4>
                    <p className="text-[8px] text-slate-500 dark:text-slate-400 print:text-slate-600">
                      Tahun Pelajaran {s.academicYear} • {school?.city || 'Indonesia'}
                    </p>
                  </div>

                  {/* Right Logo: Logo Sekolah (if regional logo exists) */}
                  {school?.regionalLogoUrl && school?.logoUrl && (
                    <div className="w-11 h-11 rounded-lg bg-indigo-50 dark:bg-slate-800 print:bg-transparent border border-indigo-200 dark:border-slate-700 print:border-none flex items-center justify-center shrink-0 overflow-hidden">
                      <img src={school.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="flex items-start justify-between gap-4 flex-1">
                  {/* Student Details */}
                  <div className="space-y-1.5 flex-1 text-xs">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500 text-[11px]">Nama Lengkap</span>
                      <span className="col-span-2 font-bold text-slate-900 truncate">
                        : {s.fullName}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500 text-[11px]">NIS / NISN</span>
                      <span className="col-span-2 font-mono font-semibold text-slate-800">
                        : {s.nis} {s.nisn ? `/ ${s.nisn}` : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500 text-[11px]">Kelas / Rombel</span>
                      <span className="col-span-2 font-semibold text-slate-800">
                        : {s.gradeClass} {s.rombel ? `(${s.rombel})` : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500 text-[11px]">Jenis Kelamin</span>
                      <span className="col-span-2 font-semibold text-slate-800">
                        : {s.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100">
                      <span className="text-blue-700 font-bold text-[11px]">KODE PESERTA</span>
                      <span className="col-span-2 font-mono font-black text-blue-700 text-xs tracking-wider">
                        : {s.participantCode}
                      </span>
                    </div>
                  </div>

                  {/* QR Code and Photo Column */}
                  <div className="flex flex-col items-center justify-center shrink-0 pl-2 border-l border-slate-200">
                    {qrUrl ? (
                      <div className="p-1 rounded-lg border border-slate-300 bg-white">
                        <img src={qrUrl} alt="QR Code" className="w-20 h-20 object-contain" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                        <QrCodeIcon className="w-8 h-8" />
                      </div>
                    )}
                    <span className="text-[8px] font-mono font-bold text-slate-500 mt-1 uppercase">
                      Scan Validasi
                    </span>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className="pt-2 mt-3 border-t border-slate-200 flex items-end justify-between text-[9px] text-slate-500">
                  <div>
                    <p className="italic">* Harap dibawa saat memasuki ruang ujian.</p>
                    <p className="font-mono text-[8px] text-slate-400">ISTAFA EXAM SECURE SYSTEM</p>
                  </div>
                  <div className="text-right">
                    <p>Kepala Sekolah,</p>
                    <div className="h-6" />
                    <p className="font-bold text-slate-900 underline">
                      {school?.principalName || 'Kepala Sekolah'}
                    </p>
                    <p className="text-[8px]">{school?.principalNip ? `NIP. ${school.principalNip}` : ''}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
