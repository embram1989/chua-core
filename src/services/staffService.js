import { initializeApp, deleteApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, auth, handleFirestoreError } from '../firebase';

/**
 * Registrasi Staf/Pelatih oleh Owner menggunakan "Secondary Firebase App"
 * Ini menjamin akun Owner utama TIDAK ter-logout saat mendaftarkan staf baru.
 */
export async function registerStaffByOwner({ name, email, password, role, tenantId }) {
  if (!name || !email || !password || !role || !tenantId) {
    throw new Error('Semua data (Nama, Email, Password, Role, Tenant ID) wajib diisi.');
  }

  if (role !== 'admin' && role !== 'pelatih') {
    throw new Error('Role staf tidak valid. Harus "admin" atau "pelatih".');
  }

  const secondaryAppName = `SecondaryStaffApp_${Date.now()}`;
  let secondaryApp = null;

  try {
    // 1. Inisialisasi App Firebase Kedua khusus untuk Pendaftaran Staf
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    // 2. Buat akun Auth staf di Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth, 
      email.trim(), 
      password
    );
    const newStaffUser = userCredential.user;

    // 3. Simpan data profil staf ke Firestore koleksi `users_staff/{uid}`
    const staffDocRef = doc(db, 'users_staff', newStaffUser.uid);
    const staffData = {
      uid: newStaffUser.uid,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role, // 'admin' atau 'pelatih'
      tenantId: tenantId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(staffDocRef, staffData);

    // 4. Logout dari Secondary Auth untuk keamanan
    await signOut(secondaryAuth);

    return {
      uid: newStaffUser.uid,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role,
      tenantId
    };

  } catch (error) {
    console.error('Error registering staff:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email ini sudah terdaftar di sistem. Gunakan email lain.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password terlalu lemah. Gunakan minimal 6 karakter.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Format email tidak valid.');
    }
    
    if (error.message && error.message.includes('permission')) {
      handleFirestoreError(error, 'write', 'users_staff');
    }
    throw error;
  } finally {
    // Clean up secondary Firebase app instance
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch (cleanupErr) {
        console.warn('Warning deleting secondary app:', cleanupErr);
      }
    }
  }
}

/**
 * Ambil dokumen profil staf dari Firestore `users_staff/{uid}`
 */
export async function getStaffProfile(uid) {
  try {
    const docRef = doc(db, 'users_staff', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching staff profile:', error);
    handleFirestoreError(error, 'get', `users_staff/${uid}`);
    return null;
  }
}

/**
 * Login Staf via Email & Password menggunakan Firebase Auth utama
 */
export async function loginStaffWithEmail(email, password) {
  if (!email || !password) {
    throw new Error('Email dan kata sandi wajib diisi.');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const firebaseUser = userCredential.user;

    // Ambil profil staf dari `users_staff/{uid}`
    const staffProfile = await getStaffProfile(firebaseUser.uid);

    if (!staffProfile) {
      // Jika akun tidak ada di users_staff, logout dan berikan pesan error
      await signOut(auth);
      const err = new Error('Akun staf tidak ditemukan dalam sistem.');
      err.code = 'STAFF_NOT_FOUND';
      throw err;
    }

    return {
      uid: firebaseUser.uid,
      displayName: staffProfile.name || firebaseUser.displayName || 'Staf CHUA',
      email: firebaseUser.email,
      role: staffProfile.role, // 'admin' atau 'pelatih'
      tenantId: staffProfile.tenantId,
      isStaff: true
    };
  } catch (error) {
    console.error('Login staff error:', error);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      throw new Error('Email atau kata sandi tidak cocok.');
    }
    throw error;
  }
}

/**
 * Mengambil seluruh daftar staf untuk tenant tertentu
 */
export async function getStaffListByTenant(tenantId) {
  if (!tenantId) return [];

  try {
    const staffRef = collection(db, 'users_staff');
    const q = query(staffRef, where('tenantId', '==', tenantId));
    const querySnapshot = await getDocs(q);

    const staffList = [];
    querySnapshot.forEach((docSnap) => {
      staffList.push({ id: docSnap.id, ...docSnap.data() });
    });

    return staffList;
  } catch (error) {
    console.error('Error fetching staff list:', error);
    handleFirestoreError(error, 'list', 'users_staff');
    return [];
  }
}

/**
 * Hapus akun staf dari Firestore `users_staff/{uid}`
 */
export async function deleteStaffDoc(staffUid) {
  if (!staffUid) return;

  try {
    const docRef = doc(db, 'users_staff', staffUid);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting staff doc:', error);
    handleFirestoreError(error, 'delete', `users_staff/${staffUid}`);
    throw error;
  }
}
