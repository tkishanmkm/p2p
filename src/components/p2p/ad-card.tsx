
'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { P2PAd, CryptoCurrency } from '@/lib/types';
import { usePrices } from '@/context/price-context';
import { ThumbsUp, ThumbsDown, Info } from 'lucide-react';
import { toDate, cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from '@/components/icons';

const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency; className?: string }) => {
    switch (crypto) {
        case 'BTC': return <BtcLogo className={className} />;
        case 'ETH': return <EthLogo className={className} />;
        case 'LTC': return <LtcLogo className={className} />;
        case 'USDT': return <UsdtLogo className={className} />;
        default: return null;
    }
}

interface AdCardProps {
  ad: P2PAd;
}

export function AdCard({ ad }: AdCardProps) {
  const { prices, fiatRates } = usePrices();
  const adCreator = ad.user;

  const marketPriceUsd = prices[ad.crypto] || 0;
  const exchangeRate = fiatRates[ad.fiatCurrency] || 1;
  const marketPriceInFiat = marketPriceUsd * exchangeRate;

  const adPrice =
    ad.rateType === 'fixed' ? ad.fixedRate! : marketPriceInFiat * (1 + (ad.ratePercent || 0) / 100);

  const pricePremium = marketPriceInFiat > 0 ? (adPrice - marketPriceInFiat) / marketPriceInFiat : 0;
  
  const isForBuyingPage = ad.adType === 'sell';
  
  const priceBadgeClass = isForBuyingPage 
    ? (pricePremium >= 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700') 
    : (pricePremium >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700');

  const buttonLabel = ad.adType === 'buy' ? 'Sell' : 'Buy';
  const buttonColorClass = buttonLabel === 'Buy'
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : 'bg-red-600 hover:bg-red-700 text-white';

  return (
     <Card className="hover:shadow-md transition-shadow">
      <div className="p-4 flex items-center justify-between gap-4">
        {/* Left Side: Price and Limits */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <CryptoLogo crypto={ad.crypto as CryptoCurrency} className="h-5 w-5" />
            <p className="font-bold text-lg">
              {adPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm text-muted-foreground ml-1">{ad.fiatCurrency}</span>
            </p>
            {marketPriceInFiat > 0 && (
                <Badge className={cn('font-semibold', priceBadgeClass)}>
                    {pricePremium >= 0 ? '+' : ''}{(pricePremium * 100).toFixed(2)}%
                </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Limit: {ad.minAmount.toLocaleString()} - {ad.maxAmount.toLocaleString()} {ad.fiatCurrency}
          </p>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
           <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                  <Link href={`/ad/${ad.id}`}>
                    <Info className="h-5 w-5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View ad details</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button asChild className={cn(buttonColorClass, "gap-2")}>
            <Link href={`/trade/initiate/${ad.id}`}>
              {buttonLabel} <CryptoLogo crypto={ad.crypto as CryptoCurrency} className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

