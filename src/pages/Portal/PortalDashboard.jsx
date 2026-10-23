import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
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
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Loader2,
  Receipt
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

  // State untuk penagihan & QRIS
  const [billingData, setBillingData] = useState(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(true);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // 2. Fetch billing data dari endpoint /api/portal/billing saat mount
  useEffect(() => {
    if (!student?.id) return;
    let isMounted = true;

    const fetchBilling = async () => {
      setIsLoadingBilling(true);
      try {
        const response = await fetch('/api/portal/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.id,
            tenantId: student.tenantId || ''
          })
        });

        if (response.ok) {
          const res = await response.json();
          if (isMounted && res.success) {
            setBillingData(res);
            setIsLoadingBilling(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Billing API fetch failed (fallback to client):', err);
      }

      // Dev-mode fallback jika Pages functions endpoint belum aktif di preview lokal
      try {
        const tenantId = student.tenantId;
        if (tenantId) {
          const tDoc = await getDoc(doc(db, 'tenants', tenantId));
          if (tDoc.exists() && isMounted) {
            const tData = tDoc.data();
            const currentMonth = new Date().toISOString().slice(0, 7);
            const isPaid = student.lastPaidMonth === currentMonth;
            setBillingData({
              success: true,
              tenant: {
                id: tenantId,
                name: tData.name || student.academyName || 'Sports Arena',
                qrisUrl: tData.qrisUrl || tData.qrisImageUrl || tData.qrisImageBase64 || null,
                bankName: tData.bankName || tData.bank || '',
                bankAccount: tData.bankAccount || tData.noRekening || '',
                accountHolder: tData.accountHolder || tData.atasNama || ''
              },
              billing: {
                monthlyFee: student.monthlyFee || 350000,
                currentMonth,
                lastPaidMonth: student.lastPaidMonth || '',
                isPaidThisMonth: isPaid,
                statusText: isPaid ? 'LUNAS BULAN INI' : 'MENUNGGU PEMBAYARAN'
              },
              paymentHistory: []
            });
          }
        }
      } catch (fbErr) {
        console.warn('Firestore fallback billing fetch error:', fbErr);
      } finally {
        if (isMounted) setIsLoadingBilling(false);
      }
    };

    fetchBilling();
    return () => {
      isMounted = false;
    };
  }, [student?.id, student?.tenantId]);

  // Jika tidak ada data siswa aktif, redirect langsung ke halaman login portal
  if (!student) {
    return <Navigate to="/portal" replace />;
  }

  // Handler Tombol Keluar
  const handleLogout = () => {
    localStorage.removeItem('activeStudent');
    sessionStorage.removeItem('portal_student_id');
    sessionStorage.removeItem('portal_parent_phone');
    sessionStorage.removeItem('portal_student_data');
    navigate('/portal');
  };

  const studentName = student.studentName || 'Nama Siswa';
  const photoUrl = student.photoUrl || null;
  const academyName = billingData?.tenant?.name || student.academyName || 'Sport Academy';
  const sportCategory = student.sportCategory || 'Badminton';
  const className = student.className || 'Reguler';
  const coachName = student.coachName || 'Instruktur Utama';
  const monthlyFee = billingData?.billing?.monthlyFee || student.monthlyFee || 350000;
  const age = calculateAge(student.birthDate);

  // Status pembayaran bulan ini
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isPaid = billingData?.billing?.isPaidThisMonth ?? (student.lastPaidMonth === currentMonth);
  const qrisUrl = billingData?.tenant?.qrisUrl || null;
  const bankName = billingData?.tenant?.bankName || '';
  const bankAccount = billingData?.tenant?.bankAccount || '';
  const accountHolder = billingData?.tenant?.accountHolder || '';

  const handleCopyAccount = () => {
    if (bankAccount) {
      navigator.clipboard.writeText(bankAccount);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen text-slate-800">
      {/* 1. HEADER MOBILE-FRIENDLY & TOMBOL KELUAR */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-black text-slate-900 tracking-tight leading-tight">
              PORTAL WALI MURID
            </h1>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]">
              {academyName}
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
        
        {/* 2. KARTU PROFIL UTAMA (HERO SECTION DENGAN GRADIEN MODERN) */}
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

        {/* 3. SEKSI ADMINISTRASI SPP & STATUS REAL-TIME */}
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

            {isPaid ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>LUNAS</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200 animate-pulse">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>BELUM BAYAR</span>
              </span>
            )}
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
              {isLoadingBilling ? (
                <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memeriksa...</span>
                </div>
              ) : isPaid ? (
                <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-200">
                  Bulan Ini Lunas
                </span>
              ) : (
                <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg border border-amber-200/80">
                  Siap Dibayar
                </span>
              )}
            </div>
          </div>

          {/* Tombol Lihat QRIS / Bayar (Memicu Modal Pop-up) */}
          <button
            type="button"
            onClick={() => setShowQrisModal(true)}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Lihat QRIS / Bayar</span>
            <ChevronRight className="w-4 h-4 opacity-80" />
          </button>

          <p className="text-[10px] text-slate-400 text-center leading-normal">
            Pembayaran iuran dapat dilakukan melalui scan QRIS resmi atau transfer rekening bank.
          </p>
        </div>

        {/* 4. RIWAYAT PEMBAYARAN SPP (JIKA ADA DARI API) */}
        {billingData?.paymentHistory && billingData.paymentHistory.length > 0 && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Riwayat Pembayaran Terakhir
                </h3>
                <p className="text-[11px] text-slate-400">Bukti transaksi tersimpan</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {billingData.paymentHistory.slice(0, 3).map((item, idx) => (
                <div key={item.id || idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{item.itemName || 'Iuran SPP Akademi'}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.monthPaid ? `Bulan: ${item.monthPaid}` : 'Pembayaran Terverifikasi'} &bull; {item.paymentMethod || 'QRIS'}
                    </p>
                  </div>
                  <span className="font-bold text-emerald-600">
                    {formatRupiah(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. SEKSI INFORMASI SESI LATIHAN */}
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
                Jadwal mingguan &amp; koordinasi
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
        <div className="flex items-center justify-center gap-1 text-slate-600 font-semibold mb-0.5">
          <ShieldCheck className="w-3 h-3 text-blue-600" />
          <span>PORTAL RESMI WALI MURID</span>
        </div>
        <p>CHUA SPORT CORE &bull; Sistem Terpadu Manajemen Akademi</p>
      </footer>

      {/* 6. MODAL QRIS PEMBAYARAN (MOBILE-FRIENDLY & THEMED TAILWIND) */}
      {showQrisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">QRIS Pembayaran SPP</h3>
                  <p className="text-[10px] text-blue-100">{academyName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQrisModal(false)}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                aria-label="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Total Tagihan Box */}
              <div className="bg-slate-800/70 p-3.5 rounded-2xl border border-slate-700/60 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Total Tagihan Iuran
                </p>
                <p className="text-2xl font-black text-amber-300 mt-0.5">
                  {formatRupiah(monthlyFee)}
                </p>
                <p className="text-[11px] text-slate-300 mt-1">
                  Untuk Siswa: <strong className="text-white">{studentName}</strong>
                </p>
              </div>

              {/* QRIS Image Area */}
              <div className="bg-white p-4 rounded-2xl shadow-inner flex flex-col items-center justify-center">
                {qrisUrl ? (
                  <>
                    <img
                      src={qrisUrl}
                      alt="QRIS Pembayaran Resmi"
                      crossOrigin="anonymous"
                      className="w-full max-h-60 object-contain rounded-lg"
                    />
                    <div className="mt-3 flex items-center gap-1.5 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>QRIS Terverifikasi Resmi</span>
                    </div>
                  </>
                ) : (
                  <div className="py-8 px-4 text-center flex flex-col items-center justify-center text-slate-600">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      QRIS Sedang Disiapkan
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[210px] leading-relaxed">
                      Pengelola arena belum mengunggah gambar QRIS. Silakan gunakan opsi transfer bank di bawah ini.
                    </p>
                  </div>
                )}
              </div>

              {/* Info Alternatif Transfer Bank */}
              {(bankName || bankAccount) && (
                <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700/80 space-y-1.5 text-left text-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Alternatif Transfer Bank
                    </p>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">
                      {bankName || 'BANK'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60 mt-1">
                    <div>
                      <p className="text-[10px] text-slate-400 font-mono">Nomor Rekening:</p>
                      <p className="font-mono font-bold text-amber-300 text-sm select-all">
                        {bankAccount}
                      </p>
                      {accountHolder && (
                        <p className="text-[10px] text-slate-300 mt-0.5">a.n {accountHolder}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Salin Nomor Rekening"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedAccount ? 'Tersalin!' : 'Salin'}</span>
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 text-center leading-normal">
                Dapat dibayar menggunakan GoPay, OVO, DANA, BCA Mobile, Livin', atau seluruh aplikasi mobile banking di Indonesia.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-900 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowQrisModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
