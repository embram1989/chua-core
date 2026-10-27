import React, { useState, useEffect } from 'react';
import useArenaData from '../hooks/useArenaData';
import { X, Calendar, Clock, User, Phone, DollarSign, Calculator, CheckCircle2 } from 'lucide-react';

export default function NewBookingModal({
  isOpen,
  onClose,
  userProfile,
  initialCourtId,
  initialDate,
  initialStartTime,
  onProceedToPayment
}) {
  const { courts } = useArenaData(userProfile);
  const tenantId = userProfile?.tenant?.id || userProfile?.tenantId || userProfile?.uid;

  // Form States
  const [selectedCourtId, setSelectedCourtId] = useState(initialCourtId || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingDate, setBookingDate] = useState(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState(initialStartTime || '08:00');
  const [endTime, setEndTime] = useState('09:00');

  // Auto-fill initialStartTime and compute endTime (+1 hour) when props change
  useEffect(() => {
    if (initialStartTime) {
      setStartTime(initialStartTime);
      const [h, m] = initialStartTime.split(':').map(Number);
      const nextH = (h + 1) % 24;
      const nextHStr = String(nextH).padStart(2, '0');
      const nextMStr = String(m || 0).padStart(2, '0');
      setEndTime(`${nextHStr}:${nextMStr}`);
    }
  }, [initialStartTime]);

  useEffect(() => {
    if (initialDate) {
      setBookingDate(initialDate);
    }
  }, [initialDate]);

  useEffect(() => {
    if (initialCourtId) {
      setSelectedCourtId(initialCourtId);
    }
  }, [initialCourtId]);

  // Auto-calculated state
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [durationHours, setDurationHours] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Default select first court if none selected
  useEffect(() => {
    if (courts && courts.length > 0 && !selectedCourtId) {
      setSelectedCourtId(courts[0].id);
    }
  }, [courts, selectedCourtId]);

  // SMART CALCULATOR LOGIC
  useEffect(() => {
    const courtObj = courts.find((c) => c.id === selectedCourtId);
    const hourlyRate = courtObj?.price || 0;

    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const startMinutes = startH * 60 + (startM || 0);
      const endMinutes = endH * 60 + (endM || 0);

      let diffMinutes = endMinutes - startMinutes;
      if (diffMinutes <= 0) {
        diffMinutes = 60; // fallback min 1 hour if end time <= start time
      }

      const hours = Math.max(1, Math.round(diffMinutes / 60));
      setDurationHours(hours);
      setCalculatedPrice(hourlyRate * hours);
    } else {
      setDurationHours(1);
      setCalculatedPrice(hourlyRate);
    }
  }, [selectedCourtId, startTime, endTime, courts]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg('Nama pemesan wajib diisi.');
      return;
    }
    if (!selectedCourtId || !tenantId) {
      setErrorMsg('Silakan pilih lapangan.');
      return;
    }

    // Time Travel Prevention: Check if booking is in the past
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [startH, startM] = (startTime || '08:00').split(':').map(Number);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const isPastDate = bookingDate < todayStr;
    const isPastTimeToday = bookingDate === todayStr && (startH < currentHour || (startH === currentHour && (startM || 0) <= currentMinute));

    if (isPastDate || isPastTimeToday) {
      setErrorMsg('Waktu pemesanan sudah terlewat. Silakan pilih waktu yang akan datang.');
      return;
    }

    const selectedCourtObj = courts.find((c) => c.id === selectedCourtId);

    const newBookingData = {
      tenantId,
      courtId: selectedCourtObj?.id || '',
      courtName: selectedCourtObj?.name || 'Lapangan',
      courtNumber: selectedCourtObj?.name || '1',
      sport: selectedCourtObj?.sport || 'Sports',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      bookingDate,
      startTime,
      endTime,
      durationHours,
      price: calculatedPrice,
      status: 'Lunas',
    };

    if (onProceedToPayment) {
      onProceedToPayment(newBookingData);
    }
  };

  const selectedCourtObj = courts.find((c) => c.id === selectedCourtId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-[#333333]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-base text-[#333333]">Buat Reservasi Baru</h2>
            <p className="text-xs text-gray-500">Masukkan detail jadwal untuk menghitung biaya sewa secara otomatis.</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-black cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
          
          {/* Dropdown Court Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Pilih Lapangan <span className="text-[#C89D32]">*</span>
            </label>
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#354944] focus:ring-1 focus:ring-[#354944] font-bold text-slate-800"
            >
              {courts.length === 0 ? (
                <option value="">Belum ada lapangan terdaftar</option>
              ) : (
                courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name} ({court.sport || 'Sports'}) - Rp {Number(court.price || 0).toLocaleString('id-ID')}/jam
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Nama Pemesan / Pelanggan <span className="text-[#C89D32]">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama pemesan"
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#354944] focus:ring-1 focus:ring-[#354944]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Nomor WhatsApp
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="081234567890"
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#354944] focus:ring-1 focus:ring-[#354944]"
              />
            </div>
          </div>

          {/* Tanggal & Jam Section */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Tanggal <span className="text-[#C89D32]">*</span>
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#354944] focus:ring-1 focus:ring-[#354944] font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Mulai <span className="text-[#C89D32]">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#354944] focus:ring-1 focus:ring-[#354944] font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Selesai <span className="text-[#C89D32]">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#354944] focus:ring-1 focus:ring-[#354944] font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC CALCULATOR DISPLAY BOX */}
          <div className="p-3.5 bg-[#354944]/5 border border-[#354944]/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span className="flex items-center space-x-1">
                <Calculator className="w-3.5 h-3.5 text-[#354944]" />
                <span>Rincian Biaya:</span>
              </span>
              <span className="font-bold text-slate-800">
                {durationHours} Jam Sewa x Rp {Number(selectedCourtObj?.price || 0).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1 border-t border-[#354944]/10">
              <span className="text-xs font-bold text-gray-700 uppercase">Total Biaya Booking:</span>
              <span className="text-lg font-black text-[#354944]">
                Rp {calculatedPrice.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || courts.length === 0}
              className="flex-1 py-2.5 bg-[#354944] hover:bg-[#2B3D38] border-b-2 border-[#C89D32] text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              Lanjut Pembayaran
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
