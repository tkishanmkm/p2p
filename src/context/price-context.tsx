'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { CryptoCurrency } from '@/lib/types';

interface PriceContextType {
  prices: Record<CryptoCurrency, number>;
  fiatRates: Record<string, number>;
  isLoading: boolean;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export function PriceProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();

  // Define the document reference for market data. This remains the same.
  const marketDataRef = useMemoFirebase(() => (firestore ? doc(firestore, '_config', 'market_data') : null), [firestore]);

  // Use useDoc to listen for real-time updates from Firestore. This becomes the single source of truth.
  // The component now only consumes data.
  const { data: marketData, isLoading: isMarketDataLoading } = useDoc<any>(marketDataRef);

  // The problematic useEffect with setInterval and fetchAndWritePrices has been removed to ensure client stability.

  const prices = marketData?.prices || {};
  const fiatRates = marketData?.fiatRates || {};

  return (
    <PriceContext.Provider value={{ prices, fiatRates, isLoading: isMarketDataLoading }}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrices() {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePrices must be used within a PriceProvider');
  }
  return context;
}
