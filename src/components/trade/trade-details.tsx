
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { P2PAd, Trade } from "@/lib/types";
import Link from "next/link";
import { Button } from "../ui/button";
import { toDate, cn } from "@/lib/utils";
import { FlagIcon } from "../ui/flag-icon";
import { RefreshCw } from "lucide-react";

interface TradeDetailsProps {
  trade: Trade;
  sellerTerms?: string;
  currentUserRole: 'buy' | 'sell';
}

function DetailRow({ label, value, valueClass, isLink = false, href = '#' }: { label: string, value: string | React.ReactNode, valueClass?: string, isLink?: boolean, href?: string }) {
  const valueContent = isLink ? (
    <Button variant="link" asChild className="p-0 h-auto font-medium text-right">
        <Link href={href}>{value}</Link>
    </Button>
  ) : (
    <p className={cn(`font-medium text-right`, valueClass)}>{value}</p>
  );
  
  return (
    <div className="flex justify-between items-center text-sm">
      <p className="text-muted-foreground">{label}</p>
      {valueContent}
    </div>
  )
}

function ParticipantRow({ label, user }: { label: string, user?: { username: string; country?: string } }) {
  if (!user || !user.username) {
    return (
        <div className="flex justify-between items-center text-sm">
            <p className="text-muted-foreground">{label}</p>
            <p className="font-medium text-right text-muted-foreground">Unknown</p>
        </div>
    );
  }
  
  return (
     <div className="flex justify-between items-center text-sm">
      <p className="text-muted-foreground">{label}</p>
        <Button variant="link" asChild className="p-0 h-auto font-medium">
            <Link href={`/users/${user.username}`} className="flex items-center gap-2">
                {user.username}
                {user.country && <FlagIcon countryCode={user.country} />}
            </Link>
        </Button>
    </div>
  )
}


export function TradeDetails({ trade, sellerTerms, currentUserRole }: TradeDetailsProps) {
  const isBuying = currentUserRole === 'buy';
  const showReopen = ['cancelled', 'expired'].includes(trade.status);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Trade Details</CardTitle>
                <CardDescription>ID: {trade?.tradeId || 'N/A'}</CardDescription>
            </div>
            <Badge variant="outline" className="capitalize">{trade?.status || 'unknown'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-4">
            <DetailRow label={isBuying ? "You are buying" : "You are selling"} value={`${trade?.amount ?? 0} ${trade?.crypto ?? ''}`} />
            <DetailRow label="Price" value={`1 ${trade?.crypto ?? ''} = ${(trade?.price ?? 0).toLocaleString()} ${trade?.fiatCurrency ?? ''}`} />
            {trade.escrowFee && <DetailRow label="Escrow Fee" value={`${trade.escrowFee.toFixed(8)} ${trade.crypto}`} />}
            <hr className="my-2 border-dashed" />
            <DetailRow 
                label={isBuying ? "You will pay" : "You will receive"} 
                value={`${(trade?.fiatAmount ?? 0).toLocaleString()} ${trade?.fiatCurrency ?? ''}`} 
                valueClass={isBuying ? "text-lg font-bold text-destructive" : "text-lg font-bold text-green-600"} 
            />
        </div>

        <div className="space-y-2">
            <h4 className="font-semibold">Participants & Payment</h4>
            <ParticipantRow label="Buyer" user={trade?.buyer} />
            <ParticipantRow label="Seller" user={trade?.seller} />
            {trade?.paymentMethod && <DetailRow label="Payment Method" value={trade.paymentMethod} />}
        </div>
        
        <div className="space-y-2">
            <h4 className="font-semibold">Timestamps</h4>
            <DetailRow label="Created At" value={toDate(trade?.createdAt)?.toLocaleString() ?? 'N/A'} />
            {trade?.paidAt && <DetailRow label="Paid At" value={toDate(trade.paidAt)?.toLocaleString() ?? 'N/A'} />}
            {trade?.releasedAt && <DetailRow label="Released At" value={toDate(trade.releasedAt)?.toLocaleString() ?? 'N/A'} />}
            {trade.status === 'active' && <DetailRow label="Expires At" value={toDate(trade?.expiresAt)?.toLocaleString() ?? 'N/A'} valueClass="text-destructive" />}
        </div>

         {sellerTerms && <div className="space-y-2">
            <h4 className="font-semibold">Seller's Terms</h4>
            <div className="text-sm p-3 bg-secondary rounded-md text-muted-foreground whitespace-pre-wrap">
                <p>{sellerTerms}</p>
            </div>
        </div>}
        
        {showReopen && (
             <Button asChild variant="outline" className="w-full">
                <Link href={`/ad/${trade.adId}`}><RefreshCw className="mr-2 h-4 w-4" /> Reopen Trade</Link>
             </Button>
        )}

      </CardContent>
    </Card>
  );
}
