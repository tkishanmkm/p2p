
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
import { Skeleton } from "@/components/ui/skeleton";

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
  const displayFeedback = adCreator?.feedbackScore ?? ad.user.feedbackScore ?? 100;
  const displayTrades = adCreator?.completedTrades ?? ad.user.completedTrades ?? 0;

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
                  <p className="font-semibold">{displayUser.userId}</p>
                  <p className="text-xs text-muted-foreground">{displayTrades} trades</p>
                  <p className="text-xs text-muted-foreground">{displayFeedback}% positive</p>
                </>
              )}
            </div>
          </Link>
          
          {/* Price */}
          <div className="sm:col-span-1">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-bold text-lg text-green-600">{priceLabel}</p>
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
            <Button asChild className="w-full sm:w-auto" disabled={!tradeIsPossible || isLoading}>
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
