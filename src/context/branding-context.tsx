'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

export interface BrandingConfig {
  appLogo?: string;
  appLogoMobile?: string;
  btcLogo?: string;
  ethLogo?: string;
  ltcLogo?: string;
  usdtLogo?: string;
}

interface BrandingContextType {
  branding: BrandingConfig | null;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Initialize a separate Firebase app instance for public data if it doesn't exist
// This prevents auth state from interfering with public data fetching
const publicAppName = 'public-branding-app';
const publicApp = !getApps().some(app => app.name === publicAppName) 
    ? initializeApp(firebaseConfig, publicAppName) 
    : getApp(publicAppName);
const publicFirestore = getFirestore(publicApp);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const brandingRef = doc(publicFirestore, '_config', 'branding');
    const unsubscribe = onSnapshot(brandingRef, (doc) => {
      if (doc.exists()) {
        setBranding(doc.data() as BrandingConfig);
      } else {
        setBranding(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("BrandingProvider fetch error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = { branding, isLoading };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
