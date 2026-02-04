'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

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

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const brandingRef = useMemoFirebase(() => (firestore ? doc(firestore, '_config', 'branding') : null), [firestore]);
  const { data, isLoading } = useDoc<BrandingConfig>(brandingRef);

  return (
    <BrandingContext.Provider value={{ branding: data, isLoading }}>
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
