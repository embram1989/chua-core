import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { calculateAge } from '../utils/helpers';
import useArenaData from '../hooks/useArenaData';

import SppPaymentModal from '../components/SppPaymentModal';
import GlobalReceiptModal from '../components/GlobalReceiptModal';
import StudentDetailModal from '../components/StudentDetailModal';
import StudentRegistrationModal from '../components/StudentRegistrationModal';
import CoachModal from '../components/CoachModal';
import ClassModal from '../components/ClassModal';
import CreateAcademyModal from '../components/CreateAcademyModal';
import GenerateAcademyScheduleModal from '../components/GenerateAcademyScheduleModal';
import AttendanceSection from '../components/AttendanceSection';
import EvaluationSection from '../components/EvaluationSection';
import GrowthTrackerSection from '../components/GrowthTrackerSection';
import AcademyDashboard from '../components/AcademyDashboard';
// import { Dashboard3DIcon, Akademi3DIcon } from '../components/icons/App3DIcons';
import { 
  GraduationCap, 
  UserPlus, 
  CheckCircle2, 
  X, 
  Phone, 
  User, 
  FileText, 
  MapPin, 
  Upload, 
  School, 
  Eye, 
  TrendingUp,

  CreditCard, 
  Calendar,
  Trophy,
  Users,
  Award,
  BookOpen,
  MessageCircle,
  LayoutDashboard,
  ClipboardCheck,
  Plus,
  Inbox,
  Sparkles,
  Lock,
  Edit3,
  ChevronDown,
  ChevronUp,
  Building2,
  Clock
} from 'lucide-react';
import { Dashboard3DIcon, Akademi3DIcon, Booking3DIcon, Kasir3DIcon, Event3DIcon, Keuangan3DIcon, AIInsight3DIcon, Pengaturan3DIcon } from '../components/icons/App3DIcons';

// SPORT CATEGORY OPTIONS DICTIONARY FOR MULTI-ACADEMY WORKSPACE (Enterprise Fase 11 Part 1)
export const sportCategoryOptions = [
  { id: 'racket', label: 'Racket Sports', sports: ['Badminton', 'Tenis', 'Padel', 'Squash', 'Tenis Meja'] },
  { id: 'field', label: 'Field & Team Sports', sports: ['SepakBola', 'Futsal', 'Minisoccer'] },
  { id: 'court', label: 'Court Team Sports', sports: ['BolaBasket 5v5', 'BolaBasket 3v3'] },
  { id: 'net', label: 'Net Team Sports', sports: ['Bola Voli indoor', 'Bola Voli pasir', 'Sepak Takraw'] }
];

/**
 * Utility to calculate SPP Arrears status based on Billing Cycle & Due Date
 */
export function calculateSppStatus(student, sppBillingStartDay = 1, sppDueDay = 10) {
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7); // Format "YYYY-MM"
  const currentDay = today.getDate();

  const startDay = Number(sppBillingStartDay) || 1;
  const dueDay = Number(sppDueDay) || 10;

  // a. Siswa sudah lunas untuk bulan ini
  if (student?.lastPaidMonth === currentMonth) {
    return {
      isPaid: true,
      statusText: 'LUNAS BULAN INI',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold',
      daysOverdue: 0
    };
  }

  // b. Siswa belum lunas untuk bulan ini
  if (currentDay >= startDay) {
    if (currentDay > dueDay) {
      const daysOverdue = currentDay - dueDay;
      return {
        isPaid: false,
        statusText: `MENUNGGAK ${daysOverdue} HARI`,
        badgeClass: 'bg-red-100 text-red-800 border border-red-200 font-black animate-pulse',
        daysOverdue
      };
    } else {
      return {
        isPaid: false,
        statusText: 'BELUM DIBAYAR',
        badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200 font-extrabold',
        daysOverdue: 0
      };
    }
  } else {
    // Belum masuk masa penagihan bulan ini
    return {
      isPaid: false,
      statusText: 'BELUM DIBAYAR',
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200 font-extrabold',
      daysOverdue: 0
    };
  }
}

/**
 * Helper formatter nomor WhatsApp internasional (+628...)
 */
export const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  let formatted = phone.replace(/\D/g, ''); // Hapus karakter non-angka
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1);
  }
  return formatted;
};

/**
 * Utility to format WhatsApp Web Direct Link
 */
