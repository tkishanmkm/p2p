// This is a new file
'use client';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useAdminStatus() {
  const { user, firestore, isUserLoading } = useFirebase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      // Don't do anything until we know if a user is logged in or not.
      return;
    }

    if (!user || !firestore) {
      // If there's no user after the initial load, they are not an admin.
      setIsAdmin(false);
      setIsLoading(false);
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
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, firestore, isUserLoading]);

  return { isAdmin, isLoading };
}
