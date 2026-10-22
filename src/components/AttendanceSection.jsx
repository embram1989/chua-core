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
  UserCheck, 
  UserX,
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  User,
  Sparkles,
  Loader2
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

    // Map records payload
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

      setSuccessMsg(`Presensi kelas ${selectedClass.className} tanggal ${attendanceDate} berhasil disimpan!`);
      setSessionNotes('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to save academy_attendance:', err);
      handleFirestoreError(err, 'create', 'academy_attendance');
      setErrorMsg('Gagal menyimpan data presensi ke Firestore. Silakan coba lagi.');
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

  const coachName = selectedClass?.coachName || selectedClass?.coach || 'Pelatih Utama';

  return (
    <div className="space-y-6 text-left">
      
      {/* CARD UTAMA: SMART ATTENDANCE FORM */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
        
        {/* 2. BANGUN ANTARMUKA (UI) - HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                Presensi Kelas: {selectedClass?.className || 'Kelas Akademi'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-1">
              Pelatih Utama: <strong className="text-slate-800 font-bold">{coachName}</strong> &bull; Cabang: <span className="text-blue-600 font-bold">{selectedClass?.sport || 'Akademi'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-0.5">
                Tanggal Presensi
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-blue-600 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FEEDBACK NOTIFICATION ALERTS */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl font-bold flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-bold flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveAttendance} className="space-y-6">
          
          {/* COACH SECTION: TOGGLE KEHADIRAN PELATIH UTAMA */}
          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold transition-all ${
                coachAttendance ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {coachAttendance ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs font-black text-slate-800">
                  Kehadiran Pelatih Utama ({coachName})
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {coachAttendance 
                    ? 'Pelatih hadir & memimpin seluruh sesi latihan ini.' 
                    : 'Pelatih utama tidak hadir / diwakilkan oleh asisten.'}
                </p>
              </div>
            </div>

            {/* TOGGLE SWITCH BUTTON */}
            <button
              type="button"
              onClick={() => setCoachAttendance(!coachAttendance)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-2xs shrink-0 ${
                coachAttendance 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {coachAttendance ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pelatih Hadir</span>
                </>
              ) : (
                <>
                  <UserX className="w-4 h-4" />
                  <span>Pelatih Absen</span>
                </>
              )}
            </button>
          </div>

          {/* CATATAN / MATERI SESI (OPTIONAL) */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Catatan / Materi Sesi Latihan (Opsional)
            </label>
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="e.g. Drill Footwork, Servis Panjang, &amp; Evaluasi Fisik Akhir Sesi"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
            />
          </div>

          {/* STUDENT LIST SECTION */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Daftar Presensi Siswa ({classStudents.length})
                </h4>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded-md">
                  Segmented Tap Control
                </span>
              </div>

              {/* QUICK SET ALL BUTTONS */}
              {classStudents.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <span className="text-slate-400">Set Semua:</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllStudents('Hadir')}
                    className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                  >
                    Semua Hadir
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllStudents('Izin')}
                    className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer border border-amber-200"
                  >
                    Semua Izin
                  </button>
                </div>
              )}
            </div>

            {/* IF NO STUDENTS IN CLASS */}
            {classStudents.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center p-6 bg-slate-50/50">
                <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  Belum ada siswa terdaftar di kelas ini.
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Tambahkan siswa baru atau tetapkan siswa ke kelas <strong className="text-slate-700">{selectedClass?.className}</strong> melalui menu Pendaftaran Siswa.
                </p>
              </div>
            ) : (
              /* STUDENT LIST TABLE / CARDS */
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                {classStudents.map((st, idx) => {
                  const currentStatus = studentAttendance[st.id] || 'Hadir';

                  return (
                    <div 
                      key={st.id} 
                      className="p-3.5 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-xs text-slate-900">{st.studentName}</p>
                            {calculateAge(st.birthDate) !== '-' && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[9px] font-bold">
                                Usia: {calculateAge(st.birthDate)} Thn
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Wali: <strong className="text-slate-700">{st.parentName || '-'}</strong> {st.parentPhone ? `(${st.parentPhone})` : ''}
                          </p>
                        </div>
                      </div>

                      {/* 4 PILLS SEGMENTED CONTROL ([Hadir] [Izin] [Sakit] [Alpa]) */}
                      <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center shrink-0">
                        
                        {/* 1. HADIR */}
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(st.id, 'Hadir')}
                          className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer text-center ${
                            currentStatus === 'Hadir'
                              ? 'bg-green-500 text-white shadow-xs scale-102 ring-2 ring-green-300'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                          }`}
                        >
                          Hadir
                        </button>

                        {/* 2. IZIN */}
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(st.id, 'Izin')}
                          className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer text-center ${
                            currentStatus === 'Izin'
                              ? 'bg-yellow-500 text-white shadow-xs scale-102 ring-2 ring-yellow-300'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                          }`}
                        >
                          Izin
                        </button>

                        {/* 3. SAKIT */}
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(st.id, 'Sakit')}
                          className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer text-center ${
                            currentStatus === 'Sakit'
                              ? 'bg-blue-500 text-white shadow-xs scale-102 ring-2 ring-blue-300'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                          }`}
                        >
                          Sakit
                        </button>

                        {/* 4. ALPA */}
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(st.id, 'Alpa')}
                          className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer text-center ${
                            currentStatus === 'Alpa' || currentStatus === 'Alpha'
                              ? 'bg-red-500 text-white shadow-xs scale-102 ring-2 ring-red-300'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
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
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving || classStudents.length === 0}
              className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Menyimpan Presensi...</span>
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-4 h-4 text-cyan-200" />
                  <span>Simpan Presensi Sesi Ini</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* RIWAYAT PRESENSI SIKLUS TERAKHIR */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Riwayat Sesi Presensi Disimpan ({history.length})
            </h3>
          </div>
        </div>

        {loadingHistory ? (
          <p className="py-8 text-center text-xs text-slate-400 font-medium">Memuat riwayat presensi kelas...</p>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl p-4">
            Belum ada rekam presensi disimpan untuk kelas {selectedClass?.className}.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((sess) => {
              const isExpanded = expandedSessionId === sess.id;
              const sum = sess.summary || {};

              return (
                <div 
                  key={sess.id} 
                  className="border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-400 transition-all bg-white"
                >
                  <div 
                    onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0 font-bold">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-extrabold text-xs text-slate-900">
                          Tgl Latihan: {sess.date}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Pelatih: <strong className="text-slate-700">{sess.coachName || coachName}</strong> &bull; {sess.coachAttended ? <span className="text-emerald-600 font-bold">Hadir</span> : <span className="text-rose-600 font-bold">Absen</span>}
                        </p>
                        {sess.notes && (
                          <p className="text-[11px] text-slate-600 italic line-clamp-1 mt-0.5">
                            "{sess.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      {/* SUMMARY BADGES */}
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                          {sum.hadir || 0} Hadir
                        </span>
                        {(sum.izin || 0) > 0 && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                            {sum.izin} Izin
                          </span>
                        )}
                        {(sum.sakit || 0) > 0 && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                            {sum.sakit} Sakit
                          </span>
                        )}
                        {(sum.alpa || 0) > 0 && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md border border-rose-200">
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
                          title="Hapus Catatan Presensi"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED BREAKDOWN PER STUDENT */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-100 bg-white space-y-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Rincian Presensi Siswa ({sess.students?.length || 0})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {sess.students?.map((rec, idx) => {
                          let badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                          if (rec.status === 'Izin') badgeStyle = 'bg-amber-100 text-amber-800 border-amber-200';
                          if (rec.status === 'Sakit') badgeStyle = 'bg-blue-100 text-blue-800 border-blue-200';
                          if (rec.status === 'Alpa' || rec.status === 'Alpha') badgeStyle = 'bg-rose-100 text-rose-800 border-rose-200';

                          return (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="font-extrabold text-slate-800">{rec.studentName}</span>
                              <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-lg border ${badgeStyle}`}>
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
