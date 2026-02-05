'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CryptoCurrency } from '@/lib/types';

interface PriceContextType {
  prices: Record<CryptoCurrency, number>;
  fiatRates: Record<string, number>;
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

  const [fiatRates, setFiatRates] = useState<Record<string, number>>({
    USD: 1,
    EUR: 0.93,
    GBP: 0.79,
    INR: 83.45,
    CAD: 1.37,
    AUD: 1.51,
    JPY: 157.0,
    CNY: 7.24,
    BRL: 5.45,
    MXN: 18.10,
    AED: 3.67,
    SAR: 3.75,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial fetch
    setTimeout(() => setIsLoading(false), 500);

    const cryptoInterval = setInterval(() => {
      setPrices(prev => ({
        BTC: prev.BTC * (1 + (Math.random() - 0.5) * 0.005),
        ETH: prev.ETH * (1 + (Math.random() - 0.5) * 0.005),
        LTC: prev.LTC * (1 + (Math.random() - 0.5) * 0.01),
        USDT: 1,
      }));
    }, 15000);

    const fiatInterval = setInterval(() => {
      setFiatRates(prev => {
        const newRates = { ...prev };
        for (const currency in newRates) {
          if (currency !== 'USD') {
            newRates[currency] *= (1 + (Math.random() - 0.5) * 0.001);
          }
        }
        return newRates;
      });
    }, 15000);

    return () => {
      clearInterval(cryptoInterval);
      clearInterval(fiatInterval);
    };
  }, []);

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
