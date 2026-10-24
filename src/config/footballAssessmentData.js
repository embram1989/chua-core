// =====================================================================
// KAMUS DATA "ATHLETE DEVELOPMENT ASSESSMENT" (4-TIER LTAD CURRICULUM)
// =====================================================================

export const TIER_CONFIGS = {
  1: {
    tier: 1,
    label: 'Tier 1: Usia Dini / SSB (U-6 s.d. U-12)',
    shortLabel: 'Tier 1 — Usia Dini (SSB)',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    desc: 'Pengenalan bola, koordinasi dasar, motorik, dan fun game.'
  },
  2: {
    tier: 2,
    label: 'Tier 2: Pemula (U-13)',
    shortLabel: 'Tier 2 — U-13',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    desc: 'Mulai memahami posisi dasar, teknik spesifik, dan aturan kompetisi.'
  },
  3: {
    tier: 3,
    label: 'Tier 3: Pengembangan Taktik (U-15)',
    shortLabel: 'Tier 3 — U-15',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    desc: 'Pengembangan taktik tim, fisik, transisi permainan, dan pembentukan karakter.'
  },
  4: {
    tier: 4,
    label: 'Tier 4: Elit & Profesional (U-16 s.d. Pro)',
    shortLabel: 'Tier 4 — U-16 s.d. Pro',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    desc: 'Kompetisi tingkat elit, pematangan taktik, persiapan level profesional / Timnas.'
  }
};

export function detectTierFromAge(ageInput) {
  if (ageInput === undefined || ageInput === null || ageInput === '') return 1;
  let parsed = 0;
  if (typeof ageInput === 'number') {
    parsed = ageInput;
  } else {
    const digits = String(ageInput).replace(/\D/g, '');
    parsed = parseInt(digits, 10) || 0;
  }

  if (parsed <= 0) return 1;
  if (parsed <= 12) return 1; // SSB (U-6 s.d. U-12)
  if (parsed === 13) return 2; // U-13
  if (parsed >= 14 && parsed <= 15) return 3; // U-15
  return 4; // U-16, U-17, U-18, U-20 & Profesional
}

