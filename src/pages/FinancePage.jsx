import React, { useState } from 'react';
import useArenaData from '../hooks/useArenaData';
import { 
  DollarSign, 
  Inbox, 
  ArrowUpRight, 
  Filter, 
  Download, 
  Sparkles 
} from 'lucide-react';
import {
  Booking3DIcon,
  Kasir3DIcon,
  Akademi3DIcon,
  Keuangan3DIcon
} from '../components/icons/App3DIcons';

import DateRangeFilter, { filterDataByTime } from '../components/DateRangeFilter';

export default function FinancePage({ userProfile }) {
  const { bookings, transactions, isLoading } = useArenaData(userProfile);

  // Time Range Filter States
  const [timeFilter, setTimeFilter] = useState('today'); // 'today', 'week', 'month', 'custom'
  const [customDate, setCustomDate] = useState({ start: '', end: '' });

  // Category Filter
  const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL' | 'SEWA' | 'POS' | 'SPP'

  // Filter Data by Time Period
  const filteredBookings = filterDataByTime(bookings, 'bookingDate', timeFilter, customDate);
  const filteredTransactions = filterDataByTime(transactions, 'createdAt', timeFilter, customDate);

  // 1. Calculate KPI Metrics based on filtered records
  const bookingRevenue = filteredBookings.reduce((sum, b) => sum + (b.price || 0), 0);

  const posRevenue = filteredTransactions
    .filter((t) => t.itemCategory !== 'SPP Akademi')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const sppRevenue = filteredTransactions
    .filter((t) => t.itemCategory === 'SPP Akademi')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalGrossRevenue = bookingRevenue + posRevenue + sppRevenue;

  // 2. Merge Filtered Bookings & Transactions into Single Integrated Ledger History
  const mergedLedger = [
    ...filteredBookings.map((b) => ({
      id: `booking-${b.id}`,
      type: 'SEWA',
      categoryLabel: 'Sewa Lapangan',
      title: b.customerName || 'Pelanggan Lapangan',
      detail: `${b.courtName || `Lapangan ${b.courtNumber}`} (${b.startTime || '08:00'} - ${b.endTime || '09:00'})`,
      amount: b.price || 0,
      date: b.bookingDate || b.date || 'Hari ini',
      rawDate: b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date()
    })),
    ...filteredTransactions.map((t) => {
      const isSPP = t.itemCategory === 'SPP Akademi';
      return {
        id: `tx-${t.id}`,
        type: isSPP ? 'SPP' : 'POS',
        categoryLabel: isSPP ? 'SPP Akademi' : 'Kasir POS',
        title: t.itemName || 'Transaksi Kasir',
        detail: `Metode: ${t.paymentMethod || 'QRIS / Cash'}`,
        amount: t.amount || 0,
        date: t.createdAt?.seconds 
          ? new Date(t.createdAt.seconds * 1000).toLocaleDateString('id-ID')
          : 'Hari ini',
        rawDate: t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date()
      };
    })
  ].sort((a, b) => b.rawDate - a.rawDate);

  // Filtered Ledger by Category
  const filteredLedger = mergedLedger.filter((item) => {
    if (filterCategory === 'ALL') return true;
    return item.type === filterCategory;
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-gray-500 font-medium">
        Memuat laporan keuangan terpadu...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#333333]">
      
      {/* HEADER BANNER */}
      <div className="bg-[#333333] text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Keuangan3DIcon className="w-5 h-5 shrink-0" />
            <span className="text-emerald-400">Laporan Arus Kas Terpadu (General Ledger)</span>
          </div>
          <p className="text-xs text-gray-300 mt-1">Total Pendapatan Kotor Seluruh Operasional Arena</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Rp {totalGrossRevenue.toLocaleString('id-ID')}
          </h1>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 text-right space-y-0.5">
          <p className="text-[10px] uppercase tracking-wider text-gray-300 font-bold">Total Transaksi</p>
          <p className="text-lg font-black text-white">{mergedLedger.length} Transaksi</p>
        </div>
      </div>

      {/* TIME RANGE FILTER PANEL */}
      <DateRangeFilter
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        customDate={customDate}
        setCustomDate={setCustomDate}
      />

      {/* 3 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* a. Pendapatan Sewa Lapangan */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sewa Lapangan</span>
            <Booking3DIcon className="w-8 h-8 shrink-0 drop-shadow-2xs" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-[#333333]">
              Rp {bookingRevenue.toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {filteredBookings.length} Reservasi Terkonfirmasi
            </p>
          </div>
        </div>

        {/* b. Pendapatan Kasir POS */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kasir POS (Retail &amp; F&amp;B)</span>
            <Kasir3DIcon className="w-8 h-8 shrink-0 drop-shadow-2xs" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-[#333333]">
              Rp {posRevenue.toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {filteredTransactions.filter((t) => t.itemCategory !== 'SPP Akademi').length} Penjualan Retail &amp; F&amp;B
            </p>
          </div>
        </div>

        {/* c. Pendapatan SPP Akademi */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Akademi (SPP)</span>
            <Akademi3DIcon className="w-8 h-8 shrink-0 drop-shadow-2xs" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-[#333333]">
              Rp {sppRevenue.toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {filteredTransactions.filter((t) => t.itemCategory === 'SPP Akademi').length} Pembayaran Iuran Siswa
            </p>
          </div>
        </div>

      </div>

      {/* INTEGRATED TRANSACTIONS HISTORY LEDGER */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="font-bold text-base text-[#333333]">Histori Transaksi Terpadu</h2>
            <p className="text-xs text-gray-500">Gabungan arus kas masuk dari Sewa Lapangan, Kasir POS, &amp; SPP Akademi</p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                filterCategory === 'ALL'
                  ? 'bg-[#333333] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Semua ({mergedLedger.length})
            </button>
            <button
              onClick={() => setFilterCategory('SEWA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                filterCategory === 'SEWA'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Sewa ({filteredBookings.length})
            </button>
            <button
              onClick={() => setFilterCategory('POS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                filterCategory === 'POS'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              POS ({filteredTransactions.filter((t) => t.itemCategory !== 'SPP Akademi').length})
            </button>
            <button
              onClick={() => setFilterCategory('SPP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                filterCategory === 'SPP'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              SPP ({filteredTransactions.filter((t) => t.itemCategory === 'SPP Akademi').length})
            </button>
          </div>
        </div>

        {filteredLedger.length === 0 ? (
          /* ZERO MOCK DATA MANDATORY EMPTY STATE UI */
          <div className="py-12 border-2 border-dashed border-gray-200 rounded-xl text-center flex flex-col items-center justify-center p-6">
            <Inbox className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-700">Tidak ada riwayat transaksi keuangan pada periode ini</p>
            <p className="text-xs text-gray-400 max-w-sm mt-1">
              Gunakan panel filter waktu di atas untuk melihat rentang tanggal lainnya atau catat transaksi baru.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLedger.map((item) => {
              // Badge colors based on transaction type
              let badgeStyle = 'bg-gray-100 text-gray-700';
              if (item.type === 'SEWA') badgeStyle = 'bg-blue-100 text-blue-800 border-blue-200';
              if (item.type === 'POS') badgeStyle = 'bg-purple-100 text-purple-800 border-purple-200';
              if (item.type === 'SPP') badgeStyle = 'bg-green-100 text-green-800 border-green-200';

              return (
                <div key={item.id} className="py-3.5 flex items-center justify-between hover:bg-gray-50/60 px-2 rounded-xl transition-colors">
                  <div className="space-y-1 overflow-hidden pr-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 border text-[9px] font-extrabold rounded-md uppercase tracking-wider ${badgeStyle}`}>
                        {item.categoryLabel}
                      </span>
                      <span className="text-[10px] text-gray-400">{item.date}</span>
                    </div>
                    <p className="font-bold text-xs sm:text-sm text-[#333333] truncate">{item.title}</p>
                    <p className="text-[11px] text-gray-400 truncate">{item.detail}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-xs sm:text-sm text-green-600 block">
                      + Rp {item.amount.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Terkonfirmasi</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
