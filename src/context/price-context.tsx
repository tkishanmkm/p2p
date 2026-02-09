
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

  const cryptoSymbols = SUPPORTED_CRYPTOS.map(c => c.name);

  const fetchAll = useCallback(async () => {
    const coingeckoIds: Record<CryptoCurrency, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      LTC: 'litecoin',
      USDT: 'tether',
    };
    const ids = cryptoSymbols.map(s => coingeckoIds[s as CryptoCurrency]).join(',');

    try {
      const [cryptoRes, fiatRes] = await Promise.all([
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`),
        fetch('https://open.er-api.com/v6/latest/USD')
      ]);
      
      if (cryptoRes.ok) {
        const cryptoData = await cryptoRes.json();
        const newPrices: Partial<Record<CryptoCurrency, number>> = {};
        for (const symbol of cryptoSymbols) {
            const coingeckoId = coingeckoIds[symbol as CryptoCurrency];
            if (cryptoData[coingeckoId] && cryptoData[coingeckoId].usd) {
                newPrices[symbol as CryptoCurrency] = cryptoData[coingeckoId].usd;
            }
        }
        newPrices.USDT = 1.00; // Force USDT to be 1
        setPrices(prev => ({...prev, ...newPrices}));
      } else {
         console.error("Failed to fetch crypto prices from CoinGecko.");
      }
      
      if (fiatRes.ok) {
        const fiatData = await fiatRes.json();
        if (fiatData.result === 'success') {
          setFiatRates({ USD: 1, ...fiatData.rates });
        } else {
          console.error("Failed to fetch fiat rates: API request was not successful.");
        }
      } else {
        console.error("Failed to fetch fiat rates from API.");
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