export const FOOTBALL_POSITIONS = [
  {
    code: 'GK',
    label: 'GK — Penjaga Gawang (Kiper)',
    shortLabel: 'Penjaga Gawang (GK)',
    specializations: ['Shot-stopper', 'Sweeper-keeper'],
    indicators: [
      'Refleks', 'Posisi Kiper', 'Tangkapan', 'Menepis Bola', 'Duel Satu Lawan Satu',
      'Distribusi Tangan', 'Distribusi Kaki', 'Bola Udara', 'Sweeping', 'Komunikasi Pertahanan',
      'Antisipasi Tembakan', 'Posisi Awal', 'Penalti', 'Keputusan Keluar', 'Build-up Kiper'
    ]
  },
  {
    code: 'CB',
    label: 'CB — Bek Tengah (CB)',
    shortLabel: 'Bek Tengah (CB)',
    specializations: ['Stopper', 'Ball-playing defender'],
    indicators: [
      'Duel Bertahan', 'Duel Udara', 'Interception', 'Timing Tekel', 'Penjagaan Lawan',
      'Cover Pertahanan', 'Posisi Garis Belakang', 'Antisipasi Lari', 'Clearance', 'Umpan Progresif',
      'Build-up', 'Transisi Bertahan'
    ]
  },
  {
    code: 'LB/RB',
    label: 'LB/RB — Bek Sayap (LB/RB)',
    shortLabel: 'Bek Sayap (LB/RB)',
    specializations: ['Defensive fullback', 'Attacking fullback'],
    indicators: [
      'Duel Sayap', 'Bertahan Satu Lawan Satu', 'Overlap', 'Underlap', 'Akurasi Crossing',
      'Progresi Sayap', 'Recovery Run', 'Cover Sisi', 'Kombinasi Sayap', 'Transisi Sisi'
    ]
  },
  {
    code: 'WB',
    label: 'WB — Wingback',
    shortLabel: 'Wingback (WB)',
    specializations: ['Wide runner', 'Attacking wingback'],
    indicators: [
      'Daya Jelajah', 'Overlap', 'Underlap', 'Crossing', 'Duel Sayap',
      'Recovery Run', 'Transisi Sayap', 'Kontrol Lebar', 'Dukungan Serangan', 'Ketahanan Sisi'
    ]
  },
  {
    code: 'DM',
    label: 'DM — Gelandang Bertahan (DM)',
    shortLabel: 'Gelandang Bertahan (DM)',
    specializations: ['Ball-winner', 'Deep-lying playmaker'],
    indicators: [
      'Proteksi Lini', 'Interception', 'Duel Tengah', 'Screening', 'Sirkulasi Bola',
      'Umpan Progresif', 'Orientasi Tubuh', 'Kontrol Tempo', 'Cover Gelandang', 'Transisi Bertahan',
      'Build-up', 'Disiplin Posisi'
    ]
  },
  {
    code: 'CM',
    label: 'CM — Gelandang Tengah (CM)',
    shortLabel: 'Gelandang Tengah (CM)',
    specializations: ['Box-to-box', 'Playmaker'],
    indicators: [
      'Distribusi Bola', 'Progresi Bola', 'Umpan Terobosan', 'Kontrol Tempo', 'Gerak Tanpa Bola',
      'Box-to-Box', 'Duel Tengah', 'Pressing Tengah', 'Dukungan Serangan', 'Recovery Bertahan',
      'Orientasi Tubuh', 'Keputusan Progresif'
    ]
  },
  {
    code: 'AM',
    label: 'AM — Gelandang Serang (AM)',
    shortLabel: 'Gelandang Serang (AM)',
    specializations: ['Creator', 'Advanced playmaker'],
    indicators: [
      'Visi Umpan', 'Umpan Kunci', 'Umpan Terobosan', 'Kontrol Ruang Antarlini', 'Kreativitas',
      'Dribbling Ofensif', 'Finishing', 'Gerak Antarlini', 'Kombinasi Serangan', 'Pressing Depan',
      'Keputusan Final', 'Kontribusi Gol'
    ]
  },
  {
    code: 'LM/RM',
    label: 'LM/RM — Gelandang Sayap (LM/RM)',
    shortLabel: 'Gelandang Sayap (LM/RM)',
    specializations: ['Wide creator', 'Tracking winger'],
    indicators: [
      'Kontrol Sisi', 'Crossing', 'Dribbling Sayap', 'Kombinasi Sisi', 'Umpan ke Dalam',
      'Tracking Back', 'Lebar Permainan', 'Transisi Sayap', 'Duel 1 on 1', 'Keputusan Crossing'
    ]
  },
  {
    code: 'WFR/WFL',
    label: 'WFR/WFL — Sayap / Winger (WFR/WFL)',
    shortLabel: 'Winger / Sayap (WFR/WFL)',
    specializations: ['Inverted winger', 'Touchline winger'],
    indicators: [
      'Akselerasi Sayap', 'Dribbling Ofensif', 'Cut Inside', 'Crossing', 'Finishing Sayap',
      'Umpan Kunci', 'Lari ke Ruang', 'Duel 1 on 1', 'Pressing Sayap', 'Keputusan Akhir'
    ]
  },
  {
    code: 'SS',
    label: 'SS — Second Striker / Penyerang Kedua (SS)',
    shortLabel: 'Second Striker (SS)',
    specializations: ['Link-up forward', 'Shadow striker'],
    indicators: [
      'Link-up Play', 'Gerak Antarlini', 'Umpan Kunci', 'Finishing', 'Lari Tanpa Bola',
      'Kombinasi Penyerang', 'Dribbling Ofensif', 'Tekanan Depan', 'Rebound', 'Keputusan Final'
    ]
  },
  {
    code: 'ST',
    label: 'ST — Striker (ST)',
    shortLabel: 'Striker (ST)',
    specializations: ['Target man', 'Poacher', 'Pressing forward'],
    indicators: [
      'Finishing', 'Penempatan Posisi', 'Lari di Belakang Bek', 'Duel Udara', 'Hold-up Play',
      'Link-up Play', 'Gerak di Kotak Penalti', 'First-time Shot', 'Tekanan Depan', 'Peluang Menjadi Gol',
      'Serangan Tiang Dekat', 'Serangan Tiang Jauh'
    ]
  }
];

