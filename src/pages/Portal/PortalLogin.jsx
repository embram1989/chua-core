import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { GraduationCap, Phone, Hash, ArrowRight, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function PortalLogin() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!studentId.trim() || !parentPhone.trim()) {
      setErrorMsg('Mohon lengkapi ID Siswa dan Nomor HP Wali.');
      return;
    }

    setLoading(true);

    try {
      let isApiHandled = false;

      // 1. Panggil endpoint Cloudflare Pages Function (/api/portal/login)
      try {
        const response = await fetch('/api/portal/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: studentId.trim(),
            parentPhone: parentPhone.trim()
          })
        });

        // Jika fungsi Cloudflare aktif (bukan 404 dari dev server)
        if (response.status !== 404) {
          isApiHandled = true;
          const result = await response.json();

          if (response.ok && result.success) {
            sessionStorage.setItem('portal_student_id', studentId.trim());
            sessionStorage.setItem('portal_parent_phone', parentPhone.trim());
            if (result.student) {
              sessionStorage.setItem('portal_student_data', JSON.stringify(result.student));
            }
            navigate('/portal/dashboard');
            return;
          } else {
            setErrorMsg(result.message || 'Kredensial tidak ditemukan');
            return;
          }
        }
      } catch (apiErr) {
        // Abaikan fetch error jika dev server belum menjalankan Pages functions
        console.warn('Functions endpoint fetch error:', apiErr);
      }

      // 2. Dev-mode Fallback: Langsung verifikasi ke Firestore client SDK jika functions belum aktif
      if (!isApiHandled) {
        const cleanId = studentId.trim();
        const inputDigits = parentPhone.replace(/\D/g, '');

        const docRef = doc(db, 'students', cleanId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          const storedPhoneDigits = String(data.parentPhone || '').replace(/\D/g, '');

          if (
            storedPhoneDigits &&
            inputDigits &&
            (storedPhoneDigits.endsWith(inputDigits) || inputDigits.endsWith(storedPhoneDigits))
          ) {
            sessionStorage.setItem('portal_student_id', docSnap.id);
            sessionStorage.setItem('portal_parent_phone', parentPhone.trim());
            sessionStorage.setItem('portal_student_data', JSON.stringify(data));
            navigate('/portal/dashboard');
            return;
          }
        }

        setErrorMsg('Kredensial tidak ditemukan');
      }
    } catch (err) {
      console.error('Portal Login error:', err);
      setErrorMsg('Kredensial tidak ditemukan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-b from-slate-50 via-white to-slate-50 min-h-screen">
      {/* Top Brand & Title */}
      <div className="pt-4 text-center">
        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-2 border border-blue-100">
          Portal Wali Murid
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Masuk ke Akun Siswa
        </h1>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
          Pantau perkembangan latihan, kehadiran, tagihan SPP, dan prestasi ananda secara langsung.
        </p>
      </div>

      {/* Login Form */}
      <div className="my-auto py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Input ID Siswa */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-slate-700">
              ID Siswa (Firestore Doc ID)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Contoh: s7X9mK2..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              ID tertera pada Kartu ID Card / Kartu Anggota Siswa.
            </p>
          </div>

          {/* Input Nomor HP Wali */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-slate-700">
              Nomor WhatsApp / HP Wali
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Nomor kontak yang terdaftar saat registrasi siswa.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Bottom Footer Note */}
      <div className="pb-2 text-center text-slate-400 text-[11px] space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Akses Terenkripsi &amp; Resmi</span>
        </div>
        <p>CHUA SPORT CORE &bull; Sistem Manajemen Akademi</p>
      </div>
    </div>
  );
}
