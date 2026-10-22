import React, { useState } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { X, Calendar, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

const DAYS_MAP = {
  'Minggu': 0,
  'Senin': 1,
  'Selasa': 2,
  'Rabu': 3,
  'Kamis': 4,
  'Jumat': 5,
  'Sabtu': 6
};

export default function GenerateAcademyScheduleModal({
  isOpen,
  onClose,
  academyClass,
  tenantId
}) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Default end date 7 days from today
  const defaultEnd = new Date();
  defaultEnd.setDate(defaultEnd.getDate() + 7);
  const [endDate, setEndDate] = useState(defaultEnd.toISOString().split('T')[0]);

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen || !academyClass) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!startDate || !endDate) {
      setErrorMsg('Tanggal mulai dan selesai wajib diisi.');
      return;
    }

    if (startDate > endDate) {
      setErrorMsg('Tanggal mulai tidak boleh lebih besar dari tanggal selesai.');
      return;
    }

    if (!academyClass.schedules || academyClass.schedules.length === 0) {
      setErrorMsg('Blueprint jadwal kelas ini kosong.');
      return;
    }

    setGenerating(true);

    try {
      // 1. AMBIL DATA BOOKING EKSISTING SEBELUM GENERATE (Cegah Bentrok Turnamen & Booking Kasir)
      const bookingsRef = collection(db, 'bookings');
      const qBookings = query(bookingsRef, where('tenantId', '==', tenantId));
      const bookingsSnapshot = await getDocs(qBookings);
      
      const existingBookings = bookingsSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((b) => {
          const bDate = b.date || b.bookingDate;
          return bDate && bDate >= startDate && bDate <= endDate;
        });

      // 2. Generate date range
      const datesToProcess = [];
      let curr = new Date(startDate);
      const end = new Date(endDate);

      while (curr <= end) {
        datesToProcess.push(new Date(curr).toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
      }

      const bookingPromises = [];
      let successCount = 0;
      let skippedCount = 0;

      // 3. LOOP PEMBUATAN JADWAL DENGAN SMART CONFLICT DETECTION
      datesToProcess.forEach((dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayOfWeek = dateObj.getDay(); // 0-6

        academyClass.schedules.forEach((item) => {
          const targetDayNum = DAYS_MAP[item.day];
          if (targetDayNum === dayOfWeek && item.courtId) {
            const newSchedule = {
              courtId: item.courtId,
              date: dateStr,
              startTime: item.startTime,
              endTime: item.endTime
            };

            // Logika Overlap Waktu
            const isConflict = existingBookings.some((b) => {
              const bCourtId = b.courtId;
              const bDate = b.date || b.bookingDate;

              if (bCourtId !== newSchedule.courtId || bDate !== newSchedule.date) {
                return false;
              }

              // Abaikan booking yang sudah dibatalkan
              if (b.status === 'Dibatalkan' || b.status === 'Cancelled') {
                return false;
              }

              const bStart = b.startTime || '00:00';
              const bEnd = b.endTime || '23:59';

              // Persinggungan waktu
              return newSchedule.startTime < bEnd && newSchedule.endTime > bStart;
            });

            if (isConflict) {
              skippedCount++;
            } else {
              successCount++;
              bookingPromises.push(
                addDoc(collection(db, 'bookings'), {
                  tenantId,
                  classId: academyClass.id,
                  courtId: item.courtId,
                  courtName: item.courtName || 'Lapangan',
                  date: dateStr,
                  bookingDate: dateStr,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  bookingType: 'ACADEMY',
                  customerName: `Akademi: ${academyClass.className}`,
                  customerPhone: '-',
                  status: 'Lunas', // Locked
                  totalPrice: 0,
                  paymentMethod: 'Internal GOR',
                  createdAt: serverTimestamp()
                })
              );
            }
          }
        });
      });

      if (bookingPromises.length > 0) {
        await Promise.all(bookingPromises);
      }

      // 4. TAMPILKAN SUMMARY ALERT & NOTIFIKASI
      const summaryMsg = `Sinkronisasi Selesai! Berhasil dibuat: ${successCount} sesi. Dilewati (Bentrok/Libur Turnamen): ${skippedCount} sesi.`;
      setSuccessMsg(summaryMsg);

      // Sesuai instruksi: Tampilkan alert
      try {
        window.alert(summaryMsg);
      } catch (e) {
        console.warn('Alert suppressed in iframe:', e);
      }

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error generating academy schedule with conflict detection:', err);
      handleFirestoreError(err, 'create', 'bookings');
      setErrorMsg('Gagal men-generate jadwal. Silakan coba lagi.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-[#333333]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Kunci Jadwal Lapangan</h3>
              <p className="text-[11px] text-gray-500">Smart Conflict Detection (Auto-skip jika bentrok turnamen)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-black cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
          <p className="text-xs font-bold text-blue-600">{academyClass.className}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            Cabor: {academyClass.sport} • Pelatih: {academyClass.coachName}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl font-medium flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span className="text-xs">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Dari Tanggal <span className="text-blue-600">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Sampai Tanggal <span className="text-blue-600">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Sistem akan memindai rentang tanggal dan secara cerdas melewati jadwal jika bertabrakan dengan jadwal turnamen atau reservasi lapangan lain.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={generating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{generating ? 'Memeriksa & Mengunci...' : 'Generate & Blokir Lapangan'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
