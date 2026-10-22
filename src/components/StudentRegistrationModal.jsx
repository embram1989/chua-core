import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { 
  X, 
  User, 
  Calendar, 
  FileText, 
  School, 
  Upload, 
  GraduationCap, 
  Phone, 
  MapPin, 
  Loader2, 
  Check,
  Lock,
  AlertTriangle
} from 'lucide-react';

export default function StudentRegistrationModal({
  isOpen,
  onClose,
  academyClasses = [],
  tenantId,
  activeAcademy = null,
  activeAcademyId = '',
  uniqueSports = [],
  studentToEdit = null,
  academyPricing = null,
  onSuccess
}) {
  const isEditing = Boolean(studentToEdit);

  // Form Fields
  const [studentName, setStudentName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nikKk, setNikKk] = useState('');
  const [schoolOrigin, setSchoolOrigin] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [sportCategory, setSportCategory] = useState(uniqueSports[0] || 'Badminton');
  const [studentClassId, setStudentClassId] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [registrationFee, setRegistrationFee] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  // Emsifa API Wilayah States
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedRegency, setSelectedRegency] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingRegencies, setLoadingRegencies] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pricingWarning, setPricingWarning] = useState(null);

  // Fallback classes listener if parent did not provide academyClasses
  const [classesList, setClassesList] = useState(academyClasses);

  // Helper to normalize sport names for case & whitespace insensitive matching
  const normalizeSport = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Auto-fill SPP and Registration fee from Master Data based on selected sportCategory
  useEffect(() => {
    if (!isOpen) return;

    const activePricingMap = academyPricing || {};

    if (sportCategory) {
      let match = activePricingMap[sportCategory];

      if (!match && Object.keys(activePricingMap).length > 0) {
        const normTarget = normalizeSport(sportCategory);
        const matchedKey = Object.keys(activePricingMap).find(
          (key) => normalizeSport(key) === normTarget
        );
        if (matchedKey) {
          match = activePricingMap[matchedKey];
        }
      }

      if (match) {
        if (!studentToEdit || sportCategory !== studentToEdit.sportCategory) {
          setMonthlyFee(String(match.spp ?? 0));
          setRegistrationFee(String(match.registration ?? 0));
        }
        setPricingWarning(null);
      } else {
        if (!studentToEdit || sportCategory !== studentToEdit.sportCategory) {
          setMonthlyFee('0');
          setRegistrationFee('0');
        }
        setPricingWarning(`Tarif Master Data untuk cabang "${sportCategory}" belum diatur di Pengaturan. Biaya disetel ke Rp 0.`);
      }
    }
  }, [sportCategory, academyPricing, isOpen, studentToEdit]);

  useEffect(() => {
    if (academyClasses && academyClasses.length > 0) {
      setClassesList(academyClasses);
    } else if (tenantId && isOpen) {
      const q = query(collection(db, 'academy_classes'), where('tenantId', '==', tenantId));
      const unsub = onSnapshot(q, (snap) => {
        setClassesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [academyClasses, tenantId, isOpen]);

  // Pre-fill form if editing
  useEffect(() => {
    if (studentToEdit && isOpen) {
      setStudentName(studentToEdit.studentName || '');
      setBirthDate(studentToEdit.birthDate || '');
      setNikKk(studentToEdit.nikKk || '');
      setSchoolOrigin(studentToEdit.schoolOrigin || '');
      setParentName(studentToEdit.parentName || '');
      setParentPhone(studentToEdit.parentPhone || '');
      setSportCategory(studentToEdit.sportCategory || uniqueSports[0] || 'Badminton');
      setStudentClassId(studentToEdit.classId || '');
      setJoinDate(studentToEdit.joinDate || new Date().toISOString().split('T')[0]);
      setMonthlyFee(studentToEdit.monthlyFee ? String(studentToEdit.monthlyFee) : '');
      setRegistrationFee(studentToEdit.registrationFee ? String(studentToEdit.registrationFee) : '');
      setAddressDetail(studentToEdit.addressDetail || '');
      setSelectedProvince(studentToEdit.province ? { name: studentToEdit.province } : null);
      setSelectedRegency(studentToEdit.regency ? { name: studentToEdit.regency } : null);
      setSelectedDistrict(studentToEdit.district ? { name: studentToEdit.district } : null);
      setSelectedVillage(studentToEdit.village ? { name: studentToEdit.village } : null);
    } else if (!studentToEdit && isOpen) {
      // Reset form
      setStudentName('');
      setBirthDate('');
      setNikKk('');
      setSchoolOrigin('');
      setParentName('');
      setParentPhone('');
      setSportCategory(uniqueSports[0] || 'Badminton');
      setStudentClassId('');
      setJoinDate(new Date().toISOString().split('T')[0]);
      setAddressDetail('');
      setSelectedProvince(null);
      setSelectedRegency(null);
      setSelectedDistrict(null);
      setSelectedVillage(null);
      setErrorMsg(null);
    }
  }, [studentToEdit, isOpen, uniqueSports]);

  // Fetch Provinces from Emsifa API
  useEffect(() => {
    if (isOpen && provinces.length === 0) {
      async function fetchProvinces() {
        setLoadingProvinces(true);
        try {
          const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
          if (!res.ok) throw new Error('Gagal memuat data provinsi');
          const data = await res.json();
          setProvinces(data || []);
        } catch (err) {
          console.error('Emsifa Provinces Fetch Error:', err);
          setProvinces([]);
        } finally {
          setLoadingProvinces(false);
        }
      }
      fetchProvinces();
    }
  }, [isOpen, provinces.length]);

  // Emsifa Handlers
  const handleProvinceChange = async (e) => {
    const provId = e.target.value;
    if (!provId) {
      setSelectedProvince(null);
      setRegencies([]);
      setSelectedRegency(null);
      setDistricts([]);
      setSelectedDistrict(null);
      setVillages([]);
      setSelectedVillage(null);
      return;
    }

    const foundProv = provinces.find((p) => p.id === provId);
    setSelectedProvince(foundProv ? { id: foundProv.id, name: foundProv.name } : null);
    setRegencies([]);
    setSelectedRegency(null);
    setDistricts([]);
    setSelectedDistrict(null);
    setVillages([]);
    setSelectedVillage(null);

    setLoadingRegencies(true);
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`);
      if (!res.ok) throw new Error('Gagal memuat data kota/kabupaten');
      const data = await res.json();
      setRegencies(data || []);
    } catch (err) {
      console.error('Emsifa Regencies Fetch Error:', err);
      setRegencies([]);
    } finally {
      setLoadingRegencies(false);
    }
  };

  const handleRegencyChange = async (e) => {
    const regId = e.target.value;
    if (!regId) {
      setSelectedRegency(null);
      setDistricts([]);
      setSelectedDistrict(null);
      setVillages([]);
      setSelectedVillage(null);
      return;
    }

    const foundReg = regencies.find((r) => r.id === regId);
    setSelectedRegency(foundReg ? { id: foundReg.id, name: foundReg.name } : null);
    setDistricts([]);
    setSelectedDistrict(null);
    setVillages([]);
    setSelectedVillage(null);

    setLoadingDistricts(true);
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regId}.json`);
      if (!res.ok) throw new Error('Gagal memuat data kecamatan');
      const data = await res.json();
      setDistricts(data || []);
    } catch (err) {
      console.error('Emsifa Districts Fetch Error:', err);
      setDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const handleDistrictChange = async (e) => {
    const distId = e.target.value;
    if (!distId) {
      setSelectedDistrict(null);
      setVillages([]);
      setSelectedVillage(null);
      return;
    }

    const foundDist = districts.find((d) => d.id === distId);
    setSelectedDistrict(foundDist ? { id: foundDist.id, name: foundDist.name } : null);
    setVillages([]);
    setSelectedVillage(null);

    setLoadingVillages(true);
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${distId}.json`);
      if (!res.ok) throw new Error('Gagal memuat data kelurahan');
      const data = await res.json();
      setVillages(data || []);
    } catch (err) {
      console.error('Emsifa Villages Fetch Error:', err);
      setVillages([]);
    } finally {
      setLoadingVillages(false);
    }
  };

  const handleVillageChange = (e) => {
    const vilId = e.target.value;
    if (!vilId) {
      setSelectedVillage(null);
      return;
    }
    const foundVil = villages.find((v) => v.id === vilId);
    setSelectedVillage(foundVil ? { id: foundVil.id, name: foundVil.name } : null);
  };

  const handleClassSelectionChange = (classId) => {
    setStudentClassId(classId);
    if (classId) {
      const selected = classesList.find((c) => c.id === classId);
      if (selected?.sport) {
        setSportCategory(selected.sport);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!studentName.trim() || !tenantId) {
      setErrorMsg('Nama lengkap siswa wajib diisi.');
      return;
    }

    if (!birthDate) {
      setErrorMsg('Tanggal lahir siswa wajib diisi.');
      return;
    }

    setIsSaving(true);

    try {
      const selectedClassObj = classesList.find((c) => c.id === studentClassId);

      const payload = {
        tenantId,
        academyId: activeAcademy?.id || activeAcademyId || studentToEdit?.academyId || '',
        academyName: activeAcademy?.name || studentToEdit?.academyName || '',
        studentName: studentName.trim(),
        birthDate,
        nikKk: nikKk.trim(),
        schoolOrigin: schoolOrigin.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        sportCategory: sportCategory || (selectedClassObj?.sport || uniqueSports[0] || 'Umum'),
        classId: studentClassId || '',
        className: selectedClassObj?.className || '',
        coachName: selectedClassObj?.coachName || '',
        joinDate,
        monthlyFee: parseFloat(monthlyFee) || 0,
        registrationFee: registrationFee === '' ? 0 : Number(registrationFee),
        province: selectedProvince?.name || studentToEdit?.province || '',
        regency: selectedRegency?.name || studentToEdit?.regency || '',
        district: selectedDistrict?.name || studentToEdit?.district || '',
        village: selectedVillage?.name || studentToEdit?.village || '',
        addressDetail: addressDetail.trim(),
      };

      if (isEditing) {
        const studentRef = doc(db, 'students', studentToEdit.id);
        await updateDoc(studentRef, {
          ...payload,
          updatedAt: serverTimestamp()
        });
        if (onSuccess) {
          onSuccess({ id: studentToEdit.id, ...payload });
        }
      } else {
        const docRef = await addDoc(collection(db, 'students'), {
          ...payload,
          sppStatus: 'Belum Lunas',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        if (onSuccess) {
          onSuccess({ id: docRef.id, ...payload });
        }
      }

      onClose();
    } catch (err) {
      console.error('Error saving student:', err);
      handleFirestoreError(err, isEditing ? 'update' : 'create', 'students');
      setErrorMsg(`Gagal ${isEditing ? 'mengupdate' : 'mendaftarkan'} siswa. Silakan coba lagi.`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentSelectedClass = classesList.find((c) => c.id === studentClassId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-[#333333] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white shrink-0">
          <div>
            <h3 className="font-bold text-base text-[#333333]">
              {isEditing ? 'Edit Data & Kelas Siswa' : 'Pendaftaran Siswa Akademi Baru'}
            </h3>
            <p className="text-xs text-gray-500">
              {isEditing 
                ? 'Perbarui identitas, penetapan kelas/pelatih, & informasi siswa' 
                : 'Lengkapi identitas siswa, wali murid, kelompok latihan, & alamat administratif Emsifa'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 text-gray-400 hover:text-black cursor-pointer rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {pricingWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{pricingWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
            {/* KOLOM KIRI: DATA DIRI SISWA */}
            <div className="space-y-3.5">
              <div className="border-b border-gray-100 pb-2">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Data Diri &amp; Identitas Siswa</span>
                </h4>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nama Lengkap Siswa <span className="text-blue-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Nama calon siswa"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Tanggal Lahir Siswa <span className="text-blue-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  No. Induk Kependudukan (NIK) / No. KK
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={nikKk}
                    onChange={(e) => setNikKk(e.target.value)}
                    placeholder="16 digit NIK atau Nomor Kartu Keluarga"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Asal Sekolah
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={schoolOrigin}
                    onChange={(e) => setSchoolOrigin(e.target.value)}
                    placeholder="misal: SD Negeri 01 / SMP Nusantara"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Dokumen Lampiran (KK / Akta)
                </label>
                <button
                  type="button"
                  onClick={() => alert('Fitur Upload Berkas KK akan tersedia pada Fase Cloud Storage.')}
                  className="w-full py-2.5 px-3 border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50/50 hover:bg-blue-50/20 text-gray-600 hover:text-blue-600 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Berkas KK (Fase Storage)</span>
                </button>
              </div>
            </div>

            {/* KOLOM KANAN: KONTAK, KELAS RELASIONAL & ALAMAT */}
            <div className="space-y-3.5">
              <div className="border-b border-gray-100 pb-2">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center space-x-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Kontak, Kelas &amp; Cabang Akademi</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Nama Wali / Ortu
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Nama wali murid"
                    className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    WhatsApp Ortu
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* DROPDOWN RELASI KELAS (Relational Academy Link) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Pilih Kelas / Kelompok Latihan
                </label>
                <select
                  value={studentClassId}
                  onChange={(e) => handleClassSelectionChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
                >
                  <option value="">-- Pilih Kelas / Kelompok Latihan (Opsional) --</option>
                  {classesList.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.className} ({cls.sport || 'Umum'}) - Pelatih: {cls.coachName || '-'}
                    </option>
                  ))}
                </select>
                {currentSelectedClass && (
                  <div className="mt-1 px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-800 flex items-center justify-between">
                    <span>Pelatih Utama: <strong>{currentSelectedClass.coachName || '-'}</strong></span>
                    <span>Jadwal: <strong>{currentSelectedClass.schedule || '-'}</strong></span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Cabang Olahraga <span className="text-blue-600">*</span>
                  </label>
                  <select
                    value={sportCategory}
                    onChange={(e) => setSportCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
                  >
                    {uniqueSports.length === 0 ? (
                      <option value="">Belum ada lapangan terdaftar</option>
                    ) : (
                      uniqueSports.map((sport) => (
                        <option key={sport} value={sport}>
                          {sport}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Tgl Bergabung <span className="text-blue-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Tarif SPP Bulanan (Rp) <span className="text-blue-600">*</span>
                  </label>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-md flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3" /> Master Data
                  </span>
                </div>
                <div className="relative">
                  <span className="text-xs font-bold text-gray-400 absolute left-3 top-2.5">Rp</span>
                  <input
                    type="text"
                    readOnly
                    value={Number(monthlyFee || 0).toLocaleString('id-ID')}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-100 border border-gray-200 rounded-xl font-bold text-blue-700 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Otomatis dari Master Data Tarif cabang {sportCategory}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Biaya Pendaftaran / Uang Pangkal (Rp)
                  </label>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded-md flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3" /> Master Data
                  </span>
                </div>
                <div className="relative">
                  <span className="text-xs font-bold text-gray-400 absolute left-3 top-2.5">Rp</span>
                  <input
                    type="text"
                    readOnly
                    value={Number(registrationFee || 0).toLocaleString('id-ID')}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-100 border border-gray-200 rounded-xl font-bold text-slate-800 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Otomatis dari Master Data Tarif cabang {sportCategory}</p>
              </div>

              {/* Wilayah Tempat Tinggal (Emsifa API) */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-700 uppercase flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Wilayah Tempat Tinggal (Emsifa API)</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <select
                      value={selectedProvince?.id || ''}
                      onChange={handleProvinceChange}
                      disabled={loadingProvinces}
                      className="w-full px-2.5 py-2 text-[11px] bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">
                        {selectedProvince?.name ? selectedProvince.name : (loadingProvinces ? 'Memuat Provinsi...' : '-- Pilih Provinsi --')}
                      </option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={selectedRegency?.id || ''}
                      onChange={handleRegencyChange}
                      disabled={!selectedProvince?.id || loadingRegencies}
                      className="w-full px-2.5 py-2 text-[11px] bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">
                        {selectedRegency?.name ? selectedRegency.name : (loadingRegencies ? 'Memuat Kab/Kota...' : '-- Pilih Kota/Kab --')}
                      </option>
                      {regencies.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <select
                      value={selectedDistrict?.id || ''}
                      onChange={handleDistrictChange}
                      disabled={!selectedRegency?.id || loadingDistricts}
                      className="w-full px-2.5 py-2 text-[11px] bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">
                        {selectedDistrict?.name ? selectedDistrict.name : (loadingDistricts ? 'Memuat Kecamatan...' : '-- Pilih Kecamatan --')}
                      </option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={selectedVillage?.id || ''}
                      onChange={handleVillageChange}
                      disabled={!selectedDistrict?.id || loadingVillages}
                      className="w-full px-2.5 py-2 text-[11px] bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">
                        {selectedVillage?.name ? selectedVillage.name : (loadingVillages ? 'Memuat Kelurahan...' : '-- Pilih Kelurahan --')}
                      </option>
                      {villages.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="Alamat jalan, nomor rumah, RT/RW..."
                    className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-black cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? 'Simpan Perubahan Siswa' : 'Daftarkan Siswa'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
