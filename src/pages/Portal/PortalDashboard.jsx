import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  LogOut, 
  Calendar, 
  CreditCard, 
  Award, 
  UserCheck, 
  Sparkles, 
  User, 
  Phone, 
  ShieldCheck 
} from 'lucide-react';
import { getStudentInitials } from '../../utils/helpers';

export default function PortalDashboard() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(() => {
    try {
      const stored = localStorage.getItem('activeStudent') || sessionStorage.getItem('portal_student_data');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const studentId = studentData?.id || sessionStorage.getItem('portal_student_id') || 'STUDENT-DOC-ID';

  useEffect(() => {
    try {
      const stored = localStorage.getItem('activeStudent') || sessionStorage.getItem('portal_student_data');
      if (stored) {
        setStudentData(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Error reading activeStudent data:', e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('activeStudent');
    sessionStorage.removeItem('portal_student_id');
    sessionStorage.removeItem('portal_parent_phone');
    sessionStorage.removeItem('portal_student_data');
    navigate('/portal');
  };

  const studentName = studentData?.studentName || 'Siswa Akademi';
  const sport = studentData?.sportCategory || 'Badminton';
  const className = studentData?.className || 'Reguler';
  const coachName = studentData?.coachName || 'Instruktur Utama';

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen text-slate-800">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 pb-8 rounded-b-3xl shadow-lg relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold tracking-wide uppercase text-blue-100">
              Portal Wali Murid
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Keluar dari Portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Welcome Text */}
        <h1 className="text-xl font-black text-white leading-tight">
          Selamat Datang di Portal Wali Murid
        </h1>
        <p className="text-xs text-blue-100 mt-1">
          Akses informasi latihan, absensi, dan administrasi siswa secara transparan dan real-time.
        </p>

        {/* Student Profile Card */}
        <div className="mt-4 p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center gap-3">
          {studentData?.photoUrl ? (
            <img
              src={studentData.photoUrl}
              alt={studentName}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/40 shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-sm shrink-0 border border-white/30">
              {getStudentInitials(studentName)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-sm text-white truncate">{studentName}</h2>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full text-[9px] font-bold">
                Aktif
              </span>
            </div>
            <p className="text-[11px] text-blue-100 truncate mt-0.5">
              {sport} &bull; Kelas: {className}
            </p>
            <p className="text-[10px] text-blue-200 font-mono truncate mt-0.5">
              ID: {studentId}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-5 -mt-4 space-y-4 flex-1">
        {/* Quick Status Info */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-slate-800">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Informasi Pelatih
              </h3>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
              {sport}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Instruktur / Pelatih: <strong className="text-slate-800">{coachName}</strong>. Jadwal latihan mingguan dan rekap presensi akan diperbarui secara berkala oleh tim pelatih akademi.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-left">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Jadwal Sesi</h3>
            <p className="text-[11px] text-slate-500 leading-tight">Jadwal latihan mingguan &amp; info lapangan</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-left">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Presensi</h3>
            <p className="text-[11px] text-slate-500 leading-tight">Rekap absensi &amp; kehadiran ananda</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-left">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Tagihan SPP</h3>
            <p className="text-[11px] text-slate-500 leading-tight">Status iuran bulanan &amp; bukti pembayaran</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-left">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Prestasi</h3>
            <p className="text-[11px] text-slate-500 leading-tight">Catatan prestasi kejuaraan &amp; turnamen</p>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="p-4 text-center text-slate-400 text-[10px] border-t border-slate-200 bg-white">
        <div className="flex items-center justify-center gap-1 text-slate-500 font-semibold mb-0.5">
          <ShieldCheck className="w-3 h-3 text-blue-600" />
          <span>CHUA SPORT CORE &bull; PORTAL RESMI</span>
        </div>
        <p>Terhubung langsung dengan database akademi olahraga</p>
      </div>
    </div>
  );
}
