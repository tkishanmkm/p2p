'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { CryptoCurrency } from '@/lib/types';
import { SUPPORTED_CRYPTOS } from '@/lib/constants';

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

  const cryptoIdMap: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    LTC: 'litecoin',
    USDT: 'tether',
  };
    
  const cryptoSymbols = SUPPORTED_CRYPTOS.map(c => cryptoIdMap[c.name]).filter(Boolean).join(',');

  const fetchAll = useCallback(async () => {
    try {
      const [cryptoRes, fiatRes] = await Promise.all([
        fetch(`https://api.coincap.io/v2/assets?ids=${cryptoSymbols}`, { cache: 'no-store' }),
        fetch('https://api.exchangerate.host/latest?base=USD', { cache: 'no-store' })
      ]);
      
      if (cryptoRes.ok) {
        const cryptoData = await cryptoRes.json();
        const newPrices: Partial<Record<CryptoCurrency, number>> = {};
        cryptoData.data.forEach((asset: any) => {
          const symbol = Object.keys(cryptoIdMap).find(key => cryptoIdMap[key] === asset.id) as CryptoCurrency | undefined;
          if (symbol) {
            newPrices[symbol] = parseFloat(asset.priceUsd);
          }
        });
        newPrices.USDT = 1.00; // Force USDT to be 1
        setPrices(prev => ({...prev, ...newPrices}));
      } else {
         console.error("Failed to fetch crypto prices from CoinCap API.");
      }
      
      if (fiatRes.ok) {
        const fiatData = await fiatRes.json();
        setFiatRates({ USD: 1, ...fiatData.rates });
      } else {
        console.error("Failed to fetch fiat rates from exchangerate.host API.");
      }

    } catch (error) {
      console.error("Error fetching price data:", error);
    } finally {
        if(isLoading) {
            setIsLoading(false);
        }
    }
  }, [cryptoSymbols, isLoading]);


  useEffect(() => {
    fetchAll();
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