export const TIER_1_POSITIONS = [
  {
    code: 'OUTFIELD_SSB',
    label: 'Eksplorasi Pemain Lapangan (Rotasi Multi-Posisi)',
    shortLabel: 'Eksplorasi Pemain Lapangan',
    indicators: [
      'Keberanian Menguasai Bola',
      'Koordinasi Mata-Kaki',
      'Ketangkasan Fun Game',
      'Semangat Mencoba Posisi Baru',
      'Kesenangan Bermain'
    ]
  },
  {
    code: 'GK_SSB',
    label: 'Pengenalan Penjaga Gawang (GK Dasar)',
    shortLabel: 'Pengenalan Kiper',
    indicators: [
      'Keberanian Menangkap Bola',
      'Koordinasi Tangan-Mata',
      'Ketangkasan Gerak Dasar',
      'Distribusi Bola Dasar',
      'Kesenangan Bermain'
    ]
  }
];

export const TIER_2_POSITIONS = [
  { code: 'GK', label: 'GK — Penjaga Gawang (Kiper Dasar)', shortLabel: 'Penjaga Gawang (GK)' },
  { code: 'CB', label: 'CB — Lini Belakang (Bek Dasar)', shortLabel: 'Bek Tengah (CB)' },
  { code: 'CM', label: 'CM — Lini Tengah (Gelandang Dasar)', shortLabel: 'Gelandang Tengah (CM)' },
  { code: 'ST', label: 'ST — Lini Depan (Penyerang Dasar)', shortLabel: 'Striker (ST)' }
];

export const FOOTBALL_PLAYING_STYLES = [
  { code: 'STY01', name: 'Playmaker', desc: 'Mengatur dan menciptakan serangan' },
  { code: 'STY02', name: 'Ball-winner', desc: 'Merebut penguasaan bola' },
  { code: 'STY03', name: 'Box-to-box', desc: 'Aktif di area bertahan dan menyerang' },
  { code: 'STY04', name: 'Inverted Winger', desc: 'Sayap yang bergerak ke tengah' },
  { code: 'STY05', name: 'Touchline Winger', desc: 'Sayap yang menjaga lebar' },
  { code: 'STY06', name: 'Target Man', desc: 'Penyerang sebagai tumpuan bola' },
  { code: 'STY07', name: 'Poacher', desc: 'Fokus mencari peluang gol' },
  { code: 'STY08', name: 'Pressing Forward', desc: 'Penyerang dengan tekanan tinggi' },
  { code: 'STY09', name: 'Ball-playing Defender', desc: 'Bek yang aktif membangun serangan' },
  { code: 'STY10', name: 'Sweeper-keeper', desc: 'Kiper yang aktif di luar kotak' },
  { code: 'STY11', name: 'Overlapping Fullback', desc: 'Bek sayap yang aktif melewati pemain depan' },
  { code: 'STY12', name: 'Deep-lying Playmaker', desc: 'Pengatur serangan dari area dalam' },
  { code: 'STY13', name: 'Inverted Fullback', desc: 'Bek sayap yang masuk ke area tengah' },
  { code: 'STY14', name: 'Shadow Striker', desc: 'Gelandang serang yang masuk ke area gol' }
];

