import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import useArenaData from '../hooks/useArenaData';
import { generateBusinessInsights } from '../services/aiService';
import { 
  BrainCircuit, 
  TrendingUp, 
  PieChart, 
  Loader2, 
  Building2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  BarChart3, 
  Share2 
} from 'lucide-react';
import { AIInsight3DIcon } from '../components/icons/App3DIcons';

export default function IntelligencePage({ userProfile }) {
  const { tenantProfile, courts, bookings, transactions, isLoading: loadingData } = useArenaData(userProfile);

  const [aiInsight, setAiInsight] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Compute summary numbers to show in data preview cards
  const bookingRevenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const posRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalOmset = bookingRevenue + posRevenue;

  const totalCourts = courts.length || tenantProfile?.courtsCount || 0;
  const totalBookings = bookings.length;

  const handleGenerateInsight = async () => {
    setAnalyzing(true);
    setError(null);

    // Prepare real-time raw data payload for Gemini AI
    const arenaDataPayload = {
      bookings: bookings,
      transactions: transactions,
      profilGOR: {
        nama: tenantProfile?.name || 'GOR Arena Sports',
        lokasi: `${tenantProfile?.village || ''}, ${tenantProfile?.district || ''}, ${tenantProfile?.regency || ''}, ${tenantProfile?.province || ''}`,
        kategoriOlahraga: tenantProfile?.sportsType || 'Multi-Sport',
        jumlahLapangan: totalCourts,
      },
      metrikKeuangan: {
        totalOmsetKotor: `Rp ${totalOmset.toLocaleString('id-ID')}`,
        omsetSewaLapangan: `Rp ${bookingRevenue.toLocaleString('id-ID')}`,
        omsetPOSKasir: `Rp ${posRevenue.toLocaleString('id-ID')}`,
        totalTransaksi: bookings.length + transactions.length,
      },
      metrikOperasional: {
        totalReservasiBooking: totalBookings,
        daftarLapangan: courts.map((c) => ({
          nama: c.name,
          cabang: c.sport,
          tarifPerJam: `Rp ${Number(c.price || 0).toLocaleString('id-ID')}`
        })),
        sampelBookingTerbaru: bookings.slice(0, 10).map((b) => ({
          namaPemesan: b.customerName,
          lapangan: b.courtName || b.courtNumber,
          jam: `${b.startTime} - ${b.endTime}`,
          tanggal: b.bookingDate,
          harga: b.price
        })),
        sampelTransaksiPOS: transactions.slice(0, 10).map((t) => ({
          item: t.itemName,
          kategori: t.itemCategory,
          jumlah: t.amount,
          metodePembayaran: t.paymentMethod
        }))
      }
    };

    try {
      const insightResult = await generateBusinessInsights(arenaDataPayload);
      setAiInsight(insightResult);
    } catch (err) {
      console.error('Error generating AI Insights:', err);
      setError(err.message || 'Gagal terhubung dengan Chua Intelligence Engine.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loadingData) {
    return (
      <div className="py-16 text-center text-xs text-gray-500 font-medium">
        Menyiapkan titik data operasional real-time...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#333333]">
      
      {/* FUTURISTIC HEADER BANNER */}
      <div className="bg-[#212121] text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-gray-800 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-950/80 border border-blue-800/60 rounded-full text-blue-400 text-xs font-extrabold tracking-wider">
            <AIInsight3DIcon className="w-4 h-4 shrink-0" />
            <span>CHUA INTELLIGENCE &bull; AI BUSINESS ENGINE</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Pusat Kendali Business Intelligence
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-xl leading-relaxed">
                Analisa otomatis arus kas, tingkat okupansi jam kosong, dan rekomendasi strategi harga dinamis berbasis kecerdasan buatan Gemini AI.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateInsight}
              disabled={analyzing}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-900/30 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center space-x-2.5 shrink-0 border border-blue-500/30"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Menganalisa Titik Data...</span>
                </>
              ) : (
                <>
                  <BrainCircuit className="w-5 h-5 text-white" />
                  <span>Generate Analisa AI - Chua Intelligence</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RAW DATA AUDIT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Omset Terdeteksi</p>
          <p className="text-base sm:text-lg font-black text-[#333333]">
            Rp {totalOmset.toLocaleString('id-ID')}
          </p>
          <p className="text-[9px] text-gray-400">Arus kas terkonfirmasi</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data Booking</p>
          <p className="text-base sm:text-lg font-black text-[#333333]">{totalBookings} Reservasi</p>
          <p className="text-[9px] text-gray-400">Jadwal terpeta di database</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fasilitas Arena</p>
          <p className="text-base sm:text-lg font-black text-[#333333]">{totalCourts} Lapangan</p>
          <p className="text-[9px] text-gray-400">Aset aktif arena</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Transaksi Kasir</p>
          <p className="text-base sm:text-lg font-black text-[#333333]">{transactions.length} POS</p>
          <p className="text-[9px] text-gray-400">Ritel &amp; F&amp;B terpindat</p>
        </div>
      </div>

      {/* ERROR NOTICE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* AI PROCESSING STATE */}
      {analyzing && (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-sm text-center flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-md animate-bounce">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <Sparkles className="w-6 h-6 text-blue-600 absolute -top-2 -right-2 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#333333]">Chua Intelligence sedang menganalisa data venue Anda...</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Memproses evaluasi FinOps, segmentasi jam sibuk/kosong, dan rekomendasi strategi harga optimal.
            </p>
          </div>
        </div>
      )}

      {/* AI INSIGHT CARD RESULT */}
      {aiInsight && !analyzing && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 space-y-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-[#333333]">Laporan Rekomendasi Chua Intelligence</h2>
                <p className="text-xs text-gray-500">Hasil data storytelling &amp; strategi FinOps real-time</p>
              </div>
            </div>

            <button
              onClick={handleGenerateInsight}
              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Analisa Ulang</span>
            </button>
          </div>

          {/* Markdown Content Rendering */}
          <div className="prose prose-sm max-w-none text-[#333333] leading-relaxed space-y-4 font-sans border-l-4 border-blue-600 pl-4 sm:pl-6 bg-blue-50/20 py-2 rounded-r-xl">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-blue-600 mt-4 mb-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-base font-bold text-[#333333] mt-4 mb-2 border-b pb-1" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-blue-600 mt-3 mb-1" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-bold text-[#333333] bg-amber-100/60 px-1 rounded" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700" {...props} />,
                li: ({ node, ...props }) => <li className="leading-snug" {...props} />,
                p: ({ node, ...props }) => <p className="text-xs sm:text-sm text-gray-700" {...props} />
              }}
            >
              {aiInsight}
            </ReactMarkdown>
          </div>

        </div>
      )}

      {/* PROMPT PLACEHOLDER WHEN NO INSIGHT GENERATED YET */}
      {!aiInsight && !analyzing && (
        <div className="bg-white rounded-2xl p-10 border border-gray-200 shadow-sm text-center flex flex-col items-center justify-center p-6 space-y-3">
          <Zap className="w-12 h-12 text-blue-600 mb-1" />
          <h3 className="text-base font-bold text-[#333333]">Siap Memulai Analisa Intelligence?</h3>
          <p className="text-xs text-gray-400 max-w-md">
            Klik tombol "Generate Analisa AI - Chua Intelligence" di atas untuk memproses evaluasi performa bisnis arena olahraga Anda.
          </p>
        </div>
      )}

    </div>
  );
}
