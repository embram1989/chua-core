import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  LogOut, 
  CreditCard, 
  QrCode, 
  User, 
  Calendar, 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight,
  Clock,
  Phone
} from 'lucide-react';
import { getStudentInitials, calculateAge } from '../../utils/helpers';

/**
 * Helper to format number into IDR currency format
 */
const formatRupiah = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

export default function PortalDashboard() {
  const navigate = useNavigate();

  // 1. Route Guard & Inisialisasi: Ambil data activeStudent dari localStorage
  const student = (() => {
    try {
      const stored = localStorage.getItem('activeStudent');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn('Gagal membaca data activeStudent:', e);
      return null;
    }
  })();

  // Jika tidak ada data siswa aktif, redirect langsung ke halaman login portal
  if (!student) {
    return <Navigate to="/portal" replace />;
  }

  // 2. Handler Tombol Keluar
  const handleLogout = () => {
    localStorage.removeItem('activeStudent');
    sessionStorage.removeItem('portal_student_id');
    sessionStorage.removeItem('portal_parent_phone');
    sessionStorage.removeItem('portal_student_data');
    navigate('/portal');
  };

  const studentName = student.studentName || 'Nama Siswa';
  const photoUrl = student.photoUrl || null;
  const academyName = student.academyName || 'Sport Academy';
  const sportCategory = student.sportCategory || 'Badminton';
  const className = student.className || 'Reguler';
  const coachName = student.coachName || 'Instruktur Utama';
  const monthlyFee = student.monthlyFee || '350000';
  const age = calculateAge(student.birthDate);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen text-slate-800">
      {/* 2. HEADER MOBILE-FRIENDLY & TOMBOL KELUAR */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-black text-slate-900 tracking-tight leading-tight">
              PORTAL WALI MURID
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              Chua Sport Academy
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold rounded-xl border border-slate-200/80 hover:border-rose-200 transition-colors cursor-pointer"
          title="Keluar dari Portal"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </header>

      {/* CONTAINER BODY UTAMA */}
      <main className="p-4 sm:p-5 space-y-4 flex-1">
        
        {/* 3. KARTU PROFIL UTAMA (HERO SECTION DENGAN GRADIEN MODERN) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white p-5 shadow-lg shadow-blue-600/15">
          {/* Subtle Ambient Background Shapes */}
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />

          {/* Top Badge: Cabang & Akademi */}
          <div className="flex items-center justify-between gap-2 mb-3.5 relative z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wider border border-white/20">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{sportCategory}</span>
            </span>
            <span className="text-[11px] font-bold text-blue-100/90 truncate max-w-[160px]">
              {academyName}
            </span>
          </div>

          {/* Profile Details Row */}
          <div className="flex items-start gap-3.5 relative z-10">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={studentName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/60 shadow-md bg-white shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md text-white font-black text-xl flex items-center justify-center shrink-0 border-2 border-white/40 shadow-md">
                {getStudentInitials(studentName)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black text-white leading-tight break-words">
                {studentName}
              </h2>
              <p className="text-[11px] text-blue-100/90 mt-0.5 font-medium">
                {age !== '-' ? `${age} Tahun` : 'Siswa Aktif'}
                {student.schoolOrigin ? ` • ${student.schoolOrigin}` : ''}
              </p>
              <p className="text-[10px] font-mono text-blue-200 mt-1 tracking-wider opacity-90">
                ID: {student.id}
              </p>
            </div>
          </div>

          {/* Metadata Chips: Kelas & Pelatih */}
          <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-2 gap-2 relative z-10 text-xs">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 flex items-center gap-2 border border-white/10">
              <BookOpen className="w-4 h-4 text-blue-200 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-blue-200 font-bold">Kelas</p>
                <p className="font-bold text-white text-[11px] truncate">{className}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 flex items-center gap-2 border border-white/10">
              <User className="w-4 h-4 text-blue-200 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-blue-200 font-bold">Pelatih</p>
                <p className="font-bold text-white text-[11px] truncate">{coachName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. SEKSI ADMINISTRASI SPP (KARTU PUTIH DENGAN PREPARASI PEMBAYARAN) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Administrasi Iuran SPP
                </h3>
                <p className="text-[11px] text-slate-400">
                  Iuran bulanan pembinaan atlet
                </p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-100">
              Reguler
            </span>
          </div>

          {/* Informasi Nominal SPP */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Nominal Iuran Dasar
              </p>
              <p className="text-base font-black text-slate-900 mt-0.5">
                {formatRupiah(monthlyFee)}
                <span className="text-xs font-medium text-slate-400"> / bulan</span>
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg border border-amber-200/80">
                Siap Dibayar
              </span>
            </div>
          </div>

          {/* Tombol Lihat QRIS / Bayar (Statis Persiapan Integrasi) */}
          <button
            type="button"
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Lihat QRIS / Bayar</span>
            <ChevronRight className="w-4 h-4 opacity-80" />
          </button>

          <p className="text-[10px] text-slate-400 text-center leading-normal">
            Pembayaran iuran dapat dilakukan melalui QRIS statis/dinamis yang terverifikasi otomatis.
          </p>
        </div>

        {/* SEKSI AKTIVITAS & INFORMASI AKADEMI */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Informasi Sesi Latihan
              </h3>
              <p className="text-[11px] text-slate-400">
                Jadwal mingguan &amp; catatan pelatih
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/70 text-xs text-blue-900 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span>Sesi Kelas {className}</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                Terjadwal
              </span>
            </div>
            <p className="text-[11px] text-blue-700/90 leading-relaxed">
              Pastikan atlet hadir 15 menit sebelum sesi dimulai dengan seragam latihan resmi.
            </p>
          </div>
        </div>

      </main>

      {/* FOOTER INFORMASI */}
      <footer className="p-4 text-center text-slate-400 text-[10px] border-t border-slate-200 bg-white">
        <div className="flex items-center justify-center gap-1.5 text-slate-600 font-semibold mb-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>PORTAL RESMI WALI MURID</span>
        </div>
        <p>CHUA SPORT CORE &bull; Sistem Terpadu Manajemen Akademi</p>
      </footer>
    </div>
  );
}