// KAMUS 6 KATEGORI DENGAN minTier (1 s.d. 4)
export const FOOTBALL_CORE_CATEGORIES = {
  fisik: {
    key: 'fisik',
    title: 'Physical / Fisik',
    shortTitle: 'Fisik',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    indicators: [
      { name: 'Akselerasi', minTier: 1 },
      { name: 'Kelincahan', minTier: 1 },
      { name: 'Keseimbangan', minTier: 1 },
      { name: 'Mobilitas', minTier: 1 },
      { name: 'Koordinasi Tubuh', minTier: 1 },
      { name: 'Kecepatan Maksimal', minTier: 2 },
      { name: 'Reaksi', minTier: 2 },
      { name: 'Lompatan', minTier: 2 },
      { name: 'Perubahan Arah', minTier: 2 },
      { name: 'Daya Tahan', minTier: 3 },
      { name: 'Daya Ledak', minTier: 3 },
      { name: 'Kekuatan Tubuh', minTier: 3 },
      { name: 'Kekuatan Inti', minTier: 3 },
      { name: 'Sprint Berulang', minTier: 4 },
      { name: 'Pemulihan', minTier: 4 },
      { name: 'Intensitas Kerja', minTier: 4 }
    ]
  },
  teknik: {
    key: 'teknik',
    title: 'Technical / Teknik',
    shortTitle: 'Teknik',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    indicators: [
      { name: 'Kontrol Bola', minTier: 1 },
      { name: 'Sentuhan Pertama', minTier: 1 },
      { name: 'Passing Pendek', minTier: 1 },
      { name: 'Dribbling', minTier: 1 },
      { name: 'Finishing', minTier: 1 },
      { name: 'Passing Jauh', minTier: 2 },
      { name: 'Kekuatan Tembakan', minTier: 2 },
      { name: 'Tackling', minTier: 2 },
      { name: 'Interception', minTier: 2 },
      { name: 'Clearance', minTier: 2 },
      { name: 'Kaki Lemah', minTier: 2 },
      { name: 'Umpan Terobosan', minTier: 3 },
      { name: 'Proteksi Bola', minTier: 3 },
      { name: 'Heading', minTier: 3 },
      { name: 'Crossing', minTier: 3 },
      { name: 'Bola Mati', minTier: 3 },
      { name: 'First Touch Bertekanan', minTier: 4 },
      { name: 'Duel Udara', minTier: 4 },
      { name: 'Umpan Satu Sentuhan', minTier: 4 },
      { name: 'Kontrol di Ruang Sempit', minTier: 4 }
    ]
  },
  taktik: {
    key: 'taktik',
    title: 'Tactical / Taktik',
    shortTitle: 'Taktik',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    indicators: [
      { name: 'Posisi Bertahan', minTier: 1 },
      { name: 'Posisi Menyerang', minTier: 1 },
      { name: 'Membuka Ruang', minTier: 1 },
      { name: 'Membaca Permainan', minTier: 2 },
      { name: 'Pengambilan Keputusan', minTier: 2 },
      { name: 'Gerak Tanpa Bola', minTier: 2 },
      { name: 'Cover Rekan', minTier: 2 },
      { name: 'Disiplin Formasi', minTier: 2 },
      { name: 'Transisi Menyerang', minTier: 3 },
      { name: 'Transisi Bertahan', minTier: 3 },
      { name: 'Pressing', minTier: 3 },
      { name: 'Menutup Ruang', minTier: 3 },
      { name: 'Progresi Bola', minTier: 3 },
      { name: 'Serangan Balik', minTier: 3 },
      { name: 'Counter-Pressing', minTier: 4 },
      { name: 'Jarak Antarlini', minTier: 4 },
      { name: 'Sirkulasi Bola', minTier: 4 },
      { name: 'Menjaga Kedalaman', minTier: 4 },
      { name: 'Adaptasi Taktik', minTier: 4 },
      { name: 'Keputusan di Bawah Tekanan', minTier: 4 }
    ]
  },
  mental: {
    key: 'mental',
    title: 'Mental',
    shortTitle: 'Mental',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    indicators: [
      { name: 'Fokus', minTier: 1 },
      { name: 'Percaya Diri', minTier: 1 },
      { name: 'Disiplin', minTier: 1 },
      { name: 'Orientasi Tim', minTier: 1 },
      { name: 'Kontrol Emosi', minTier: 2 },
      { name: 'Daya Juang', minTier: 2 },
      { name: 'Respons Kesalahan', minTier: 3 },
      { name: 'Tahan Tekanan', minTier: 3 },
      { name: 'Konsistensi Mental', minTier: 3 },
      { name: 'Keberanian Duel', minTier: 3 }
    ]
  },
  komunikasi: {
    key: 'komunikasi',
    title: 'Communication / Komunikasi',
    shortTitle: 'Komunikasi',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    indicators: [
      { name: 'Komunikasi Verbal', minTier: 1 },
      { name: 'Dukungan Rekan', minTier: 1 },
      { name: 'Komunikasi Nonverbal', minTier: 2 },
      { name: 'Respons Instruksi', minTier: 2 },
      { name: 'Koordinasi Lini', minTier: 3 },
      { name: 'Kepemimpinan', minTier: 3 },
      { name: 'Koordinasi Pressing', minTier: 3 },
      { name: 'Koordinasi Bertahan', minTier: 3 }
    ]
  },
  perkembangan: {
    key: 'perkembangan',
    title: 'Development / Perkembangan',
    shortTitle: 'Perkembangan',
    badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    indicators: [
      { name: 'Kehadiran Latihan', minTier: 1 },
      { name: 'Respons Latihan', minTier: 1 },
      { name: 'Progres Teknik', minTier: 1 },
      { name: 'Kepatuhan Program', minTier: 2 },
      { name: 'Progres Fisik', minTier: 2 },
      { name: 'Progres Taktik', minTier: 3 },
      { name: 'Pencapaian Target', minTier: 3 },
      { name: 'Kesiapan Bertanding', minTier: 3 },
      { name: 'Evaluasi Mandiri', minTier: 3 },
      { name: 'Konsistensi Performa', minTier: 3 }
    ]
  }
};

