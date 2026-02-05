'use client';
import { Firestore, collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import type { P2PAd } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function generatePublicAdId() {
  const prefix = "AD-";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + result;
}

export async function createP2PAd(db: Firestore, adData: Omit<P2PAd, 'id' | 'createdAt' | 'user' | 'userId' | 'publicAdId'>, user: {
    id: string;
    userId: string;
    feedbackScore: number;
    completedTrades: number;
    photoURL?: string;
}) {
  const adsCollection = collection(db, 'p2p_ads');
  
  const newAdData = {
    ...adData,
    publicAdId: generatePublicAdId(),
    userId: user.id,
    user: {
      userId: user.userId,
      feedbackScore: user.feedbackScore,
      completedTrades: user.completedTrades,
      photoURL: user.photoURL,
    },
    createdAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(adsCollection, newAdData);
    return docRef;
  } catch (error) {
    console.error("Error creating P2P Ad: ", error);
    
    // For error reporting, create a version with a client-side date to ensure it's serializable
    const reportableData = { ...newAdData, createdAt: new Date().toISOString() };
    delete (reportableData as any).ratePercent;
    
    errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: adsCollection.path,
          operation: 'create',
          requestResourceData: reportableData,
        })
      )
    throw error;
  }
}

export async function updateAd(db: Firestore, adId: string, adData: Partial<Omit<P2PAd, 'id' | 'createdAt' | 'user' | 'userId' | 'publicAdId'>>) {
    const adRef = doc(db, 'p2p_ads', adId);
    await updateDoc(adRef, adData);
}

export async function updateAdStatus(db: Firestore, adId: string, active: boolean) {
    const adRef = doc(db, 'p2p_ads', adId);
    await updateDoc(adRef, { active });
}

// Soft delete by marking as inactive
export async function softDeleteAd(db: Firestore, adId: string) {
    const adRef = doc(db, 'p2p_ads', adId);
    await updateDoc(adRef, { active: false });
}
