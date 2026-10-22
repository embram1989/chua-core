import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { calculateAge } from '../utils/helpers';
import { 
  ClipboardCheck, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  User,
  Loader2,
  Check
} from 'lucide-react';

export default function AttendanceSection({ selectedClass, students = [], tenantId }) {
  // 1. SETUP STATE & FILTERING DATA
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [coachAttendance, setCoachAttendance] = useState(true);
  const [studentAttendance, setStudentAttendance] = useState({});

  const [sessionNotes, setSessionNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  // Filter students by selected class
  const classStudents = students.filter((student) => student.classId === selectedClass?.id);

  // Default all students in class to 'Hadir' on load / class change
  useEffect(() => {
    const defaultMap = {};
    classStudents.forEach((st) => {
      defaultMap[st.id] = 'Hadir';
    });
    setStudentAttendance(defaultMap);
    setCoachAttendance(true);
  }, [selectedClass?.id, students.length]);

  // Real-time listener for attendance history (koleksi `academy_attendance`)
  useEffect(() => {
    if (!tenantId || !selectedClass?.id) {
      setHistory([]);
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    const ref = collection(db, 'academy_attendance');
    const q = query(
      ref, 
      where('tenantId', '==', tenantId), 
      where('classId', '==', selectedClass.id)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setHistory(list);
        setLoadingHistory(false);
      },
      (err) => {
        console.error('Error fetching academy_attendance:', err);
        handleFirestoreError(err, 'list', 'academy_attendance');
        setHistory([]);
        setLoadingHistory(false);
      }
    );

    return () => unsub();
  }, [tenantId, selectedClass?.id]);

  // Handler update status presensi siswa individual
  const handleStudentStatusChange = (studentId, status) => {
    setStudentAttendance((prev) => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Quick action: Set all students status
  const handleSetAllStudents = (status) => {
    const updated = {};
    classStudents.forEach((st) => {
      updated[st.id] = status;
    });
    setStudentAttendance(updated);
  };

  // 3. LOGIKA PENYIMPANAN (FIRESTORE)
  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    if (!selectedClass?.id || !tenantId) return;

    if (!attendanceDate) {
      setErrorMsg('Tanggal presensi wajib dipilih.');
      return;
    }

    if (classStudents.length === 0) {
      setErrorMsg('Belum ada siswa terdaftar di kelas ini untuk dicatat presensinya.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const recordsPayload = classStudents.map((st) => ({
      studentId: st.id,
      studentName: st.studentName || 'Siswa',
      status: studentAttendance[st.id] || 'Hadir'
    }));

    const summary = {
      hadir: recordsPayload.filter((r) => r.status === 'Hadir').length,
      izin: recordsPayload.filter((r) => r.status === 'Izin').length,
      sakit: recordsPayload.filter((r) => r.status === 'Sakit').length,
      alpa: recordsPayload.filter((r) => r.status === 'Alpa' || r.status === 'Alpha').length
    };

    const coachNameDisplay = selectedClass.coachName || selectedClass.coach || 'Pelatih Utama';

    try {
      await addDoc(collection(db, 'academy_attendance'), {
        tenantId,
        academyId: selectedClass.academyId || '',
        classId: selectedClass.id,
        className: selectedClass.className || selectedClass.name || 'Kelas Akademi',
        sport: selectedClass.sport || '',
        coachName: coachNameDisplay,
        coachAttended: coachAttendance,
        date: attendanceDate,
        notes: sessionNotes.trim(),
        students: recordsPayload,
        summary,
        totalStudents: recordsPayload.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSuccessMsg(`Presensi tanggal ${attendanceDate} berhasil disimpan!`);
      setSessionNotes('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to save academy_attendance:', err);
      handleFirestoreError(err, 'create', 'academy_attendance');
      setErrorMsg('Gagal menyimpan data presensi. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHistory = async (id, dateStr) => {
    if (!window.confirm(`Hapus catatan presensi tanggal ${dateStr}?`)) return;
    try {
      await deleteDoc(doc(db, 'academy_attendance', id));
    } catch (err) {
      console.error('Failed to delete attendance history:', err);
      handleFirestoreError(err, 'delete', 'academy_attendance');
    }
  };

  return (
    <div className="space-y-5 text-left font-sans">
      
      {/* FORM PRESENSI UTAMA (CLEAN & MINIMALIST) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4">
        
        {/* CONTROL BAR INLINE: DATE PICKER + TOGGLE SWITCH KEHADIRAN PELATIH */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Presensi Sesi Latihan</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Picker Input */}
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="date"
                required
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer"
              />
            </div>

            {/* TOGGLE SWITCH ELEGAN (GAYA iOS/MANTINE) - PELATIH HADIR */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-700">Pelatih Hadir</span>
              <button
                type="button"
                role="switch"
                aria-checked={coachAttendance}
                onClick={() => setCoachAttendance(!coachAttendance)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer ${
                  coachAttendance ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200 ease-in-out shadow-2xs ${
                    coachAttendance ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* FEEDBACK NOTIFICATION ALERTS */}
        {successMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveAttendance} className="space-y-4">
          
          {/* CATATAN / MATERI SESI */}
          <div>
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Catatan / materi latihan hari ini (opsional)..."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 text-slate-700 font-medium"
            />
          </div>

          {/* DAFTAR PRESENSI SISWA */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Siswa ({classStudents.length})
              </span>

              {/* Quick action buttons */}
              {classStudents.length > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSetAllStudents('Hadir')}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                  >
                    Set Semua Hadir
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllStudents('Izin')}
                    className="text-amber-600 hover:text-amber-700 font-semibold cursor-pointer"
                  >
                    Set Semua Izin
                  </button>
                </div>
              )}
            </div>

            {/* IF NO STUDENTS IN CLASS */}
            {classStudents.length === 0 ? (
              <div className="py-6 border border-dashed border-slate-200 rounded-xl text-center p-4 bg-slate-50/50">
                <User className="w-7 h-7 text-slate-300 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-600">
                  Belum ada siswa terdaftar di kelas ini.
                </p>
              </div>
            ) : (
              /* CLEAN STUDENT LIST WITH SEGMENTED CONTROL */
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {classStudents.map((st, idx) => {
                  const currentStatus = studentAttendance[st.id] || 'Hadir';

                  return (
                    <div 
                      key={st.id} 
                      className="p-2.5 sm:px-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-xs text-slate-800 truncate">{st.studentName}</p>
                          {calculateAge(st.birthDate) !== '-' && (
                            <p className="text-[10px] text-slate-400">
                              Usia: {calculateAge(st.birthDate)} thn
                            </p>
                          )}
                        </div>
                      </div>

                      {/* SEGMENTED CONTROL (HADIR, IZIN, SAKIT, ALPA) */}
                      <div className="p-0.5 bg-slate-100/90 rounded-lg inline-flex items-center gap-0.5 shrink-0">
                        
                        {/* 1. HADIR */}
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(st.id, 'Hadir')}
                          className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                            currentStatus === 'Hadir'
                              ? 'bg-emerald-500 text-white font-semibold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                          }`}
                        >
                          Hadir
                        </button>

                        {/* 2. IZIN */}
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(st.id, 'Izin')}
                          className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                            currentStatus === 'Izin'
                              ? 'bg-amber-500 text-white font-semibold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                          }`}
                        >
                          Izin
                        </button>

                        {/* 3. SAKIT */}
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(st.id, 'Sakit')}
                          className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                            currentStatus === 'Sakit'
                              ? 'bg-blue-500 text-white font-semibold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                          }`}
                        >
                          Sakit
                        </button>

                        {/* 4. ALPA */}
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(st.id, 'Alpa')}
                          className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                            currentStatus === 'Alpa' || currentStatus === 'Alpha'
                              ? 'bg-rose-500 text-white font-semibold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                          }`}
                        >
                          Alpa
                        </button>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SIMPAN PRESENSI BUTTON */}
          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              disabled={isSaving || classStudents.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Presensi</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* RIWAYAT PRESENSI */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <h4 className="font-bold text-xs text-slate-800">
              Riwayat Presensi ({history.length})
            </h4>
          </div>
        </div>

        {loadingHistory ? (
          <p className="py-4 text-center text-xs text-slate-400 font-medium">Memuat riwayat...</p>
        ) : history.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            Belum ada rekam presensi disimpan.
          </p>
        ) : (
          <div className="space-y-1.5">
            {history.map((sess) => {
              const isExpanded = expandedSessionId === sess.id;
              const sum = sess.summary || {};

              return (
                <div 
                  key={sess.id} 
                  className="border border-slate-200/80 rounded-xl overflow-hidden bg-white hover:border-slate-300 transition-all"
                >
                  <div 
                    onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                    className="p-2.5 bg-slate-50/60 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 font-semibold text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{sess.date}</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 text-[11px]">
                        {sess.coachName || 'Pelatih'} {sess.coachAttended ? '(Hadir)' : '(Absen)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* SUMMARY BADGES */}
                      <div className="flex items-center gap-1 text-[10px] font-medium">
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200/60">
                          {sum.hadir || 0} Hadir
                        </span>
                        {(sum.izin || 0) > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200/60">
                            {sum.izin} Izin
                          </span>
                        )}
                        {(sum.sakit || 0) > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200/60">
                            {sum.sakit} Sakit
                          </span>
                        )}
                        {(sum.alpa || 0) > 0 && (
                          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200/60">
                            {sum.alpa} Alpa
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHistory(sess.id, sess.date);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED BREAKDOWN PER STUDENT */}
                  {isExpanded && (
                    <div className="p-2.5 border-t border-slate-100 bg-white space-y-1.5 text-xs">
                      {sess.notes && (
                        <p className="text-slate-500 italic mb-1 text-[11px]">
                          Catatan: "{sess.notes}"
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                        {sess.students?.map((rec, idx) => {
                          let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          if (rec.status === 'Izin') badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                          if (rec.status === 'Sakit') badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                          if (rec.status === 'Alpa' || rec.status === 'Alpha') badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';

                          return (
                            <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100 text-xs">
                              <span className="font-medium text-slate-700">{rec.studentName}</span>
                              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${badgeStyle}`}>
                                {rec.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
