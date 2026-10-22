import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  GraduationCap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  MessageCircle,
  Plus,
  BookOpen,
  Calendar,
  Sparkles,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import {
  Akademi3DIcon,
  Keuangan3DIcon
} from './icons/App3DIcons';

// Helper format mata uang Rupiah
function formatRupiah(amount) {
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}

// Custom Tooltip untuk Donut Chart SPP
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700/80 text-xs">
        <p className="font-extrabold text-slate-300">{data.name}</p>
        <p className="font-black text-sm text-white mt-0.5">
          {data.value} Siswa ({data.payload?.percent || 0}%)
        </p>
        <p className="text-[10px] text-emerald-400 mt-0.5 font-bold">
          Total: {formatRupiah(data.payload?.amount || 0)}
        </p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip untuk Bar Chart Distribusi Kelas
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700/80 text-xs min-w-[150px]">
        <p className="font-extrabold text-slate-300 border-b border-slate-800 pb-1">{label}</p>
        <p className="font-black text-sm text-blue-400 mt-1">
          {data.value} Siswa Terdaftar
        </p>
        {data.payload?.coach && (
          <p className="text-[10px] text-slate-400 mt-0.5">
            Pelatih: <strong className="text-white">{data.payload.coach}</strong>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function AcademyDashboard({
  activeAcademy,
  activeStudents = [],
  activeClasses = [],
  activeCoaches = [],
  sppBillingStartDay = 1,
  sppDueDay = 10,
  calculateSppStatus,
  handleSendWABilling,
  onAddStudent,
  onAddClass,
  onPaySpp,
  onViewStudentDetail
}) {
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // =====================================================================
  // 1. HITUNG METRIK UTAMA DENGAN useMemo (TERISOLASI PADA activeAcademy)
  // =====================================================================
  const {
    totalStudents,
    paidStudents,
    unpaidStudents,
    paidStudentsCount,
    unpaidStudentsCount,
    collectionRate,
    potentialRevenue,
    actualRevenue,
    unpaidRevenue,
    pieData,
    classDistributionData
  } = useMemo(() => {
    const total = activeStudents.length;
    let paidCount = 0;
    let potRev = 0;
    let actRev = 0;
    const paidList = [];
    const unpaidList = [];

    activeStudents.forEach((st) => {
      const fee = Number(st.monthlyFee || st.tuitionFee || 0);
      potRev += fee;

      // Status SPP logic
      let sppInfo = null;
      if (typeof calculateSppStatus === 'function') {
        sppInfo = calculateSppStatus(st, sppBillingStartDay, sppDueDay);
      } else {
        const isPaidCheck =
          st.lastPaidMonth === currentMonth ||
          st.paymentStatus === 'lunas' ||
          st.sppStatus === 'Lunas';
        sppInfo = {
          isPaid: isPaidCheck,
          statusText: isPaidCheck ? 'LUNAS BULAN INI' : 'MENUNGGAK',
          badgeClass: isPaidCheck
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : 'bg-red-100 text-red-800 border-red-200'
        };
      }

      const isPaid = Boolean(
        st.lastPaidMonth === currentMonth ||
        st.paymentStatus === 'lunas' ||
        st.sppStatus === 'Lunas' ||
        sppInfo?.isPaid
      );

      if (isPaid) {
        paidCount++;
        actRev += fee;
        paidList.push({ ...st, sppInfo });
      } else {
        unpaidList.push({ ...st, sppInfo });
      }
    });

    const unpCount = total - paidCount;
    const rate = total > 0 ? Math.round((paidCount / total) * 100) : 0;
    const unpRev = Math.max(0, potRev - actRev);

    // Data Donut Chart SPP
    const pie = [
      {
        name: 'SPP Lunas',
        value: paidCount,
        percent: rate,
        amount: actRev,
        color: '#10b981' // emerald-500
      },
      {
        name: 'SPP Menunggak',
        value: unpCount,
        percent: total > 0 ? 100 - rate : 0,
        amount: unpRev,
        color: '#f43f5e' // rose-500
      }
    ];

    // Data Bar Chart Distribusi Kelas
    const classDist = (activeClasses || []).map((cls) => {
      const studentCount = activeStudents.filter((st) => st.classId === cls.id).length;
      return {
        name: cls.className || 'Kelas',
        count: studentCount,
        coach: cls.coachName || '-'
      };
    });

    // Urutkan siswa menunggak berdasarkan hari keterlambatan / nama
    unpaidList.sort((a, b) => (b.sppInfo?.daysOverdue || 0) - (a.sppInfo?.daysOverdue || 0));

    return {
      totalStudents: total,
      paidStudents: paidList,
      unpaidStudents: unpaidList,
      paidStudentsCount: paidCount,
      unpaidStudentsCount: unpCount,
      collectionRate: rate,
      potentialRevenue: potRev,
      actualRevenue: actRev,
      unpaidRevenue: unpRev,
      pieData: pie,
      classDistributionData: classDist
    };
  }, [activeStudents, activeClasses, sppBillingStartDay, sppDueDay, calculateSppStatus, currentMonth]);

  // Jika belum ada akademi aktif atau siswa masih 0
  if (!activeAcademy) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Akademi3DIcon className="w-10 h-10" />
        </div>
        <h3 className="font-black text-lg text-slate-800">Pilih Akademi Terlebih Dahulu</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Silakan buat atau pilih akademi di atas untuk melihat ringkasan metrik analitik dan laporan kinerja.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* =============================================================== */}
      {/* HEADER BANNER AKADEMI SPESIFIK & SIKLUS PENAGIHAN               */}
      {/* =============================================================== */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5 border border-slate-700/60">
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-36 -top-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center space-x-4 z-10 min-w-0">
          <div className="w-13 h-13 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-inner shrink-0 p-2">
            <Akademi3DIcon className="w-9 h-9" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                Dasbor BI &amp; Analytics &bull; {activeAcademy.name}
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                {activeAcademy.categoryLabel || activeAcademy.category || 'Akademi'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 flex items-center space-x-2 flex-wrap gap-y-1">
              <span>Siklus Tagihan: Mulai Tgl <strong>{sppBillingStartDay}</strong></span>
              <span>&bull;</span>
              <span>Jatuh Tempo: Tgl <strong>{sppDueDay}</strong></span>
              <span>&bull;</span>
              <span className="text-emerald-300 font-semibold">{activeClasses.length} Kelas Terdaftar</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 z-10 shrink-0 w-full md:w-auto">
          {onAddStudent && (
            <button
              onClick={onAddStudent}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Daftar Siswa</span>
            </button>
          )}
          {onAddClass && (
            <button
              onClick={onAddClass}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 backdrop-blur-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Buat Kelas</span>
            </button>
          )}
        </div>
      </div>

      {/* =============================================================== */}
      {/* 1. BAGIAN ATAS (SCORECARDS METRIK UTAMA)                         */}
      {/* =============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL SISWA AKTIF */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Siswa Aktif</p>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalStudents}</span>
              <span className="text-xs text-slate-400 font-semibold">Atlet</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {activeClasses.length} Kelas &bull; {activeCoaches.length} Pelatih
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* CARD 2: TINGKAT PELUNASAN SPP (%) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tingkat Pelunasan</p>
              <div className="flex items-baseline space-x-2">
                <span className={`text-2xl sm:text-3xl font-black ${
                  collectionRate >= 80 ? 'text-emerald-600' : collectionRate >= 50 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {collectionRate}%
                </span>
                <span className="text-xs text-slate-400 font-semibold">Bulan Ini</span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs border ${
              collectionRate >= 80
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : collectionRate >= 50
                ? 'bg-amber-50 text-amber-600 border-amber-100'
                : 'bg-rose-50 text-rose-600 border-rose-100'
            }`}>
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          {/* Progress Bar Visual */}
          <div className="space-y-1">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  collectionRate >= 80 ? 'bg-emerald-500' : collectionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, collectionRate)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
              <span className="text-emerald-600 font-bold">{paidStudentsCount} Lunas</span>
              <span className="text-rose-600 font-bold">{unpaidStudentsCount} Menunggak</span>
            </div>
          </div>
        </div>

        {/* CARD 3: PENDAPATAN AKTUAL SPP */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pendapatan SPP Masuk</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 truncate">
              {formatRupiah(actualRevenue)}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              Potensi: <span className="font-bold text-slate-700">{formatRupiah(potentialRevenue)}</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
            <Keuangan3DIcon className="w-6 h-6" />
          </div>
        </div>

        {/* CARD 4: TOTAL TUNGGAKAN SPP */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tunggakan</p>
            <p className="text-xl sm:text-2xl font-black text-rose-600 truncate">
              {formatRupiah(unpaidRevenue)}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              <span className="font-bold text-rose-600">{unpaidStudentsCount} Siswa</span> Belum Lunas
            </p>
          </div>
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* =============================================================== */}
      {/* 2. BAGIAN TENGAH (CHARTS: DONUT SPP & BAR KELAS)                 */}
      {/* =============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CHART 1: DONUT CHART PROPORSI SPP (5 COLS) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center space-x-2">
              <CreditCard className="w-4.5 h-4.5 text-blue-600" />
              <span>Proporsi Status SPP Bulan Ini</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rasio siswa lunas vs menunggak pada siklus aktif
            </p>
          </div>

          {/* Donut Chart with Center Text */}
          <div className="h-60 w-full relative flex items-center justify-center">
            {totalStudents === 0 ? (
              <div className="text-center p-4">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Belum ada siswa di akademi ini</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Circle Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Pelunasan
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {collectionRate}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {paidStudentsCount}/{totalStudents} Siswa
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Legend Details */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100/70">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-slate-800">SPP Lunas</span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-emerald-700 block">{formatRupiah(actualRevenue)}</span>
                <span className="text-[10px] text-slate-500 font-bold">{paidStudentsCount} Siswa ({collectionRate}%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/60 border border-rose-100/70">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                <span className="font-bold text-slate-800">SPP Menunggak</span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-rose-700 block">{formatRupiah(unpaidRevenue)}</span>
                <span className="text-[10px] text-slate-500 font-bold">{unpaidStudentsCount} Siswa ({totalStudents > 0 ? 100 - collectionRate : 0}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* CHART 2: BAR CHART DISTRIBUSI SISWA PER KELAS (7 COLS) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center space-x-2">
                <BookOpen className="w-4.5 h-4.5 text-indigo-600" />
                <span>Distribusi Siswa per Kelas / Kelompok</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kapasitas dan populasi siswa antar kelas di {activeAcademy.name}
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
              {activeClasses.length} Kelas
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {classDistributionData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum ada kelas dibuat</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tambahkan kelompok atau kelas latihan untuk melihat sebaran atlet.
                </p>
                {onAddClass && (
                  <button
                    onClick={onAddClass}
                    className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    + Buat Kelas Sekarang
                  </button>
                )}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Siswa"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Catatan Ringkas */}
          <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
            <span>Rata-rata siswa per kelas: <strong>{activeClasses.length > 0 ? (totalStudents / activeClasses.length).toFixed(1) : 0} Siswa</strong></span>
            <span>Total Pelatih: <strong>{activeCoaches.length} Orang</strong></span>
          </div>
        </div>
      </div>

      {/* =============================================================== */}
      {/* 3. BAGIAN BAWAH (QUICK ACTION: SISWA MENUNGGAK SPP BULAN INI)   */}
      {/* =============================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Daftar Siswa Menunggak SPP Bulan Ini
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                  {unpaidStudents.length} Siswa
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kirim pesan tagihan otomatis via WhatsApp untuk mempercepat arus kas akademi
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 font-bold block">Total Belum Tertagih:</span>
            <span className="text-sm font-black text-rose-600">{formatRupiah(unpaidRevenue)}</span>
          </div>
        </div>

        {unpaidStudents.length === 0 ? (
          <div className="py-10 border-2 border-dashed border-emerald-200 bg-emerald-50/30 rounded-2xl text-center flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-sm font-extrabold text-emerald-800">
              Luar Biasa! Semua Siswa Telah Lunas
            </p>
            <p className="text-xs text-emerald-600 max-w-md mt-1">
              Tidak ada tagihan SPP yang menunggak untuk akademi {activeAcademy.name} pada periode siklus bulan ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-extrabold text-[10px] tracking-wider">
                  <th className="py-3 px-3">Nama Siswa</th>
                  <th className="py-3 px-3">Kelas &amp; Pelatih</th>
                  <th className="py-3 px-3">Kontak Wali</th>
                  <th className="py-3 px-3">Status Tunggakan</th>
                  <th className="py-3 px-3 text-right">Nominal SPP</th>
                  <th className="py-3 px-3 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {unpaidStudents.map((st) => {
                  const sppInfo = st.sppInfo || {};
                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => onViewStudentDetail && onViewStudentDetail(st)}
                    >
                      {/* Nama Siswa */}
                      <td className="py-3.5 px-3">
                        <p className="font-extrabold text-slate-800 hover:text-blue-600 transition-colors">
                          {st.studentName || st.name}
                        </p>
                        {st.nikKk && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIK: {st.nikKk}</p>
                        )}
                      </td>

                      {/* Kelas & Pelatih */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-md inline-block">
                          {st.className || 'Reguler'}
                        </span>
                        {st.coachName && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Pelatih: <strong className="text-slate-600">{st.coachName}</strong>
                          </p>
                        )}
                      </td>

                      {/* Kontak Wali */}
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-slate-700">{st.parentName || 'Orang Tua'}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {st.parentPhone || st.phone || '-'}
                        </p>
                      </td>

                      {/* Status Tunggakan */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-block ${sppInfo.badgeClass || 'bg-rose-100 text-rose-800'}`}>
                          {sppInfo.statusText || 'MENUNGGAK'}
                        </span>
                      </td>

                      {/* Nominal SPP */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-black text-rose-600 block">
                          {formatRupiah(st.monthlyFee || st.tuitionFee)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Per Bulan</span>
                      </td>

                      {/* Aksi Cepat: Tagih via WA & Bayar */}
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* TOMBOL TAGIH VIA WHATSAPP */}
                          <button
                            type="button"
                            onClick={() => handleSendWABilling(st, activeAcademy?.name)}
                            className="flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-xl text-xs font-bold border border-green-200 transition-colors cursor-pointer shadow-2xs"
                            title="Kirim Tagihan SPP via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                            <span>Tagih via WA</span>
                          </button>

                          {/* TOMBOL BAYAR SEKARANG (OPSIONAL) */}
                          {onPaySpp && (
                            <button
                              type="button"
                              onClick={() => onPaySpp(st)}
                              className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                              title="Bayar SPP Sekarang"
                            >
                              Bayar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
