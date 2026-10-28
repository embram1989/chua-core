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
 * Validates user email & UID against authorization rules (Strict Invite-Only Enforcement):
 * 1. Super Admin -> 'superadmin' (embram1989@gmail.com)
 * 2. Check Firestore 'users_staff' -> 'admin' / 'pelatih' / 'kasir'
 * 3. Check Firestore 'tenants' -> Existing Tenant Owner (direct to Dashboard)
 * 4. Check Firestore 'invitations' -> Invited user (allowed to access Onboarding)
 * 5. Uninvited user -> Blocked & auto sign-out
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
      isStaff: false,
    };
  }

  // 2. Check if user exists in Firestore `users_staff/{uid}` or query by email
  try {
    const staffDocRef = doc(db, 'users_staff', user.uid);
    const staffDocSnap = await getDoc(staffDocRef);

    if (staffDocSnap.exists()) {
      const staffData = staffDocSnap.data();

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
        role: staffData.role || 'kasir',
        tenantId: staffData.tenantId,
        tenant: tenantData,
        isStaff: true,
      };
    } else if (normalizedEmail) {
      const staffRef = collection(db, 'users_staff');
      const staffQuery = query(staffRef, where('email', '==', normalizedEmail));
      const staffSnapshot = await getDocs(staffQuery);

      if (!staffSnapshot.empty) {
        const staffDoc = staffSnapshot.docs[0];
        const staffData = staffDoc.data();

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
          role: staffData.role || 'kasir',
          tenantId: staffData.tenantId,
          tenant: tenantData,
          isStaff: true,
        };
      }
    }
  } catch (staffErr) {
    console.warn('Error checking users_staff document:', staffErr);
  }

  // 3. Check if user has an existing tenant in `tenants/{uid}` or by `ownerEmail` / `email`
  let tenantData = null;
  let tenantId = null;

  try {
    const directTenantRef = doc(db, 'tenants', user.uid);
    const directTenantSnap = await getDoc(directTenantRef);

    if (directTenantSnap.exists()) {
      tenantData = { id: directTenantSnap.id, ...directTenantSnap.data() };
      tenantId = directTenantSnap.id;
    } else if (normalizedEmail) {
      const tenantsRef = collection(db, 'tenants');
      const tenantQuery = query(tenantsRef, where('ownerEmail', '==', normalizedEmail));
      const tenantSnapshot = await getDocs(tenantQuery);
      if (!tenantSnapshot.empty) {
        const tenantDoc = tenantSnapshot.docs[0];
        tenantData = { id: tenantDoc.id, ...tenantDoc.data() };
        tenantId = tenantDoc.id;
      } else {
        const tenantEmailQuery = query(tenantsRef, where('email', '==', normalizedEmail));
        const tenantEmailSnapshot = await getDocs(tenantEmailQuery);
        if (!tenantEmailSnapshot.empty) {
          const tenantDoc = tenantEmailSnapshot.docs[0];
          tenantData = { id: tenantDoc.id, ...tenantDoc.data() };
          tenantId = tenantDoc.id;
        }
      }
    }
  } catch (tenantErr) {
    console.warn('Error checking tenant document:', tenantErr);
  }

  // If user ALREADY HAS an active tenant, enter Dashboard directly (no onboarding needed)
  if (tenantData && tenantId) {
    return {
      uid: user.uid,
      displayName: user.displayName || 'Tenant Owner',
      email: user.email,
      photoURL: user.photoURL,
      role: 'owner',
      tenant: tenantData,
      tenantId: tenantId,
      isStaff: false,
    };
  }

  // 4. Check Official Invitation (`invitations`) for Onboarding Access
  let invitationInfo = null;
  if (normalizedEmail) {
    try {
      const invitationsRef = collection(db, 'invitations');
      const q = query(invitationsRef, where('email', '==', normalizedEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const invitationDoc = querySnapshot.docs[0];
        invitationInfo = { id: invitationDoc.id, ...invitationDoc.data() };
      }
    } catch (invErr) {
      console.warn('Error checking invitations collection:', invErr);
    }
  }

  // If email IS found in invitations, allow access to Onboarding Page
  if (invitationInfo) {
    return {
      uid: user.uid,
      displayName: user.displayName || 'Tenant Owner',
      email: user.email,
      photoURL: user.photoURL,
      role: invitationInfo.role || 'owner',
      tenant: null,
      tenantId: user.uid,
      isStaff: false,
      invitation: invitationInfo,
    };
  }

  // 5. IF NOT IN invitations, NOT IN tenants, AND NOT IN users_staff: STRICT FAIL-CLOSED ACCESS DENIED!
  await signOut(auth);
  const uninvitedErr = new Error(
    `Akses Ditolak: Email Anda (${user.email || 'tanpa email'}) belum terdaftar dalam daftar undangan resmi CHUA SPORT CORE. Silakan hubungi Administrator Sistem untuk mendapatkan akses.`
  );
  uninvitedErr.code = 'UNAUTHORIZED_EMAIL';
  throw uninvitedErr;
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
    if (
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/user-not-found'
    ) {
      throw new Error('Email atau kata sandi tidak cocok.');
    }
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser() {
  try {
    localStorage.removeItem('demo_user_profile');
  } catch (e) {}
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
