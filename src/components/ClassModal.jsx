import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import useArenaData from '../hooks/useArenaData';
import { X, GraduationCap, Calendar, Plus, Trash2, Dumbbell, MapPin, Clock } from 'lucide-react';

const DAYS_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function ClassModal({
  isOpen,
  onClose,
  userProfile,
  activeAcademy = null,
  uniqueSports,
  coaches,
  courts = [],
  onClassAdded
}) {
  const tenantId = userProfile?.tenant?.id || userProfile?.tenantId || userProfile?.uid;

  // Dual data fetch: Use props if available, fallback to internal useArenaData hook
  const arenaData = useArenaData(userProfile);
  const safeCourts = Array.isArray(courts) && courts.length > 0 ? courts : (arenaData?.courts || []);

  const [className, setClassName] = useState('');
  const [sport, setSport] = useState(uniqueSports?.[0] || 'Badminton');
  const [coachId, setCoachId] = useState(coaches?.[0]?.id || '');

  // Structured Schedule Array State
  const [schedules, setSchedules] = useState([
    { id: '1', day: 'Senin', startTime: '15:00', endTime: '17:00', courtId: '', courtName: '' }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Normalisasi string pada filter lapangan (case-insensitive & trim)
  const filteredCourts = safeCourts.filter((court) => {
    const courtSport = (court.sport || '').toLowerCase().trim();
    const selectedSport = (sport || '').toLowerCase().trim();
    return courtSport === selectedSport;
  });

  // Fallback data lapangan jika field sport kosong / data lama
  const displayCourts = filteredCourts.length > 0 ? filteredCourts : safeCourts;

  // Auto-set initial court for schedule rows when sport/courts change
  useEffect(() => {
    if (displayCourts.length > 0) {
      setSchedules((prev) =>
        prev.map((row) => {
          if (!row.courtId || !displayCourts.some((c) => c.id === row.courtId)) {
            return {
              ...row,
              courtId: displayCourts[0].id,
              courtName: displayCourts[0].name
            };
          }
          return row;
        })
      );
    } else {
      setSchedules((prev) =>
        prev.map((row) => ({
          ...row,
          courtId: '',
          courtName: ''
        }))
      );
    }
  }, [sport, safeCourts.length]);

  if (!isOpen) return null;

  const handleAddScheduleRow = () => {
    const defaultCourt = displayCourts[0];
    setSchedules((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        day: 'Rabu',
        startTime: '15:00',
        endTime: '17:00',
        courtId: defaultCourt?.id || '',
        courtName: defaultCourt?.name || ''
      }
    ]);
  };

  const handleRemoveScheduleRow = (id) => {
    if (schedules.length === 1) return;
    setSchedules((prev) => prev.filter((row) => row.id !== id));
  };

  const handleUpdateScheduleRow = (id, field, value) => {
    setSchedules((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          if (field === 'courtId') {
            const selectedCourt = safeCourts.find((c) => c.id === value);
            return {
              ...row,
              courtId: value,
              courtName: selectedCourt?.name || ''
            };
          }
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!className.trim() || !tenantId) {
      setErrorMsg('Nama kelas wajib diisi.');
      return;
    }

    // Validation: Ensure every schedule row has a court selected
    const missingCourt = schedules.some((s) => !s.courtId);
    if (missingCourt) {
      setErrorMsg('Silakan pilih lapangan untuk semua sesi jadwal latihan.');
      return;
    }

    setSubmitting(true);

    try {
      const selectedCoachObj = coaches.find((c) => c.id === coachId);

      // Summary string for fast table display
      const scheduleSummary = schedules
        .map((s) => `${s.day} (${s.startTime}-${s.endTime}, ${s.courtName || 'Lapangan'})`)
        .join('; ');

      const newClass = {
        tenantId,
        academyId: activeAcademy?.id || '',
        academyName: activeAcademy?.name || '',
        className: className.trim(),
        sport,
        coachId: selectedCoachObj?.id || '',
        coachName: selectedCoachObj?.name || 'Pelatih Utama',
        schedules: schedules, // Array of structured objects
        schedule: scheduleSummary,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'academy_classes'), newClass);

      if (onClassAdded) {
        onClassAdded({ id: docRef.id, ...newClass });
      }

      onClose();
      setClassName('');
    } catch (err) {
      console.error('Error adding academy class:', err);
      handleFirestoreError(err, 'create', 'academy_classes');
      setErrorMsg('Gagal membuat kelas. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-fade-in text-[#333333] max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
          <div>
            <h3 className="font-bold text-base text-[#333333]">Buat Kelas / Kelompok Latihan</h3>
            <p className="text-xs text-gray-500">Atur kelompok usia, pelatih utama, &amp; jadwal alokasi lapangan</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-black cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium shrink-0">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreateClass} className="space-y-4 text-left flex-1 overflow-y-auto pr-1">
          
          {/* Nama Kelas */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Nama Kelas / Kelompok <span className="text-blue-600">*</span>
            </label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="misal: U-12 Pemula / U-15 Prestasi"
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Cabang Olahraga
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
              >
                {uniqueSports?.length > 0 ? (
                  uniqueSports.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))
                ) : (
                  <option value="Badminton">Badminton</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Pelatih Utama
              </label>
              <select
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
              >
                {coaches?.length === 0 ? (
                  <option value="">Belum ada pelatih terdaftar</option>
                ) : (
                  coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.sportSpecialty || 'Pelatih'})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* DYNAMIC SCHEDULE BUILDER WITH COURT INTEGRATION */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-blue-600 uppercase flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Alokasi Jadwal &amp; Lapangan Rutin</span>
              </label>
              <span className="text-[10px] text-gray-400">
                Lapangan terfilter cabor: <strong className="text-gray-700">{sport}</strong>
              </span>
            </div>

            <div className="space-y-2.5">
              {schedules.map((row, idx) => (
                <div key={row.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60">
                    <span className="font-bold text-blue-600 text-[11px]">Sesi #{idx + 1}</span>
                    {schedules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveScheduleRow(row.id)}
                        className="text-gray-400 hover:text-red-600 p-1 cursor-pointer flex items-center space-x-1 text-[10px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Hari */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Hari</label>
                      <select
                        value={row.day}
                        onChange={(e) => handleUpdateScheduleRow(row.id, 'day', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-800"
                      >
                        {DAYS_LIST.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Jam Mulai */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Mulai</label>
                      <input
                        type="time"
                        required
                        value={row.startTime}
                        onChange={(e) => handleUpdateScheduleRow(row.id, 'startTime', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-800"
                      />
                    </div>

                    {/* Jam Selesai */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Selesai</label>
                      <input
                        type="time"
                        required
                        value={row.endTime}
                        onChange={(e) => handleUpdateScheduleRow(row.id, 'endTime', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Dropdown Pilih Lapangan Smart Filtered with Fallback & Debug Log */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                      Pilih Lapangan ({sport}) <span className="text-blue-600">*</span>
                    </label>
                    <select
                      value={row.courtId}
                      onChange={(e) => handleUpdateScheduleRow(row.id, 'courtId', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="">-- Pilih Lapangan --</option>
                      {displayCourts.length === 0 ? (
                        <option value="" disabled>Belum ada lapangan terdaftar</option>
                      ) : (
                        displayCourts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.sport || 'Umum'}) - Rp {Number(c.price || 0).toLocaleString('id-ID')}/jam
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddScheduleRow}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1 border border-gray-200"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Tambah Sesi Hari Lain</span>
            </button>
          </div>

          <div className="flex space-x-3 pt-3 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Memproses...' : 'Buat Kelas'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
