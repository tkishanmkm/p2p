'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useCountdown } from '@/hooks/use-countdown';

import { cancelTrade, markTradeAsPaid, releaseFundsFromEscrow } from '@/lib/wallet';
import { openDispute } from '@/lib/disputes';
import { cn, toDate } from '@/lib/utils';
import { statusColors } from '@/lib/status-colors';
import type { Trade, TradeStatus } from '@/lib/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { FlagIcon } from '@/components/ui/flag-icon';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Clock, Loader2, Flag } from 'lucide-react';

function DetailRow({ label, value, valueClass, isLink = false, href = '#' }: { label: string, value: string | React.ReactNode, valueClass?: string, isLink?: boolean, href?: string }) {
    const valueContent = isLink ? (
      <Button variant="link" asChild className="p-0 h-auto font-medium text-right"><Link href={href}>{value}</Link></Button>
    ) : (<p className={cn(`font-medium text-right`, valueClass)}>{value}</p>);
    return (<div className="flex justify-between items-center text-sm"><p className="text-muted-foreground">{label}</p>{valueContent}</div>)
}

const CountdownDisplay = ({ targetDate, tradeStatus }: { targetDate: string, tradeStatus: TradeStatus }) => {
    const { hours, minutes, seconds, isFinished } = useCountdown(targetDate);
    if (isFinished || !['active', 'paid'].includes(tradeStatus)) { return <div className="text-sm font-semibold font-mono text-muted-foreground">--:--:--</div>; }
    const displayTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return (<div className="text-sm font-semibold font-mono text-destructive flex items-center gap-1.5">{displayTime}</div>);
}

function ParticipantRow({ label, user }: { label: string, user?: { username: string; country?: string } }) {
    if (!user || !user.username) { return (<div className="flex justify-between items-center text-sm"><p className="text-muted-foreground">{label}</p><p className="font-medium text-right text-muted-foreground">Unknown</p></div>); }
    return (<div className="flex justify-between items-center text-sm"><p className="text-muted-foreground">{label}</p><Button variant="link" asChild className="p-0 h-auto font-medium"><Link href={`/users/${user.username}`} className="flex items-center gap-2">{user.username}{user.country && <FlagIcon countryCode={user.country} />}</Link></Button></div>)
}

const disputeSchema = z.object({
  reason: z.string().min(1, "Please select a reason for the dispute."),
  explanation: z.string().min(10, "Explanation must be at least 10 characters.").max(500, "Explanation cannot exceed 500 characters."),
});
type DisputeFormValues = z.infer<typeof disputeSchema>;
const disputeReasons = [
    "I have paid, but the seller has not released the crypto.",
    "Buyer has not paid, but marked the trade as paid.",
    "Buyer paid the wrong amount.",
    "The other party is unresponsive.",
    "I suspect fraudulent activity or a scam.",
    "Other (please explain in detail below).",
];
function OpenDisputeDialog({ trade, currentUserId, currentUsername }: { trade: Trade; currentUserId: string; currentUsername: string; }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const form = useForm<DisputeFormValues>({
    resolver: zodResolver(disputeSchema),
    defaultValues: { reason: "", explanation: "" }
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: DisputeFormValues) {
    if (!firestore) return;
    try {
      await openDispute(firestore, trade, currentUserId, currentUsername, values.reason, values.explanation);
      toast({ title: "Dispute Opened", description: "A moderator will join the chat shortly to assist you." });
      setIsOpen(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Open Dispute", description: error.message });
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full"><Flag className="mr-2 h-4 w-4" /> Open Dispute</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Open a Dispute for Trade {trade.tradeId}</AlertDialogTitle>
          <AlertDialogDescription>Please provide a clear reason for the dispute. A moderator will review all evidence.</AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger></FormControl>
                  <SelectContent>{disputeReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="explanation" render={({ field }) => (
              <FormItem>
                <FormLabel>Explanation</FormLabel>
                <FormControl><Textarea placeholder="Explain the situation clearly..." {...field} className="min-h-[100px]" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Dispute
            </Button>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const ActionButtons = ({ trade, currentUserRole }: { trade: Trade; currentUserRole: 'buy' | 'sell' }) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    if (!user) return null;

    const handleMarkAsPaid = async () => { if (!firestore) return; try { await markTradeAsPaid(firestore, trade.id); toast({ title: "Success", description: "Seller has been notified that you've paid." }); } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); } };
    const handleReleaseCrypto = async () => { if (!firestore) return; try { await releaseFundsFromEscrow(firestore, trade.id); toast({ title: "Crypto Released", description: "The crypto has been sent to the buyer." }); } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); } };
    const handleCancelTrade = async () => { if (!firestore) return; try { await cancelTrade(firestore, trade.id); toast({ title: "Trade Cancelled" }); } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); } };

    const canBuyerCancel = currentUserRole === 'buy' && (trade.status === 'active' || trade.status === 'disputed');
    const canSellerRelease = currentUserRole === 'sell' && (trade.status === 'paid' || trade.status === 'disputed');
    const canBuyerMarkPaid = currentUserRole === "buy" && trade.status === "active";
    const canOpenDispute = (trade.status === 'active' || trade.status === 'paid');

    return (
        <div className="space-y-2">
            {canBuyerMarkPaid && (
                <AlertDialog><AlertDialogTrigger asChild><Button className="w-full" size="lg">Mark as Paid</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Payment</AlertDialogTitle><AlertDialogDescription>Have you sent <span className="font-bold">{trade.fiatAmount} {trade.fiatCurrency}</span> to the seller? Only confirm after you have fully sent the payment.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleMarkAsPaid}>Yes, I Have Paid</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            )}
            {canSellerRelease && (
                <AlertDialog><AlertDialogTrigger asChild><Button className="w-full" size="lg">Release Crypto</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Release Cryptocurrency?</AlertDialogTitle><AlertDialogDescription>Confirm you have received <span className="font-bold">{trade.fiatAmount} {trade.fiatCurrency}</span>. This action is irreversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleReleaseCrypto}>Confirm and Release</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            )}
            {canBuyerCancel && (
                <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="w-full">Cancel Trade</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancel Trade?</AlertDialogTitle><AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>No</AlertDialogCancel><AlertDialogAction onClick={handleCancelTrade}>Yes, Cancel</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            )}
            {canOpenDispute && (<OpenDisputeDialog trade={trade} currentUserId={user.uid} currentUsername={user.displayName || 'user'} />)}
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Warning</AlertTitle><AlertDescription>To avoid scams, never communicate or trade outside of this platform.</AlertDescription></Alert>
        </div>
    );
};

