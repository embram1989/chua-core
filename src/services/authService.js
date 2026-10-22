import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError } from '../firebase';

export const SUPER_ADMIN_EMAIL = 'embram1989@gmail.com';

/**
 * Validates user email & UID against authorization rules:
 * 1. embram1989@gmail.com -> 'superadmin'
 * 2. Check Firestore 'users_staff/{uid}' -> 'admin' atau 'pelatih' (Client-side RBAC Murni)
 * 3. Invited email -> check Firestore 'invitations' & 'tenants' (Tenant Owner)
 * 4. Uninvited user -> Access Denied & auto sign-out
 */
export async function verifyUserRoleAndTenant(user) {
  if (!user) {
    throw new Error('User tidak valid.');
  }

  const normalizedEmail = user.email ? user.email.toLowerCase().trim() : '';

  // 1. Check if Super Admin
  if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return {
      uid: user.uid,
      displayName: user.displayName || 'Super Admin',
      email: user.email,
      photoURL: user.photoURL,
      role: 'superadmin',
      tenant: null,
      tenantId: null,
      isStaff: false
    };
  }

  // 2. Check if user exists in Firestore `users_staff/{uid}` collection
  try {
    const staffDocRef = doc(db, 'users_staff', user.uid);
    const staffDocSnap = await getDoc(staffDocRef);

    if (staffDocSnap.exists()) {
      const staffData = staffDocSnap.data();

      // Fetch tenant info if tenantId is available
      let tenantData = null;
      if (staffData.tenantId) {
        try {
          const tenantDocRef = doc(db, 'tenants', staffData.tenantId);
          const tenantDocSnap = await getDoc(tenantDocRef);
          if (tenantDocSnap.exists()) {
            tenantData = { id: tenantDocSnap.id, ...tenantDocSnap.data() };
          }
        } catch (tErr) {
          console.warn('Warning fetching tenant for staff:', tErr);
        }
      }

      return {
        uid: user.uid,
        displayName: staffData.name || user.displayName || 'Staf CHUA',
        email: user.email || staffData.email,
        photoURL: user.photoURL || null,
        role: staffData.role, // 'admin' atau 'pelatih'
        tenantId: staffData.tenantId,
        tenant: tenantData,
        isStaff: true
      };
    }
  } catch (staffErr) {
    console.warn('Error checking users_staff document:', staffErr);
  }

  // 3. If not staff, check if user email exists in 'invitations' collection (Tenant Owner)
  try {
    if (!normalizedEmail) {
      await signOut(auth);
      const err = new Error('Email tidak ditemukan pada akun ini.');
      err.code = 'UNAUTHORIZED_EMAIL';
      throw err;
    }

    const invitationsRef = collection(db, 'invitations');
    const q = query(invitationsRef, where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // Uninvited user & not staff: Force sign out
      await signOut(auth);
      const err = new Error('Akses ditolak. Hubungi Owner atau Super Admin.');
      err.code = 'UNAUTHORIZED_EMAIL';
      throw err;
    }

    const invitationDoc = querySnapshot.docs[0];
    const invitationData = invitationDoc.data();

    // Check if user already registered a tenant in 'tenants' collection
    const tenantsRef = collection(db, 'tenants');
    const tenantQuery = query(tenantsRef, where('ownerEmail', '==', normalizedEmail));
    const tenantSnapshot = await getDocs(tenantQuery);

    let tenantData = null;
    let tenantId = null;

    if (!tenantSnapshot.empty) {
      const tenantDoc = tenantSnapshot.docs[0];
      tenantData = { id: tenantDoc.id, ...tenantDoc.data() };
      tenantId = tenantDoc.id;
    }

    return {
      uid: user.uid,
      displayName: user.displayName || 'Tenant Owner',
      email: user.email,
      photoURL: user.photoURL,
      role: invitationData.role || 'owner',
      tenant: tenantData,
      tenantId: tenantId,
      isStaff: false,
      invitation: { id: invitationDoc.id, ...invitationData }
    };
  } catch (error) {
    if (error.code === 'UNAUTHORIZED_EMAIL') {
      throw error;
    }
    console.error('Error verifying user access:', error);
    if (error.message && error.message.includes('permission')) {
      handleFirestoreError(error, 'list', 'invitations');
    }
    throw error;
  }
}

/**
 * Initiates Google Sign-In with popup (for Owners & Super Admin)
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const userProfile = await verifyUserRoleAndTenant(result.user);
    return userProfile;
  } catch (error) {
    if (error.code === 'UNAUTHORIZED_EMAIL') {
      throw error;
    }
    console.error('Google Login error:', error);
    throw error;
  }
}

/**
 * Login Staf dengan Email & Sandi via Firebase Auth utama
 */
export async function loginWithEmailAndPassword(email, password) {
  if (!email || !password) {
    throw new Error('Email dan kata sandi harus diisi.');
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    const userProfile = await verifyUserRoleAndTenant(result.user);
    return userProfile;
  } catch (error) {
    console.error('Email/Password Login error:', error);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      throw new Error('Email atau kata sandi tidak cocok.');
    } else if (error.code === 'UNAUTHORIZED_EMAIL') {
      throw error;
    }
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Listen to auth state changes and verify authorization
 */
export function subscribeToAuthChanges(onUserChanged) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      onUserChanged(null, null);
      return;
    }

    try {
      const userProfile = await verifyUserRoleAndTenant(firebaseUser);
      onUserChanged(firebaseUser, userProfile);
    } catch (error) {
      console.error('Auth verification failed during auth state change:', error.message);
      onUserChanged(null, null, error.message || 'Akses ditolak. Hubungi Super Admin.');
    }
  });
}
