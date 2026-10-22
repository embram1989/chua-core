import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { 
  Award, 
  Star, 
  Calendar, 
  User, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Filter,
  UserCheck,
  Loader2,
  ChevronRight,
  Target,
  Layers,
  Zap,
  Dumbbell,
  Activity,
  Brain,
  Shield,
  Sparkles,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip
} from 'recharts';

// =====================================================================
// 1. MATRIKS KPI 4-PILAR SPORTS SCIENCE + POSISI SPESIFIK
// =====================================================================
export const SPORT_KPI_MATRIX = {
  'racket': {
    label: 'Racket Sports (Badminton, Tenis, Padel)',
    pillars: {
      fisik: ['Footwork (Kelincahan Kaki)', 'Stamina Reli Panjang', 'Explosive Power (Lompatan Smash)'],
      teknik: ['Akurasi Servis', 'Kekuatan & Akurasi Smash', 'Kualitas Dropshot / Netting', 'Defense (Pengembalian Bola / Blok)'],
      taktik: ['Penempatan Bola (Ball Placement)', 'Antisipasi Pergerakan Lawan', 'Penguasaan Lapangan (Court Coverage)'],
      mental: ['Ketenangan Poin Kritis (Deuce/Tie-Break)', 'Fokus Pertandingan', 'Daya Juang (Fighting Spirit)']
    },
    roles: ['Singles Specialist', 'Doubles Front Court', 'Doubles Rear Court']
  },
  'field': {
    label: 'Field & Team Sports (Sepakbola, Mini Soccer, Futsal)',
    pillars: {
      fisik: ['VO2 Max (Stamina Kardio)', 'Kecepatan (Sprint / Acceleration)', 'Kekuatan Tubuh (Body Balance / Shielding)'],
      teknik: ['Passing (Akurasi Operan)', 'Dribbling & First Touch', 'Shooting (Penyelesaian Akhir)', 'Tackling & Intercepting'],
      taktik: ['Positioning (Pemahaman Ruang)', 'Kecepatan Transisi (Attack to Defense)', 'Visi Bermain (Decision Making)'],
      mental: ['Kerja Sama Tim', 'Komunikasi di Lapangan', 'Disiplin Taktik Pelatih']
    },
    roles: ['Goalkeeper / Keeper', 'Defender / Anchor', 'Flank / Winger', 'Attacker / Pivot']
  },
  'court': {
    label: 'Court Team Sports (Basket 5x5 & 3x3)',
    pillars: {
      fisik: ['Vertical Jump (Lompatan)', 'Lateral Quickness (Geser Menyamping)', 'Stamina Lari Bolak-Balik'],
      teknik: ['Shooting Accuracy (FG, 3PT, FT)', 'Ball Handling (Dribel)', 'Passing Accuracy', 'Rebounding'],
      taktik: ['Spacing (Pemanfaatan Ruang)', 'Eksekusi Pick & Roll', 'Rotasi Pertahanan (Help Defense)', 'Transisi Fast Break'],
      mental: ['Hustle (Etos Kerja Mengejar Bola)', 'Kepemimpinan', 'Keputusan Cepat (Shot Clock Awareness)']
    },
    roles: ['Point Guard', 'Shooting Guard / Wing', 'Center / Big Man']
  },
  'net': {
    label: 'Net Team Sports (Voli Indoor, Voli Pasir, Sepak Takraw)',
    pillars: {
      fisik: ['Jumping Power (Daya Ledak Kaki)', 'Waktu Reaksi (Reaction Time)', 'Fleksibilitas Tubuh'],
      teknik: ['Kualitas Servis', 'Receive / Digging (Bola Pertama)', 'Kualitas Set / Tosser (Umpan)', 'Smash / Spike (Power & Akurasi)', 'Blocking'],
      taktik: ['Membaca Arah Serangan Lawan', 'Rotasi & Coverage Area Kosong', 'Variasi Serangan'],
      mental: ['Komunikasi Antar Pemain', 'Kepercayaan Diri', 'Resiliensi (Bangkit Setelah Eror)']
    },
    roles: ['Setter', 'Smasher / Open Spiker', 'Libero / Defender']
  }
};

