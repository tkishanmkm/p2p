
'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { P2PAd } from '@/lib/types';
import { usePrices } from '@/context/price-context';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { toDate, cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { FlagIcon } from '../ui/flag-icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

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
  
  const isForBuyingPage = ad.adType === 'sell'; // On buy page, we see 'sell' ads
  
  const priceColorClass = isForBuyingPage 
    ? (pricePremium >= 0 ? 'text-red-600' : 'text-green-600') 
    : (pricePremium >= 0 ? 'text-green-600' : 'text-red-600');

  const buttonLabel = ad.adType === 'buy' ? 'Sell' : 'Buy';
  const buttonColorClass = buttonLabel === 'Buy'
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : 'bg-red-600 hover:bg-red-700 text-white';

  const lastActiveDate = adCreator.lastActive ? toDate(adCreator.lastActive) : null;
  let activity = { text: 'Offline', dotClass: 'bg-muted-foreground/50', textClass: 'text-muted-foreground' };

  if (lastActiveDate) {
    const diffMinutes = (new Date().getTime() - lastActiveDate.getTime()) / (1000 * 60);
    const formattedDistance = formatDistanceToNow(lastActiveDate);

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
        {/* Left Side */}
        <div className="flex-grow space-y-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={adCreator.photoURL} />
              <AvatarFallback>{adCreator.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <Link href={`/users/${adCreator.username}`} className="font-semibold hover:underline flex items-center gap-2">
                {adCreator.username}
                {adCreator.country && <FlagIcon countryCode={adCreator.country} />}
              </Link>
              <div className="text-xs text-muted-foreground flex items-center gap-4">
                <span>{adCreator.completedTrades} trades</span>
                <div className="h-2 w-px bg-muted-foreground/30" />
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3 text-green-500" /> {adCreator.positiveFeedback ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown className="h-3 w-3 text-red-500" /> {adCreator.negativeFeedback ?? 0}
                  </span>
                </div>
                <div className="h-2 w-px bg-muted-foreground/30" />
                <div className={cn('flex items-center gap-1.5', activity.textClass)}>
                  <div className={cn('h-1.5 w-1.5 rounded-full', activity.dotClass)} />
                  {activity.text}
                </div>
              </div>
            </div>
          </div>
          {ad.offerLabel && <Badge>{ad.offerLabel}</Badge>}
          <div className="flex items-center gap-2 flex-wrap">
            {ad.paymentMethods.slice(0, 3).map((pm) => (
              <Badge key={pm} variant="outline">
                {pm}
              </Badge>
            ))}
            {ad.paymentMethods.length > 3 && <Badge variant="outline">+{ad.paymentMethods.length - 3} more</Badge>}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex-shrink-0 w-full sm:w-auto text-left sm:text-right space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-bold text-lg text-primary">
              {adPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              {ad.fiatCurrency}
            </p>
            {marketPriceInFiat > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className={cn('text-xs cursor-help', priceColorClass)}>
                      {pricePremium >= 0 ? '+' : ''}{(pricePremium * 100).toFixed(2)}%
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Market price: {marketPriceInFiat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      {ad.fiatCurrency}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex justify-between sm:justify-end gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Limits</p>
              <p className="text-sm font-medium">
                {ad.minAmount} - {ad.maxAmount} {ad.fiatCurrency}
              </p>
            </div>
            <Button asChild className={buttonColorClass}>
              <Link href={`/trade/initiate/${ad.id}`}>{buttonLabel} {ad.crypto}</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
