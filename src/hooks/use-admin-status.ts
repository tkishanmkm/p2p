'use client';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useAdminStatus() {
  const { user, firestore, isUserLoading } = useFirebase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    // Reset on user change or when auth is loading again
    setIsAdmin(false);
    setIsCheckingAdmin(true);

    if (isUserLoading) {
      // Wait for firebase auth to settle before doing anything.
      return;
    }

    if (!user || !firestore) {
      // No user, so not an admin. We are done checking.
      setIsCheckingAdmin(false);
      return;
    }

    const checkAdminStatus = async () => {
      const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
      try {
        const docSnap = await getDoc(adminRoleRef);
        setIsAdmin(docSnap.exists());
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, firestore, isUserLoading]);

  // The overall loading state is true if firebase auth is loading OR we are checking the admin role.
  const isLoading = isUserLoading || isCheckingAdmin;

  return { isAdmin, isLoading };
}
