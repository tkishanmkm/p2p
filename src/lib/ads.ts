
'use client';
import { Firestore, collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { P2PAd, CryptoCurrency } from './types';
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
    country?: string;
    feedbackScore: number;
    completedTrades: number;
    photoURL?: string;
    badges?: string[];
    lastActive?: string;
}) {
  const adsCollection = collection(db, 'p2p_ads');
  
  // Explicitly build the object to avoid sending undefined fields
  const newAdData: any = {
    adType: adData.adType,
    crypto: adData.crypto,
    fiatCurrency: adData.fiatCurrency,
    paymentMethods: adData.paymentMethods,
    rateType: adData.rateType,
    minAmount: adData.minAmount,
    maxAmount: adData.maxAmount,
    paymentTimeLimit: adData.paymentTimeLimit,
    terms: adData.terms,
    active: adData.active,
    minCompletedTrades: adData.minCompletedTrades,
    publicAdId: generatePublicAdId(),
    userId: user.id, // The UID of the user creating the ad
    user: { // The denormalized public user data
      userId: user.userId,
      country: user.country,
      feedbackScore: user.feedbackScore,
      completedTrades: user.completedTrades,
      photoURL: user.photoURL || "",
      badges: user.badges || [],
      lastActive: user.lastActive || new Date().toISOString()
    },
    createdAt: serverTimestamp()
  };

  // Conditionally add optional fields to avoid sending 'undefined'
  if (adData.rateType === 'market' && adData.ratePercent !== undefined) {
    newAdData.ratePercent = adData.ratePercent;
  }
  if (adData.rateType === 'fixed' && adData.fixedRate !== undefined) {
    newAdData.fixedRate = adData.fixedRate;
  }
  if (adData.tags && adData.tags.length > 0) {
    newAdData.tags = adData.tags;
  }
  if (adData.offerLabel) {
    newAdData.offerLabel = adData.offerLabel;
  }
  if (adData.targetedCountries && adData.targetedCountries.length > 0) {
    newAdData.targetedCountries = adData.targetedCountries;
  }
  if (adData.blockedCountries && adData.blockedCountries.length > 0) {
    newAdData.blockedCountries = adData.blockedCountries;
  }


  try {
    const docRef = await addDoc(adsCollection, newAdData);
    return docRef;
  } catch (error) {
    console.error("Error creating P2P Ad: ", error);
    
    const reportableData = { ...newAdData, createdAt: new Date().toISOString() };
    
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
    await updateDoc(adRef, { active: false, deletedAt: serverTimestamp() });
}
