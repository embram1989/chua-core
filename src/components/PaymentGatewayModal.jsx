import React, { useState } from 'react';
import { 
  X, 
  QrCode, 
  CreditCard, 
  Wallet, 
  Copy, 
  Check, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Receipt
} from 'lucide-react';

/**
 * Universal & Dynamic Payment Gateway Modal for Event Registrations
 * Bug Fix Enterprise Fase 10: Dynamic QRIS & Bank Integration
 */
export default function PaymentGatewayModal({
  isOpen,
  onClose,
  draftRegistration,
  tenantData = {},
  onConfirmPayment,
  isProcessing = false
}) {
  const [copiedRek, setCopiedRek] = useState(false);

  if (!isOpen || !draftRegistration) return null;

  // Format currency helper
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Dynamic tenant payment settings extraction with resilient fallbacks
  const qrisUrl = 
    tenantData?.qrisImageUrl || 
    tenantData?.qrisImageBase64 || 
    tenantData?.qrisUrl || 
    '';

  const bankName = tenantData?.bankName || '';
  const bankAccountNumber = tenantData?.bankAccountNumber || '';
  const bankAccountHolder = 
    tenantData?.bankAccountHolder || 
    tenantData?.bankAccountName || 
    tenantData?.name || 
    '';

  const paymentMethod = draftRegistration.paymentMethod || 'QRIS';
  const amountToPay = Number(draftRegistration.amountPaid) || 0;

  // Validation: Check if configuration is present for chosen payment method
  const isQrisConfigured = Boolean(qrisUrl && qrisUrl.trim() !== '');
  const isBankConfigured = Boolean(bankAccountNumber && bankAccountNumber.trim() !== '');

  // Determine if confirm button should be disabled
  let isPaymentConfigValid = true;
  if (paymentMethod === 'QRIS') {
    isPaymentConfigValid = isQrisConfigured;
  } else if (paymentMethod === 'Transfer Bank') {
    isPaymentConfigValid = isBankConfigured;
  }

  const handleCopyRek = (accNumber) => {
    if (!accNumber) return;
    try {
      navigator.clipboard.writeText(accNumber);
      setCopiedRek(true);
      setTimeout(() => setCopiedRek(false), 2500);
    } catch {
      // Fallback
      setCopiedRek(true);
      setTimeout(() => setCopiedRek(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full my-auto p-6 md:p-7 space-y-5 shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 border ${
              paymentMethod === 'QRIS'
                ? 'bg-rose-50 text-rose-600 border-rose-100'
                : paymentMethod === 'Transfer Bank'
                ? 'bg-blue-50 text-blue-600 border-blue-100'
                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
              {paymentMethod === 'QRIS' ? (
                <QrCode className="w-5 h-5" />
              ) : paymentMethod === 'Transfer Bank' ? (
                <CreditCard className="w-5 h-5" />
              ) : (
                <Wallet className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                Instruksi Pembayaran &amp; Verifikasi Kasir
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Metode: <strong className="text-slate-800">{paymentMethod}</strong> &bull; {draftRegistration.participantName || 'Peserta'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            title="Tutup & Kembali ke Form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4">
          {/* Info Ringkas Tagihan */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Kategori / Tim</span>
              <span className="font-extrabold text-slate-800">
                {draftRegistration.categoryName || 'Kategori'} - {draftRegistration.participantName || 'Peserta'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Status Bayar</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md inline-block">
                {draftRegistration.paymentStatus || 'Lunas'}
              </span>
            </div>
          </div>

          {/* ==================================================== */}
          {/* A. JIKA METODE PEMBAYARAN: QRIS (DYNAMIC RENDER) */}
          {/* ==================================================== */}
          {paymentMethod === 'QRIS' && (
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 text-center space-y-4">
              {isQrisConfigured ? (
                <>
                  {/* Dynamic QRIS Image Container */}
                  <div className="max-w-[260px] mx-auto bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <img 
                      src={qrisUrl} 
                      alt="Kode QRIS Pembayaran Tenant"
                      className="max-h-56 max-w-full object-contain rounded-xl mx-auto"
                    />
                    <div className="mt-2 flex items-center justify-center gap-1.5">
                      <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-[9px] rounded-md tracking-wider">
                        QRIS RESMI
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">
                        {tenantData?.name || 'GOR Arena'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Nominal yang Harus Dibayar
                    </span>
                    <div className="text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                      {formatRupiah(amountToPay)}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
                    Scan menggunakan <strong>myBCA, GoPay, OVO, ShopeePay, Dana, dll.</strong>
                  </p>
                </>
              ) : (
                /* Empty State jika QRIS belum dikonfigurasi */
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-center text-sm space-y-2">
                  <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <p className="font-bold">
                    Kode QRIS belum dikonfigurasi. Silakan atur di Pengaturan Profil GOR Anda.
                  </p>
                  <p className="text-xs text-rose-500 font-normal">
                    Unggah gambar kode QRIS pada menu Pengaturan agar pendaftaran via QRIS dapat diverifikasi.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* B. JIKA METODE PEMBAYARAN: TRANSFER BANK (DYNAMIC RENDER) */}
          {/* ==================================================== */}
          {paymentMethod === 'Transfer Bank' && (
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-4">
              {isBankConfigured ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-2xs uppercase">
                        {(bankName || 'BANK').slice(0, 4)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs">{bankName || 'Bank Tujuan'}</h4>
                        <p className="text-[11px] text-slate-500">Rekening Resmi GOR / Panitia</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md">
                      Transfer Bank
                    </span>
                  </div>

                  {/* Rekening Card */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nomor Rekening Tujuan</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-lg font-black text-slate-900 tracking-wider">
                        {bankAccountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyRek(bankAccountNumber)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        {copiedRek ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedRek ? 'Tersalin!' : 'Salin No. Rek'}</span>
                      </button>
                    </div>
                    {bankAccountHolder && (
                      <div className="text-xs text-slate-500 font-medium">
                        Atas Nama: <strong className="text-slate-800">{bankAccountHolder}</strong>
                      </div>
                    )}
                  </div>

                  {/* Nominal Transfer */}
                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 text-center">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Nominal yang Harus Dibayar</span>
                    <div className="text-3xl font-black text-blue-900 font-mono tracking-tight mt-0.5">
                      {formatRupiah(amountToPay)}
                    </div>
                    <p className="text-[11px] text-blue-700 mt-1">
                      Pastikan nominal transfer sesuai persis agar terverifikasi otomatis oleh sistem Kasir Global.
                    </p>
                  </div>
                </>
              ) : (
                /* Empty State jika Rekening Bank belum dikonfigurasi */
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-center text-sm space-y-2">
                  <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <p className="font-bold">
                    Informasi Rekening Bank belum dikonfigurasi. Silakan atur di Pengaturan Profil GOR Anda.
                  </p>
                  <p className="text-xs text-rose-500 font-normal">
                    Isi nama bank dan nomor rekening pada menu Pengaturan agar pendaftaran via Transfer Bank dapat diverifikasi.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* C. JIKA METODE PEMBAYARAN: CASH / TUNAI */}
          {/* ==================================================== */}
          {paymentMethod === 'Cash' && (
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                  <Wallet className="w-6 h-6" />
                </div>
                <h4 className="font-black text-emerald-950 text-sm">Pembayaran Tunai di Meja Registrasi</h4>
                <p className="text-xs text-emerald-800 font-medium leading-relaxed max-w-sm mx-auto">
                  Harap terima uang tunai dari peserta sebesar <strong className="font-black text-emerald-950 underline">{formatRupiah(amountToPay)}</strong> sebelum menekan tombol konfirmasi.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Uang Tunai Diterima</span>
                <div className="text-3xl font-black text-emerald-700 font-mono tracking-tight mt-0.5">
                  {formatRupiah(amountToPay)}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Uang tunai akan otomatis tercatat ke Laporan Transaksi Kasir Utama (Global POS).</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirmPayment}
            disabled={isProcessing || !isPaymentConfigValid}
            title={!isPaymentConfigValid ? 'Konfigurasi pembayaran belum lengkap' : 'Konfirmasi pembayaran diterima'}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan Transaksi...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Konfirmasi Pembayaran Diterima</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
