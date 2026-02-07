'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  useEffect(() => {
    const cryptoIdMap: Record<string, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      LTC: 'litecoin',
      USDT: 'tether',
    };
    
    const cryptoSymbols = SUPPORTED_CRYPTOS.map(c => cryptoIdMap[c.name]).filter(Boolean).join(',');

    const fetchPrices = async () => {
      try {
        const response = await fetch(`https://api.coincap.io/v2/assets?ids=${cryptoSymbols}`);
        if (!response.ok) {
            console.error("Failed to fetch crypto prices from CoinCap API.");
            return;
        }
        const data = await response.json();
        
        const newPrices: Partial<Record<CryptoCurrency, number>> = {};
        
        data.data.forEach((asset: any) => {
          const symbol = Object.keys(cryptoIdMap).find(key => cryptoIdMap[key] === asset.id) as CryptoCurrency | undefined;
          if (symbol) {
            newPrices[symbol] = parseFloat(asset.priceUsd);
          }
        });

        // Ensure USDT is always 1, as API might fluctuate slightly
        newPrices.USDT = 1.00;

        setPrices(prev => ({ ...prev, ...newPrices }));
        
      } catch (error) {
        console.error("Error fetching crypto prices:", error);
      }
    };

    const fetchFiatRates = async () => {
        try {
          const response = await fetch(`https://api.coincap.io/v2/rates`);
          if (!response.ok) {
            console.error("Failed to fetch fiat rates from CoinCap API.");
            return;
          }
          const data = await response.json();
          const newRates: Record<string, number> = { USD: 1 };
          data.data.forEach((rate: any) => {
            if (rate.type === 'fiat') {
              // The API gives rateUsd, which is how many USD 1 unit of the currency is.
              // We need the rate against USD (how many units of currency for 1 USD).
              newRates[rate.symbol] = 1 / parseFloat(rate.rateUsd);
            }
          });
          setFiatRates(newRates);
        } catch (error) {
          console.error("Error fetching fiat rates:", error);
        }
    };

    const fetchAllData = async () => {
        await Promise.all([fetchPrices(), fetchFiatRates()]);
        if (isLoading) {
            setIsLoading(false);
        }
    };
    
    fetchAllData(); // Initial fetch
    const interval = setInterval(fetchAllData, 15000); // Fetch every 15 seconds

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount.

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
