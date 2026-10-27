import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import useArenaData from '../hooks/useArenaData';
import { 
  X, 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  Building,
  CheckSquare,
  Square,
  Receipt
} from 'lucide-react';

export default function SppPaymentModal({
  isOpen,
  onClose,
  student,
  userProfile,
  onPaymentSuccess
}) {
  const { tenantProfile } = useArenaData(userProfile);
  const tenant = tenantProfile || userProfile?.tenant;
  const tenantId = tenant?.id || userProfile?.tenantId || userProfile?.uid;

  // Selected Month (default to current YYYY-MM)
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7); // Format "YYYY-MM"
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [paymentMethod, setPaymentMethod] = useState('QRIS Statis');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fee Calculations & Statuses
  const sppAmount = Number(student?.monthlyFee || 350000);
  const regFeeAmount = Number(student?.registrationFee || student?.entryFee || 150000);
  const isRegistrationFeeAlreadyPaid = Boolean(student?.registrationFeePaid || student?.isRegistrationFeePaid);

  // Checkbox States for Dual Billing (Registration Fee & SPP)
  const [payRegistrationFee, setPayRegistrationFee] = useState(false);
  const [paySppFee, setPaySppFee] = useState(true);

  // Reset/sync checkbox states when student changes or modal opens
  useEffect(() => {
    if (student) {
      setPayRegistrationFee(!isRegistrationFeeAlreadyPaid && regFeeAmount > 0);
      setPaySppFee(true);
      setErrorMsg(null);
    }
  }, [student, isRegistrationFeeAlreadyPaid, regFeeAmount]);

  if (!isOpen || !student) return null;

  const qrisUrl = tenant?.qrisUrl || tenant?.qrisImageUrl || tenant?.qrisImageBase64;

  // Formatted Month Label for Display (e.g., "Oktober 2026")
  const getMonthLabel = (yyyyMm) => {
    if (!yyyyMm) return '';
    const [y, m] = yyyyMm.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, 1);
    return dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const monthLabel = getMonthLabel(selectedMonth || currentMonth);

  // Dynamic Total Amount Calculation
  const totalTagihan = (payRegistrationFee ? regFeeAmount : 0) + (paySppFee ? sppAmount : 0);

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!student.id || !tenantId) return;

    if (!payRegistrationFee && !paySppFee) {
      setErrorMsg('Pilih minimal satu item tagihan (Biaya Pendaftaran atau SPP) untuk diproses.');
      return;
    }

    if (totalTagihan <= 0) {
      setErrorMsg('Total tagihan tidak boleh Rp 0.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const monthToRecord = selectedMonth || currentMonth;

      // 1. Update Student Record in Firestore
      const studentRef = doc(db, 'students', student.id);
      const updatedStudentFields = {
        updatedAt: serverTimestamp()
      };

      if (paySppFee) {
        updatedStudentFields.lastPaidMonth = monthToRecord;
        updatedStudentFields.sppStatus = 'Lunas';
        updatedStudentFields.lastSppPaidAt = serverTimestamp();
        updatedStudentFields.lastPaidDate = new Date().toISOString().split('T')[0];
      }

      if (payRegistrationFee) {
        updatedStudentFields.registrationFeePaid = true;
        updatedStudentFields.isRegistrationFeePaid = true;
        updatedStudentFields.registrationFeePaidAt = serverTimestamp();
      }

      await updateDoc(studentRef, updatedStudentFields);

      // 2. Record Transaction in 'transactions' collection
      await addDoc(collection(db, 'transactions'), {
        tenantId,
        itemCategory: 'SPP & Pendaftaran Akademi',
        itemName: `Pembayaran Akademi: ${student.studentName}`,
        amount: totalTagihan,
        paymentMethod,
        studentId: student.id,
        monthPaid: paySppFee ? monthToRecord : '',
        payRegistrationFee,
        paySppFee,
        createdAt: serverTimestamp()
      });

      // 3. Record Transaction in 'pos_transactions' collection for Global Kasir & Struk Thermal
      const receiptNo = `AKD-${Date.now().toString().slice(-6)}`;
      await addDoc(collection(db, 'pos_transactions'), {
        tenantId,
        type: 'AKADEMI',
        receiptNo,
        customerName: student.studentName,
        parentName: student.parentName || '',
        amount: totalTagihan,
        total: totalTagihan,
        paymentMethod,
        status: 'LUNAS',
        notes: `Akademi: ${student.academyName || 'SIMAK Workspace'}`,
        createdAt: serverTimestamp()
      });

      // 4. Construct Thermal Receipt Payload
      const receiptItems = [];
      if (payRegistrationFee && regFeeAmount > 0) {
        receiptItems.push({
          name: `Biaya Pendaftaran - ${student.studentName}`,
          qty: 1,
          price: regFeeAmount,
          subtotal: regFeeAmount
        });
      }
      if (paySppFee && sppAmount > 0) {
        receiptItems.push({
          name: `SPP Akademi (${monthLabel}) - ${student.studentName}`,
          qty: 1,
          price: sppAmount,
          subtotal: sppAmount
        });
      }

      const receiptPayload = {
        receiptNo,
        date: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        cashierName: userProfile?.displayName || userProfile?.name || 'Kasir Akademi',
        customerName: `${student.studentName} (Wali: ${student.parentName || '-'})`,
        items: receiptItems,
        total: totalTagihan,
        paymentMethod,
        status: 'LUNAS',
        notes: `Akademi: ${student.academyName || 'SIMAK Workspace'}`
      };

      if (onPaymentSuccess) {
        onPaymentSuccess({ ...student, ...updatedStudentFields }, receiptPayload);
      }

      onClose();
    } catch (err) {
      console.error('Error processing academy payment:', err);
      handleFirestoreError(err, 'create', 'transactions');
      setErrorMsg('Gagal memproses pembayaran. Silakan periksa koneksi Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      {/* Strict Container Max-Height & Overflow for Non-Cutoff Scrolling */}
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-100 text-slate-800">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#354944]/10 text-[#354944] flex items-center justify-center font-bold shrink-0 border border-[#354944]/20">
              <CreditCard className="w-5 h-5 text-[#C89D32]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">Kasir Pembayaran Akademi</h3>
              <p className="text-xs text-slate-500">Biaya Pendaftaran &amp; Tagihan SPP Siswa</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Student Overview Box */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-900">{student.studentName}</p>
            <span className="px-2 py-0.5 bg-[#354944]/10 text-[#354944] font-extrabold text-[10px] rounded-md uppercase border border-[#354944]/20">
              {student.sportCategory || 'Akademi'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Wali Murid: <strong className="text-slate-700">{student.parentName || '-'}</strong> ({student.parentPhone || '-'})
          </p>
        </div>

        <form onSubmit={handleSubmitPayment} className="space-y-4 text-left">
          
          {/* Month Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#354944]" />
              <span>Siklus Bulan SPP <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="month"
              required
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#354944] font-bold text-slate-800 cursor-pointer"
            />
          </div>

          {/* DUAL BILLING ITEM CHECKBOXES */}
          <div className="space-y-2 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Rincian Item Tagihan Yang Dibayar:
            </p>

            {/* Checkbox 1: Biaya Pendaftaran */}
            <label 
              onClick={() => {
                if (!isRegistrationFeeAlreadyPaid) setPayRegistrationFee(!payRegistrationFee);
              }}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                payRegistrationFee 
                  ? 'bg-[#354944]/10 border-[#354944] text-[#354944] shadow-2xs' 
                  : 'bg-white border-slate-200 text-slate-600'
              } ${isRegistrationFeeAlreadyPaid ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={payRegistrationFee}
                  disabled={isRegistrationFeeAlreadyPaid}
                  onChange={(e) => setPayRegistrationFee(e.target.checked)}
                  className="w-4 h-4 text-[#354944] rounded-md border-slate-300 focus:ring-[#354944] cursor-pointer"
                />
                <span>Biaya Pendaftaran Akademi</span>
                {isRegistrationFeeAlreadyPaid && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-200">
                    SUDAH LUNAS
                  </span>
                )}
              </div>
              <span className="font-black text-slate-900">Rp {regFeeAmount.toLocaleString('id-ID')}</span>
            </label>

            {/* Checkbox 2: SPP Bulan Ini */}
            <label 
              onClick={() => setPaySppFee(!paySppFee)}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                paySppFee 
                  ? 'bg-[#354944]/10 border-[#354944] text-[#354944] shadow-2xs' 
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={paySppFee}
                  onChange={(e) => setPaySppFee(e.target.checked)}
                  className="w-4 h-4 text-[#354944] rounded-md border-slate-300 focus:ring-[#354944] cursor-pointer"
                />
                <span>SPP Bulan Ini ({monthLabel})</span>
              </div>
              <span className="font-black text-slate-900">Rp {sppAmount.toLocaleString('id-ID')}</span>
            </label>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Metode Pembayaran <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#354944] font-extrabold text-slate-900 cursor-pointer"
            >
              <option value="QRIS Statis">QRIS Statis</option>
              <option value="Tunai (Cash)">Tunai (Cash)</option>
              <option value="Transfer Bank">Transfer Bank</option>
            </select>
          </div>

          {/* QRIS Display Box with STRICT Max Height Guard */}
          {paymentMethod === 'QRIS Statis' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-[#354944]">
                <QrCode className="w-4 h-4 text-[#C89D32]" />
                <span>Scan QRIS Resmi GOR</span>
              </div>

              {qrisUrl ? (
                <div className="space-y-1.5">
                  <img
                    src={qrisUrl}
                    alt="Kode QRIS GOR"
                    className="w-full max-h-40 sm:max-h-48 object-contain mx-auto rounded-xl border border-slate-200 shadow-2xs p-1.5 bg-white"
                  />
                  <p className="text-[10px] text-slate-500 font-medium">
                    Pindai gambar QRIS menggunakan GoPay, OVO, Dana, ShopeePay, BCA, atau m-Banking.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold">QRIS Belum Diatur</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Unggah gambar QRIS di menu <strong>Pengaturan GOR</strong> untuk mengaktifkan pembayaran QR.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transfer Bank Display Box when Transfer Bank selected */}
          {paymentMethod === 'Transfer Bank' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#354944]">
                <Building className="w-4 h-4 text-[#C89D32]" />
                <span>Informasi Rekening Transfer Bank</span>
              </div>

              {tenant?.bankAccountNumber ? (
                <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200 text-xs">
                  <p className="text-slate-500">Bank: <strong className="text-slate-800">{tenant.bankName || 'Bank Transfer'}</strong></p>
                  <p className="text-slate-500">No. Rekening: <strong className="text-[#354944] font-mono text-sm">{tenant.bankAccountNumber}</strong></p>
                  {tenant.bankAccountName && (
                    <p className="text-slate-500">Atas Nama: <strong className="text-slate-800">{tenant.bankAccountName}</strong></p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold">Rekening Bank Belum Diatur</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Lengkapi data rekening bank di menu <strong>Pengaturan GOR</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Total Summary */}
          <div className="flex items-baseline justify-between pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Pembayaran:</span>
            <span className="text-xl font-black text-[#C89D32]">
              Rp {totalTagihan.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || totalTagihan <= 0}
              className="flex-1 py-3 bg-[#354944] hover:bg-[#2B3D38] text-white font-extrabold text-xs rounded-xl border-b-2 border-[#C89D32] shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-[#C89D32]" />
              <span>{submitting ? 'Memproses...' : 'Konfirmasi & Cetak Struk'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
