
'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { P2PAd, CryptoCurrency } from '@/lib/types';
import { usePrices } from '@/context/price-context';
import { ThumbsUp, ThumbsDown, Info } from 'lucide-react';
import { cn, toDate } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo, DefaultAvatar } from '@/components/icons';
import { FlagIcon } from '../ui/flag-icon';
import { formatDistanceToNow } from 'date-fns';


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

  const adCreatorLastActive = adCreator.lastActive ? toDate(adCreator.lastActive) : null;
  let activity = { text: 'Offline', dotClass: 'bg-gray-500', textClass: 'text-muted-foreground' };

  if (adCreatorLastActive) {
    const diffMinutes = (new Date().getTime() - adCreatorLastActive.getTime()) / (1000 * 60);
    const formattedDistance = formatDistanceToNow(adCreatorLastActive);

    if (diffMinutes < 5) {
      activity = { text: 'Active now', dotClass: 'bg-green-500', textClass: 'text-green-600' };
    } else if (diffMinutes < 60) {
      activity = { text: `${formattedDistance} ago`, dotClass: 'bg-green-500', textClass: 'text-green-600' };
    } else if (diffMinutes < 24 * 60) {
      activity = { text: `${formattedDistance} ago`, dotClass: 'bg-yellow-600', textClass: 'text-yellow-600' };
    } else {
      activity = { text: `${formattedDistance} ago`, dotClass: 'bg-gray-500', textClass: 'text-muted-foreground' };
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
        {/* Left Side: User Info */}
        <div className="flex-grow space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={adCreator.photoURL} />
              <AvatarFallback><DefaultAvatar /></AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1.5">
                <Link href={`/users/${adCreator.username}`} className="font-semibold hover:underline">{adCreator.username}</Link>
                {adCreator.country && <FlagIcon countryCode={adCreator.country} />}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                <span>{adCreator.completedTrades || 0} Trades</span>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3 text-green-500" /> {adCreator.positiveFeedback || 0}
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsDown className="h-3 w-3 text-red-500" /> {adCreator.negativeFeedback || 0}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                  <div className={cn('h-2 w-2 rounded-full', activity.dotClass)} />
                  <p className={cn("text-xs", activity.textClass)}>
                      {activity.text}
                  </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {ad.paymentMethods.slice(0, 3).map(pm => <Badge key={pm} variant="outline" className="text-xs">{pm}</Badge>)}
            {ad.paymentMethods.length > 3 && <Badge variant="outline" className="text-xs">+{ad.paymentMethods.length - 3} more</Badge>}
          </div>
        </div>
        
        {/* Right Side: Price & Action */}
        <div className="w-full sm:w-auto flex flex-col items-start sm:items-end gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <div className="flex items-center gap-2">
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
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Limits</p>
            <p className="font-medium text-sm">{ad.minAmount.toLocaleString()} - {ad.maxAmount.toLocaleString()} {ad.fiatCurrency}</p>
          </div>

          <div className="flex items-center justify-end gap-1 sm:gap-2 mt-2 w-full sm:w-auto">
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
              <Link href={`/ad/${ad.id}`}>
                {buttonLabel} <CryptoLogo crypto={ad.crypto as CryptoCurrency} className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
    
