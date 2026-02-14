'use client';
import { Firestore, doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, addDoc, writeBatch, limit } from 'firebase/firestore';
import type { User as AuthUser } from 'firebase/auth';
import { countries } from './countries';

/**
 * Blocks a target user by adding their UID to the current user's block list.
 * @param db - The Firestore instance.
 * @param currentUserId - The UID of the user performing the block.
 * @param targetUsername - The username of the user to block.
 */
export async function blockUser(db: Firestore, currentUserId: string, targetUsername: string) {
    // Find target user by username
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("userId", "==", targetUsername), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error(`User "${targetUsername}" not found.`);
    }
    const targetUserId = querySnapshot.docs[0].id;
    if (currentUserId === targetUserId) {
        throw new Error("You cannot block yourself.");
    }

    const currentUserRef = doc(db, "users", currentUserId);
    await updateDoc(currentUserRef, {
        blockedUsers: arrayUnion(targetUserId)
    });
}

/**
 * Unblocks a target user by removing their UID from the current user's block list.
 * @param db - The Firestore instance.
 * @param currentUserId - The UID of the user performing the unblock.
 * @param targetUserIdToUnblock - The UID of the user to unblock.
 */
export async function unblockUser(db: Firestore, currentUserId: string, targetUserIdToUnblock: string) {
  const currentUserRef = doc(db, "users", currentUserId);
  await updateDoc(currentUserRef, {
    blockedUsers: arrayRemove(targetUserIdToUnblock)
  });
}


/**
 * Creates a session document for a user and updates their IP-based country.
 * @param db - The Firestore instance.
 * @param user - The authenticated user object from Firebase Auth.
 * @returns The ID of the newly created session document.
 */
export async function createUserSession(db: Firestore, user: AuthUser): Promise<string | undefined> {
  if (!user) return;
  
  const batch = writeBatch(db);

  // 1. Create session document
  const sessionsCollectionRef = collection(db, "users", user.uid, "sessions");
  const sessionDocRef = doc(sessionsCollectionRef);
  
  const simulatedIp = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;

  const sessionData = {
    userId: user.uid,
    userAgent: navigator.userAgent,
    ipAddress: simulatedIp,
    lastLogin: new Date().toISOString(),
    isActive: true,
  };
  batch.set(sessionDocRef, sessionData);

  // 2. Update user's IP-based country to simulate real-time detection
  const userDocRef = doc(db, "users", user.uid);
  const randomIpCountry = countries[Math.floor(Math.random() * countries.length)].code;
  batch.update(userDocRef, { ipBasedCountry: randomIpCountry });

  await batch.commit();

  return sessionDocRef.id;
}

/**
 * Logs out specified sessions by marking them as inactive.
 * @param db The Firestore instance.
 * @param userId The UID of the user.
 * @param sessionIdsToLogout An array of session document IDs to log out.
 */
export async function logoutSessions(db: Firestore, userId: string, sessionIdsToLogout: string[]) {
  if (!userId || !sessionIdsToLogout || sessionIdsToLogout.length === 0) {
    throw new Error("User ID and session IDs are required.");
  }
  const sessionsRef = collection(db, "users", userId, "sessions");
  const batch = writeBatch(db);

  sessionIdsToLogout.forEach(sessionId => {
    const sessionRef = doc(sessionsRef, sessionId);
    batch.update(sessionRef, { isActive: false });
  });

  await batch.commit();
}
