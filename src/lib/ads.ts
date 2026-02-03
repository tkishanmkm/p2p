// This is a new file
'use client';
import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { P2PAd } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export async function createP2PAd(db: Firestore, adData: Omit<P2PAd, 'id' | 'createdAt' | 'user' | 'userId' >, user: {
    id: string;
    userId: string;
    feedbackScore: number;
    completedTrades: number;
}) {
  const adsCollection = collection(db, 'p2p_ads');
  
  const newAdData = {
    ...adData,
    userId: user.id,
    user: {
      userId: user.userId,
      feedbackScore: user.feedbackScore,
      completedTrades: user.completedTrades,
    },
    active: true,
  };

  try {
    const docRef = await addDoc(adsCollection, {
      ...newAdData,
      createdAt: serverTimestamp()
    });
    return docRef;
  } catch (error) {
    console.error("Error creating P2P Ad: ", error);
    errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: adsCollection.path,
          operation: 'create',
          requestResourceData: newAdData,
        })
      )
    throw error;
  }
}

    