/**
 * Filter indicator names for a core category based on activeTier
 */
export function getFilteredIndicatorsForCategory(categoryKey, activeTier) {
  const cat = FOOTBALL_CORE_CATEGORIES[categoryKey];
  if (!cat) return [];
  return cat.indicators
    .filter((ind) => ind.minTier <= activeTier)
    .map((ind) => ind.name);
}

/**
 * Filter position indicators based on activeTier and position code
 */
export function getPositionIndicatorsForTier(code, activeTier) {
  if (activeTier === 1) {
    const ssbPos = TIER_1_POSITIONS.find((p) => p.code === code) || TIER_1_POSITIONS[0];
    return {
      code: ssbPos.code,
      label: ssbPos.label,
      shortLabel: ssbPos.shortLabel,
      tabTitle: 'Gerak Dasar & Fun Game (5)',
      indicators: ssbPos.indicators
    };
  }

  const posCfg = getPositionConfig(code);
  let sliced = posCfg.indicators;

  if (activeTier === 2) {
    sliced = posCfg.indicators.slice(0, 6);
  } else if (activeTier === 3) {
    sliced = posCfg.indicators.slice(0, 8);
  }

  return {
    code: posCfg.code,
    label: posCfg.label,
    shortLabel: posCfg.shortLabel,
    tabTitle: `Khusus [${posCfg.code}] (${sliced.length})`,
    indicators: sliced
  };
}

/**
 * Get available position list depending on activeTier
 */
export function getAvailablePositionsForTier(activeTier) {
  if (activeTier === 1) return TIER_1_POSITIONS;
  if (activeTier === 2) return TIER_2_POSITIONS;
  return FOOTBALL_POSITIONS;
}

/**
 * Checks if a class or academy sport corresponds to SepakBola, Minisoccer, or Futsal
 */
export function isFootballOrMinisoccer(selectedClass, activeAcademy) {
  const sportName = (selectedClass?.sport || activeAcademy?.sport || selectedClass?.sportCategory || activeAcademy?.category || '').toLowerCase();
  const searchTerms = ['sepakbola', 'sepak bola', 'minisoccer', 'mini soccer', 'soccer'];
  return searchTerms.some((term) => sportName.includes(term));
}

/**
 * Get position object by code
 */
export function getPositionConfig(code) {
  return FOOTBALL_POSITIONS.find((p) => p.code === code) || FOOTBALL_POSITIONS[10];
}

/**
 * Get playing style by code
 */
export function getStyleConfig(code) {
  return FOOTBALL_PLAYING_STYLES.find((s) => s.code === code) || FOOTBALL_PLAYING_STYLES[0];
}
