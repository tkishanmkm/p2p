'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CryptoCurrency } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface PriceContextType {
  prices: Record<CryptoCurrency, number>;
  fiatRates: Record<string, number>;
  isLoading: boolean;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export function PriceProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();

  const [prices, setPrices] = useState<Record<CryptoCurrency, number>>({
    BTC: 0,
    ETH: 0,
    LTC: 0,
    USDT: 1,
  });

  const [fiatRates, setFiatRates] = useState<Record<string, number>>({ USD: 1 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    };

    const marketDataRef = doc(firestore, '_config', 'market_data');
    
    // Set up a real-time listener. This will also handle the initial data load.
    const unsubscribe = onSnapshot(marketDataRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            if (data.prices) setPrices(prev => ({...prev, ...data.prices}));
            if (data.fiatRates) setFiatRates(data.fiatRates);
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error with price listener:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  return (
    <PriceContext.Provider value={{ prices, fiatRates, isLoading }}>
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
