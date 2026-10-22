import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { X, School, Trophy, Layers, Sparkles, Plus } from 'lucide-react';
import { sportCategoryOptions } from '../pages/AcademyPage';

export default function CreateAcademyModal({ isOpen, onClose, userProfile, onAcademyCreated }) {
  const tenantId = userProfile?.tenant?.id || userProfile?.tenantId || userProfile?.uid;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('field');
  const [sport, setSport] = useState('Futsal');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync specific sport dropdown when sport category changes
  useEffect(() => {
    const catObj = sportCategoryOptions.find((c) => c.id === category);
    if (catObj && catObj.sports.length > 0) {
      if (!catObj.sports.includes(sport)) {
        setSport(catObj.sports[0]);
      }
    }
  }, [category, sport]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama akademi wajib diisi.');
      return;
    }

    if (!tenantId) {
      setErrorMsg('Sesi pengguna tidak valid. Silakan muat ulang halaman.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const catObj = sportCategoryOptions.find((c) => c.id === category);

      const docRef = await addDoc(collection(db, 'academies'), {
        tenantId,
        name: name.trim(),
        category,
        categoryLabel: catObj?.label || 'Sports',
        sportCategory: category,
        sport,
        description: description.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const newId = docRef.id;
      setName('');
      setDescription('');
      if (onAcademyCreated) {
        onAcademyCreated(newId, name.trim());
      }
      onClose();
    } catch (err) {
      console.error('Error creating academy:', err);
      handleFirestoreError(err, 'create', 'academies');
      setErrorMsg('Gagal membuat akademi baru. Silakan periksa koneksi internet Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategoryObj = sportCategoryOptions.find((c) => c.id === category) || sportCategoryOptions[0];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Top Decorative Sporty Gradient Bar */}
        <div className="h-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100 shadow-2xs">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">Buat Ruang Akademi Baru</h3>
              <p className="text-xs text-slate-500">Mendukung Multi-Cabang Olahraga dalam 1 Tenant GOR</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-left">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Input 1: Nama Akademi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Akademi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Wates Futsal School, Garuda Badminton Academy"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Input 2: Kategori Olahraga */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Kategori Olahraga <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-blue-600 font-extrabold normal-case">Pilih Kelompok Olahraga</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
            >
              {sportCategoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Input 3: Cabang Olahraga Spesifik (Dinamis berdasarkan Kategori) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Cabang Olahraga Spesifik <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-emerald-600 font-extrabold normal-case">Dinamis dari Kategori</span>
            </label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
            >
              {currentCategoryObj.sports.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>

          {/* Input 4: Deskripsi Singkat */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Deskripsi Singkat <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Misal: Sekolah pembinaan bakat futsal usia dini U-10 hingga U-17 dengan lisensi nasional."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-cyan-300" />
                  <span>Simpan &amp; Aktifkan Akademi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
