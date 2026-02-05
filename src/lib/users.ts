// This is a new file
'use client';
import { Firestore, doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Blocks a target user by adding their UID to the current user's block list.
 * @param db - The Firestore instance.
 * @param currentUserId - The UID of the user performing the block.
 * @param targetUserId - The UID of the user to block.
 */
export async function blockUser(db: Firestore, currentUserId: string, targetUserId: string) {
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
