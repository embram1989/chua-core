import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';

/**
 * Real-time custom hook for listening to tenant profile, courts, bookings, and transactions
 */
export default function useArenaData(userProfile) {
  const [tenantProfile, setTenantProfile] = useState(userProfile?.tenant || null);
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const tenantId = userProfile?.tenant?.id || userProfile?.tenantId || userProfile?.uid;

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 1. Listen to Tenant Document updates
    const tenantDocRef = doc(db, 'tenants', tenantId);
    const unsubTenant = onSnapshot(
      tenantDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setTenantProfile({ id: snapshot.id, ...snapshot.data() });
        }
      },
      (error) => {
        console.error('Error in tenant snapshot:', error);
        handleFirestoreError(error, 'get', `tenants/${tenantId}`);
      }
    );

    // 2. Listen to Courts Collection (where tenantId == current tenantId)
    const courtsRef = collection(db, 'courts');
    const qCourts = query(courtsRef, where('tenantId', '==', tenantId));
    const unsubCourts = onSnapshot(
      qCourts,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Global alphabetical and numeric sorting for court names
        list.sort((a, b) => 
          (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
        );
        setCourts(list);
      },
      (error) => {
        console.error('Error in courts snapshot:', error);
        handleFirestoreError(error, 'list', 'courts');
        setCourts([]);
      }
    );

    // 3. Listen to Bookings Collection (where tenantId == current tenantId)
    const bookingsRef = collection(db, 'bookings');
    const qBookings = query(bookingsRef, where('tenantId', '==', tenantId));
    const unsubBookings = onSnapshot(
      qBookings,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBookings(list);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error in bookings snapshot:', error);
        handleFirestoreError(error, 'list', 'bookings');
        setBookings([]);
        setIsLoading(false);
      }
    );

    // 4. Listen to Transactions Collection
    const txRef = collection(db, 'transactions');
    const qTx = query(txRef, where('tenantId', '==', tenantId));
    const unsubTx = onSnapshot(
      qTx,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTransactions(list);
      },
      (error) => {
        console.error('Error in transactions snapshot:', error);
        handleFirestoreError(error, 'list', 'transactions');
        setTransactions([]);
      }
    );

    // Cleanup all subscriptions on unmount or tenantId change
    return () => {
      unsubTenant();
      unsubCourts();
      unsubBookings();
      unsubTx();
    };
  }, [tenantId]);

  return {
    tenantProfile: tenantProfile || userProfile?.tenant,
    courts,
    bookings,
    transactions,
    isLoading
  };
}
