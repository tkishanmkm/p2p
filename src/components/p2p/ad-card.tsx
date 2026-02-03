import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { P2PAd } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

interface AdCardProps {
  ad: P2PAd;
}

export function AdCard({ ad }: AdCardProps) {
  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar-2');
  
  const priceLabel = ad.rateType === 'fixed'
    ? `${ad.fixedRate?.toLocaleString()} ${ad.fiatCurrency}`
    : `Market ${ad.ratePercent}%`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
          {/* User Info */}
          <Link href={`/users/${ad.user.userId}`} className="sm:col-span-1 flex items-center gap-3 hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors">
            {userAvatar && (
              <Avatar>
                <AvatarImage src={ad.user.photoURL || userAvatar.imageUrl} alt={ad.user.userId} data-ai-hint={userAvatar.imageHint} />
                <AvatarFallback>{ad.user.userId.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <p className="font-semibold">{ad.user.userId}</p>
              <p className="text-xs text-muted-foreground">{ad.user.completedTrades} trades</p>
              <p className="text-xs text-muted-foreground">{ad.user.feedbackScore}% positive</p>
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
                <p className="font-medium">{ad.minAmount.toLocaleString()} - {ad.maxAmount.toLocaleString()} {ad.fiatCurrency}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="font-medium">{(ad.maxAmount / (ad.fixedRate || 65000)).toFixed(5)} {ad.crypto}</p>
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
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/trade/initiate/${ad.id}`}>
                {ad.adType === 'sell' ? `Buy ${ad.crypto}` : `Sell ${ad.crypto}`}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