export const CATEGORY_KPI_DICTIONARY = SPORT_KPI_MATRIX;

// =====================================================================
// 2. PARAMETER SPESIFIK BERDASARKAN POSISI ATLET
// =====================================================================
export const ROLE_SPECIFIC_KPIS = {
  // Racket Sports Roles
  'Singles Specialist': ['Court Coverage', 'Patience & Rally Construction'],
  'Doubles Front Court': ['Interception Reflex', 'Quick Tap & Drive'],
  'Doubles Rear Court': ['Jump Smash Power', 'Backcourt Defense Rotation'],

  // Field & Team Sports Roles
  'Goalkeeper / Keeper': ['Shot Stopping & Reflex', 'Distribution & Throw-in'],
  'Defender / Anchor': ['Tackling / Intercept', 'Defensive Positioning'],
  'Flank / Winger': ['Sprint Speed & Crossing', '1v1 Dribble Penetration'],
  'Attacker / Pivot': ['Finishing / Target Hold', 'First Touch Under Pressure'],

  // Court Team Sports Roles
  'Point Guard': ['Court Vision & Assist', 'Pace & Ball Control'],
  'Shooting Guard / Wing': ['3-Point Accuracy', 'Perimeter Defense'],
  'Center / Big Man': ['Post Moves & Hook', 'Rim Protection / Blocks'],

  // Net Team Sports Roles
  'Setter': ['Set Precision & Deception', 'Second Ball Attack'],
  'Smasher / Open Spiker': ['Vertical Jump & Spike Angle', 'Tooling the Block'],
  'Libero / Defender': ['Dig Reflex & Diving', 'Free Ball Reception Quality']
};

/**
 * Resolves the sport category key ('racket' | 'field' | 'court' | 'net')
 */
export function resolveSportCategoryKey(selectedClass, activeAcademy) {
  if (selectedClass?.sportCategory && SPORT_KPI_MATRIX[selectedClass.sportCategory]) {
    return selectedClass.sportCategory;
  }
  const acadCat = activeAcademy?.category || activeAcademy?.sportCategory;
  if (acadCat && SPORT_KPI_MATRIX[acadCat]) {
    return acadCat;
  }
  const sportName = (selectedClass?.sport || activeAcademy?.sport || '').toLowerCase();
  if (['badminton', 'tenis', 'padel', 'squash', 'tenis meja', 'bulutangkis'].some((s) => sportName.includes(s))) {
    return 'racket';
  }
  if (['basket', 'basketball'].some((s) => sportName.includes(s))) {
    return 'court';
  }
  if (['voli', 'volleyball', 'takraw'].some((s) => sportName.includes(s))) {
    return 'net';
  }
  if (['futsal', 'sepakbola', 'soccer', 'mini soccer'].some((s) => sportName.includes(s))) {
    return 'field';
  }
  return 'field';
}

function getCategoryVisuals(catKey) {
  switch (catKey) {
    case 'racket':
      return {
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        badgePill: 'bg-emerald-500 text-white',
        border: 'border-emerald-200',
        cardBg: 'bg-emerald-50/40',
        textAccent: 'text-emerald-700',
        sliderAccent: 'accent-emerald-600'
      };
    case 'court':
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        badgePill: 'bg-amber-500 text-white',
        border: 'border-amber-200',
        cardBg: 'bg-amber-50/40',
        textAccent: 'text-amber-700',
        sliderAccent: 'accent-amber-600'
      };
    case 'net':
      return {
        badge: 'bg-purple-50 text-purple-800 border-purple-200',
        badgePill: 'bg-purple-500 text-white',
        border: 'border-purple-200',
        cardBg: 'bg-purple-50/40',
        textAccent: 'text-purple-700',
        sliderAccent: 'accent-purple-600'
      };
    case 'field':
    default:
      return {
        badge: 'bg-blue-50 text-blue-800 border-blue-200',
        badgePill: 'bg-blue-600 text-white',
        border: 'border-blue-200',
        cardBg: 'bg-blue-50/40',
        textAccent: 'text-blue-700',
        sliderAccent: 'accent-blue-600'
      };
  }
}

