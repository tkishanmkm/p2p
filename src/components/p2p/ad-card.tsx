

"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { P2PAd, User, UserWallet } from "@/lib/types";
import { usePrices } from "@/context/price-context";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { ThumbsUp, Info, Power, ThumbsDown } from "lucide-react";
import { toDate, cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from 'date-fns';
import { FlagIcon } from "../ui/flag-icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface AdCardProps {
  ad: P2PAd;
}

export function AdCard({ ad }: AdCardProps) {
  const { firestore } = useFirebase();
  const { prices, fiatRates } = usePrices();

  // The ad object already contains denormalized user data.
  // We can use this directly to avoid extra database reads on list views.
  const adCreator = ad.user;

  const marketPriceUsd = prices[ad.crypto] || 0;
  const exchangeRate = fiatRates[ad.fiatCurrency] || 1;
  const marketPriceInFiat = marketPriceUsd * exchangeRate;
  
  const adPrice = ad.rateType === 'fixed' 
    ? ad.fixedRate! 
    : marketPriceInFiat * (1 + (ad.ratePercent || 0) / 100);

  const pricePremium = marketPriceInFiat > 0 ? (adPrice - marketPriceInFiat) / marketPriceInFiat : 0;
  
  const lastActiveDate = adCreator.lastActive ? toDate(adCreator.lastActive) : null;
  const wasActiveRecently = lastActiveDate && (new Date().getTime() - lastActiveDate.getTime()) < 15 * 60 * 1000;

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
                           <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-green-500" /> {adCreator.positiveFeedback ?? 0}</span>
                           <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3 text-red-500" /> {adCreator.negativeFeedback ?? 0}</span>
                        </div>
                         <div className="h-2 w-px bg-muted-foreground/30" />
                        <div className={cn("flex items-center gap-1.5", wasActiveRecently ? 'text-green-600' : '')}>
                           <div className={cn("h-1.5 w-1.5 rounded-full", wasActiveRecently ? "bg-green-500" : "bg-muted-foreground/50")} />
                           {lastActiveDate ? formatDistanceToNowStrict(lastActiveDate) : 'Offline'}
                        </div>
                    </div>
                </div>
            </div>
            {ad.offerLabel && (
                <Badge>{ad.offerLabel}</Badge>
            )}
            <div className="flex items-center gap-2 flex-wrap">
                {ad.paymentMethods.slice(0, 3).map(pm => (
                    <Badge key={pm} variant="outline">{pm}</Badge>
                ))}
                {ad.paymentMethods.length > 3 && <Badge variant="outline">+{ad.paymentMethods.length - 3} more</Badge>}
            </div>
        </div>

        {/* Right Side */}
        <div className="flex-shrink-0 w-full sm:w-auto text-left sm:text-right space-y-2">
             <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-bold text-lg text-primary">{adPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ad.fiatCurrency}</p>
                 {marketPriceInFiat > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <p className={cn("text-xs cursor-help", pricePremium >= 0 ? "text-green-600" : "text-red-600")}>
                                {Math.abs(pricePremium * 100).toFixed(2)}% {pricePremium >= 0 ? 'above' : 'below'} market
                           </p>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>Market price: {marketPriceInFiat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ad.fiatCurrency}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <div className="flex justify-between sm:justify-end gap-4">
                 <div>
                    <p className="text-xs text-muted-foreground">Limits</p>
                    <p className="text-sm font-medium">{ad.minAmount} - {ad.maxAmount} {ad.fiatCurrency}</p>
                </div>
                <Button asChild>
                    <Link href={`/trade/initiate/${ad.id}`}>
                        {ad.adType === 'buy' ? "Sell" : "Buy"} {ad.crypto}
                    </Link>
                </Button>
            </div>
        </div>
      </div>
    </Card>
  );
}
