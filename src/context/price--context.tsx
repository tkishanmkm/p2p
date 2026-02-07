
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
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

  const [fiatRates, setFiatRates] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const cryptoIdMap: Record<CryptoCurrency, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    LTC: 'litecoin',
    USDT: 'tether',
  };

  const fetchCryptoPrices = async () => {
    const ids = SUPPORTED_CRYPTOS.map(c => cryptoIdMap[c.name]).join(',');

    const res = await fetch(
      `https://api.coincap.io/v2/assets?ids=${ids}`,
      { cache: 'no-store' }
    );

    if (!res.ok) throw new Error('Crypto price fetch failed');

    const data = await res.json();

    const updated: Partial<Record<CryptoCurrency, number>> = {};

    data.data.forEach((asset: any) => {
      const symbol = Object.keys(cryptoIdMap).find(
        key => cryptoIdMap[key as CryptoCurrency] === asset.id
      ) as CryptoCurrency | undefined;

      if (symbol) {
        updated[symbol] = Number(asset.priceUsd);
      }
    });

    updated.USDT = 1; // force stable

    setPrices(prev => ({ ...prev, ...updated }));
  };

  const fetchFiatRates = async () => {
    const res = await fetch(
      'https://api.exchangerate.host/latest?base=USD',
      { cache: 'no-store' }
    );

    if (!res.ok) throw new Error('Fiat rate fetch failed');

    const data = await res.json();
    setFiatRates({ USD: 1, ...data.rates });
  };

  const fetchAll = async () => {
    try {
      await Promise.all([fetchCryptoPrices(), fetchFiatRates()]);
      setIsLoading(false);
    } catch (err) {
      console.error('Price update error:', err);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PriceContext.Provider value={{ prices, fiatRates, isLoading }}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrices() {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error('usePrices must be used within PriceProvider');
  }
  return context;
}
