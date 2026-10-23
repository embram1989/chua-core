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
  serverTimestamp,
  arrayUnion 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { calculateAge } from '../utils/helpers';

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
  BarChart2,
  Lock,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';

// =====================================================================
// 1. RESTRUKTURISASI MATRIKS KPI 4-PILAR SPORTS SCIENCE + POSISI SPESIFIK
// =====================================================================
export const SPORT_KPI_MATRIX = {
  'racket': {
    label: 'Racket Sports (Badminton, Tenis, Padel)',
    pillars: {
      fisik: ['Footwork', 'Stamina Reli', 'Explosive Power'],
      teknik: ['Akurasi Servis', 'Kekuatan Smash', 'Dropshot / Netting', 'Defense / Block'],
      taktik: ['Ball Placement', 'Antisipasi Lawan', 'Court Coverage'],
      mental: ['Ketenangan Poin Kritis', 'Fokus', 'Fighting Spirit']
    },
    roles: ['Singles Specialist', 'Doubles Front Court', 'Doubles Rear Court']
  },
  'field': {
    label: 'Field & Team Sports (Sepakbola, Mini Soccer, Futsal)',
    pillars: {
      fisik: ['VO2 Max (Kardio)', 'Sprint & Acceleration', 'Body Balance'],
      teknik: ['Passing Accuracy', 'Dribbling & First Touch', 'Shooting / Finishing', 'Tackling / Intercepting'],
      taktik: ['Positioning', 'Kecepatan Transisi', 'Visi & Decision Making'],
      mental: ['Kerja Sama Tim', 'Komunikasi Lapangan', 'Disiplin Taktik']
    },
    roles: ['Goalkeeper / Keeper', 'Defender / Anchor', 'Midfielder / Playmaker', 'Flank / Winger', 'Forward / Pivot']
  },
  'court': {
    label: 'Court Team Sports (Basket 5x5 & 3x3)',
    pillars: {
      fisik: ['Vertical Jump', 'Lateral Quickness', 'Stamina Lari Bolak-Balik'],
      teknik: ['Shooting Accuracy (FG, 3PT, FT)', 'Ball Handling & Dribel', 'Passing Accuracy', 'Rebounding'],
      taktik: ['Spacing & Ruang', 'Eksekusi Pick & Roll', 'Rotasi Pertahanan (Help Defense)', 'Transisi Fast Break'],
      mental: ['Hustle', 'Kepemimpinan', 'Shot Clock Awareness']
    },
    roles: ['Point Guard', 'Shooting Guard / Wing', 'Center / Big Man']
  },
  'net': {
    label: 'Net Team Sports (Voli Indoor, Voli Pasir, Sepak Takraw)',
    pillars: {
      fisik: ['Jumping Power (Daya Ledak)', 'Waktu Reaksi (Reaction Time)', 'Fleksibilitas Tubuh'],
      teknik: ['Kualitas Servis', 'Receive / Digging (Bola Pertama)', 'Kualitas Set / Tosser', 'Smash / Spike', 'Blocking'],
      taktik: ['Membaca Serangan Lawan', 'Rotasi & Coverage', 'Variasi Serangan'],
      mental: ['Komunikasi Lapangan', 'Kepercayaan Diri', 'Resiliensi (Bangkit Eror)']
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
  'Goalkeeper': ['Shot Stopping & Reflex', 'Distribution & Throw-in'],
  'Goalkeeper / Keeper': ['Shot Stopping & Reflex', 'Distribution & Throw-in'],
  'Anchor / Defender': ['Tackling / Intercept', 'Defensive Positioning'],
  'Defender / Anchor': ['Tackling / Intercept', 'Defensive Positioning'],
  'Midfielder / Playmaker': ['Passing Range & Ball Retention', 'Box-to-Box Stamina & Pressing'],
  'Midfielder': ['Passing Range & Ball Retention', 'Box-to-Box Stamina & Pressing'],
  'Flank / Winger': ['Sprint Speed & Crossing', '1v1 Dribble Penetration'],
  'Forward / Pivot': ['Finishing / Target Hold', 'First Touch Under Pressure'],
  'Pivot / Striker': ['Finishing / Target Hold', 'First Touch Under Pressure'],
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

  // 4. POSISI / PERAN SISWA TERKUNCI (LOCKED FROM STUDENT PROFILE)
  const playerRole = selectedStudent?.playerRole || selectedStudent?.position || '';

  // MUTASI POSISI MODAL STATE
  const [showMutationModal, setShowMutationModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [mutationReason, setMutationReason] = useState('');
  const [isMutating, setIsMutating] = useState(false);

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

  // 7. KALKULASI SUB-SKOR PER PILAR (USEMEMO)
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

    const overall = Math.round((fisik + teknik + taktik + mental + position) / 5);

    const allActiveKPIs = Array.from(new Set([
      ...(pillars.fisik || []),
      ...(pillars.teknik || []),
      ...(pillars.taktik || []),
      ...(pillars.mental || []),
      ...roleKPIs
    ]));

    return { fisik, teknik, taktik, mental, position, overall, allActiveKPIs };
  }, [pillars, roleKPIs, scores]);

  const overallScore = pillarScores.overall;

  // Radar chart data for recharts
  const radarData = useMemo(() => [
    { subject: 'Fisik', A: pillarScores.fisik, fullMark: 100 },
    { subject: 'Teknik', A: pillarScores.teknik, fullMark: 100 },
    { subject: 'Taktik', A: pillarScores.taktik, fullMark: 100 },
    { subject: 'Mental', A: pillarScores.mental, fullMark: 100 },
    { subject: 'Posisi', A: pillarScores.position, fullMark: 100 }
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

  // 9. DETEKSI EVALUASI TERAKHIR SISWA UNTUK AUTO PRE-FILL SLIDER
  const lastStudentEvaluation = useMemo(() => {
    if (!selectedStudent?.id || history.length === 0) return null;
    return history.find((h) => h.studentId === selectedStudent.id) || null;
  }, [selectedStudent?.id, history]);

  // PRE-FILL STATE SCORES DARI HISTORI TERAKHIR ATLET
  useEffect(() => {
    if (lastStudentEvaluation && lastStudentEvaluation.scores && Object.keys(lastStudentEvaluation.scores).length > 0) {
      setScores(lastStudentEvaluation.scores);
    } else {
      setScores({});
    }
  }, [selectedStudent?.id, lastStudentEvaluation]);

  // Handler pergantian siswa
  const handleSelectStudent = (student) => {
    setSelectedStudentId(student.id);
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

  // Open Mutation Modal
  const handleOpenMutationModal = () => {
    if (!selectedStudent) return;
    const availRoles = categoryConfig.roles || [];
    setNewRole(playerRole || availRoles[0] || '');
    setMutationReason('');
    setShowMutationModal(true);
  };

  // Execute Position Mutation (Firestore updateDoc with arrayUnion)
  const handleMutatePosition = async (e) => {
    e.preventDefault();
    if (!selectedStudent?.id || !newRole) return;

    setIsMutating(true);
    setErrorMsg(null);
    try {
      const historyEntry = {
        oldRole: playerRole || 'Belum Ada',
        newRole: newRole,
        date: new Date().toISOString(),
        reason: mutationReason.trim() || 'Mutasi posisi atlet oleh pelatih'
      };

      await updateDoc(doc(db, 'students', selectedStudent.id), {
        playerRole: newRole,
        position: newRole,
        positionHistory: arrayUnion(historyEntry),
        updatedAt: serverTimestamp()
      });

      setSuccessMsg(`Posisi ${selectedStudent.studentName} berhasil dimutasi ke "${newRole}"!`);
      setShowMutationModal(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to mutate student position:', err);
      handleFirestoreError(err, 'update', 'students');
      setErrorMsg('Gagal melakukan mutasi posisi. Silakan coba lagi.');
    } finally {
      setIsMutating(false);
    }
  };

  // AUTO-GENERATOR CATATAN PELATIH
  const handleGenerateDraft = () => {
    if (!selectedStudent) return;

    const items = [
      { name: 'Kondisi Fisik', score: pillarScores.fisik },
      { name: 'Kemampuan Teknik', score: pillarScores.teknik },
      { name: 'Pemahaman Taktik', score: pillarScores.taktik },
      { name: 'Mentalitas', score: pillarScores.mental },
      { name: `Spesifik Posisi (${playerRole || 'Peran'})`, score: pillarScores.position }
    ];

    const sorted = [...items].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];

    let draft = `Atlet ${selectedStudent.studentName} (${playerRole || 'Umum'}) menunjukkan kekuatan luar biasa pada aspek ${top.name} (Skor: ${top.score}/100). Namun, perlu ada fokus latihan tambahan untuk meningkatkan ${bottom.name} (Skor: ${bottom.score}/100). Secara keseluruhan performa sudah ${pillarScores.overall >= 80 ? 'sangat memuaskan' : pillarScores.overall >= 70 ? 'cukup baik' : 'membutuhkan pembinaan berkelanjutan'}.`;

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
    if (!playerRole) {
      setErrorMsg('Siswa belum memiliki posisi resmi. Silakan gunakan tombol "🔄 Ganti Posisi" terlebih dahulu.');
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 border border-indigo-100/80">
              <Award className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 tracking-tight">
                  Engine Evaluasi 4-Pilar & Mutasi Posisi
                </h3>
                {/* BADGE RUMPUN SEJAJAR JUDUL */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${theme.badge}`}>
                  <Layers className="w-3 h-3 shrink-0" />
                  <span>{categoryConfig.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelas: <strong className="text-slate-700 font-medium">{selectedClass?.className}</strong> &bull; Cabang: <span className="text-indigo-600 font-medium">{sportName}</span>
              </p>
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
        {/* 2. MASTER-DETAIL INTERFACE (CLEAN INTEGRATED GRID) */}
        {/* ================================================================= */}
        {classStudents.length === 0 ? (
          <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center p-6 bg-slate-50/50">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Belum ada siswa terdaftar di kelas ini.
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Daftarkan siswa baru ke kelas <strong className="text-slate-700">{selectedClass?.className}</strong> untuk mulai mengisi rapor evaluasi 4-Pilar.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 2A. DROPDOWN SELECTOR SISWA & PROFIL ATLET AKTIF */}
            <div className="p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Dropdown Siswa (Select Ringkas & Elegan) */}
                <div className="flex-1">
                  <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Pilih Siswa / Atlet Evaluasi ({classStudents.length} Atlet)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedStudent?.id || ''}
                      onChange={(e) => {
                        const found = classStudents.find((s) => s.id === e.target.value);
                        if (found) handleSelectStudent(found);
                      }}
                      className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 shadow-2xs cursor-pointer appearance-none pr-10"
                    >
                      {classStudents.map((st) => {
                        const isEvaluatedToday = evaluatedStudentIdsToday.has(st.id);
                        const pos = st.playerRole || st.position || 'Belum Set Posisi';
                        return (
                          <option key={st.id} value={st.id}>
                            {isEvaluatedToday ? '✓ [Terisi] ' : ''}{st.studentName} — Posisi: {pos}
                          </option>
                        );
                      })}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Tanggal & Indikator Selesai Sesi */}
                <div className="flex flex-wrap items-center gap-3 self-start lg:self-end">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tanggal Sesi</span>
                    </label>
                    <input
                      type="date"
                      value={evaluationDate}
                      onChange={(e) => setEvaluationDate(e.target.value)}
                      className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 shadow-2xs cursor-pointer"
                    />
                  </div>

                  {selectedStudent && evaluatedStudentIdsToday.has(selectedStudent.id) && (
                    <div className="self-end pb-0.5">
                      <span className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Sesi Hari Ini Sudah Terisi</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rincian Ringkas Atlet Terpilih & Kontrol Posisi */}
              {selectedStudent && (
                <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">{selectedStudent.studentName}</span>
                      {calculateAge(selectedStudent.birthDate) !== '-' && (
                        <span className="px-2 py-0.5 bg-white text-slate-600 border border-slate-200 rounded-md text-[10px] font-semibold">
                          Usia: {calculateAge(selectedStudent.birthDate)} Thn
                        </span>
                      )}
                    </div>
                    <span className="text-slate-300 hidden sm:inline">&bull;</span>
                    <p className="text-xs text-slate-500">
                      Wali: <strong className="text-slate-700">{selectedStudent.parentName || '-'}</strong> {selectedStudent.parentPhone ? `(${selectedStudent.parentPhone})` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Posisi & Mutasi */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Posisi:</span>
                      </span>
                      {playerRole ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-slate-800 border border-slate-200 rounded-lg text-xs font-bold shadow-2xs">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>{playerRole}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold">
                          Belum Set
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenMutationModal}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Ubah posisi bermain atlet"
                      >
                        <RefreshCw className="w-3 h-3 text-indigo-600" />
                        <span>Ganti Posisi</span>
                      </button>
                    </div>

                    {/* Live Skor */}
                    <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                      <span className="text-xs text-slate-500 font-medium">Skor Total:</span>
                      <span className="text-lg font-black text-slate-900">{overallScore}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-md border ${getScoreGrade(overallScore).badge}`}>
                        {getScoreGrade(overallScore).grade}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Smart Pre-Fill Banner */}
              {lastStudentEvaluation ? (
                <div className="px-3.5 py-2 bg-indigo-50/70 border border-indigo-100 text-indigo-900 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 animate-pulse" />
                    <span>
                      <strong>Smart Pre-Fill:</strong> Nilai slider dimuat otomatis dari rapor sesi tanggal <strong>{lastStudentEvaluation.date || 'sebelumnya'}</strong>.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded-md shrink-0">
                    Histori Terakhir
                  </span>
                </div>
              ) : (
                <div className="px-3.5 py-1.5 bg-slate-100/70 text-slate-500 rounded-xl text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Sesi evaluasi perdana atlet di kelas ini (Baseline nilai awal: 75).</span>
                </div>
              )}
            </div>

            {/* 2B. TATA LETAK GRID 2-KOLOM (KIRI & KANAN) */}
            {selectedStudent ? (
              <form onSubmit={handleSaveEvaluation} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  
                  {/* KOLOM KIRI: GRAFIK RADAR + FISIK + TEKNIK */}
                  <div className="space-y-6">
                    
                    {/* 1. Grafik Scouting Radar */}
                    <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                          <BarChart2 className="w-4 h-4" />
                          <span>Profil Atlet / Scouting Radar</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">Real-Time Scouting</span>
                      </div>

                      {/* Recharts Container */}
                      <div className="h-60 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={240}>
                          <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                            <PolarGrid stroke="#334155" />
                            <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 9 }} />
                            <Radar name="Skor Atlet" dataKey="A" stroke="#818cf8" fill="#6366f1" fillOpacity={0.5} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Sub-Score Breakdown Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs pt-1 border-t border-slate-800/80">
                        <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/60 text-center">
                          <span className="text-rose-300 block text-[9px] font-bold uppercase truncate">1. Fisik</span>
                          <span className="font-black text-rose-200 text-sm">{pillarScores.fisik}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-800/60 text-center">
                          <span className="text-blue-300 block text-[9px] font-bold uppercase truncate">2. Teknik</span>
                          <span className="font-black text-blue-200 text-sm">{pillarScores.teknik}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/60 text-center">
                          <span className="text-purple-300 block text-[9px] font-bold uppercase truncate">3. Taktik</span>
                          <span className="font-black text-purple-200 text-sm">{pillarScores.taktik}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-center">
                          <span className="text-emerald-300 block text-[9px] font-bold uppercase truncate">4. Mental</span>
                          <span className="font-black text-emerald-200 text-sm">{pillarScores.mental}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-center col-span-2 sm:col-span-1">
                          <span className="text-indigo-300 block text-[9px] font-bold uppercase truncate">5. Posisi</span>
                          <span className="font-black text-indigo-200 text-sm">{pillarScores.position}</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Pilar 1: Kondisi Fisik */}
                    <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                          <Dumbbell className="w-4 h-4 text-rose-600" />
                          <span>1. Kondisi Fisik</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
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

                    {/* 3. Pilar 2: Kemampuan Teknik */}
                    <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-blue-600" />
                          <span>2. Kemampuan Teknik</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
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

                  </div>

                  {/* KOLOM KANAN: TAKTIK + MENTALITAS + SPESIFIK POSISI */}
                  <div className="space-y-6">
                    
                    {/* 1. Pilar 3: Pemahaman Taktik */}
                    <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-purple-600" />
                          <span>3. Pemahaman Taktik</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
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

                    {/* 2. Pilar 4: Mentalitas */}
                    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          <span>4. Mentalitas</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
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

                    {/* 3. Pilar 5: Parameter Spesifik Posisi (Midfielder / Playmaker dll.) */}
                    <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-indigo-600" />
                          <span>5. Parameter Spesifik Posisi: {playerRole || 'Belum Ditentukan'}</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Rata-rata: {pillarScores.position}
                        </span>
                      </div>

                      {roleKPIs.length > 0 ? (
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
                      ) : (
                        <div className="p-4 bg-white border border-dashed border-indigo-200 rounded-xl text-center space-y-2">
                          <p className="text-xs text-indigo-900 font-medium">
                            Posisi resmi atlet belum ditentukan (misal: <em>Midfielder / Playmaker, Defender, Flank, Forward</em>).
                          </p>
                          <button
                            type="button"
                            onClick={handleOpenMutationModal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Tetapkan Posisi Atlet Sekarang</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                </div>

                {/* 2C. CATATAN EVALUASI PELATIH & TOMBOL SIMPAN (FULL WIDTH) */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <span>Catatan Evaluasi Pelatih (Rapor Siswa)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateDraft}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>⚡ Buat Draf Analisis Otomatis</span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={coachNote}
                    onChange={(e) => setCoachNote(e.target.value)}
                    placeholder={`e.g. Sebagai ${playerRole || 'atlet'}, pergerakan dan pengambilan keputusannya sudah matang. Tingkatkan ketahanan fisik di set penutup.`}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  />

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-slate-400">
                      * Rapor evaluasi ini tersimpan secara permanen dan otomatis disinkronisasi ke Portal Wali Murid &amp; Atlet.
                    </p>
                    <button
                      type="submit"
                      disabled={isSaving || !playerRole}
                      className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Menyimpan Rapor...</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-4 h-4 text-cyan-200" />
                          <span>Simpan Evaluasi {selectedStudent?.studentName || 'Atlet'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </form>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Pilih siswa dari dropdown di atas untuk mulai mengisi rapor evaluasi.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 3. MODAL MUTASI POSISI ATLET */}
      {/* ================================================================= */}
      {showMutationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                <span>Mutasi Posisi Atlet</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMutationModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-indigo-900">
                Atlet: <strong className="text-slate-900">{selectedStudent?.studentName}</strong>
              </p>
              <p className="text-indigo-700">
                Posisi Saat Ini: <strong className="font-extrabold">{playerRole || 'Belum Set Posisi'}</strong>
              </p>
            </div>

            <form onSubmit={handleMutatePosition} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Posisi Baru ({categoryConfig.label})
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 cursor-pointer"
                >
                  {categoryConfig.roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Alasan Perubahan / Catatan Mutasi
                </label>
                <textarea
                  rows={3}
                  value={mutationReason}
                  onChange={(e) => setMutationReason(e.target.value)}
                  placeholder="e.g. Uji coba visi bermain di lini tengah dan stamina pembacaan serangan babak kedua."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMutationModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isMutating || !newRole}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isMutating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Menyimpan Mutasi...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 text-cyan-200" />
                      <span>Simpan Mutasi Posisi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. RIWAYAT EVALUASI KELAS INI */}
      {/* ================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Riwayat Rapor Evaluasi Atlet Disimpan ({filteredHistory.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStudentId}
              onChange={(e) => setFilterStudentId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 cursor-pointer"
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
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-400 transition-all space-y-3 relative group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900">{item.studentName}</h4>
                        {item.playerRole && (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {item.playerRole}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-indigo-600" />
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
