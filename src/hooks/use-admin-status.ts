'use client';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useAdminStatus() {
  const { user, firestore, isUserLoading } = useFirebase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // If Firebase Auth is still figuring out who the user is, just wait.
    if (isUserLoading) {
      return;
    }

    // If Auth is resolved and there is no user, they can't be an admin.
    // We can consider the check complete.
    if (!user || !firestore) {
      setIsAdmin(false);
      setHasChecked(true);
      return;
    }

    // If we have a user, we need to check their role in the database.
    const checkAdminStatus = async () => {
      const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
      try {
        const docSnap = await getDoc(adminRoleRef);
        setIsAdmin(docSnap.exists());
      } catch (error) {
        console.error("Error checking admin status:", error);
        // If the check fails for any reason, assume not an admin for security.
        setIsAdmin(false);
      } finally {
        // No matter the outcome, the check has been performed.
        setHasChecked(true);
      }
    };

    checkAdminStatus();

  }, [user, isUserLoading, firestore]);

  // The overall loading state is true until we have performed the check.
  const isLoading = !hasChecked;

  return { isAdmin, isLoading };
}
