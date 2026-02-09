'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { CryptoCurrency } from '@/lib/types';
import { SUPPORTED_CRYPTOS } from '@/lib/constants';
import { getPrices as getCryptoPrices } from '@/ai/flows/get-crypto-prices-flow';

interface PriceContextType {
  prices: Record<CryptoCurrency, number>;
  fiatRates: Record<string, number>;
  isLoading: boolean;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export function PriceProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Record<CryptoCurrency, number>>({
    BTC: 0,
    ETH: 0,
    LTC: 0,
    USDT: 1,
  });

  const [fiatRates, setFiatRates] = useState<Record<string, number>>({ USD: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const cryptoSymbols = SUPPORTED_CRYPTOS.map(c => c.name);

  const fetchAll = useCallback(async () => {
    try {
      const [cryptoRes, fiatRes] = await Promise.all([
        getCryptoPrices({ symbols: cryptoSymbols }),
        fetch('https://api.exchangerate.host/latest?base=USD', { cache: 'no-store' })
      ]);
      
      if (cryptoRes && cryptoRes.prices) {
        const newPrices: Partial<Record<CryptoCurrency, number>> = {};
        for (const symbol of cryptoSymbols) {
            if(cryptoRes.prices[symbol]) {
                newPrices[symbol as CryptoCurrency] = cryptoRes.prices[symbol];
            }
        }
        newPrices.USDT = 1.00; // Force USDT to be 1
        setPrices(prev => ({...prev, ...newPrices}));
      } else {
         console.error("Failed to fetch crypto prices from Gemini.");
      }
      
      if (fiatRes.ok) {
        const fiatData = await fiatRes.json();
        setFiatRates({ USD: 1, ...fiatData.rates });
      } else {
        console.error("Failed to fetch fiat rates from exchangerate.host API.");
      }

    } catch (error) {
      console.error("Error fetching price data:", error);
    }
  }, [cryptoSymbols]);


  useEffect(() => {
    const initialFetch = async () => {
        await fetchAll();
        setIsLoading(false);
    };

    initialFetch();
    
    const interval = setInterval(fetchAll, 15000);
    
    return () => clearInterval(interval);
  }, [fetchAll]);

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
