// This is a new file
'use client';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useAdminStatus() {
  const { user, firestore } = useFirebase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      setIsLoading(true);
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
  }, [user, firestore]);

  return { isAdmin, isLoading };
}
