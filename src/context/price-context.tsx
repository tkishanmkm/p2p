'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CryptoCurrency } from '@/lib/types';

interface PriceContextType {
  prices: Record<CryptoCurrency, number>;
  isLoading: boolean;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export function PriceProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Record<CryptoCurrency, number>>({
    BTC: 65000,
    ETH: 3500,
    LTC: 80,
    USDT: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial fetch
    setTimeout(() => setIsLoading(false), 500);

    const interval = setInterval(() => {
      setPrices(prev => ({
        BTC: prev.BTC * (1 + (Math.random() - 0.5) * 0.005), // Smaller fluctuation
        ETH: prev.ETH * (1 + (Math.random() - 0.5) * 0.005),
        LTC: prev.LTC * (1 + (Math.random() - 0.5) * 0.01), // LTC is more volatile in this sim
        USDT: 1, // Stable coin
      }));
    }, 15000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <PriceContext.Provider value={{ prices, isLoading }}>
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
