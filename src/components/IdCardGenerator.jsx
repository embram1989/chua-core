import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';
import { 
  X, 
  Download, 
  Loader2, 
  IdCard, 
  ShieldCheck, 
  AlertCircle
} from 'lucide-react';
import { getStudentInitials } from '../utils/helpers';

/**
 * IdCardGenerator Component
 * Generates an elegant printable & downloadable digital ID Card (Member / Staff)
 * with QR Code containing the Firestore Document ID.
 */
export default function IdCardGenerator({
  isOpen,
  onClose,
  data,
  role = 'SISWA', // 'SISWA' | 'PELATIH'
  tenantData = null,
  tenantName = '',
  tenantLogo = '',
  academyName = '',
  sportCategory = ''
}) {
  const cardRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  if (!isOpen || !data) return null;

  const isStudent = role === 'SISWA';
  const fullName = isStudent 
    ? (data.studentName || 'Nama Siswa') 
    : (data.name || 'Nama Pelatih');
  const photoUrl = data.photoUrl || null;
  const documentId = data.id || 'N/A';
  const sport = data.sportCategory || data.sportSpecialty || sportCategory || 'Olahraga';
  const subInfo = isStudent
    ? (data.className ? `Kelas: ${data.className}` : (data.schoolOrigin || 'Akademi Siswa'))
    : (data.license ? `Lisensi: ${data.license}` : (data.specialty || 'Instruktur Resmi'));

  // Resolusi data tenant dari props tenantData dengan fallback
  const finalTenantName = tenantData?.name || tenantName || 'CHUA SPORT CORE';
  const finalTenantLogo = tenantData?.logoUrl || tenantLogo || '';
  const finalTenantAddress = tenantData?.address || tenantData?.alamat || '';
  const finalTenantPhone = tenantData?.phone || tenantData?.whatsapp || tenantData?.noHp || '';

  const handleDownload = async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);

    try {
      // Jeda sejenak untuk memastikan render gambar stabil
      await new Promise((resolve) => setTimeout(resolve, 200));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: { margin: 0 }
      });

      const link = document.createElement('a');
      const safeName = fullName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      link.download = `ID_CARD_${role}_${safeName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Gagal men-generate ID card:', err);
      setDownloadError('Gagal mengunduh kartu. Silakan periksa koneksi atau coba unduh kembali.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${isStudent ? 'bg-blue-600' : 'bg-amber-600'}`}>
              <IdCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                Generate ID Card {isStudent ? 'Siswa' : 'Pelatih'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Kartu anggota digital resmi dengan QR Code terverifikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Preview Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col items-center justify-center bg-slate-100/60">
          
          {/* THE ID CARD ELEMENT TO BE RENDERED/DOWNLOADED */}
          <div
            ref={cardRef}
            className="w-[265px] min-h-[440px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col relative border border-slate-200/90 select-none text-slate-800"
            style={{
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {/* Lanyard Clip Slot Simulation */}
            <div className="w-full pt-2 pb-1 flex justify-center bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700">
              <div className="w-11 h-1.5 rounded-full bg-slate-900/30 shadow-inner" />
            </div>

            {/* Card Header (Informasi Tenant - Rata Tengah) */}
            <div className="px-3 pt-1 pb-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white flex flex-col items-center text-center relative">
              {/* Baris 1: Logo Tenant */}
              {finalTenantLogo ? (
                <img
                  src={finalTenantLogo}
                  alt={finalTenantName}
                  crossOrigin="anonymous"
                  className="w-8 h-8 object-cover rounded-md mb-1 mx-auto shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-md bg-white/20 text-white font-black text-xs flex items-center justify-center mb-1 mx-auto border border-white/30">
                  {finalTenantName ? finalTenantName.charAt(0).toUpperCase() : 'G'}
                </div>
              )}

              {/* Baris 2: Nama Tenant */}
              <h4 className="text-[18px] font-bold whitespace-normal break-words leading-tight text-white">
                {finalTenantName}
              </h4>

              {/* Baris 3: Alamat Tenant */}
              {finalTenantAddress && (
                <p className="text-[8px] text-white/90 whitespace-normal break-words leading-tight mt-0.5">
                  {finalTenantAddress}
                </p>
              )}

              {/* Baris 4: No. Telp/WA */}
              {finalTenantPhone && (
                <p className="text-[8px] font-semibold text-white/90">
                  Telp/WA: {finalTenantPhone}
                </p>
              )}
            </div>

            {/* Decorative Gold Divider / Top Accent */}
            <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 shadow-xs" />

            {/* Card Middle: Profile Photo & Identification */}
            <div className="px-3 pt-3 pb-2 flex flex-col items-center text-center bg-gradient-to-b from-blue-50/40 via-white to-white flex-1">
              {/* Photo or Initials */}
              <div className="relative mb-2">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={fullName}
                    crossOrigin="anonymous"
                    className="w-20 h-20 rounded-full object-cover border-3 border-white shadow-md bg-white"
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-black border-3 border-white shadow-md ${
                    isStudent 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' 
                      : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                  }`}>
                    {getStudentInitials(fullName)}
                  </div>
                )}
                {/* Micro Role Badge on avatar bottom */}
                <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-xs whitespace-nowrap ${
                  isStudent
                    ? 'bg-blue-600 text-white'
                    : 'bg-amber-500 text-slate-900 font-extrabold'
                }`}>
                  {role}
                </span>
              </div>

              {/* Nama Lengkap Siswa / Pelatih (Full wrapped, tidak terpotong) */}
              <h3 className="text-sm font-bold text-gray-900 whitespace-normal break-words text-center px-2 mt-1">
                {fullName}
              </h3>

              {/* Sub-info (Cabang Olahraga & Kelas/Lisensi) */}
              <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800 text-[10px] font-bold">
                  {sport}
                </span>
                {subInfo && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium break-words max-w-[150px]">
                    {subInfo}
                  </span>
                )}
              </div>

              {/* QR Code Section */}
              <div className="mt-auto pt-2 pb-1 flex flex-col items-center">
                <div className="p-1.5 bg-white rounded-lg border border-slate-200/90 shadow-2xs">
                  <QRCode
                    value={documentId}
                    size={72}
                    level="M"
                  />
                </div>
                {/* Document ID Text explicitly beneath the QR Code */}
                <p className="text-[9px] font-mono font-semibold text-slate-500 mt-1 tracking-wider">
                  ID: <span className="text-slate-700">{documentId}</span>
                </p>
              </div>
            </div>

            {/* Card Footer Stripe */}
            <div className="px-3 py-1.5 bg-slate-900 text-[8px] text-slate-300 font-bold uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-blue-400" />
                <span>OFFICIAL PASS</span>
              </span>
              <span className="text-slate-400 font-medium">CHUA CORE</span>
            </div>
          </div>

          {/* Feedback error jika download bermasalah */}
          {downloadError && (
            <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 max-w-[280px]">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{downloadError}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center mt-3">
            Kartu berformat PNG siap cetak berkualitas tinggi.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownload}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Gambar...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Kartu (PNG)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
