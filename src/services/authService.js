import { 
  signInWithPopup, 
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
 * Validates user email against authorization rules:
 * 1. embram1989@gmail.com -> 'superadmin'
 * 2. Invited email -> check Firestore 'invitations'
 * 3. Uninvited email -> Access Denied & auto sign-out
 */
export async function verifyUserRoleAndTenant(user) {
  if (!user || !user.email) {
    throw new Error('User email tidak valid.');
  }

  const normalizedEmail = user.email.toLowerCase().trim();

  // 1. Check if Super Admin
  if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return {
      uid: user.uid,
      displayName: user.displayName || 'Super Admin',
      email: user.email,
      photoURL: user.photoURL,
      role: 'superadmin',
      tenant: null,
      tenantId: null
    };
  }

  // 2. Check if user email exists in 'invitations' collection
  try {
    const invitationsRef = collection(db, 'invitations');
    const q = query(invitationsRef, where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // Uninvited user: Force sign out
      await signOut(auth);
      const err = new Error('Akses ditolak. Hubungi Super Admin.');
      err.code = 'UNAUTHORIZED_EMAIL';
      throw err;
    }

    const invitationDoc = querySnapshot.docs[0];
    const invitationData = invitationDoc.data();

    // 3. Check if user already registered a tenant in 'tenants' collection
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
      invitation: { id: invitationDoc.id, ...invitationData }
    };
  } catch (error) {
    if (error.code === 'UNAUTHORIZED_EMAIL') {
      throw error;
    }
    // Handle Firestore permissions or network errors
    console.error('Error verifying user access:', error);
    // If it's a permissions error because database rules restricted read:
    if (error.message && error.message.includes('permission')) {
      handleFirestoreError(error, 'list', 'invitations');
    }
    throw error;
  }
}

/**
 * Initiates Google Sign-In with popup
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
    console.error('Login error:', error);
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
