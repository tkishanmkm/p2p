

'use client';

import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Trade, TradeStatus } from "@/lib/types";
import Link from "next/link";
import { Button } from "../ui/button";
import { toDate, cn } from "@/lib/utils";
import { FlagIcon } from "../ui/flag-icon";
import { RefreshCw, AlertCircle, Clock } from "lucide-react";
import { statusColors } from "@/lib/status-colors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cancelTrade, markTradeAsPaid, releaseFundsFromEscrow } from '@/lib/wallet';
import { OpenDisputeDialog } from '@/components/trade/open-dispute-dialog';
import { useCountdown } from '@/hooks/use-countdown';

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

const CountdownDisplay = ({ targetDate, tradeStatus }: { targetDate: string, tradeStatus: TradeStatus }) => {
    const { hours, minutes, seconds, isFinished } = useCountdown(targetDate);
    
    if (isFinished || !['active', 'paid'].includes(tradeStatus)) {
        return <div className="text-sm font-semibold font-mono text-muted-foreground">--:--:--</div>;
    }

    const displayTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
    return (
      <div className="text-sm font-semibold font-mono text-destructive flex items-center gap-1.5">
        {displayTime}
      </div>
    );
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

const ActionButtons = ({ trade, currentUserRole }: { trade: Trade; currentUserRole: 'buy' | 'sell' }) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    if (!user) return null;

    const handleMarkAsPaid = async () => {
        if (!firestore) return;
        try {
            await markTradeAsPaid(firestore, trade.id);
            toast({ title: "Success", description: "Seller has been notified that you've paid." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        }
    };

    const handleReleaseCrypto = async () => {
        if (!firestore) return;
        try {
            await releaseFundsFromEscrow(firestore, trade.id);
            toast({ title: "Crypto Released", description: "The crypto has been sent to the buyer." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        }
    };

    const handleCancelTrade = async () => {
        if (!firestore) return;
        try {
            await cancelTrade(firestore, trade.id);
            toast({ title: "Trade Cancelled" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        }
    };

    return (
        <div className="space-y-2">
            {currentUserRole === "buy" && trade.status === "active" && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="w-full" size="lg">Mark as Paid</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                            <AlertDialogDescription>
                                Have you sent <span className="font-bold">{trade.fiatAmount} {trade.fiatCurrency}</span> to the seller? Only confirm after you have fully sent the payment.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleMarkAsPaid}>Yes, I Have Paid</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {currentUserRole === "sell" && trade.status === "paid" && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="w-full" size="lg">Release Crypto</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Release Cryptocurrency?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Confirm you have received <span className="font-bold">{trade.fiatAmount} {trade.fiatCurrency}</span>. This action is irreversible.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReleaseCrypto}>Confirm and Release</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {trade.status === 'active' && currentUserRole === 'buy' && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full">Cancel Trade</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Trade?</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>No</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCancelTrade}>Yes, Cancel</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {trade.status === 'paid' && (
                <OpenDisputeDialog
                    trade={trade}
                    currentUserId={user.uid}
                    currentUsername={user.displayName || 'user'}
                />
            )}
            <div className="text-xs p-3 bg-red-100 border-l-4 border-red-500 text-red-900 rounded-r-md flex gap-2 items-start">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                    <strong>Warning:</strong> To avoid scams, never communicate or trade outside of this platform.
                </p>
            </div>
        </div>
    );
};


export function TradeDetails({ trade, sellerTerms, currentUserRole }: TradeDetailsProps) {
  const isBuying = currentUserRole === 'buy';
  const showReopen = ['cancelled', 'expired'].includes(trade.status);

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Trade Details</CardTitle>
                        <CardDescription>ID: {trade?.tradeId || 'N/A'}</CardDescription>
                    </div>
                    <Badge variant="outline" className={cn("capitalize", statusColors[trade.status])}>{trade?.status || 'unknown'}</Badge>
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
                    <h4 className="font-semibold">Time Remaining</h4>
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <CountdownDisplay targetDate={trade.expiresAt} tradeStatus={trade.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">Time for buyer to make payment.</p>
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
        {(trade.status === 'active' || trade.status === 'paid') && <ActionButtons trade={trade} currentUserRole={currentUserRole} />}
    </div>
  );
}