export function TradeDetails({ trade, sellerTerms, currentUserRole }: { trade: Trade; sellerTerms?: string; currentUserRole: 'buy' | 'sell'; }) {
  const isBuying = currentUserRole === 'buy';
  const showReopen = ['cancelled', 'expired'].includes(trade.status);

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div><CardTitle>Trade Details</CardTitle><CardDescription>ID: {trade?.tradeId || 'N/A'}</CardDescription></div>
                    <Badge variant="outline" className={cn("capitalize", statusColors[trade.status])}>{trade?.status || 'unknown'}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2 rounded-md border p-4">
                    <DetailRow label={isBuying ? "You are buying" : "You are selling"} value={`${trade?.amount ?? 0} ${trade?.crypto ?? ''}`} />
                    <DetailRow label="Price" value={`1 ${trade?.crypto ?? ''} = ${(trade?.price ?? 0).toLocaleString()} ${trade?.fiatCurrency ?? ''}`} />
                    {trade.escrowFee && <DetailRow label="Escrow Fee" value={`${trade.escrowFee.toFixed(8)} ${trade.crypto}`} />}
                    <hr className="my-2 border-dashed" />
                    <DetailRow label={isBuying ? "You will pay" : "You will receive"} value={`${(trade?.fiatAmount ?? 0).toLocaleString()} ${trade?.fiatCurrency ?? ''}`} valueClass={isBuying ? "text-lg font-bold text-destructive" : "text-lg font-bold text-green-600"} />
                </div>
                 <div className="space-y-2">
                    <h4 className="font-semibold">Time Remaining</h4>
                    <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" /><CountdownDisplay targetDate={trade.expiresAt} tradeStatus={trade.status} /></div>
                    <p className="text-xs text-muted-foreground">Time for buyer to make payment.</p>
                </div>
                <div className="space-y-2"><h4 className="font-semibold">Participants & Payment</h4><ParticipantRow label="Buyer" user={trade?.buyer} /><ParticipantRow label="Seller" user={trade?.seller} />{trade?.paymentMethod && <DetailRow label="Payment Method" value={trade.paymentMethod} />}</div>
                <div className="space-y-2"><h4 className="font-semibold">Timestamps</h4><DetailRow label="Created At" value={toDate(trade?.createdAt)?.toLocaleString() ?? 'N/A'} />{trade?.paidAt && <DetailRow label="Paid At" value={toDate(trade.paidAt)?.toLocaleString() ?? 'N/A'} />}{trade?.releasedAt && <DetailRow label="Released At" value={toDate(trade.releasedAt)?.toLocaleString() ?? 'N/A'} />}</div>
                {sellerTerms && <div className="space-y-2"><h4 className="font-semibold">Seller's Terms</h4><div className="text-sm p-3 bg-secondary rounded-md text-muted-foreground whitespace-pre-wrap"><p>{sellerTerms}</p></div></div>}
                {showReopen && (<Button asChild variant="outline" className="w-full"><Link href={`/ad/${trade.adId}`}><RefreshCw className="mr-2 h-4 w-4" /> Reopen Trade</Link></Button>)}
            </CardContent>
        </Card>
        {(trade.status === 'active' || trade.status === 'paid' || trade.status === 'disputed') && <ActionButtons trade={trade} currentUserRole={currentUserRole} />}
    </div>
  );
}
