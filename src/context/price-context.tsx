'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { CryptoCurrency } from '@/lib/types';
import { SUPPORTED_CRYPTOS } from '@/lib/constants';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

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

  const fetchAndStorePrices = useCallback(async () => {
    if (!firestore) return;

    const coingeckoIds: Record<CryptoCurrency, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      LTC: 'litecoin',
      USDT: 'tether',
    };
    const cryptoSymbols = SUPPORTED_CRYPTOS.map(c => c.name);
    const ids = cryptoSymbols.map(s => coingeckoIds[s as CryptoCurrency]).join(',');

    try {
      const [cryptoRes, fiatRes] = await Promise.all([
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`),
        fetch('https://open.er-api.com/v6/latest/USD')
      ]);
      
      const newPrices: Partial<Record<CryptoCurrency, number>> = {};
      if (cryptoRes.ok) {
        const cryptoData = await cryptoRes.json();
        for (const symbol of cryptoSymbols) {
            const coingeckoId = coingeckoIds[symbol as CryptoCurrency];
            if (cryptoData[coingeckoId] && cryptoData[coingeckoId].usd) {
                newPrices[symbol as CryptoCurrency] = cryptoData[coingeckoId].usd;
            }
        }
        newPrices.USDT = 1.00;
      }
      
      let newFiatRates: Record<string, number> | null = null;
      if (fiatRes.ok) {
        const fiatData = await fiatRes.json();
        if (fiatData.result === 'success') {
          newFiatRates = { USD: 1, ...fiatData.rates };
        }
      }

      if (Object.keys(newPrices).length > 0 || newFiatRates) {
        const marketDataRef = doc(firestore, '_config', 'market_data');
        const dataToStore: any = {};
        if(Object.keys(newPrices).length > 0) dataToStore.prices = newPrices;
        if(newFiatRates) dataToStore.fiatRates = newFiatRates;
        
        await setDoc(marketDataRef, dataToStore, { merge: true });
      }

    } catch (error) {
      console.error("Error fetching and storing price data:", error);
    }
  }, [firestore]);


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

    // Set up a periodic fetch to update the data from the external API
    const interval = setInterval(fetchAndStorePrices, 30000); // 30 seconds interval

    // Initial fetch right away to get the latest data on first load.
    fetchAndStorePrices();

    return () => {
        unsubscribe();
        clearInterval(interval);
    };
  }, [firestore, fetchAndStorePrices]);

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
