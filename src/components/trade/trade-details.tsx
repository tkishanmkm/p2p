import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Trade } from "@/lib/types";

interface TradeDetailsProps {
  trade: Trade;
  sellerTerms: string;
}

function DetailRow({ label, value, valueClass }: { label: string, value: string | React.ReactNode, valueClass?: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className={`font-medium text-right ${valueClass}`}>{value}</p>
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
            <DetailRow label="Price" value={`1 ${trade.crypto} = ${parseFloat(trade.price).toLocaleString()} ${trade.fiatAmount.split(' ')[1]}`} />
            <DetailRow label="To receive" value={trade.fiatAmount} valueClass="text-lg font-bold text-green-600" />
        </div>

        <div className="space-y-2">
            <h4 className="font-semibold">Participants</h4>
            <DetailRow label="Buyer" value={trade.buyer.userId} />
            <DetailRow label="Seller" value={trade.seller.userId} />
        </div>
        
        <div className="space-y-2">
            <h4 className="font-semibold">Timestamps</h4>
            <DetailRow label="Created At" value={new Date(trade.createdAt).toLocaleString()} />
            {trade.paidAt && <DetailRow label="Paid At" value={new Date(trade.paidAt).toLocaleString()} />}
            {trade.releasedAt && <DetailRow label="Released At" value={new Date(trade.releasedAt).toLocaleString()} />}
            <DetailRow label="Expires At" value={new Date(trade.expiresAt).toLocaleString()} valueClass="text-destructive" />
        </div>

         <div className="space-y-2">
            <h4 className="font-semibold">Seller's Terms</h4>
            <div className="text-sm p-3 bg-secondary rounded-md text-muted-foreground">
                <p>{sellerTerms}</p>
            </div>
        </div>

      </CardContent>
    </Card>
  );
}
