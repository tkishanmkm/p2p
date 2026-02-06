'use client';

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { P2PAd, User, UserWallet } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { usePrices } from "@/context/price-context";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toDate, cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from 'date-fns';
import { FlagIcon } from "../ui/flag-icon";
import { countries } from "@/lib/countries";

interface AdCardProps {
  ad: P2PAd;
}

export function AdCard({ ad }: AdCardProps) {
  const { firestore, user: authUser } = useFirebase();
  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar-2');
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
  
  const priceLabel = ad.rateType === 'fixed'
    ? `${ad.fixedRate?.toLocaleString()} ${ad.fiatCurrency}`
    : `Market ${ad.ratePercent}%`;

  const adPrice = ad.rateType === 'fixed' 
    ? ad.fixedRate! 
    : marketPrice * (1 + (ad.ratePercent || 0) / 100);

  let effectiveMaxAmount = ad.maxAmount;
  let availableCrypto: string | number = '...';
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
            availableCrypto = sellerWallet.balance.toFixed(5);
            if (effectiveMaxAmount < ad.minAmount) {
                tradeIsPossible = false;
            }
        } else { // Seller has no wallet or 0 balance
            effectiveMaxAmount = 0;
            availableCrypto = (0).toFixed(5);
            tradeIsPossible = false;
        }
    }
  } else { // This is a 'buy' ad, no balance check needed for the ad creator (the buyer).
    if (adPrice > 0) {
        availableCrypto = (ad.maxAmount / adPrice).toFixed(5);
    } else {
        availableCrypto = 'N/A';
    }
  }

  const isLoading = (ad.adType === 'sell' && isWalletLoading) || isCreatorLoading;
  const actionUrl = authUser ? `/trade/initiate/${ad.id}` : `/login?redirect=/trade/initiate/${ad.id}`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
          {/* User Info */}
          <Link href={`/users/${displayUser.userId}`} className="sm:col-span-1 flex items-center gap-3 hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors">
            {isLoading ? <Skeleton className="h-10 w-10 rounded-full" /> : (
              <Avatar>
                <AvatarImage src={displayPhoto || userAvatar?.imageUrl} alt={displayUser.userId} data-ai-hint={userAvatar?.imageHint} />
                <AvatarFallback>{displayUser.userId.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            <div>
              {isLoading ? (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-14" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{displayUser.userId}</p>
                    {displayUser.country && <FlagIcon countryCode={displayUser.country} className="w-5 h-auto" />}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {wasActiveRecently ? (
                      <div className="h-2 w-2 rounded-full bg-green-500" title="Active recently" />
                    ) : null}
                    <span>
                      {lastActiveDate ? `${formatDistanceToNowStrict(lastActiveDate)} ago` : 'Offline'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5 text-green-600">
                        <ThumbsUp className="h-3 w-3" />
                        <span>{adCreator?.positiveFeedback || 0}</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-red-600">
                        <ThumbsDown className="h-3 w-3" />
                        <span>{adCreator?.negativeFeedback || 0}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Link>
          
          {/* Price */}
          <div className="sm:col-span-1">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-bold text-lg">{priceLabel}</p>
          </div>
          
          {/* Limits & Payment */}
          <div className="sm:col-span-2">
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Limit</p>
                {isLoading ? <Skeleton className="h-5 w-32" /> : (
                  <p className="font-medium">{ad.minAmount.toLocaleString()} - {Math.floor(effectiveMaxAmount).toLocaleString()} {ad.fiatCurrency}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                {isLoading ? <Skeleton className="h-5 w-24" /> : (
                    <p className="font-medium">{availableCrypto} {ad.crypto}</p>
                )}
              </div>
            </div>
             <div className="mt-2 flex flex-wrap gap-1">
                {ad.paymentMethods.slice(0, 3).map(pm => (
                    <Badge key={pm} variant="secondary">{pm}</Badge>
                ))}
                 {ad.tags?.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
             </div>
          </div>

          {/* Action Button */}
          <div className="sm:col-span-1 sm:text-right">
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
            {!tradeIsPossible && !isLoading && <p className="text-xs text-destructive text-center sm:text-right mt-1">Seller has insufficient funds.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
