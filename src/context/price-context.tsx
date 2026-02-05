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
    USD: 1,      EUR: 0.93,   JPY: 157.0,  GBP: 0.79,   AUD: 1.51,
    CAD: 1.37,   CHF: 0.90,   CNY: 7.24,   HKD: 7.81,   NZD: 1.63,
    SEK: 10.45,  KRW: 1378.0, SGD: 1.35,   NOK: 10.55,  MXN: 18.10,
    INR: 83.45,  RUB: 90.0,   ZAR: 18.75,  TRY: 32.50,  BRL: 5.45,
    AED: 3.67,   AFN: 71.50,  ALL: 93.50,  AMD: 387.0,  ANG: 1.79,
    AOA: 830.0,  ARS: 900.0,  AWG: 1.79,   AZN: 1.70,   BAM: 1.82,
    BBD: 2.00,   BDT: 117.0,  BGN: 1.81,   BHD: 0.37,   BIF: 2850.0,
    BMD: 1.00,   BND: 1.35,   BOB: 6.91,   BSD: 1.00,   BTN: 83.45,
    BWP: 13.50,  BYN: 3.27,   BZD: 2.02,   CDF: 2800.0, CLP: 940.0,
    COP: 4100.0, CRC: 525.0,  CUP: 24.0,   CVE: 102.0,  CZK: 23.25,
    DJF: 177.7,  DKK: 6.95,   DOP: 59.0,   DZD: 134.5,  EGP: 47.5,
    ERN: 15.0,   ETB: 57.0,   FJD: 2.25,   FKP: 0.79,   FOK: 6.95,
    GEL: 2.80,   GGP: 0.79,   GHS: 14.5,   GIP: 0.79,   GMD: 68.0,
    GNF: 8600.0, GTQ: 7.78,   GYD: 209.0,  HNL: 24.7,   HRK: 7.00,
    HTG: 132.0,  HUF: 365.0,  IDR: 16200.0,ILS: 3.75,   IMP: 0.79,
    IQD: 1310.0, IRR: 42100.0,ISK: 139.0,  JEP: 0.79,   JMD: 155.0,
    JOD: 0.71,   KES: 130.0,  KGS: 88.0,   KHR: 4100.0, KID: 1.51,
    KMF: 458.0,  KWD: 0.31,   KYD: 0.83,   KZT: 445.0,  LAK: 21800.0,
    LBP: 89500.0,LKR: 300.0,  LRD: 194.0,  LSL: 18.75,  LYD: 4.85,
    MAD: 10.0,   MDL: 17.7,   MGA: 4450.0, MKD: 57.0,   MMK: 2100.0,
    MNT: 3450.0, MOP: 8.05,   MRU: 39.6,   MUR: 46.5,   MVR: 15.4,
    MWK: 1750.0, MYR: 4.72,   MZN: 64.0,   NAD: 18.75,  NGN: 1480.0,
    NIO: 36.8,   NPR: 133.5,  OMR: 0.38,   PAB: 1.00,   PEN: 3.75,
    PGK: 3.88,   PHP: 58.7,   PKR: 278.0,  PLN: 4.00,   PYG: 7500.0,
    QAR: 3.64,   RON: 4.63,   RSD: 109.0,  RWF: 1300.0, SAR: 3.75,
    SBD: 8.35,   SCR: 13.5,   SDG: 600.0,  SHP: 0.79,   SLL: 22500.0,
    SOS: 572.0,  SRD: 32.5,   SSP: 1600.0, STN: 23.0,   SYP: 12900.0,
    SZL: 18.75,  THB: 36.7,   TJS: 10.9,   TMT: 3.50,   TND: 3.13,
    TOP: 2.35,   TTD: 6.77,   TWD: 32.3,   TZS: 2600.0, UAH: 40.5,
    UGX: 3750.0, UYU: 39.0,   UZS: 12600.0,VES: 36.4,   VND: 25400.0,
    VUV: 120.0,  WST: 2.75,   XAF: 610.0,  XCD: 2.70,   XDR: 0.76,
    XOF: 610.0,  XPF: 111.0,  YER: 250.0,  ZMW: 25.5,   ZWL: 13.5,
    TVD: 1.51,   CKD: 1.63,   PND: 0.79
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
