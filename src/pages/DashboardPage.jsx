import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import useArenaData from '../hooks/useArenaData';
import { 
  Plus, 
  Inbox, 
  Clock, 
  ArrowRight,
  PieChart as PieChartIcon,
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Calendar,
  ArrowUpRight,
  Activity,
  CheckCircle,
  CheckCircle2,
  Building2,
  GraduationCap,
  ShoppingBag,
  Layers,
  Filter,
  Sparkles,
  Landmark,
  AlertCircle
} from 'lucide-react';
import {
  Dashboard3DIcon,
  Booking3DIcon,
  Kasir3DIcon,
  Akademi3DIcon,
  Event3DIcon,
  Keuangan3DIcon,
  AIInsight3DIcon,
  Pengaturan3DIcon,
  DanaSponsor3DIcon
} from '../components/icons/App3DIcons';
import DateRangeFilter, { filterDataByTime } from '../components/DateRangeFilter';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

// =====================================================================
// HELPER: PARSE FIRESTORE TIMESTAMP / DATE OBJECT
// =====================================================================
function parseTxDate(raw) {
  if (!raw) return new Date();
  if (raw.seconds) return new Date(raw.seconds * 1000);
  if (raw instanceof Date) return raw;
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// =====================================================================
// HELPER: FORMAT RUPIAH CURRENCY
// =====================================================================
function formatRupiah(amount) {
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}

// =====================================================================
// HELPER: KLASIFIKASI DIVISI TRANSAKSI
// ('Court/Booking' | 'POS/Retail' | 'Academy/SPP' | 'Event & Sponsorship')
// =====================================================================
export function classifyTransactionDivision(tx) {
  if (!tx) return 'POS/Retail';
  const type = (tx.type || '').toLowerCase();
  const cat = (tx.itemCategory || tx.category || '').toLowerCase();
  const name = (tx.itemName || tx.title || tx.name || '').toLowerCase();

  // 0. Cek Sponsorship B2B (Enterprise Fase 12 Part 1)
  if (
    type === 'sponsorship' ||
    cat.includes('sponsor') ||
    name.includes('sponsor') ||
    cat.includes('event & sponsor')
  ) {
    return 'Event & Sponsorship';
  }

  // 1. Cek item di dalam keranjang jika ada (Fase 11 Part 6)
  if (Array.isArray(tx.items) && tx.items.length > 0) {
    const hasSpp = tx.items.some(
      (i) => i.type === 'spp' || (i.category || '').toLowerCase().includes('akademi')
    );
    const hasBooking = tx.items.some(
      (i) => i.type === 'booking' || (i.category || '').toLowerCase().includes('lapangan')
    );
    const hasSponsor = tx.items.some(
      (i) => i.type === 'sponsorship' || (i.category || '').toLowerCase().includes('sponsor')
    );
    const hasRetail = tx.items.some(
      (i) => i.type === 'jual' || i.type === 'sewa' || (i.category || '').toLowerCase().includes('f&b')
    );

    if (hasSponsor) return 'Event & Sponsorship';
    if (hasSpp && !hasRetail && !hasBooking) return 'Academy/SPP';
    if (hasBooking && !hasRetail && !hasSpp) return 'Court/Booking';
    if (hasRetail && !hasSpp && !hasBooking) return 'POS/Retail';
    if (hasSpp) return 'Academy/SPP';
  }

  // 2. Cek string category & item name
  if (cat.includes('spp') || cat.includes('akademi') || name.includes('spp') || name.includes('akademi')) {
    return 'Academy/SPP';
  }
  if (cat.includes('sewa') || cat.includes('booking') || cat.includes('lapangan') || cat.includes('court') || name.includes('lapangan') || tx.courtNumber || tx.courtName) {
    return 'Court/Booking';
  }
  return 'POS/Retail';
}

// Custom Tooltip untuk Bar / Area Chart
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs space-y-1.5 min-w-[180px]">
        <p className="font-extrabold text-slate-300 pb-1 border-b border-slate-800 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-slate-400 font-normal">Arus Kas</span>
        </p>
        {payload.map((entry, index) => (
          <div key={`entry-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 font-bold" style={{ color: entry.color || '#60a5fa' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || '#60a5fa' }} />
              {entry.name}:
            </span>
            <span className="font-black text-white">
              {formatRupiah(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Tooltip untuk Donut / Pie Chart
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700/80 text-xs">
        <p className="font-extrabold text-slate-300">{data.name}</p>
        <p className="font-black text-sm text-white mt-0.5">
          {formatRupiah(data.value)}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Kontribusi: <strong className="text-emerald-400 font-extrabold">{data.payload?.percent || 0}%</strong> dari total
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage({ userProfile }) {
  const { tenantProfile, courts, bookings, transactions, isLoading } = useArenaData(userProfile);

  // Time Range Filter States
  const [timeFilter, setTimeFilter] = useState('today'); // 'today', 'week', 'month', 'custom'
  const [customDate, setCustomDate] = useState({ start: '', end: '' });

  // Chart Trend Days Toggle: 7 Hari vs 14 Hari
  const [trendDays, setTrendDays] = useState(14); // 7 | 14

  // Mobile Tab State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'charts' | 'recent'

  // Total courts
  const totalCourtsCount = courts.length || tenantProfile?.courtsCount || 0;

  // Reconciliation States (Enterprise Fase 12 Part 4)
  const [isClearing, setIsClearing] = useState(false);
  const [reconcileNotice, setReconcileNotice] = useState(null);
  const [reconcileError, setReconcileError] = useState(null);

  // =====================================================================
  // 1. DATA TRANSAKSI GLOBAL & MERGED LEDGER (INTRUKSI 1)
  // =====================================================================
  const allMergedTransactions = useMemo(() => {
    const txList = (transactions || []).map((t) => {
      const parsedDate = parseTxDate(t.createdAt);
      const division = classifyTransactionDivision(t);
      return {
        id: t.id ? `TX-${t.id.slice(0, 8).toUpperCase()}` : 'TX-POS',
        rawId: t.id,
        dateObj: parsedDate,
        dateFormatted: parsedDate.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        timeFormatted: parsedDate.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        title: t.itemName || t.title || 'Transaksi Kasir POS',
        amount: Number(t.amount || 0),
        division,
        paymentMethod: t.paymentMethod || 'QRIS / Cash',
        status: t.status || 'success',
        giroData: t.giroData || null,
        items: t.items || [],
        source: 'transaction'
      };
    });

    // Masukkan data booking lapangan jika ada yang belum tercatat di transactions
    const bookingTxList = (bookings || [])
      .filter((b) => b.paymentStatus === 'Lunas' || b.status === 'Confirmed')
      .map((b) => {
        const parsedDate = b.createdAt ? parseTxDate(b.createdAt) : parseTxDate(b.bookingDate || b.date);
        return {
          id: b.id ? `BK-${b.id.slice(0, 8).toUpperCase()}` : 'BK-LAP',
          rawId: b.id,
          dateObj: parsedDate,
          dateFormatted: parsedDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          timeFormatted: parsedDate.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          title: `Booking ${b.courtName || `Lapangan ${b.courtNumber || 1}`} (${b.customerName || 'Pelanggan'})`,
          amount: Number(b.price || b.amount || 0),
          division: 'Court/Booking',
          paymentMethod: b.paymentMethod || 'QRIS / Transfer',
          status: 'success',
          giroData: null,
          items: [],
          source: 'booking'
        };
      });

    // Gabungkan & urutkan descending (terbaru di atas)
    return [...txList, ...bookingTxList].sort((a, b) => b.dateObj - a.dateObj);
  }, [transactions, bookings]);

  // =====================================================================
  // 2. AGREGASI BULAN BERJALAN & FILTER WAKTU (INTRUKSI 1 & 4)
  // =====================================================================
  const financialSummary = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    // a. Total Pendapatan Kotor (Gross Revenue) BULAN INI (Hanya transaksi yang sudah cair / bukan pending kliring)
    const monthTransactions = allMergedTransactions.filter((tx) => {
      const isCleared = tx.status !== 'pending_clearing' && tx.status !== 'failed';
      return isCleared && tx.dateObj.getFullYear() === curYear && tx.dateObj.getMonth() === curMonth;
    });

    const grossRevenueThisMonth = monthTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    // b. Pendapatan Berdasarkan Divisi (Bulan Berjalan)
    let courtRevMonth = 0;
    let posRevMonth = 0;
    let sppRevMonth = 0;
    let sponsorRevMonth = 0;

    monthTransactions.forEach((tx) => {
      // Pecah multi-item jika ada item di keranjang (Enterprise Fase 11 Part 6)
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        tx.items.forEach((item) => {
          const itemTotal = (item.price || 0) * (item.qty || 1);
          if (item.type === 'spp' || (item.category || '').toLowerCase().includes('akademi')) {
            sppRevMonth += itemTotal;
          } else if (item.type === 'booking' || (item.category || '').toLowerCase().includes('lapangan')) {
            courtRevMonth += itemTotal;
          } else if (item.type === 'sponsorship' || (item.category || '').toLowerCase().includes('sponsor')) {
            sponsorRevMonth += itemTotal;
          } else {
            posRevMonth += itemTotal;
          }
        });
      } else {
        if (tx.division === 'Court/Booking') courtRevMonth += tx.amount;
        else if (tx.division === 'Academy/SPP') sppRevMonth += tx.amount;
        else if (tx.division === 'Event & Sponsorship' || tx.division === 'Sponsorship') sponsorRevMonth += tx.amount;
        else posRevMonth += tx.amount;
      }
    });

    // c. Jumlah total transaksi sukses bulan ini
    const totalTransactionsCount = monthTransactions.length;

    // Filtered Transactions untuk tampilan dinamis berdasarkan DateRangeFilter
    const filteredByTime = filterDataByTime(allMergedTransactions, 'dateObj', timeFilter, customDate);
    const filteredTotalRevenue = filteredByTime
      .filter((tx) => tx.status !== 'pending_clearing' && tx.status !== 'failed')
      .reduce((sum, tx) => sum + tx.amount, 0);

    let courtRevFiltered = 0;
    let posRevFiltered = 0;
    let sppRevFiltered = 0;
    let sponsorRevFiltered = 0;

    filteredByTime.forEach((tx) => {
      if (tx.status === 'pending_clearing' || tx.status === 'failed') return;
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        tx.items.forEach((item) => {
          const itemTotal = (item.price || 0) * (item.qty || 1);
          if (item.type === 'spp' || (item.category || '').toLowerCase().includes('akademi')) {
            sppRevFiltered += itemTotal;
          } else if (item.type === 'booking' || (item.category || '').toLowerCase().includes('lapangan')) {
            courtRevFiltered += itemTotal;
          } else if (item.type === 'sponsorship' || (item.category || '').toLowerCase().includes('sponsor')) {
            sponsorRevFiltered += itemTotal;
          } else {
            posRevFiltered += itemTotal;
          }
        });
      } else {
        if (tx.division === 'Court/Booking') courtRevFiltered += tx.amount;
        else if (tx.division === 'Academy/SPP') sppRevFiltered += tx.amount;
        else if (tx.division === 'Event & Sponsorship' || tx.division === 'Sponsorship') sponsorRevFiltered += tx.amount;
        else posRevFiltered += tx.amount;
      }
    });

    return {
      grossRevenueThisMonth,
      courtRevMonth,
      posRevMonth,
      sppRevMonth,
      sponsorRevMonth,
      totalTransactionsCount,
      filteredTotalRevenue,
      courtRevFiltered,
      posRevFiltered,
      sppRevFiltered,
      sponsorRevFiltered,
      filteredCount: filteredByTime.length,
      filteredList: filteredByTime
    };
  }, [allMergedTransactions, timeFilter, customDate]);

  // =====================================================================
  // 3. DATA UNTUK DONUT / PIE CHART (DISTRIBUSI DIVISI) (INTRUKSI 2)
  // =====================================================================
  const divisionPieData = useMemo(() => {
    const total = financialSummary.courtRevFiltered + financialSummary.posRevFiltered + financialSummary.sppRevFiltered + (financialSummary.sponsorRevFiltered || 0);
    if (total === 0) {
      return [
        { name: 'Sewa Lapangan', value: 0, percent: 0, color: '#3b82f6' },
        { name: 'POS & Retail', value: 0, percent: 0, color: '#10b981' },
        { name: 'SPP Akademi', value: 0, percent: 0, color: '#8b5cf6' },
        { name: 'Sponsorship', value: 0, percent: 0, color: '#f59e0b' }
      ];
    }

    const cPct = Math.round((financialSummary.courtRevFiltered / total) * 100);
    const pPct = Math.round((financialSummary.posRevFiltered / total) * 100);
    const sPct = Math.round((financialSummary.sppRevFiltered / total) * 100);
    const spPct = Math.max(0, 100 - cPct - pPct - sPct);

    return [
      { name: 'Sewa Lapangan', value: financialSummary.courtRevFiltered, percent: cPct, color: '#3b82f6' },
      { name: 'POS & Retail', value: financialSummary.posRevFiltered, percent: pPct, color: '#10b981' },
      { name: 'SPP Akademi', value: financialSummary.sppRevFiltered, percent: sPct, color: '#8b5cf6' },
      { name: 'Sponsorship', value: financialSummary.sponsorRevFiltered || 0, percent: spPct, color: '#f59e0b' }
    ];
  }, [financialSummary]);

  // =====================================================================
  // 4. DATA UNTUK TREN HARIAN 7-14 HARI (BAR / AREA CHART) (INTRUKSI 2)
  // =====================================================================
  const dailyTrendData = useMemo(() => {
    const days = trendDays;
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const labelShort = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      // Agregasi transaksi pada hari tersebut
      let courtDaily = 0;
      let posDaily = 0;
      let sppDaily = 0;
      let sponsorDaily = 0;

      allMergedTransactions.forEach((tx) => {
        const txY = tx.dateObj.getFullYear();
        const txM = String(tx.dateObj.getMonth() + 1).padStart(2, '0');
        const txD = String(tx.dateObj.getDate()).padStart(2, '0');
        const txKey = `${txY}-${txM}-${txD}`;

        if (txKey === dateKey) {
          if (Array.isArray(tx.items) && tx.items.length > 0) {
            tx.items.forEach((item) => {
              const itemTotal = (item.price || 0) * (item.qty || 1);
              if (item.type === 'spp' || (item.category || '').toLowerCase().includes('akademi')) {
                sppDaily += itemTotal;
              } else if (item.type === 'booking' || (item.category || '').toLowerCase().includes('lapangan')) {
                courtDaily += itemTotal;
              } else if (item.type === 'sponsorship' || (item.category || '').toLowerCase().includes('sponsor')) {
                sponsorDaily += itemTotal;
              } else {
                posDaily += itemTotal;
              }
            });
          } else {
            if (tx.division === 'Court/Booking') courtDaily += tx.amount;
            else if (tx.division === 'Academy/SPP') sppDaily += tx.amount;
            else if (tx.division === 'Event & Sponsorship' || tx.division === 'Sponsorship') sponsorDaily += tx.amount;
            else posDaily += tx.amount;
          }
        }
      });

      result.push({
        date: labelShort,
        fullDate: dateKey,
        'Sewa Lapangan': courtDaily,
        'POS / Retail': posDaily,
        'SPP Akademi': sppDaily,
        'Sponsorship': sponsorDaily,
        total: courtDaily + posDaily + sppDaily + sponsorDaily
      });
    }

    return result;
  }, [allMergedTransactions, trendDays]);

  // =====================================================================
  // 5. 10 TRANSAKSI TERAKHIR (RECENT TRANSACTIONS TABLE) (INTRUKSI 3)
  // =====================================================================
  const recentTransactions = useMemo(() => {
    return allMergedTransactions.slice(0, 10);
  }, [allMergedTransactions]);

  // =====================================================================
  // 6. TRANSAKSI MENUNGGU KLIRING (PENDING GIRO RECONCILIATION - FASE 12 PART 4)
  // =====================================================================
  const pendingTransactions = useMemo(() => {
    return (transactions || [])
      .filter((t) => t.status === 'pending_clearing')
      .map((t) => {
        const parsedDate = parseTxDate(t.createdAt);
        const dueDate = t.giroData?.dueDate || t.dueDate || t.invoiceDueDate || null;
        let dueDateFormatted = 'Sesuai Kesepakatan';
        if (dueDate) {
          try {
            dueDateFormatted = new Date(dueDate).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
          } catch {
            dueDateFormatted = String(dueDate);
          }
        }
        const bankIssuer = t.giroData?.bankIssuer || (t.paymentMethod?.includes('Bank') ? t.paymentMethod : 'Bilyet Giro');
        const giroNumber = t.giroData?.giroNumber || '-';

        return {
          ...t,
          dateObj: parsedDate,
          dateFormatted: parsedDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          dueDate,
          dueDateFormatted,
          bankIssuer,
          giroNumber,
          amount: Number(t.amount || 0)
        };
      })
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        return b.dateObj - a.dateObj;
      });
  }, [transactions]);

  const totalPendingAmount = useMemo(() => {
    return pendingTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  }, [pendingTransactions]);

  // LOGIKA AKSI TANDAI CAIR (REKONSILIASI FIRESTORE TERPADU)
  const handleClearTransaction = async (tx) => {
    const amountStr = formatRupiah(tx.amount);
    const refStr = tx.giroData?.giroNumber ? `No. Giro ${tx.giroData.giroNumber}` : (tx.title || 'Transaksi Giro');
    const confirmMsg = `Konfirmasi rekonsiliasi dan pencairan dana ${refStr} senilai ${amountStr}?\n\nStatus transaksi akan diubah menjadi 'Sukses' (Cair) dan otomatis tercatat ke dalam Gross Revenue & Buku Kas Global.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsClearing(true);
    setReconcileError(null);
    try {
      const txDocRef = doc(db, 'transactions', tx.id);
      const txUpdatePayload = {
        status: 'success',
        clearedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Sinkronisasi ke entitas asal (Koleksi sponsors)
      if (tx.type === 'sponsorship' && tx.sponsorId) {
        const sponsorDocRef = doc(db, 'sponsors', tx.sponsorId);
        const sponsorSnap = await getDoc(sponsorDocRef);

        if (sponsorSnap.exists()) {
          const sponsorData = sponsorSnap.data();
          const contractVal = Number(sponsorData.contractValue || 0);
          const currentTotalPaid = Number(sponsorData.totalPaid || 0);
          const currentPending = Number(sponsorData.pendingAmount || 0);
          const clearedAmount = Number(tx.amount || 0);

          const newTotalPaid = currentTotalPaid + clearedAmount;
          const newPendingAmount = Math.max(0, currentPending - clearedAmount);

          // Hitung ulang status CRM otomatis (Negosiasi -> Deal -> Lunas)
          let newCrmStatus = 'Negosiasi';
          if (newTotalPaid >= contractVal && contractVal > 0) {
            newCrmStatus = 'Lunas';
          } else if (newTotalPaid > 0) {
            newCrmStatus = 'Deal';
          }

          // Perbarui status record di paymentHistory sponsor jika ada
          const currentHistory = Array.isArray(sponsorData.paymentHistory) ? sponsorData.paymentHistory : [];
          let updatedOne = false;
          const updatedHistory = currentHistory.map((h) => {
            const matchesGiroNumber = tx.giroData?.giroNumber && h.giroData?.giroNumber === tx.giroData.giroNumber;
            const matchesAmountAndPending = h.status === 'pending_clearing' && Number(h.amount) === clearedAmount;
            if (!updatedOne && (matchesGiroNumber || matchesAmountAndPending)) {
              updatedOne = true;
              return {
                ...h,
                status: 'success',
                clearedAt: new Date().toISOString()
              };
            }
            return h;
          });

          const sponsorUpdatePayload = {
            totalPaid: newTotalPaid,
            pendingAmount: newPendingAmount,
            paymentStatus: newTotalPaid >= contractVal ? 'Paid' : 'Partial',
            status: newCrmStatus,
            crmStatus: newCrmStatus,
            paymentHistory: updatedHistory,
            updatedAt: serverTimestamp()
          };

          if (newTotalPaid >= contractVal) {
            sponsorUpdatePayload.status = 'Lunas';
          }

          const batch = writeBatch(db);
          batch.update(txDocRef, txUpdatePayload);
          batch.update(sponsorDocRef, sponsorUpdatePayload);
          await batch.commit();
        } else {
          await updateDoc(txDocRef, txUpdatePayload);
        }
      } else {
        await updateDoc(txDocRef, txUpdatePayload);
      }

      setReconcileNotice(`Giro ${refStr} senilai ${amountStr} berhasil dicairkan! Dana resmi diakui di pendapatan kotor global.`);
      setTimeout(() => setReconcileNotice(null), 4000);
    } catch (err) {
      console.error('Error clearing pending transaction:', err);
      handleFirestoreError(err, 'update', `transactions/${tx.id}`);
      setReconcileError('Gagal memproses kliring transaksi. Silakan coba kembali.');
    } finally {
      setIsClearing(false);
    }
  };

  // Okupansi Lapangan Terhitung
  const totalBookingsCount = (bookings || []).length;
  const occupancyPercentage = useMemo(() => {
    let daysFactor = 1;
    if (timeFilter === 'week') daysFactor = 7;
    else if (timeFilter === 'month') daysFactor = 30;
    else if (timeFilter === 'custom' && customDate.start && customDate.end) {
      const start = new Date(customDate.start);
      const end = new Date(customDate.end);
      daysFactor = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    }
    const totalPossibleSlots = (totalCourtsCount || 1) * 15 * daysFactor;
    return totalPossibleSlots > 0
      ? Math.min(100, Math.round((totalBookingsCount / totalPossibleSlots) * 100))
      : 0;
  }, [totalCourtsCount, totalBookingsCount, timeFilter, customDate]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-gray-500 font-medium">
        Memuat data buku besar keuangan global realtime...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#333333]">
      
      {/* =============================================================== */}
      {/* HEADER PROFIL & EXECUTIVE SUMMARY BANNER                        */}
      {/* =============================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5 border border-slate-700/50">
        
        {/* Glow decoration */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -top-10 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start sm:items-center space-x-4 min-w-0 z-10">
          <div className="w-13 h-13 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black rounded-2xl flex items-center justify-center text-base shadow-inner shrink-0">
            CSC
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {tenantProfile?.name || 'GOR Arena Sports'}
              </h1>
              <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-black uppercase tracking-wider rounded-full shrink-0">
                Enterprise Fase 11
              </span>
            </div>
            <p className="text-xs text-blue-100/80 mt-1">
              Buku Besar Global (Multi-Division Cash Flow &bull; Court, POS Retail &amp; Akademi SIMAK)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 w-full md:w-auto shrink-0 z-10">
          <Link
            to="/booking"
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white border border-white/30 transition-all font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Booking Baru</span>
          </Link>
          <Link
            to="/kasir"
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white transition-all font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-950/20"
          >
            <Kasir3DIcon className="w-4 h-4 shrink-0" />
            <span>Buka Kasir POS</span>
          </Link>
        </div>
      </div>

      {/* FILTER PANEL */}
      <DateRangeFilter
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        customDate={customDate}
        setCustomDate={setCustomDate}
      />

      {/* =============================================================== */}
      {/* MENU AKSES CEPAT (7 ICON NAVIGASI)                              */}
      {/* =============================================================== */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-xs">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 px-1">
          Menu Akses Cepat Arena
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
          <Link
            to="/booking"
            className="flex items-center space-x-2 px-3 py-2 bg-orange-50/70 hover:bg-orange-100/80 text-orange-800 rounded-xl text-xs font-bold transition-all border border-orange-200/80 cursor-pointer shadow-2xs hover:shadow-xs justify-center sm:justify-start"
          >
            <Booking3DIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">Jadwal Booking</span>
          </Link>
          <Link
            to="/kasir"
            className="flex items-center space-x-2 px-3 py-2 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-800 rounded-xl text-xs font-bold transition-all border border-emerald-200/80 cursor-pointer shadow-2xs hover:shadow-xs justify-center sm:justify-start"
          >
            <Kasir3DIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">Kasir POS</span>
          </Link>
          <Link
            to="/akademi"
            className="flex items-center space-x-2 px-3 py-2 bg-purple-50/70 hover:bg-purple-100/80 text-purple-800 rounded-xl text-xs font-bold transition-all border border-purple-200/80 cursor-pointer shadow-2xs hover:shadow-xs justify-center sm:justify-start"
          >
            <Akademi3DIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">Akademi SIMAK</span>
          </Link>
          <Link
            to="/events"
            className="flex items-center space-x-2 px-3 py-2 bg-amber-50/70 hover:bg-amber-100/80 text-amber-800 rounded-xl text-xs font-bold transition-all border border-amber-200/80 cursor-pointer shadow-2xs hover:shadow-xs justify-center sm:justify-start"
          >
            <Event3DIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">Event &amp; Turnamen</span>
          </Link>
          <Link
            to="/keuangan"
            className="flex items-center space-x-2 px-3 py-2 bg-teal-50/70 hover:bg-teal-100/80 text-teal-800 rounded-xl text-xs font-bold transition-all border border-teal-200/80 cursor-pointer shadow-2xs hover:shadow-xs justify-center sm:justify-start"
          >
            <Keuangan3DIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">Keuangan</span>
          </Link>
          <Link
            to="/intelligence"
            className="flex items-center space-x-2 px-3 py-2 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-800 rounded-xl text-xs font-bold transition-all border border-indigo-200/80 cursor-pointer shadow-2xs hover:shadow-xs justify-center sm:justify-start"
          >
            <AIInsight3DIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">AI Insight</span>
          </Link>
          <Link
            to="/pengaturan"
            className="flex items-center space-x-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer shadow-2xs hover:shadow-xs justify-center sm:justify-start col-span-2 sm:col-span-2 lg:col-span-1"
          >
            <Pengaturan3DIcon className="w-5 h-5 shrink-0" />
            <span className="truncate">Profil GOR</span>
          </Link>
        </div>
      </div>

      {/* =============================================================== */}
      {/* 5 KARTU EKSEKUTIF KPI KEUANGAN (TERMASUK B2B SPONSORSHIP) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* KARTU 1: GROSS REVENUE BULAN INI */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Gross Revenue Bulan Ini
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(financialSummary.grossRevenueThisMonth)}
          </p>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-medium">Transaksi Sukses:</span>
            <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {financialSummary.totalTransactionsCount} Transaksi
            </span>
          </div>
        </div>

        {/* KARTU 2: DIVISI SEWA LAPANGAN */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
              Divisi Sewa Lapangan
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Booking3DIcon className="w-5 h-5 shrink-0" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight">
            {formatRupiah(financialSummary.courtRevMonth)}
          </p>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-medium">Okupansi Jam:</span>
            <span className="font-extrabold text-slate-700">
              {occupancyPercentage}% ({totalBookingsCount} Sesi)
            </span>
          </div>
        </div>

        {/* KARTU 3: DIVISI KASIR RETAIL (POS) */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">
              Divisi POS &amp; Retail F&amp;B
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Kasir3DIcon className="w-5 h-5 shrink-0" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
            {formatRupiah(financialSummary.posRevMonth)}
          </p>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-medium">F&amp;B &amp; Rental:</span>
            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Habis Pakai &amp; Sewa
            </span>
          </div>
        </div>

        {/* KARTU 4: DIVISI AKADEMI SPP */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">
              Divisi Akademi SIMAK
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Akademi3DIcon className="w-5 h-5 shrink-0" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
            {formatRupiah(financialSummary.sppRevMonth)}
          </p>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-medium">Pembayaran SPP:</span>
            <span className="font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              Pelunasan Terdata
            </span>
          </div>
        </div>

        {/* KARTU 5: DIVISI SPONSORSHIP (B2B) */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all space-y-2 col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">
              Sponsorship (B2B)
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <DanaSponsor3DIcon className="w-5 h-5 shrink-0" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
            {formatRupiah(financialSummary.sponsorRevMonth || 0)}
          </p>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-medium">Dana Masuk:</span>
            <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Termin B2B Cair
            </span>
          </div>
        </div>

      </div>

      {/* =============================================================== */}
      {/* 2. PANEL REKONSILIASI BILYET GIRO & TRANSAKSI PENDING (FASE 12 PART 4) */}
      {/* =============================================================== */}
      <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-amber-100/60 rounded-3xl p-5 sm:p-6 border border-amber-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-600/20 shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-sm sm:text-base text-amber-950">
                  Menunggu Kliring / Pending Giro B2B
                </h2>
                <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {pendingTransactions.length} Pending
                </span>
              </div>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Instrumen Cek / Bilyet Giro yang belum dikliringkan bank &bull; Total Potensial: <strong className="text-amber-950 font-black">{formatRupiah(totalPendingAmount)}</strong>
              </p>
            </div>
          </div>

          {pendingTransactions.length > 0 && (
            <div className="text-xs text-amber-800 font-bold bg-amber-200/60 px-3 py-1.5 rounded-xl border border-amber-300 self-start sm:self-auto">
              Klik &quot;Tandai Cair&quot; setelah dana efektif diterima di rekening GOR
            </div>
          )}
        </div>

        {reconcileNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-xs text-emerald-800 font-bold animate-in fade-in duration-200">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-600" />
            <span>{reconcileNotice}</span>
          </div>
        )}

        {reconcileError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-2 text-xs text-red-700 font-bold">
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
            <span>{reconcileError}</span>
          </div>
        )}

        {pendingTransactions.length === 0 ? (
          <div className="py-8 bg-white/60 backdrop-blur-xs rounded-2xl border border-amber-200/60 text-center flex flex-col items-center justify-center p-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
            <p className="text-sm font-bold text-slate-800">Semua Giro &amp; Transaksi Sudah Kliring</p>
            <p className="text-xs text-slate-500 max-w-sm mt-0.5">
              Tidak ada instrumen Bilyet Giro atau pembayaran B2B yang tertunda saat ini. Seluruh arus kas tercatat sukses di buku besar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white/80 backdrop-blur-xs rounded-2xl border border-amber-200/70 shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-200/70 text-amber-900 uppercase font-extrabold text-[10px] tracking-wider bg-amber-100/50">
                  <th className="py-3 px-3.5">Tanggal Jatuh Tempo</th>
                  <th className="py-3 px-3.5">Referensi / Perusahaan</th>
                  <th className="py-3 px-3.5">Bank Penerbit</th>
                  <th className="py-3 px-3.5 text-right">Nominal Pending</th>
                  <th className="py-3 px-3.5 text-center">Aksi Kliring</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 text-xs">
                {pendingTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-amber-50/60 transition-colors">
                    {/* Tanggal Jatuh Tempo */}
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center space-x-1.5 text-amber-950 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{tx.dueDateFormatted}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        Entri: {tx.dateFormatted}
                      </span>
                    </td>

                    {/* Referensi / Perusahaan */}
                    <td className="py-3.5 px-3.5 max-w-[240px]">
                      <p className="font-extrabold text-slate-900 truncate" title={tx.title}>
                        {tx.title}
                      </p>
                      <p className="text-[10px] text-amber-800 font-mono mt-0.5">
                        {tx.giroNumber !== '-' ? `No. Giro: ${tx.giroNumber}` : tx.id}
                      </p>
                    </td>

                    {/* Bank Penerbit */}
                    <td className="py-3.5 px-3.5">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-xl text-[10px] font-bold border border-amber-300">
                        {tx.bankIssuer}
                      </span>
                    </td>

                    {/* Nominal */}
                    <td className="py-3.5 px-3.5 text-right">
                      <span className="font-black text-amber-700 text-sm block">
                        ~ {formatRupiah(tx.amount)}
                      </span>
                      <span className="text-[9px] font-extrabold text-amber-600 uppercase">
                        PENDING CLEARING
                      </span>
                    </td>

                    {/* Aksi Tandai Cair */}
                    <td className="py-3.5 px-3.5 text-center">
                      <button
                        type="button"
                        disabled={isClearing}
                        onClick={() => handleClearTransaction(tx)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-950/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5 mx-auto disabled:opacity-50"
                        title="Tandai Giro Ini Sudah Cair / Sukses"
                      >
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>{isClearing ? 'Memproses...' : 'Tandai Cair'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =============================================================== */}
      {/* 2 VISUALISASI CHARTING RECHARTS (INTRUKSI 2)                     */}
      {/* =============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CHART 1: TREN ARUS KAS HARIAN (BAR / AREA CHART - 8 COLS) */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
                <span>Tren Pendapatan Harian Multi-Divisi</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fluktuasi penerimaan kas dari Sewa Lapangan, POS Retail, dan SPP Akademi
              </p>
            </div>

            {/* Toggle 7 Hari vs 14 Hari */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTrendDays(7)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  trendDays === 7 ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => setTrendDays(14)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  trendDays === 14 ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                14 Hari
              </button>
            </div>
          </div>

          {/* RECHARTS AREA / BAR CHART */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="courtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="sppGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="sponsorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 10 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Sewa Lapangan" 
                  stackId="1" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#courtGrad)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="POS / Retail" 
                  stackId="1" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fill="url(#posGrad)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="SPP Akademi" 
                  stackId="1" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  fill="url(#sppGrad)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Sponsorship" 
                  stackId="1" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  fill="url(#sponsorGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: DONUT / PIE CHART (DISTRIBUSI ARUS KAS - 4 COLS) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-4.5 h-4.5 text-indigo-600" />
              <span>Distribusi Arus Kas Divisi</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Proporsi pendapatan per segmen operasional
            </p>
          </div>

          {/* DONUT PIE CHART */}
          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={divisionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {divisionPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Summary Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Omset Filtered
              </span>
              <span className="text-sm font-black text-slate-900 truncate max-w-[120px]">
                {formatRupiah(financialSummary.filteredTotalRevenue)}
              </span>
            </div>
          </div>

          {/* LEGEND / BREAKDOWN LIST */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            {divisionPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-bold text-slate-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900 block">{formatRupiah(item.value)}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{item.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* =============================================================== */}
      {/* 3. TABEL ARUS KAS TERKINI (10 TRANSAKSI TERAKHIR) (INTRUKSI 3)  */}
      {/* =============================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-2.5">
            <Receipt className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                Tabel Arus Kas Terkini (10 Transaksi Terakhir)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit transaksi real-time lintas booking lapangan, kasir POS retail, dan SPP akademi
              </p>
            </div>
          </div>

          <Link
            to="/keuangan"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 shrink-0"
          >
            <span>Buka Buku Besar Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center p-6">
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Belum ada riwayat transaksi</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Transaksi kasir, booking lapangan, dan pelunasan SPP akan otomatis tercatat di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-extrabold text-[10px] tracking-wider">
                  <th className="py-3 px-3">Tanggal &amp; Waktu</th>
                  <th className="py-3 px-3">ID / Pelanggan</th>
                  <th className="py-3 px-3">Kategori Divisi</th>
                  <th className="py-3 px-3">Metode Bayar</th>
                  <th className="py-3 px-3 text-right">Nominal Masuk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentTransactions.map((tx) => {
                  // Badge styling per division (Instruksi 3)
                  let divisionBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                  let divisionIcon = <Booking3DIcon className="w-3.5 h-3.5 shrink-0" />;
                  let divisionLabel = 'Court / Booking';

                  if (tx.division === 'Academy/SPP') {
                    divisionBadge = 'bg-purple-50 text-purple-700 border-purple-200';
                    divisionIcon = <Akademi3DIcon className="w-3.5 h-3.5 shrink-0" />;
                    divisionLabel = 'Academy / SPP';
                  } else if (tx.division === 'POS/Retail') {
                    divisionBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    divisionIcon = <Kasir3DIcon className="w-3.5 h-3.5 shrink-0" />;
                    divisionLabel = 'POS / Retail';
                  } else if (tx.division === 'Event & Sponsorship' || tx.division === 'Sponsorship') {
                    divisionBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                    divisionIcon = <DanaSponsor3DIcon className="w-3.5 h-3.5 shrink-0" />;
                    divisionLabel = 'Sponsorship B2B';
                  }

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Tanggal & Waktu */}
                      <td className="py-3.5 px-3">
                        <p className="font-extrabold text-slate-800">{tx.dateFormatted}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.timeFormatted} WIB</p>
                      </td>

                      {/* ID / Detail Pelanggan */}
                      <td className="py-3.5 px-3 max-w-[220px]">
                        <p className="font-bold text-slate-800 truncate" title={tx.title}>
                          {tx.title}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.id}</p>
                      </td>

                      {/* Kategori Divisi (Badge Warna Terpisah) */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider ${divisionBadge}`}>
                          {divisionIcon}
                          <span>{divisionLabel}</span>
                        </span>
                      </td>

                      {/* Metode Pembayaran */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                          {tx.paymentMethod}
                        </span>
                      </td>

                      {/* Nominal */}
                      <td className="py-3.5 px-3 text-right">
                        <span className={`font-black text-sm block ${tx.status === 'pending_clearing' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {tx.status === 'pending_clearing' ? '~ ' : '+ '} {formatRupiah(tx.amount)}
                        </span>
                        <span className={`text-[9px] font-bold uppercase ${tx.status === 'pending_clearing' ? 'text-amber-600' : 'text-slate-400 font-semibold'}`}>
                          {tx.status === 'pending_clearing' ? 'PENDING KLIRING' : 'LUNAS'}
                        </span>
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
