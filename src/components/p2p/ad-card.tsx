
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

  const marketPrice = prices[ad.crypto] || 0;
  
  const adPrice = ad.rateType === 'fixed' 
    ? ad.fixedRate! 
    : marketPrice * (1 + (ad.ratePercent || 0) / 100);

  const pricePremium = ad.rateType === 'market' && ad.ratePercent ? (ad.ratePercent / 100) : ad.rateType === 'fixed' && marketPrice > 0 ? ((ad.fixedRate! - marketPrice) / marketPrice) : 0;
  const premiumPercentage = (pricePremium * 100).toFixed(2);
  
  const user = adCreator || ad.user;
  
  const lastActiveDate = user.lastActive ? toDate(user.lastActive) : null;
  const wasActiveRecently = lastActiveDate && (new Date().getTime() - lastActiveDate.getTime()) < 15 * 60 * 1000;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
        {/* Left Side */}
        <div className="flex-grow space-y-3">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={user.photoURL} />
                    <AvatarFallback>{user.userId.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                     <Link href={`/users/${user.userId}`} className="font-semibold hover:underline flex items-center gap-2">
                        {user.userId}
                        {user.country && <FlagIcon countryCode={user.country} />}
                     </Link>
                    <div className="text-xs text-muted-foreground flex items-center gap-4">
                        <span>{user.completedTrades} trades</span>
                        <div className="h-2 w-px bg-muted-foreground/30" />
                        <span><ThumbsUp className="h-3 w-3 inline-block mr-1 text-green-500" />{user.feedbackScore?.toFixed(0) ?? 100}%</span>
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
                 {marketPrice > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <p className={cn("text-xs cursor-help", pricePremium >= 0 ? "text-green-600" : "text-red-600")}>
                                {Math.abs(pricePremium * 100).toFixed(2)}% {pricePremium >= 0 ? 'above' : 'below'} market
                           </p>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>Market price: {marketPrice.toLocaleString()} {ad.fiatCurrency}</p>
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
                    <Link href={`/ad/${ad.id}`}>
                        {ad.adType === 'buy' ? "Sell" : "Buy"} {ad.crypto}
                    </Link>
                </Button>
            </div>
        </div>
      </div>
    </Card>
  );
}
