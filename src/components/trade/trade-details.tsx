import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Trade } from "@/lib/types";
import Link from "next/link";
import { Button } from "../ui/button";

interface TradeDetailsProps {
  trade: Trade;
  sellerTerms?: string; // Made optional as we might not have it right away
}

function DetailRow({ label, value, valueClass, isLink = false, href = '#' }: { label: string, value: string | React.ReactNode, valueClass?: string, isLink?: boolean, href?: string }) {
  const valueContent = isLink ? (
    <Button variant="link" asChild className="p-0 h-auto font-medium">
        <Link href={href}>{value}</Link>
    </Button>
  ) : (
    <p className={`font-medium text-right ${valueClass}`}>{value}</p>
  );
  
  return (
    <div className="flex justify-between items-center text-sm">
      <p className="text-muted-foreground">{label}</p>
      {valueContent}
    </div>
  )
}

export function TradeDetails({ trade, sellerTerms }: TradeDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Trade Details</CardTitle>
                <CardDescription>ID: {trade.tradeId}</CardDescription>
            </div>
            <Badge variant="outline" className="capitalize">{trade.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-4">
            <DetailRow label="You are selling" value={`${trade.amount} ${trade.crypto}`} />
            <DetailRow label="Price" value={`1 ${trade.crypto} = ${trade.price.toLocaleString()} ${trade.fiatCurrency}`} />
            <DetailRow label="To receive" value={`${trade.fiatAmount} ${trade.fiatCurrency}`} valueClass="text-lg font-bold text-green-600" />
        </div>

        <div className="space-y-2">
            <h4 className="font-semibold">Participants & Payment</h4>
            <DetailRow label="Buyer" value={trade.buyer.userId} isLink href={`/users/${trade.buyer.userId}`} />
            <DetailRow label="Seller" value={trade.seller.userId} isLink href={`/users/${trade.seller.userId}`} />
            <DetailRow label="Payment Method" value={trade.paymentMethod} />
        </div>
        
        <div className="space-y-2">
            <h4 className="font-semibold">Timestamps</h4>
            <DetailRow label="Created At" value={new Date(trade.createdAt).toLocaleString()} />
            {trade.paidAt && <DetailRow label="Paid At" value={new Date(trade.paidAt).toLocaleString()} />}
            {trade.releasedAt && <DetailRow label="Released At" value={new Date(trade.releasedAt).toLocaleString()} />}
            <DetailRow label="Expires At" value={new Date(trade.expiresAt).toLocaleString()} valueClass="text-destructive" />
        </div>

         {sellerTerms && <div className="space-y-2">
            <h4 className="font-semibold">Seller's Terms</h4>
            <div className="text-sm p-3 bg-secondary rounded-md text-muted-foreground">
                <p>{sellerTerms}</p>
            </div>
        </div>}

      </CardContent>
    </Card>
  );
}
