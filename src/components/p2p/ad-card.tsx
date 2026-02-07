"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { P2PAd, User, UserWallet } from "@/lib/types";
import { usePrices } from "@/context/price-context";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { ThumbsUp, Info, Power } from "lucide-react";
import { toDate, cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from 'date-fns';
import { FlagIcon } from "../ui/flag-icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface AdCardProps {
  ad: P2PAd;
}

export function AdCard({ ad }: AdCardProps) {
  const { firestore } = useFirebase();
  const { prices } = usePrices();

  // Fetch the ad creator's profile in real-time to get the latest avatar and stats
  const adCreatorRef = useMemoFirebase(() => (firestore ? doc(firestore, 'users', ad.userId) : null), [firestore, ad.userId]);
  const { data: adCreator, isLoading: isCreatorLoading } = useDoc<User>(adCreatorRef);

  // Fetch seller's wallet balance ONLY for sell ads.
  const sellerWalletRef = useMemoFirebase(() => 
    (firestore && ad.adType === 'sell') ? doc(firestore, 'users', ad.userId, 'wallets', ad.crypto) : null,
    [firestore, ad]
  );
  const { data: sellerWallet, isLoading: isWalletLoading } = useDoc<UserWallet>(sellerWalletRef);

  const marketPrice = prices[ad.crypto] || 0;
  
  const adPrice = ad.rateType === 'fixed' 
    ? ad.fixedRate! 
    : marketPrice * (1 + (ad.ratePercent || 0) / 100);

  let effectiveMaxAmount = ad.maxAmount;
  let tradeIsPossible = true;

  // Use the live creator data if available, otherwise fall back to the denormalized data
  const displayUser = adCreator || ad.user;
  const displayPhoto = adCreator?.photoURL || ad.user.photoURL;
  const lastActiveDate = adCreator?.lastActive ? toDate(adCreator.lastActive) : null;
  const wasActiveRecently = lastActiveDate && (new Date().getTime() - lastActiveDate.getTime()) < 15 * 60 * 1000;

  if (ad.adType === 'sell') {
    if (!isWalletLoading) {
        if (sellerWallet && adPrice > 0) {
            const maxFiatFromBalance = sellerWallet.balance * adPrice;
            effectiveMaxAmount = Math.min(ad.maxAmount, maxFiatFromBalance);
            if (effectiveMaxAmount < ad.minAmount) {
                tradeIsPossible = false;
            }
        } else { // Seller has no wallet or 0 balance
            effectiveMaxAmount = 0;
            tradeIsPossible = false;
        }
    }
  }

  const isLoading = isCreatorLoading || (ad.adType === 'sell' && isWalletLoading);
  const actionUrl = `/ad/${ad.id}`;

  const pricePremium = ad.rateType === 'market' && ad.ratePercent ? (ad.ratePercent / 100) : ad.rateType === 'fixed' && marketPrice > 0 ? ((ad.fixedRate! - marketPrice) / marketPrice) : 0;
  const premiumPercentage = (pricePremium * 100).toFixed(2);
  
  // Example calculation for display
  const exampleFiatAmount = 100;
  const exampleCryptoAmount = adPrice > 0 ? (exampleFiatAmount / adPrice).toFixed(5) : '0.00';
  
  const hasPowerBadge = displayUser.badges?.includes('power');

  return (
    <div className="grid grid-cols-12 items-center gap-x-4 gap-y-2 p-3 border-b hover:bg-card transition-colors">
        {/* User Info */}
        <div className="col-span-12 md:col-span-3 flex items-center gap-3">
             <Link href={`/users/${displayUser.userId}`} className="flex-shrink-0">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={displayPhoto || undefined} alt={displayUser.userId} />
                    <AvatarFallback>{displayUser.userId.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="min-w-0">
                 <div className="flex items-center gap-2">
                    <Link href={`/users/${displayUser.userId}`} className="font-semibold text-sm hover:underline truncate">{displayUser.userId}</Link>
                    {displayUser.country && <FlagIcon countryCode={displayUser.country} />}
                    {hasPowerBadge && <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-600 border-yellow-400/30"><Power className="h-3 w-3 mr-1" /> POWER</Badge>}
                </div>
                {isLoading ? <Skeleton className="h-3 w-32 mt-1" /> : (
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {displayUser.feedbackScore?.toFixed(2) || '100.00'}%</div>
                        <span>{displayUser.completedTrades || 0} Trades</span>
                        <div className="flex items-center gap-1">
                            <div className={cn("h-2 w-2 rounded-full", wasActiveRecently ? "bg-green-500" : "bg-muted-foreground/50")} />
                            {wasActiveRecently ? 'Active now' : 'Away'}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Price/Limits */}
        <div className="col-span-6 md:col-span-2">
            <div className="flex items-center gap-2">
                <p className="font-semibold">{adPrice.toFixed(2)} {ad.fiatCurrency}</p>
                <Badge variant={pricePremium > 0 ? "destructive" : "default"} className="text-xs">{pricePremium > 0 ? '+' : ''}{premiumPercentage}%</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{ad.minAmount.toLocaleString()} - {Math.floor(effectiveMaxAmount).toLocaleString()} {ad.fiatCurrency}</p>
        </div>

        {/* Payment */}
        <div className="col-span-6 md:col-span-3">
             <div className="flex flex-wrap items-center gap-1">
                {ad.paymentMethods.slice(0, 3).map(pm => <Badge key={pm} variant="outline" className="text-xs">{pm}</Badge>)}
                {ad.paymentMethods.length > 3 && <Badge variant="outline">+{ad.paymentMethods.length - 3} more</Badge>}
            </div>
        </div>
        
        {/* Receive */}
        <div className="col-span-6 md:col-span-2 text-left md:text-right">
             <p className="text-xs text-muted-foreground">Receive (for 100 {ad.fiatCurrency})</p>
             <p className="font-medium">{exampleCryptoAmount} {ad.crypto}</p>
        </div>

        {/* Action */}
        <div className="col-span-6 md:col-span-2 flex items-center justify-end gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon"><Info className="h-4 w-4 text-muted-foreground"/></Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{ad.terms}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <Button
              asChild
              className={cn(
                "w-full sm:w-auto",
                ad.adType === 'sell'
                  ? 'bg-green-600 hover:bg-green-700 text-primary-foreground'
                  : 'bg-red-600 hover:bg-red-700 text-primary-foreground'
              )}
              disabled={!tradeIsPossible || isLoading}
            >
              <Link href={actionUrl}>
                {ad.adType === 'sell' ? `Buy ${ad.crypto}` : `Sell ${ad.crypto}`}
              </Link>
            </Button>
        </div>
        {!tradeIsPossible && !isLoading && <p className="col-span-12 text-xs text-destructive text-center md:text-right mt-1">Seller has insufficient funds.</p>}
    </div>
  );
}