export default function EvaluationSection({ selectedClass, students = [], tenantId, activeAcademy }) {
  // 1. FILTER SISWA YANG TERDAFTAR DI KELAS AKTIF
  const classStudents = useMemo(() => {
    return students.filter((s) => s.classId === selectedClass?.id);
  }, [students, selectedClass?.id]);

  // 2. DETEKSI SISWA AKTIF DENGAN ID
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const selectedStudent = useMemo(() => {
    if (classStudents.length === 0) return null;
    return classStudents.find((s) => s.id === selectedStudentId) || classStudents[0];
  }, [classStudents, selectedStudentId]);

  // 3. DETEKSI RUMPUN OLAHRAGA AKTIF
  const sportCategoryKey = useMemo(() => {
    return resolveSportCategoryKey(selectedClass, activeAcademy);
  }, [selectedClass?.sportCategory, selectedClass?.sport, activeAcademy?.category, activeAcademy?.sportCategory, activeAcademy?.sport]);

  const categoryConfig = SPORT_KPI_MATRIX[sportCategoryKey] || SPORT_KPI_MATRIX['field'];
  const sportName = selectedClass?.sport || activeAcademy?.sport || categoryConfig.label;
  const theme = getCategoryVisuals(sportCategoryKey);

  // 4. POSISI / PERAN SISWA DINAMIS
  const defaultRole = useMemo(() => {
    if (!selectedStudent) return '';
    const existing = selectedStudent.playerRole || selectedStudent.position || '';
    const available = categoryConfig.roles || [];
    return available.includes(existing) ? existing : (available[0] || '');
  }, [selectedStudent, categoryConfig.roles]);

  const [customRole, setCustomRole] = useState(null);
  const playerRole = customRole !== null ? customRole : defaultRole;

  // 5. PARAMETER PILAR SPORTS SCIENCE
  const pillars = categoryConfig.pillars || {
    fisik: [],
    teknik: [],
    taktik: [],
    mental: []
  };

  const roleKPIs = useMemo(() => {
    return (playerRole && ROLE_SPECIFIC_KPIS[playerRole]) || [];
  }, [playerRole]);

  // 6. SCORES & FORM STATE
  const [evaluationDate, setEvaluationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState({});
  const [coachNote, setCoachNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // 7. KALKULASI SUB-SKOR PER PILAR (PURE USEMEMO)
  const pillarScores = useMemo(() => {
    const computeAvg = (kpiList) => {
      if (!kpiList || kpiList.length === 0) return 0;
      const total = kpiList.reduce((sum, kpi) => {
        const val = scores[kpi] !== undefined ? scores[kpi] : 75;
        return sum + val;
      }, 0);
      return Math.round(total / kpiList.length);
    };

    const fisik = computeAvg(pillars.fisik);
    const teknik = computeAvg(pillars.teknik);
    const taktik = computeAvg(pillars.taktik);
    const mental = computeAvg(pillars.mental);
    const position = computeAvg(roleKPIs);

    const allActiveKPIs = Array.from(new Set([
      ...(pillars.fisik || []),
      ...(pillars.teknik || []),
      ...(pillars.taktik || []),
      ...(pillars.mental || []),
      ...roleKPIs
    ]));

    const overall = computeAvg(allActiveKPIs);

    return { fisik, teknik, taktik, mental, position, overall, allActiveKPIs };
  }, [pillars, roleKPIs, scores]);

  const overallScore = pillarScores.overall;

  // Radar chart data for recharts
  const radarData = useMemo(() => [
    { subject: 'Fisik', score: pillarScores.fisik, fullMark: 100 },
    { subject: 'Teknik', score: pillarScores.teknik, fullMark: 100 },
    { subject: 'Taktik', score: pillarScores.taktik, fullMark: 100 },
    { subject: 'Mental', score: pillarScores.mental, fullMark: 100 },
    { subject: 'Posisi', score: pillarScores.position, fullMark: 100 }
  ], [pillarScores]);

  // 8. FIRESTORE REAL-TIME EVALUATION HISTORY
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [filterStudentId, setFilterStudentId] = useState('ALL');

  useEffect(() => {
    if (!tenantId || !selectedClass?.id) {
      setHistory([]);
      setLoadingHistory(false);
      return;
    }
    setLoadingHistory(true);
    const ref = collection(db, 'academy_evaluations');
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
        console.error('Error fetching academy_evaluations:', err);
        handleFirestoreError(err, 'list', 'academy_evaluations');
        setHistory([]);
        setLoadingHistory(false);
      }
    );
    return () => unsub();
  }, [tenantId, selectedClass?.id]);

  // Handler pergantian siswa
  const handleSelectStudent = (student) => {
    setSelectedStudentId(student.id);
    setCustomRole(null);
    setScores({});
    setCoachNote('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Handler slider nilai
  const handleScoreChange = (kpiName, value) => {
    setScores((prev) => ({
      ...prev,
      [kpiName]: Math.min(100, Math.max(0, Number(value) || 0))
    }));
  };

  // Generasi Draf Analisis Otomatis
  const handleGenerateAutoDraft = () => {
    if (!selectedStudent) return;

    const list = [
      { name: 'Kondisi Fisik', score: pillarScores.fisik },
      { name: 'Kemampuan Teknik', score: pillarScores.teknik },
      { name: 'Pemahaman Taktik', score: pillarScores.taktik },
      { name: 'Mentalitas', score: pillarScores.mental },
      { name: `Spesifik Posisi (${playerRole || 'Peran'})`, score: pillarScores.position }
    ];

    const sorted = [...list].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];

    let draft = `Atlet ${selectedStudent.studentName} (${playerRole || 'Umum'}) menunjukkan performa paling dominan pada pilar ${top.name} (skor: ${top.score}/100). `;
    
    if (bottom.score < 70) {
      draft += `Bidang yang perlu diprioritaskan untuk pembenahan adalah ${bottom.name} (skor: ${bottom.score}/100). `;
    } else {
      draft += `Performa pilar ${bottom.name} juga sudah tergolong stabil (${bottom.score}/100). `;
    }

    if (pillarScores.overall >= 85) {
      draft += `Secara keseluruhan, atlet berada dalam tingkat kematangan tinggi (A - Sangat Baik) dan siap untuk ajang kompetitif puncak.`;
    } else if (pillarScores.overall >= 75) {
      draft += `Rekomendasi pelatih: Pertahankan konsistensi latihan dan tingkatkan simulasi pertandingan intensif.`;
    } else {
      draft += `Rekomendasi pelatih: Fokus penguatan fundamental fisik & teknik dasar secara bertahap dalam sesi harian.`;
    }

    setCoachNote(draft);
  };

  // Grade helper
  const getScoreGrade = (score) => {
    if (score >= 85) return { grade: 'A (Sangat Baik)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (score >= 75) return { grade: 'B (Baik)', badge: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (score >= 60) return { grade: 'C (Cukup)', badge: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { grade: 'D (Perlu Bimbingan)', badge: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  // Handler simpan evaluasi ke Firestore
  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!selectedClass?.id || !tenantId) return;
    if (!selectedStudent?.id) {
      setErrorMsg('Pilih siswa atlet dari daftar untuk dievaluasi.');
      return;
    }
    if (!evaluationDate) {
      setErrorMsg('Tanggal evaluasi wajib diisi.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const evaluatorName = selectedClass.coachName || selectedClass.coach || 'Pelatih Utama';

    // Susun scores lengkap
    const finalScores = {};
    pillarScores.allActiveKPIs.forEach((kpi) => {
      finalScores[kpi] = scores[kpi] !== undefined ? scores[kpi] : 75;
    });

    try {
      await addDoc(collection(db, 'academy_evaluations'), {
        tenantId,
        academyId: selectedClass.academyId || activeAcademy?.id || '',
        classId: selectedClass.id,
        className: selectedClass.className || selectedClass.name || 'Kelas Akademi',
        sportCategory: sportCategoryKey,
        sportCategoryLabel: categoryConfig.label,
        sportName: sportName,
        sport: selectedClass.sport || sportName,
        playerRole: playerRole || 'Umum',
        studentId: selectedStudent.id,
        studentName: selectedStudent.studentName || 'Siswa',
        date: evaluationDate,
        scores: finalScores,
        pillarScores: {
          fisik: pillarScores.fisik,
          teknik: pillarScores.teknik,
          taktik: pillarScores.taktik,
          mental: pillarScores.mental,
          position: pillarScores.position,
          overall: pillarScores.overall
        },
        overallScore: pillarScores.overall,
        coachNote: coachNote.trim(),
        evaluator: evaluatorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update student profile position jika ada perubahan
      if (
        selectedStudent.id &&
        playerRole &&
        (selectedStudent.playerRole !== playerRole || selectedStudent.position !== playerRole)
      ) {
        try {
          await updateDoc(doc(db, 'students', selectedStudent.id), {
            playerRole: playerRole,
            position: playerRole,
            updatedAt: serverTimestamp()
          });
        } catch (studentErr) {
          console.warn('Note: Could not update student playerRole in profile:', studentErr);
        }
      }

      setSuccessMsg(`Rapor evaluasi ${selectedStudent.studentName} (${playerRole}) berhasil disimpan!`);
      setCoachNote('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to save evaluation to academy_evaluations:', err);
      handleFirestoreError(err, 'create', 'academy_evaluations');
      setErrorMsg('Gagal menyimpan rapor evaluasi. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvaluation = async (id, studentName) => {
    if (!window.confirm(`Hapus data rapor evaluasi untuk ${studentName}?`)) return;
    try {
      await deleteDoc(doc(db, 'academy_evaluations', id));
    } catch (err) {
      console.error('Failed to delete evaluation:', err);
      handleFirestoreError(err, 'delete', 'academy_evaluations');
    }
  };

  const filteredHistory = filterStudentId === 'ALL'
    ? history
    : history.filter((h) => h.studentId === filterStudentId);

  const evaluatedStudentIdsToday = new Set(
    history.filter((h) => h.date === evaluationDate).map((h) => h.studentId)
  );

  return (
    <div className="space-y-6 text-left">
      {/* ================================================================= */}
      {/* 1. HEADER INFO & BADGE RUMPUN OLAHRAGA */}
      {/* ================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100 shadow-2xs">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <span>Engine Evaluasi 4-Pilar Sports Science</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Scouting Radar
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelas: <strong className="text-slate-800 font-bold">{selectedClass?.className}</strong> &bull; Cabang: <span className="text-blue-600 font-bold">{sportName}</span>
              </p>
            </div>
          </div>

          {/* BADGE SEKAT PEMBATAS RUMPUN OLAHRAGA */}
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-bold ${theme.badge} shadow-2xs`}>
            <Layers className="w-4 h-4 shrink-0" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                Mode Penilaian Rumpun:
              </span>
              <span className="font-extrabold">
                {categoryConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* FEEDBACK NOTIFICATION ALERTS */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl font-bold flex items-center gap-2 shadow-2xs animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-bold flex items-center gap-2 shadow-2xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. MASTER-DETAIL INTERFACE */}
        {/* ================================================================= */}
        {classStudents.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl text-center p-6 bg-slate-50/50">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              Belum ada siswa terdaftar di kelas ini.
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Daftarkan siswa baru ke kelas <strong className="text-slate-700">{selectedClass?.className}</strong> untuk mulai mengisi rapor evaluasi KPI berjenjang.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
            
            {/* KOLOM KIRI: DAFTAR SISWA (MASTER - 4 COLS) */}
            <div className="lg:col-span-4 space-y-3 bg-slate-50/80 p-3.5 sm:p-4 rounded-3xl border border-slate-200/90">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Daftar Siswa ({classStudents.length})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Pilih atlet</span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {classStudents.map((st) => {
                  const isSelected = selectedStudent?.id === st.id;
                  const isEvaluatedToday = evaluatedStudentIdsToday.has(st.id);
                  const currentRole = st.playerRole || st.position;

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectStudent(st)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-101'
                          : 'bg-white border-slate-200/90 text-slate-800 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="overflow-hidden min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-xs truncate">{st.studentName}</p>
                          {isEvaluatedToday && (
                            <span
                              title="Sudah dievaluasi pada tanggal ini"
                              className={`px-1.5 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                                isSelected ? 'bg-cyan-300 text-blue-900' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              ✓ Terisi
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 truncate">
                          {currentRole ? (
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                              isSelected ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {currentRole}
                            </span>
                          ) : (
                            <span className={`text-[10px] italic ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                              Posisi belum di-set
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-cyan-200 translate-x-0.5' : 'text-slate-300'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* KOLOM KANAN: FORM EVALUASI KPI & RADAR (DETAIL - 8 COLS) */}
            <div className="lg:col-span-8 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 space-y-5 shadow-2xs">
              {selectedStudent ? (
                <form onSubmit={handleSaveEvaluation} className="space-y-6">
                  
                  {/* HEADER IDENTITAS SISWA AKTIF & PILIHAN POSISI */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">
                          Siswa Atlet Sedang Dinilai:
                        </span>
                        <h4 className="text-base font-black text-slate-900">{selectedStudent.studentName}</h4>
                        <p className="text-[11px] text-slate-500">
                          Wali: <strong className="text-slate-700">{selectedStudent.parentName || '-'}</strong> ({selectedStudent.parentPhone || '-'})
                        </p>
                      </div>

                      {/* TANGGAL EVALUASI */}
                      <div className="shrink-0">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-0.5">
                          Tgl Evaluasi
                        </label>
                        <input
                          type="date"
                          value={evaluationDate}
                          onChange={(e) => setEvaluationDate(e.target.value)}
                          className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 cursor-pointer shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* DROPDOWN POSISI / PERAN SISWA */}
                    <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-blue-600" />
                          <span>Posisi / Peran Spesifik Atlet</span>
                        </label>
                        <select
                          value={playerRole}
                          onChange={(e) => setCustomRole(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 cursor-pointer shadow-2xs"
                        >
                          {categoryConfig.roles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* INDIKATOR OVERALL SCORE LIVE */}
                      <div className="sm:text-right shrink-0">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Predikat Rata-Rata
                        </span>
                        <div className="flex items-center sm:justify-end gap-2 mt-0.5">
                          <span className="text-2xl font-black text-slate-900">{overallScore}</span>
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border ${getScoreGrade(overallScore).badge}`}>
                            {getScoreGrade(overallScore).grade}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ringkasan Sub-Skor 5-Pilar & Radar Chart Visualisation */}
                  <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-md space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <BarChart2 className="w-4 h-4" />
                        <span>Profile Scouting Radar Chart (5-Pilar)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">Real-Time Metric</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Radar Chart Component */}
                      <div className="md:col-span-7 h-52 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                            <PolarGrid stroke="#334155" />
                            <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 8 }} />
                            <Radar name="Skor Atlet" dataKey="score" stroke="#38bdf8" fill="#0284c7" fillOpacity={0.45} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#f8fafc' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* 5 Summary Badge Cards */}
                      <div className="md:col-span-5 grid grid-cols-1 gap-1.5 text-xs">
                        <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-between">
                          <span className="text-rose-300 font-bold text-[11px] flex items-center gap-1.5">
                            <Dumbbell className="w-3.5 h-3.5 text-rose-400" />
                            <span>1. Kondisi Fisik</span>
                          </span>
                          <span className="font-black text-rose-200 text-sm">{pillarScores.fisik}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-between">
                          <span className="text-blue-300 font-bold text-[11px] flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-blue-400" />
                            <span>2. Kemampuan Teknik</span>
                          </span>
                          <span className="font-black text-blue-200 text-sm">{pillarScores.teknik}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-between">
                          <span className="text-purple-300 font-bold text-[11px] flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-purple-400" />
                            <span>3. Pemahaman Taktik</span>
                          </span>
                          <span className="font-black text-purple-200 text-sm">{pillarScores.taktik}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-between">
                          <span className="text-emerald-300 font-bold text-[11px] flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            <span>4. Mentalitas</span>
                          </span>
                          <span className="font-black text-emerald-200 text-sm">{pillarScores.mental}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-between">
                          <span className="text-indigo-300 font-bold text-[11px] flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-indigo-400" />
                            <span>5. Peran Posisi</span>
                          </span>
                          <span className="font-black text-indigo-200 text-sm">{pillarScores.position}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SLIDERS MATRIX KPI 4 PILAR FUNDAMENTAL & POSISI */}
                  <div className="space-y-5">
                    
                    {/* PILAR 1: KONDISI FISIK (ROSE ACCENT) */}
                    <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                          <Dumbbell className="w-4 h-4 text-rose-600" />
                          <span>1. Kondisi Fisik</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                          Rata-rata: {pillarScores.fisik}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(pillars.fisik || []).map((kpi) => {
                          const val = scores[kpi] !== undefined ? scores[kpi] : 75;
                          return (
                            <div key={kpi} className="p-3 bg-white border border-rose-100 rounded-xl space-y-1.5 shadow-2xs">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-800 truncate" title={kpi}>{kpi}</span>
                                <span className="font-black text-rose-600 text-sm">{val}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={val}
                                onChange={(e) => handleScoreChange(kpi, e.target.value)}
                                className="w-full accent-rose-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* PILAR 2: KEMAMPUAN TEKNIK (BLUE ACCENT) */}
                    <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-blue-600" />
                          <span>2. Kemampuan Teknik</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                          Rata-rata: {pillarScores.teknik}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(pillars.teknik || []).map((kpi) => {
                          const val = scores[kpi] !== undefined ? scores[kpi] : 75;
                          return (
                            <div key={kpi} className="p-3 bg-white border border-blue-100 rounded-xl space-y-1.5 shadow-2xs">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-800 truncate" title={kpi}>{kpi}</span>
                                <span className="font-black text-blue-600 text-sm">{val}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={val}
                                onChange={(e) => handleScoreChange(kpi, e.target.value)}
                                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* PILAR 3: PEMAHAMAN TAKTIK (PURPLE ACCENT) */}
                    <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-purple-600" />
                          <span>3. Pemahaman Taktik</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                          Rata-rata: {pillarScores.taktik}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(pillars.taktik || []).map((kpi) => {
                          const val = scores[kpi] !== undefined ? scores[kpi] : 75;
                          return (
                            <div key={kpi} className="p-3 bg-white border border-purple-100 rounded-xl space-y-1.5 shadow-2xs">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-800 truncate" title={kpi}>{kpi}</span>
                                <span className="font-black text-purple-600 text-sm">{val}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={val}
                                onChange={(e) => handleScoreChange(kpi, e.target.value)}
                                className="w-full accent-purple-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* PILAR 4: MENTALITAS (EMERALD ACCENT) */}
                    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          <span>4. Mentalitas</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Rata-rata: {pillarScores.mental}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(pillars.mental || []).map((kpi) => {
                          const val = scores[kpi] !== undefined ? scores[kpi] : 75;
                          return (
                            <div key={kpi} className="p-3 bg-white border border-emerald-100 rounded-xl space-y-1.5 shadow-2xs">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-800 truncate" title={kpi}>{kpi}</span>
                                <span className="font-black text-emerald-600 text-sm">{val}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={val}
                                onChange={(e) => handleScoreChange(kpi, e.target.value)}
                                className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* PILAR 5: POSISI SPESIFIK (INDIGO ACCENT) */}
                    {roleKPIs.length > 0 && (
                      <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-indigo-600" />
                            <span>5. Parameter Spesifik Posisi: {playerRole}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Rata-rata: {pillarScores.position}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {roleKPIs.map((kpi) => {
                            const val = scores[kpi] !== undefined ? scores[kpi] : 75;
                            return (
                              <div key={kpi} className="p-3 bg-white border border-indigo-100 rounded-xl space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="text-slate-900 font-extrabold flex items-center gap-1 truncate" title={kpi}>
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                                    <span className="truncate">{kpi}</span>
                                  </span>
                                  <span className="font-black text-indigo-600 text-sm">{val}</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={val}
                                  onChange={(e) => handleScoreChange(kpi, e.target.value)}
                                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CATATAN EVALUASI PELATIH + AUTOMATED ANALYSIS BUTTON */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>Catatan Evaluasi Pelatih (Rapor Siswa)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateAutoDraft}
                        className="px-3 py-1 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Buat Draf Analisis Otomatis</span>
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={coachNote}
                      onChange={(e) => setCoachNote(e.target.value)}
                      placeholder={`e.g. Sebagai ${playerRole || 'atlet'}, pergerakan dan pengambilan keputusannya sudah matang. Tingkatkan ketahanan fisik di set penutup.`}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                    />
                  </div>

                  {/* SIMPAN BUTTON */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Menyimpan Rapor...</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-4 h-4 text-cyan-200" />
                          <span>Simpan Evaluasi {selectedStudent.studentName}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Pilih siswa dari daftar sebelah kiri untuk mulai mengisi rapor evaluasi.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 3. RIWAYAT EVALUASI KELAS INI */}
      {/* ================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4.5 h-4.5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Riwayat Rapor Evaluasi Atlet Disimpan ({filteredHistory.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStudentId}
              onChange={(e) => setFilterStudentId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Semua Siswa Kelas Ini</option>
              {classStudents.map((st) => (
                <option key={st.id} value={st.id}>{st.studentName}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingHistory ? (
          <p className="py-8 text-center text-xs text-slate-400 font-medium">Memuat riwayat evaluasi atlet...</p>
        ) : filteredHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl p-4">
            Belum ada rekam evaluasi disimpan untuk siswa/kelas ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHistory.map((item) => {
              const sc = item.scores || {};
              const ps = item.pillarScores || {};
              const gradeInfo = getScoreGrade(item.overallScore || 0);

              return (
                <div 
                  key={item.id} 
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-400 transition-all space-y-3 relative group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900">{item.studentName}</h4>
                        {item.playerRole && (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                            {item.playerRole}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        <span>Tgl: {item.date}</span> &bull; 
                        <span>Cabang: {item.sportName || item.sport || '-'}</span> &bull; 
                        <span>Pelatih: {item.evaluator || 'Pelatih'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 text-xs font-black rounded-xl border ${gradeInfo.badge}`}>
                        {item.overallScore || 0} / 100
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvaluation(item.id, item.studentName)}
                        title="Hapus Evaluasi"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 5-Pillar Breakdown Badges */}
                  {ps.fisik !== undefined ? (
                    <div className="grid grid-cols-5 gap-1 text-[10px] text-center font-bold">
                      <div className="p-1.5 bg-rose-50 text-rose-800 rounded-lg border border-rose-100">
                        <span className="block text-[8px] uppercase text-rose-600 font-black">Fisik</span>
                        <span>{ps.fisik}</span>
                      </div>
                      <div className="p-1.5 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                        <span className="block text-[8px] uppercase text-blue-600 font-black">Teknik</span>
                        <span>{ps.teknik}</span>
                      </div>
                      <div className="p-1.5 bg-purple-50 text-purple-800 rounded-lg border border-purple-100">
                        <span className="block text-[8px] uppercase text-purple-600 font-black">Taktik</span>
                        <span>{ps.taktik}</span>
                      </div>
                      <div className="p-1.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100">
                        <span className="block text-[8px] uppercase text-emerald-600 font-black">Mental</span>
                        <span>{ps.mental}</span>
                      </div>
                      <div className="p-1.5 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-100">
                        <span className="block text-[8px] uppercase text-indigo-600 font-black">Posisi</span>
                        <span>{ps.position}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-white p-3 rounded-xl border border-slate-200/80">
                      {Object.entries(sc).map(([kpiName, kpiVal]) => (
                        <div key={kpiName} className="p-1.5 bg-slate-50 rounded-lg">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold truncate" title={kpiName}>
                            {kpiName}
                          </span>
                          <strong className="text-slate-900 text-xs font-black">{kpiVal}</strong>
                          <span className="text-[10px] text-slate-400">/100</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.coachNote && (
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed">
                      <strong className="block text-[10px] uppercase font-black text-amber-800 mb-0.5">Catatan Pelatih:</strong>
                      "{item.coachNote}"
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