export function formatWhatsAppUrl(phone, studentName, arenaName) {
  if (!phone) return '#';
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }
  const msg = `Halo Bapak/Ibu Wali dari ${studentName}, ini dari admin ${arenaName || 'Akademi'}.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

export default function AcademyPage({ userProfile }) {
  const tenantId = userProfile?.tenant?.id || userProfile?.tenantId || userProfile?.uid;

  // Real-Time Arena Data
  const { tenantProfile, courts } = useArenaData(userProfile);
  const arenaName = tenantProfile?.name || 'Sports Arena';
  const sppBillingStartDay = tenantProfile?.sppBillingStartDay ?? 1;
  const sppDueDay = tenantProfile?.sppDueDay ?? 10;

  // Dynamic Unique Sports list from Courts
  const uniqueSports = Array.from(
    new Set(courts.map((c) => c.sport).filter(Boolean))
  );

  // Multi-Academy Workspace States (Enterprise Fase 11 Part 1)
  const [academies, setAcademies] = useState([]);
  const [activeAcademyId, setActiveAcademyId] = useState(() => {
    return localStorage.getItem('activeAcademyId') || '';
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingAcademies, setLoadingAcademies] = useState(true);

  // Form States for Create Academy Modal
  const [newAcademyName, setNewAcademyName] = useState('');
  const [newAcademyCategory, setNewAcademyCategory] = useState('racket');
  const [newAcademySport, setNewAcademySport] = useState('Badminton');
  const [newAcademyDescription, setNewAcademyDescription] = useState('');
  const [isSavingAcademy, setIsSavingAcademy] = useState(false);

  // Active Internal Tab: 'dasbor' | 'siswa' | 'pelatih' | 'kelas' | 'presensi'
  const [activeAcademyTab, setActiveAcademyTab] = useState('siswa');

  // Smart Collapsible Card State for Student List
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  // Attendance & Evaluation State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendanceSubTab, setAttendanceSubTab] = useState('presensi'); // 'presensi' | 'evaluasi'

  // Real-Time States from Firestore
  const [students, setStudents] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [academyClasses, setAcademyClasses] = useState([]);

  // 1. Tentukan Active Academy terlebih dahulu
  const activeAcademy = academies.find((a) => a.id === activeAcademyId) || (academies.length > 0 ? academies[0] : null);

  // Dynamic Isolated Sports list for active academy category (Enterprise Fase 11 Part 1)
  const activeAcademyCategoryObj = sportCategoryOptions.find(
    (cat) => cat.id === activeAcademy?.category || cat.id === activeAcademy?.sportCategory
  );
  const activeAcademySports = activeAcademyCategoryObj?.sports || (activeAcademy?.sport ? [activeAcademy.sport] : uniqueSports);

  // 2. STRICT ISOLATION: Hanya ambil data yang academyId-nya persis sama dengan activeAcademy.id
  // Jika activeAcademy belum ada/kosong, kembalikan array kosong ([])
  const activeStudents = activeAcademy ? students.filter((s) => s.academyId === activeAcademy.id) : [];
  const activeCoaches = activeAcademy ? coaches.filter((c) => c.academyId === activeAcademy.id) : [];
  const activeClasses = activeAcademy ? academyClasses.filter((c) => c.academyId === activeAcademy.id) : [];

  const filteredStudents = activeStudents;
  const filteredCoaches = activeCoaches;
  const filteredClasses = activeClasses;

  // Auto-reset / default selectedClassId when switching active workspace academy
  useEffect(() => {
    if (activeClasses.length > 0) {
      const isValidInCurrentAcademy = activeClasses.some((c) => c.id === selectedClassId);
      if (!isValidInCurrentAcademy) {
        setSelectedClassId(activeClasses[0].id);
      }
    } else {
      setSelectedClassId('');
    }
  }, [activeAcademyId, activeClasses, selectedClassId]);

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false); // Student Modal
  const [showCoachModal, setShowCoachModal] = useState(false); // Coach Modal
  const [showClassModal, setShowClassModal] = useState(false); // Class Modal
  const [generateModalClass, setGenerateModalClass] = useState(null); // Generate Schedule Modal

  const [paymentModalStudent, setPaymentModalStudent] = useState(null);
  const [sppReceiptData, setSppReceiptData] = useState(null);
  const [detailModalStudent, setDetailModalStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  // Student Form States
  const [studentName, setStudentName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nikKk, setNikKk] = useState('');
  const [schoolOrigin, setSchoolOrigin] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentClassId, setStudentClassId] = useState('');
  const [sportCategory, setSportCategory] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthlyFee, setMonthlyFee] = useState('350000');

  // Emsifa Location States
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedRegency, setSelectedRegency] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [addressDetail, setAddressDetail] = useState('');

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingRegencies, setLoadingRegencies] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  const [savingStudent, setSavingStudent] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // 0. Listen to Real-Time Academies Collection (Multi-Academy Workspace)
  useEffect(() => {
    if (!tenantId) {
      setLoadingAcademies(false);
      return;
    }

    setLoadingAcademies(true);
    const academiesRef = collection(db, 'academies');
    const q = query(academiesRef, where('tenantId', '==', tenantId));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setAcademies(list);
        setLoadingAcademies(false);

        if (list.length > 0) {
          const storedId = localStorage.getItem('activeAcademyId');
          const found = list.find((a) => a.id === storedId);
          if (found) {
            setActiveAcademyId(found.id);
          } else {
            setActiveAcademyId(list[0].id);
            localStorage.setItem('activeAcademyId', list[0].id);
          }
        } else {
          setActiveAcademyId('');
        }
      },
      (error) => {
        console.error('Error fetching academies:', error);
        handleFirestoreError(error, 'list', 'academies');
        setAcademies([]);
        setLoadingAcademies(false);
      }
    );

    return () => unsub();
  }, [tenantId]);

  // Keep newAcademySport synced with newAcademyCategory
  useEffect(() => {
    const catObj = sportCategoryOptions.find((c) => c.id === newAcademyCategory);
    if (catObj && catObj.sports.length > 0) {
      if (!catObj.sports.includes(newAcademySport)) {
        setNewAcademySport(catObj.sports[0]);
      }
    }
  }, [newAcademyCategory]);

  // Create New Academy Handler
  const handleCreateAcademy = async (e) => {
    e.preventDefault();
    if (!newAcademyName.trim() || !tenantId) return;

    setIsSavingAcademy(true);
    setErrorMsg(null);
    try {
      const catObj = sportCategoryOptions.find((c) => c.id === newAcademyCategory);
      const docRef = await addDoc(collection(db, 'academies'), {
        tenantId,
        name: newAcademyName.trim(),
        category: newAcademyCategory,
        categoryLabel: catObj?.label || 'Sports',
        sportCategory: newAcademyCategory,
        sport: newAcademySport,
        description: newAcademyDescription.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const newId = docRef.id;
      setActiveAcademyId(newId);
      localStorage.setItem('activeAcademyId', newId);
      setShowCreateModal(false);
      setNewAcademyName('');
      setNewAcademyDescription('');
      setSuccessMsg(`Akademi "${newAcademyName.trim()}" berhasil dibuat! Workspace aktif kini diperbarui.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Error creating academy:', err);
      handleFirestoreError(err, 'create', 'academies');
      setErrorMsg('Gagal membuat akademi baru. Silakan coba lagi.');
    } finally {
      setIsSavingAcademy(false);
    }
  };

  // Sync sportCategory default value with uniqueSports
  useEffect(() => {
    if (uniqueSports.length > 0 && (!sportCategory || !uniqueSports.includes(sportCategory))) {
      setSportCategory(uniqueSports[0]);
    }
  }, [uniqueSports, sportCategory]);

  // 1. Listen to Real-time Students Collection
  useEffect(() => {
    if (!tenantId) {
      setLoadingStudents(false);
      return;
    }

    setLoadingStudents(true);
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('tenantId', '==', tenantId));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStudents(list);
        setLoadingStudents(false);
      },
      (error) => {
        console.error('Error in students snapshot:', error);
        handleFirestoreError(error, 'list', 'students');
        setStudents([]);
        setLoadingStudents(false);
      }
    );

    return () => unsub();
  }, [tenantId]);

  // 2. Listen to Real-time Coaches Collection
  useEffect(() => {
    if (!tenantId) {
      setLoadingCoaches(false);
      return;
    }

    setLoadingCoaches(true);
    const coachesRef = collection(db, 'coaches');
    const q = query(coachesRef, where('tenantId', '==', tenantId));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCoaches(list);
        setLoadingCoaches(false);
      },
      (error) => {
        console.error('Error in coaches snapshot:', error);
        handleFirestoreError(error, 'list', 'coaches');
        setCoaches([]);
        setLoadingCoaches(false);
      }
    );

    return () => unsub();
  }, [tenantId]);

  // 3. Listen to Real-time Academy Classes Collection
  useEffect(() => {
    if (!tenantId) {
      setLoadingClasses(false);
      return;
    }

    setLoadingClasses(true);
    const classesRef = collection(db, 'academy_classes');
    const q = query(classesRef, where('tenantId', '==', tenantId));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAcademyClasses(list);
        setLoadingClasses(false);
      },
      (error) => {
        console.error('Error in academy_classes snapshot:', error);
        handleFirestoreError(error, 'list', 'academy_classes');
        setAcademyClasses([]);
        setLoadingClasses(false);
      }
    );

    return () => unsub();
  }, [tenantId]);

  // Fetch Provinces from Emsifa API when Student Modal opens
  useEffect(() => {
    if (showAddModal && provinces.length === 0) {
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
  }, [showAddModal, provinces.length]);

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

  const resetFormState = () => {
    setStudentName('');
    setBirthDate('');
    setNikKk('');
    setSchoolOrigin('');
    setParentName('');
    setParentPhone('');
    setStudentClassId('');
    setSelectedProvince(null);
    setSelectedRegency(null);
    setSelectedDistrict(null);
    setSelectedVillage(null);
    setAddressDetail('');
    setErrorMsg(null);
  };

  const handleStudentClassChange = (classId) => {
    setStudentClassId(classId);
    if (classId) {
      const selected = academyClasses.find((c) => c.id === classId);
      if (selected?.sport) {
        setSportCategory(selected.sport);
      }
    }
  };

  // Add New Student Handler
  const handleCreateStudent = async (e) => {
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

    setSavingStudent(true);
    setSuccessMsg(null);

    try {
      const selectedClassObj = academyClasses.find((c) => c.id === studentClassId);

      await addDoc(collection(db, 'students'), {
        tenantId,
        academyId: activeAcademy?.id || '',
        academyName: activeAcademy?.name || '',
        studentName: studentName.trim(),
        birthDate: birthDate,
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
        province: selectedProvince?.name || '',
        regency: selectedRegency?.name || '',
        district: selectedDistrict?.name || '',
        village: selectedVillage?.name || '',
        addressDetail: addressDetail.trim(),
        sppStatus: 'Belum Lunas',
        createdAt: serverTimestamp()
      });

      setShowAddModal(false);
      resetFormState();
      setSuccessMsg('Siswa baru berhasil didaftarkan ke akademi!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error adding student:', err);
      handleFirestoreError(err, 'create', 'students');
      setErrorMsg('Gagal mendaftarkan siswa. Silakan coba lagi.');
    } finally {
      setSavingStudent(false);
    }
  };

  // Otomatisasi Penagihan SPP via WhatsApp (Enterprise Fase 11 Part 5)
  const handleSendWABilling = (student, academyName) => {
    const phone = formatWhatsAppNumber(student?.parentPhone || student?.phone);
    if (!phone) {
      if (typeof alert !== 'undefined') {
        alert('Nomor telepon tidak tersedia untuk siswa ini.');
      }
      return;
    }

    // Format mata uang
    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
    const fee = formatter.format(student?.monthlyFee || student?.tuitionFee || 0);
    const targetAcademy = academyName || activeAcademy?.name || arenaName || 'Chua Sport Academy';
    const studentName = student?.studentName || student?.name || 'Siswa';

    // Rincian rekening pembayaran dari profil GOR/Tenant
    let rekeningText = 'BCA: 123456789 a.n CHUA SPORT';
    if (tenantProfile?.bankAccounts && tenantProfile.bankAccounts.length > 0) {
      const primaryBank = tenantProfile.bankAccounts[0];
      if (primaryBank.bankName && primaryBank.accountNumber) {
        rekeningText = `${primaryBank.bankName}: ${primaryBank.accountNumber} a.n ${primaryBank.accountName || targetAcademy}`;
      }
    } else if (tenantProfile?.bankAccountNumber) {
      rekeningText = `${tenantProfile.bankName || 'Bank'}: ${tenantProfile.bankAccountNumber} a.n ${tenantProfile.bankAccountName || targetAcademy}`;
    }

    // Template Pesan Penagihan
    const message = `Halo Kak,\nKami dari admin *${targetAcademy}* menginformasikan bahwa terdapat tagihan SPP untuk bulan ini atas nama siswa *${studentName}* senilai *${fee}* yang belum diselesaikan.\n\nPembayaran dapat dilakukan melalui kasir GOR atau transfer ke rekening:\n${rekeningText}\n\nMohon konfirmasi jika sudah melakukan pembayaran dengan melampirkan bukti transfer. Terima kasih banyak! 🙏`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* ==================================================== */}
      {/* 1. UI WORKSPACE SELECTOR & HEADER (JIKA SUDAH ADA AKADEMI) */}
      {/* ==================================================== */}
      {academies.length > 0 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Info Workspace Aktif */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0 border border-blue-400/30">
                {activeAcademy?.name ? activeAcademy.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-md border border-blue-200/80 uppercase tracking-wider">
                    Workspace Aktif
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md">
                    {activeAcademy?.sport || 'General Sports'}
                  </span>
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                  {activeAcademy?.name || 'Akademi Olahraga'}
                </h1>
              </div>
            </div>

            {/* Switcher & Secondary Action */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Dropdown Selector */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-slate-50 to-blue-50/50 px-3 py-2 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Akademi Aktif</span>
                  <select
                    value={activeAcademyId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setActiveAcademyId(id);
                      localStorage.setItem('activeAcademyId', id);
                    }}
                    className="bg-transparent text-slate-900 text-xs font-black focus:outline-none cursor-pointer pr-2"
                  >
                    {academies.map((ac) => (
                      <option key={ac.id} value={ac.id}>
                        {ac.name} ({ac.sport || 'Umum'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Tombol Sekunder + Tambah Akademi */}
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>+ Tambah Akademi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. UI EMPTY STATE & ONBOARDING (JIKA BELUM ADA AKADEMI) */}
      {/* ==================================================== */}
      {academies.length === 0 && !loadingAcademies && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xl max-w-3xl mx-auto text-center space-y-8 animate-fadeIn my-6">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg border-2 border-white">
              <School className="w-12 h-12" />
            </div>
          </div>

          <div className="space-y-3 max-w-lg mx-auto">
            <span className="px-3.5 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded-full border border-blue-200 uppercase tracking-widest inline-block">
              EKOSISTEM SIMAK WORKSPACE
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              Mulai Perjalanan Akademi Anda
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              Sistem kami mendukung berbagai cabang olahraga. Bangun ruang akademi pertama Anda sekarang.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="font-extrabold text-xs text-slate-900">Multi-Cabang Olahraga</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Kelola akademi Futsal, Badminton, Basket, Voli, &amp; Tenis dalam 1 akun GOR.
              </p>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="font-extrabold text-xs text-slate-900">Manajemen Siswa &amp; SPP</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Sistem penagihan otomatis, pelacakan tunggakan, &amp; pesan WA wali siswa.
              </p>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="font-extrabold text-xs text-slate-900">Presensi &amp; Evaluasi</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Jadwal kelompok umur, absensi harian pelatih, dan rapor perkembangan atlet.
              </p>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <Plus className="w-5 h-5 text-cyan-300" />
              <span>+ Buat Akademi Baru Sekarang</span>
            </button>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. TAB OPERASIONAL & AKSI (HANYA MUNCUL JIKA ADA AKADEMI) */}
      {/* ==================================================== */}
      {academies.length > 0 && (
        <>
          {/* ROMBAK MENU TAB MENJADI DROPDOWN (KHUSUS MOBILE) & MOBILE ACTION BUTTON */}
          <div className="flex md:hidden items-center gap-2 mb-4">
            <select
              value={activeAcademyTab}
              onChange={(e) => setActiveAcademyTab(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-3 shadow-sm focus:ring-blue-500 font-medium text-xs font-bold cursor-pointer"
            >
              <option value="dasbor">Dasbor &amp; Laporan</option>
              <option value="siswa">Siswa &amp; SPP ({filteredStudents.length})</option>
              <option value="pelatih">Pelatih ({filteredCoaches.length})</option>
              <option value="kelas">Kelas &amp; Kelompok ({filteredClasses.length})</option>
              <option value="presensi">Presensi &amp; Evaluasi</option>
            </select>
            {activeAcademyTab === 'siswa' && (
              <button
                onClick={() => {
                  setEditingStudent(null);
                  setShowAddModal(true);
                }}
                className="px-3.5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Tambah Siswa Baru"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            )}
            {activeAcademyTab === 'pelatih' && (
              <button
                onClick={() => setShowCoachModal(true)}
                className="px-3.5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Tambah Pelatih"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            )}
            {activeAcademyTab === 'kelas' && (
              <button
                onClick={() => setShowClassModal(true)}
                className="px-3.5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Buat Kelas"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* HORIZONTAL TAB NAVIGATION MENU (PILLS - DESKTOP) & CONTEXTUAL ACTION BUTTON */}
          <div className="hidden md:flex items-center justify-between border-b border-slate-200 pb-2 gap-4">
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none">
            
            <button
              onClick={() => setActiveAcademyTab('dasbor')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeAcademyTab === 'dasbor'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Dashboard3DIcon className="w-5 h-5 shrink-0" />
              <span>Dasbor &amp; Laporan</span>
            </button>

            <button
              onClick={() => setActiveAcademyTab('siswa')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeAcademyTab === 'siswa'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Akademi3DIcon className="w-5 h-5 shrink-0" />
              <span>Siswa &amp; SPP ({filteredStudents.length})</span>
            </button>

            <button
              onClick={() => setActiveAcademyTab('pelatih')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeAcademyTab === 'pelatih'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Booking3DIcon className="w-5 h-5 shrink-0" />
              <span>Pelatih ({filteredCoaches.length})</span>
            </button>

            <button
              onClick={() => setActiveAcademyTab('kelas')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeAcademyTab === 'kelas'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Akademi3DIcon className="w-5 h-5 shrink-0" />
              <span>Kelas &amp; Kelompok ({filteredClasses.length})</span>
            </button>

            <button
              onClick={() => setActiveAcademyTab('presensi')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeAcademyTab === 'presensi'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <AIInsight3DIcon className="w-5 h-5 shrink-0" />
              <span>Presensi &amp; Evaluasi</span>
            </button>
            </div>
            <div className="shrink-0 pb-1">
              {activeAcademyTab === 'siswa' && (
                <button
                  onClick={() => {
                    setEditingStudent(null);
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Tambah Siswa Baru</span>
                </button>
              )}
              {activeAcademyTab === 'pelatih' && (
                <button
                  onClick={() => setShowCoachModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Tambah Pelatih</span>
                </button>
              )}
              {activeAcademyTab === 'kelas' && (
                <button
                  onClick={() => setShowClassModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Buat Kelas</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB AREA CONTENT RENDER */}

      {/* TAB 1: DASBOR & LAPORAN (BI & ANALYTICS) */}
      {activeAcademyTab === 'dasbor' && (
        <AcademyDashboard
          activeAcademy={activeAcademy}
          activeStudents={activeStudents}
          activeClasses={activeClasses}
          activeCoaches={activeCoaches}
          sppBillingStartDay={sppBillingStartDay}
          sppDueDay={sppDueDay}
          calculateSppStatus={calculateSppStatus}
          handleSendWABilling={handleSendWABilling}
          onAddStudent={() => setShowAddModal(true)}
          onAddClass={() => setShowClassModal(true)}
          onPaySpp={(st) => setPaymentModalStudent(st)}
          onViewStudentDetail={(st) => setDetailModalStudent(st)}
        />
      )}

      {/* TAB 2: SISWA & SPP */}
      {activeAcademyTab === 'siswa' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="font-bold text-sm sm:text-base text-slate-800 flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Daftar Siswa Terdaftar ({filteredStudents.length})</span>
            </h2>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Siklus Tagihan: <strong>Tgl {sppBillingStartDay}</strong> &bull; Jatuh Tempo: <strong>Tgl {sppDueDay}</strong></span>
            </div>
          </div>

          {loadingStudents ? (
            <div className="py-12 text-center text-xs text-gray-500 font-medium">Memuat data siswa akademi...</div>
          ) : filteredStudents.length === 0 ? (
            /* MANDATORY ZERO MOCK DATA EMPTY STATE UI */
            <div className="py-12 border-2 border-dashed border-gray-200 rounded-xl text-center flex flex-col items-center justify-center p-6">
              <GraduationCap className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-700">
                Belum ada siswa terdaftar di akademi {activeAcademy?.name || ''}. Tambahkan siswa baru.
              </p>
              <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4">
                Klik tombol "+ Tambah Siswa Baru" di atas untuk mendaftarkan siswa pertama akademi Anda.
              </p>
              <button
                onClick={() => {
                  setEditingStudent(null);
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
              >
                + Tambah Siswa Pertama
              </button>
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: SMART COLLAPSIBLE CARDS (ACCORDION) */}
              <div className="flex flex-col gap-3 md:hidden">
                {filteredStudents.map((st) => {
                  const isExpanded = expandedStudentId === st.id;
                  const sppInfo = calculateSppStatus(st, sppBillingStartDay, sppDueDay);
                  const waUrl = formatWhatsAppUrl(st.parentPhone, st.studentName, arenaName);

                  return (
                    <div
                      key={st.id}
                      className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition-all"
                    >
                      {/* HEADER (Selalu Tampil) */}
                      <div
                        onClick={() => setExpandedStudentId(isExpanded ? null : st.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex flex-col gap-1 min-w-0 pr-2">
                          <h3 className="font-bold text-sm text-slate-800 truncate flex items-center gap-1.5">
                            <span>{st.studentName}</span>
                            {calculateAge(st.birthDate) !== '-' && (
                              <span className="text-xs font-bold text-slate-500">
                                ({calculateAge(st.birthDate)} thn)
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold text-[9px] rounded-md uppercase">
                              {st.sportCategory || 'Badminton'}
                            </span>
                            {st.className && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-bold text-[9px] rounded-md">
                                {st.className}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className={`px-2 py-0.5 font-extrabold rounded-full text-[9px] uppercase ${sppInfo.badgeClass}`}>
                            {sppInfo.isPaid ? 'LUNAS' : 'MENUNGGAK'}
                          </span>
                          <div className="p-1 text-slate-400 bg-slate-50 rounded-lg">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* BODY/DETAIL (Hidden by Default) */}
                      {isExpanded && (
                        <div className="p-4 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-2 text-slate-600">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Orang Tua / Wali</p>
                              <p className="font-semibold text-slate-800">{st.parentName || '-'}</p>
                              <p className="text-[11px] text-slate-500">{st.parentPhone || '-'}</p>
                            </div>

                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">SPP Bulanan</p>
                              <p className="font-black text-slate-900">
                                Rp {Number(st.monthlyFee || 0).toLocaleString('id-ID')}
                              </p>
                              <span className={`inline-block mt-0.5 px-2 py-0.5 font-bold rounded-full text-[9px] uppercase ${sppInfo.badgeClass}`}>
                                {sppInfo.statusText}
                              </span>
                            </div>

                            {st.coachName && (
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Pelatih Utama</p>
                                <p className="font-medium text-slate-700">{st.coachName}</p>
                              </div>
                            )}

                            {st.birthDate && (
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Tgl Lahir / Usia</p>
                                <p className="font-medium text-slate-700">{st.birthDate} ({calculateAge(st.birthDate)} Thn)</p>
                              </div>
                            )}
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end gap-1.5 flex-wrap">
                            {(!sppInfo.isPaid || st.paymentStatus === 'menunggak') && (
                              <button 
                                type="button"
                                onClick={() => handleSendWABilling(st, activeAcademy?.name)}
                                className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-green-200 flex items-center space-x-1 shadow-2xs"
                                title="Kirim Tagihan SPP via WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                                <span>Tagih via WA</span>
                              </button>
                            )}

                            {sppInfo.isPaid && st.parentPhone && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-green-200 flex items-center space-x-1"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                                <span>WA Wali</span>
                              </a>
                            )}

                            {sppInfo.isPaid ? (
                              <div className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-lg flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Lunas</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPaymentModalStudent(st)}
                                className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center space-x-1"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Bayar SPP</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setDetailModalStudent(st)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingStudent(st);
                                setShowAddModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: TABEL SISWA */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-3">Siswa &amp; Demografi</th>
                      <th className="py-3 px-3">Cabang, Kelas &amp; Pelatih</th>
                      <th className="py-3 px-3">Orang Tua &amp; Kontak</th>
                      <th className="py-3 px-3">SPP Bulanan</th>
                      <th className="py-3 px-3">Status Tunggakan SPP</th>
                      <th className="py-3 px-3 text-right">Aksi &amp; Komunikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((st) => {
                      const sppInfo = calculateSppStatus(st, sppBillingStartDay, sppDueDay);
                      const waUrl = formatWhatsAppUrl(st.parentPhone, st.studentName, arenaName);

                      return (
                        <tr 
                          key={st.id} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          onClick={() => setDetailModalStudent(st)}
                        >
                          <td className="py-3.5 px-3">
                            <p className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-blue-600 flex items-center gap-1.5">
                              <span>{st.studentName}</span>
                              {calculateAge(st.birthDate) !== '-' && (
                                <span className="text-xs font-semibold text-slate-500">
                                  ({calculateAge(st.birthDate)} thn)
                                </span>
                              )}
                            </p>
                            {st.birthDate && (
                              <p className="text-[10px] text-slate-500 flex items-center space-x-1">
                                <span>Tgl Lahir: {st.birthDate} ({calculateAge(st.birthDate)} Thn)</span>
                              </p>
                            )}
                            {st.nikKk && (
                              <p className="text-[10px] text-slate-400 font-mono">NIK: {st.nikKk}</p>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex flex-wrap items-center gap-1 mb-1">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold text-[9px] rounded-md uppercase inline-block">
                                {st.sportCategory || 'Badminton'}
                              </span>
                              {st.className && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-bold text-[9px] rounded-md inline-block">
                                  {st.className}
                                </span>
                              )}
                            </div>
                            {st.coachName && (
                              <p className="text-[10px] text-gray-600 font-medium">
                                Pelatih: <strong className="text-[#333333]">{st.coachName}</strong>
                              </p>
                            )}
                            {st.schoolOrigin && (
                              <p className="text-[10px] text-gray-400 font-medium">{st.schoolOrigin}</p>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            <p className="font-semibold text-gray-700">{st.parentName || '-'}</p>
                            <p className="text-[10px] text-gray-400">{st.parentPhone || '-'}</p>
                          </td>

                          <td className="py-3.5 px-3 font-extrabold text-[#333333]">
                            Rp {Number(st.monthlyFee || 0).toLocaleString('id-ID')}
                          </td>

                          {/* STATUS TUNGGAKAN SPP */}
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-1 font-extrabold rounded-full text-[10px] uppercase inline-block ${sppInfo.badgeClass}`}>
                              {sppInfo.statusText}
                            </span>
                          </td>

                          {/* ACTION BUTTONS: BAYAR SPP, DETAIL & DIRECT WHATSAPP LINK */}
                          <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-1.5">
                              
                              {/* TAGIH VIA WA (JIKA BELUM LUNAS / MENUNGGAK) */}
                              {(!sppInfo.isPaid || st.paymentStatus === 'menunggak') && (
                                <button 
                                  type="button"
                                  onClick={() => handleSendWABilling(st, activeAcademy?.name)}
                                  className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-green-200 transition-colors cursor-pointer shrink-0 shadow-2xs"
                                  title="Kirim Tagihan SPP via WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-green-600"/>
                                  <span>Tagih via WA</span>
                                </button>
                              )}

                              {/* WHATSAPP DIRECT LINK ICON BUTTON (JIKA SUDAH LUNAS) */}
                              {sppInfo.isPaid && st.parentPhone ? (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Hubungi Wali Murid via WhatsApp"
                                  className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg transition-colors cursor-pointer border border-green-200 shrink-0 flex items-center space-x-1"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                                  <span className="text-[10px] font-bold hidden sm:inline">Hubungi Wali</span>
                                </a>
                              ) : null}

                              {sppInfo.isPaid ? (
                                <div 
                                  className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px] rounded-lg select-none flex items-center space-x-1"
                                  title="SPP bulan ini sudah lunas"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Lunas</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPaymentModalStudent(st)}
                                  className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center space-x-1"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Bayar SPP</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setDetailModalStudent(st)}
                                className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStudent(st);
                                  setShowAddModal(true);
                                }}
                                className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                                title="Edit Siswa / Pindah Kelas"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: PELATIH */}
      {activeAcademyTab === 'pelatih' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold text-sm sm:text-base text-slate-800 flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Tim Pelatih ({filteredCoaches.length})</span>
            </h2>

            <button
              onClick={() => setShowCoachModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Tambah Pelatih</span>
            </button>
          </div>

          {loadingCoaches ? (
            <p className="py-12 text-center text-xs text-slate-500">Memuat data pelatih...</p>
          ) : filteredCoaches.length === 0 ? (
            /* EMPTY STATE UNTUK TAB PELATIH */
            <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center flex flex-col items-center justify-center p-6">
              <User className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">Belum ada pelatih terdaftar di akademi ini.</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                Daftarkan instruktur &amp; pelatih utama untuk memimpin kelas latihan {activeAcademy?.name || 'akademi Anda'}.
              </p>
              <button
                onClick={() => setShowCoachModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
              >
                + Tambah Pelatih Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCoaches.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-500 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold text-[9px] rounded-md uppercase">
                      {c.sportSpecialty || 'Badminton'}
                    </span>
                    {c.license && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-bold text-[9px] rounded-md">
                        {c.license}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{c.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                      <Phone className="w-3 h-3 text-green-600 shrink-0" />
                      <span>{c.phone || 'Tidak ada nomor WhatsApp'}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: KELAS & KELOMPOK */}
      {activeAcademyTab === 'kelas' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold text-sm sm:text-base text-slate-800 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Daftar Kelas &amp; Kelompok Latihan ({filteredClasses.length})</span>
            </h2>

            <button
              onClick={() => setShowClassModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Buat Kelas</span>
            </button>
          </div>

          {loadingClasses ? (
            <p className="py-12 text-center text-xs text-slate-500">Memuat daftar kelas...</p>
          ) : filteredClasses.length === 0 ? (
            /* EMPTY STATE UNTUK TAB KELAS */
            <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center flex flex-col items-center justify-center p-6">
              <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">Belum ada kelas/kelompok latihan.</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                Buat kelas latihan berdasarkan kelompok umur &amp; alokasikan pelatih utama.
              </p>
              <button
                onClick={() => setShowClassModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
              >
                + Buat Kelas Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map((cls) => (
                <div key={cls.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-500 transition-all space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold text-[9px] rounded-md uppercase">
                      {cls.sport || 'Sports'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Aktif</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{cls.className}</h4>
                    <p className="text-xs text-slate-600 font-semibold mt-0.5">
                      Pelatih: <strong className="text-slate-800">{cls.coachName || 'Utama'}</strong>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Jadwal: <strong>{cls.schedule || '-'}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGenerateModalClass(cls)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center space-x-1 border border-blue-200 shrink-0"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Kunci Jadwal</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PRESENSI & EVALUASI */}
      {activeAcademyTab === 'presensi' && (
        <div className="space-y-6 text-left">
          {/* GERBANG UTAMA: PEMILIHAN KELAS */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-bold text-sm sm:text-base text-slate-800 flex items-center space-x-2">
                  <ClipboardCheck className="w-5 h-5 text-blue-600" />
                  <span>Presensi &amp; Evaluasi Performa Atlet</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih kelas / kelompok latihan untuk mencatat rekap kehadiran atau kartu evaluasi siswa
                </p>
              </div>

              {/* DROPDOWN PEMILIHAN KELAS SANGAT JELAS */}
              <div className="w-full md:w-80 shrink-0">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Pilih Kelas / Kelompok Latihan <span className="text-blue-600">*</span>
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs font-extrabold text-slate-800 cursor-pointer"
                >
                  <option value="">-- Pilih Kelas Latihan --</option>
                  {filteredClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.className} - {cls.sport || 'Umum'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedClassId ? (
              /* EMPTY STATE: BELUM MEMILIH KELAS */
              <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center flex flex-col items-center justify-center p-6">
                <ClipboardCheck className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-700">
                  {filteredClasses.length === 0
                    ? 'Belum ada kelas/kelompok latihan terdaftar.'
                    : 'Pilih kelas terlebih dahulu untuk mulai mencatat presensi atau evaluasi.'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                  {filteredClasses.length === 0
                    ? 'Buat kelas latihan terlebih dahulu di tab "Kelas & Kelompok" untuk mulai mengelola presensi.'
                    : 'Pilih salah satu kelas pada dropdown di atas untuk membuka formulir presensi & evaluasi atlet.'}
                </p>
                {filteredClasses.length === 0 && (
                  <button
                    onClick={() => setActiveAcademyTab('kelas')}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    + Buat Kelas Baru
                  </button>
                )}
              </div>
            ) : (
              /* JIKA KELAS DIPILIH: RINCIAN KELAS RINGKAS & TOGGLE SUB-MENU */
              <div className="space-y-4">
                {(() => {
                  const currentClass = filteredClasses.find((c) => c.id === selectedClassId);
                  if (!currentClass) return null;

                  return (
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 sm:p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
                      {/* LAYOUT FLEXBOX PADAT KARTU KELAS */}
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-bold text-sm sm:text-base text-slate-800 tracking-tight">
                          {currentClass.className}
                        </h3>

                        {/* CHIP / BADGES BERWARNA LEMBUT */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-medium text-xs rounded-full border border-blue-100/80">
                            {currentClass.sport || 'Sports'}
                          </span>
                          {currentClass.ageGroup && (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-medium text-xs rounded-full border border-emerald-100/80">
                              {currentClass.ageGroup}
                            </span>
                          )}
                        </div>

                        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

                        {/* INFORMASI DENGAN IKON (TANPA TEKS PANJANG) */}
                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <span className="flex items-center gap-1.5" title="Pelatih">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700">{currentClass.coachName || 'Instruktur'}</span>
                          </span>
                          <span className="flex items-center gap-1.5" title="Jadwal Latihan">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700">{currentClass.schedule || '-'}</span>
                          </span>
                        </div>
                      </div>

                      {/* SUB-MENU TOGGLE BUTTONS */}
                      <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shrink-0 self-start lg:self-auto">
                        <button
                          type="button"
                          onClick={() => setAttendanceSubTab('presensi')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            attendanceSubTab === 'presensi'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                          }`}
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>Presensi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendanceSubTab('evaluasi')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            attendanceSubTab === 'evaluasi'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Evaluasi Atlet</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendanceSubTab('antropometri')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            attendanceSubTab === 'antropometri'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Growth &amp; Gizi</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* SUB-TAB RENDER CONTENT */}
                {(() => {
                  const currentClass = filteredClasses.find((c) => c.id === selectedClassId);
                  if (!currentClass) return null;

                  if (attendanceSubTab === 'presensi') {
                    return (
                      <AttendanceSection
                        selectedClass={currentClass}
                        students={filteredStudents}
                        tenantId={tenantId}
                      />
                    );
                  } else if (attendanceSubTab === 'evaluasi') {
                    return (
                      <EvaluationSection
                        selectedClass={currentClass}
                        students={filteredStudents}
                        tenantId={tenantId}
                        activeAcademy={activeAcademy}
                      />
                    );
                  } else {
                    return (
                      <GrowthTrackerSection
                        students={filteredStudents.filter((s) => s.classId === currentClass.id)}
                      />
                    );
                  }
                })()}
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {/* MODAL 1: PENDAFTARAN & EDIT SISWA AKADEMI (RELASIONAL) */}
      <StudentRegistrationModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingStudent(null);
        }}
        academyClasses={filteredClasses}
        activeAcademy={activeAcademy}
        activeAcademyId={activeAcademy?.id}
        tenantId={tenantId}
        uniqueSports={activeAcademySports}
        studentToEdit={editingStudent}
        academyPricing={tenantProfile?.academyPricing}
        onSuccess={(saved) => {
          setSuccessMsg(editingStudent ? `Data siswa ${saved.studentName} berhasil diperbarui!` : 'Siswa baru berhasil didaftarkan ke akademi!');
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
      {/* MODAL 2: PEMBAYARAN SPP & PENDAFTARAN AKADEMI */}
      {paymentModalStudent && (
        <SppPaymentModal
          isOpen={!!paymentModalStudent}
          onClose={() => setPaymentModalStudent(null)}
          student={paymentModalStudent}
          userProfile={userProfile}
          onPaymentSuccess={(updatedStudent, receiptData) => {
            setSuccessMsg(`Pembayaran untuk ${updatedStudent.studentName} berhasil dibayar & dicatat!`);
            if (receiptData) {
              setSppReceiptData(receiptData);
            }
            setTimeout(() => setSuccessMsg(null), 4000);
          }}
        />
      )}

      {/* MODAL 3: STUDENT DETAIL DASHBOARD WITH 3 TABS */}
      {detailModalStudent && (
        <StudentDetailModal
          isOpen={!!detailModalStudent}
          onClose={() => setDetailModalStudent(null)}
          student={detailModalStudent}
          userProfile={userProfile}
          academyClasses={filteredClasses}
          onEditStudent={(st) => {
            setEditingStudent(st);
            setShowAddModal(true);
            setDetailModalStudent(null);
          }}
          onStudentUpdated={(updatedStudent) => {
            setDetailModalStudent(updatedStudent);
          }}
        />
      )}

      {/* MODAL 4: TAMBAH PELATIH BARU */}
      {showCoachModal && (
        <CoachModal
          isOpen={showCoachModal}
          onClose={() => setShowCoachModal(false)}
          userProfile={userProfile}
          activeAcademy={activeAcademy}
          uniqueSports={activeAcademySports}
          onCoachAdded={() => {
            setSuccessMsg('Pelatih baru berhasil ditambahkan!');
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
        />
      )}

      {/* MODAL 5: BUAT KELAS AKADEMI BARU */}
      {showClassModal && (
        <ClassModal
          isOpen={showClassModal}
          onClose={() => setShowClassModal(false)}
          userProfile={userProfile}
          activeAcademy={activeAcademy}
          uniqueSports={activeAcademySports}
          coaches={filteredCoaches}
          courts={courts}
          onClassAdded={() => {
            setSuccessMsg('Kelas baru berhasil dibuat!');
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
        />
      )}

      {/* MODAL 6: GENERATE / KUNCI JADWAL LAPANGAN AKADEMI */}
      {generateModalClass && (
        <GenerateAcademyScheduleModal
          isOpen={!!generateModalClass}
          onClose={() => setGenerateModalClass(null)}
          academyClass={generateModalClass}
          tenantId={tenantId}
        />
      )}

      {/* MODAL 7: PEMBUATAN AKADEMI BARU (MULTI-ACADEMY WORKSPACE) */}
      <CreateAcademyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userProfile={userProfile}
        onAcademyCreated={(newId, academyName) => {
          setActiveAcademyId(newId);
          localStorage.setItem('activeAcademyId', newId);
          setSuccessMsg(`Akademi "${academyName}" berhasil dibuat! Workspace aktif kini diperbarui.`);
          setTimeout(() => setSuccessMsg(null), 3500);
        }}
      />

      {/* MODAL 8: STRUK THERMAL UNIVERSAL DENGAN PRINTER SIMULATOR */}
      <GlobalReceiptModal
        isOpen={!!sppReceiptData}
        onClose={() => setSppReceiptData(null)}
        transactionData={sppReceiptData}
        tenantData={tenantProfile}
      />

    </div>
  );
}
