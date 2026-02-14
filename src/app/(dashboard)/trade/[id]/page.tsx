'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, formatDistanceToNow } from 'date-fns';

import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, addDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAdminStatus } from '@/hooks/use-admin-status';
import { useStopwatch } from '@/hooks/use-stopwatch';
import { useCountdown } from '@/hooks/use-countdown';

import { cancelTrade, markTradeAsPaid, releaseFundsFromEscrow, addReceiptToTrade, claimFundsForTrade } from '@/lib/wallet';
import { openDispute } from '@/lib/disputes';
import { cn, toDate } from '@/lib/utils';
import { statusColors } from '@/lib/status-colors';
import type { Trade, P2PAd, User, TradeStatus, TradeChatMessage } from '@/lib/types';

import ErrorBoundary from '@/components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { DefaultAvatar } from '@/components/icons';
import { FlagIcon } from '@/components/ui/flag-icon';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Shield, MessageSquare, ListDetails, RefreshCw, Clock, Send, Plus, Info, Loader2, ThumbsUp, ThumbsDown, XCircle, CheckCircle, Flag, Calendar, ShieldBan, Users, AlertTriangle } from 'lucide-react';


// --- Sub-component: FeedbackForm ---
function FeedbackForm({ trade }: { trade: Trade }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating || !comment.trim() || !firestore || !user || !user.displayName) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a rating and write a comment.' });
            return;
        }

        setIsSubmitting(true);
        const opponentId = user.uid === trade.buyerId ? trade.sellerId : trade.buyerId;

        try {
            const feedbackRef = collection(firestore, 'trades', trade.id, 'feedback');
            await addDoc(feedbackRef, {
                tradeId: trade.id,
                fromUser: user.uid,
                fromUsername: user.displayName,
                toUser: opponentId,
                rating,
                comment,
                createdAt: new Date().toISOString(),
            });
            await claimFundsForTrade(firestore, trade.id, user.uid);
            toast({ title: 'Feedback Submitted', description: 'Thank you for your feedback!' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit feedback.' });
        } finally {
             setIsSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold text-center text-sm text-foreground">Leave Feedback</h4>
            <RadioGroup onValueChange={(v) => setRating(v as any)} value={rating || ''} className="flex gap-4 justify-center">
                <Label htmlFor="rating-positive" className="flex items-center gap-2 cursor-pointer p-2 border rounded-md has-[:checked]:border-green-500 has-[:checked]:bg-green-100 dark:has-[:checked]:bg-green-900/30">
                    <RadioGroupItem value="positive" id="rating-positive" />
                    <ThumbsUp className="h-5 w-5 text-green-600" /> Positive
                </Label>
                <Label htmlFor="rating-negative" className="flex items-center gap-2 cursor-pointer p-2 border rounded-md has-[:checked]:border-red-500 has-[:checked]:bg-red-100 dark:has-[:checked]:bg-red-900/30">
                    <RadioGroupItem value="negative" id="rating-negative" />
                    <ThumbsDown className="h-5 w-5 text-red-600" /> Negative
                </Label>
            </RadioGroup>
            <Textarea 
                placeholder="Leave a comment about your trading experience..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />
            <Button type="submit" size="sm" className="w-full" disabled={isSubmitting || !rating || !comment}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Feedback
            </Button>
        </form>
    );
}

// --- Sub-component: OpenDisputeDialog ---
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


// --- Sub-component: TradeDetails ---
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
const ActionButtons = ({ trade, currentUserRole }: { trade: Trade; currentUserRole: 'buy' | 'sell' }) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    if (!user) return null;

    const handleMarkAsPaid = async () => { if (!firestore) return; try { await markTradeAsPaid(firestore, trade.id); toast({ title: "Success", description: "Seller has been notified that you've paid." }); } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); } };
    const handleReleaseCrypto = async () => { if (!firestore) return; try { await releaseFundsFromEscrow(firestore, trade.id); toast({ title: "Crypto Released", description: "The crypto has been sent to the buyer." }); } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); } };
    const handleCancelTrade = async () => { if (!firestore) return; try { await cancelTrade(firestore, trade.id); toast({ title: "Trade Cancelled" }); } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); } };

    return (
        <div className="space-y-2">
            {currentUserRole === "buy" && trade.status === "active" && (
                <AlertDialog><AlertDialogTrigger asChild><Button className="w-full" size="lg">Mark as Paid</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Payment</AlertDialogTitle><AlertDialogDescription>Have you sent <span className="font-bold">{trade.fiatAmount} {trade.fiatCurrency}</span> to the seller? Only confirm after you have fully sent the payment.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleMarkAsPaid}>Yes, I Have Paid</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            )}
            {currentUserRole === "sell" && trade.status === "paid" && (
                <AlertDialog><AlertDialogTrigger asChild><Button className="w-full" size="lg">Release Crypto</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Release Cryptocurrency?</AlertDialogTitle><AlertDialogDescription>Confirm you have received <span className="font-bold">{trade.fiatAmount} {trade.fiatCurrency}</span>. This action is irreversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleReleaseCrypto}>Confirm and Release</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            )}
            {trade.status === 'active' && currentUserRole === 'buy' && (
                <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="w-full">Cancel Trade</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancel Trade?</AlertDialogTitle><AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>No</AlertDialogCancel><AlertDialogAction onClick={handleCancelTrade}>Yes, Cancel</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            )}
            {(trade.status === 'paid' || trade.status === 'active') && (<OpenDisputeDialog trade={trade} currentUserId={user.uid} currentUsername={user.displayName || 'user'} />)}
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Warning</AlertTitle><AlertDescription>To avoid scams, never communicate or trade outside of this platform.</AlertDescription></Alert>
        </div>
    );
};
function TradeDetails({ trade, sellerTerms, currentUserRole }: { trade: Trade; sellerTerms?: string; currentUserRole: 'buy' | 'sell'; }) {
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
        {(trade.status === 'active' || trade.status === 'paid') && <ActionButtons trade={trade} currentUserRole={currentUserRole} />}
    </div>
  );
}

// --- Sub-component: TradeChat ---
const TradeSummaryBar = ({ trade, isBuyer }: { trade: Trade, isBuyer: boolean }) => {
    const bgColor = isBuyer ? 'bg-green-600/10' : 'bg-red-600/10';
    const textColor = isBuyer ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300';
    const roleText = isBuyer ? 'Buying' : 'Selling';
    const paymentMethod = trade.paymentMethod;
    return (<div className={cn('p-4 rounded-lg text-sm font-semibold text-center', bgColor, textColor)}>{roleText} {trade.amount} {trade.crypto} for {trade.fiatAmount.toLocaleString()} {trade.fiatCurrency} – {paymentMethod}</div>);
}
function TradeChat({ currentUserId, trade, opponent, isAdmin, onInfoClick }: { currentUserId: string; trade: Trade; opponent: User | null | undefined; isAdmin: boolean; onInfoClick: () => void; }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'trades', trade.id, 'messages'), orderBy('createdAt', 'asc')) : null), [firestore, trade.id]);
  const { data: messages, isLoading: areMessagesLoading } = useCollection<TradeChatMessage>(messagesQuery);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTradeFinished = ['released', 'cancelled', 'expired', 'disputed'].includes(trade.status);
  const stopwatch = useStopwatch(trade.createdAt, isTradeFinished);

  const displayMessages = useMemo(() => {
    const baseMessages = messages || [];
    let finalMessage: TradeChatMessage | null = null;
    if (trade.status === 'released' && trade.claimedByBuyer) {
      finalMessage = { id: 'system-final', tradeId: trade.id, senderId: 'system', senderUsername: 'System', message: 'Trade Completed', isModerator: true, createdAt: trade.releasedAt || new Date().toISOString() };
    } else if (trade.status === 'cancelled') {
      finalMessage = { id: 'system-final', tradeId: trade.id, senderId: 'system', senderUsername: 'System', message: 'Trade is cancelled.\nKindly do not pay. If you have already paid, please reopen the trade.', isModerator: true, createdAt: trade.createdAt };
    } else if (trade.status === 'expired') {
      finalMessage = { id: 'system-final', tradeId: trade.id, senderId: 'system', senderUsername: 'System', message: 'Trade is expired.\nKindly do not pay. If you have already paid, please open a new trade.', isModerator: true, createdAt: trade.expiresAt };
    } else if (trade.status === 'disputed') {
       finalMessage = { id: 'system-final', tradeId: trade.id, senderId: 'system', senderUsername: 'System', message: 'Trade is disputed. A moderator will join the chat shortly.', isModerator: true, createdAt: new Date().toISOString() };
    }
    return finalMessage ? [...baseMessages, finalMessage] : baseMessages;
  }, [messages, trade.status, trade.id, trade.releasedAt, trade.createdAt, trade.expiresAt, trade.claimedByBuyer]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) { viewport.scrollTop = viewport.scrollHeight; }
    }
  }, [displayMessages]);

  const handleSendMessage = async (e: React.FormEvent, mediaUrl?: string, mediaType?: 'image' | 'video' | 'audio') => {
    e.preventDefault();
    if ((!newMessage.trim() && !mediaUrl) || !firestore || !user) return;
    const blockedWords = ['telegram', 'whatsapp', 'phone', 'contact'];
    if (blockedWords.some(word => newMessage.toLowerCase().includes(word))) {
      toast({ variant: 'destructive', title: 'Message Blocked', description: 'Please do not share contact information.' });
      return;
    }
    const messageToSend = newMessage;
    setNewMessage('');
    try {
      await addDoc(collection(firestore, 'trades', trade.id, 'messages'), { tradeId: trade.id, senderId: currentUserId, senderUsername: user.displayName || 'User', message: messageToSend, isModerator: isAdmin, createdAt: new Date().toISOString(), mediaUrl: mediaUrl || null, mediaType: mediaType || 'none' });
      if (mediaUrl && trade.status === 'active') {
        await addReceiptToTrade(firestore, trade.id, mediaUrl);
        toast({ title: 'Receipt Uploaded', description: 'The seller has been notified.' });
      }
    } catch (error: any) { toast({ variant: 'destructive', title: 'Send Failed', description: error.message }); }
  };
  
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        let mediaType: 'image' | 'video' | 'audio' = 'image';
        if (file.type.startsWith('video/')) mediaType = 'video';
        if (file.type.startsWith('audio/')) mediaType = 'audio';
        handleSendMessage(new Event('submit'), result, mediaType).finally(() => { setIsUploading(false); if(fileInputRef.current) fileInputRef.current.value = ""; });
      } else { setIsUploading(false); }
    };
    reader.onerror = () => { setIsUploading(false); toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read the selected file.' }); };
    reader.readAsDataURL(file);
  };

  const isBuyer = currentUserId === trade.buyerId;
  const opponentLastActive = opponent?.lastActive ? toDate(opponent.lastActive) : null;
  let activityText = 'Offline';
  if (opponentLastActive) { activityText = `Seen ${formatDistanceToNow(opponentLastActive)} ago`; }

  const renderSystemMessageContent = (msg: TradeChatMessage) => {
    if (msg.message === 'Trade Completed') { return (<Card className="border-green-500 bg-green-50 text-center dark:bg-green-900/20"><CardContent className="pt-6 space-y-4"><div className="flex flex-col items-center gap-3"><CheckCircle className="h-10 w-10 text-green-600"/><div><h3 className="font-bold text-green-800 dark:text-green-300">Trade Completed</h3><p className="text-sm text-green-700 dark:text-green-400">Congratulations! The coin has been released.</p></div></div><FeedbackForm trade={trade} /></CardContent></Card>); }
    if (msg.message.startsWith('Trade is cancelled')) { return (<Alert variant="destructive" className="text-center"><XCircle className="h-4 w-4" /><AlertTitle>Trade Cancelled</AlertTitle><AlertDescription>{msg.message.replace('Trade is cancelled.\n','')}</AlertDescription></Alert>); }
    if (msg.message.startsWith('Trade is expired')) { return (<Alert variant="default" className="text-center border-orange-500 text-orange-800 dark:text-orange-300 dark:border-orange-500/50 dark:bg-orange-900/20"><AlertTriangle className="h-4 w-4" /><AlertTitle>Trade Expired</AlertTitle><AlertDescription>{msg.message.replace('Trade is expired.\n','')}</AlertDescription></Alert>); }
    if (msg.message.startsWith('Trade is disputed')) { return <Alert variant="default" className="text-center border-amber-500 text-amber-800 dark:text-amber-300 dark:border-amber-500/50 dark:bg-amber-900/20"><Flag className="h-4 w-4" /><AlertTitle>Dispute Started</AlertTitle><AlertDescription>{msg.message.replace('Trade is disputed.\n','')}</AlertDescription></Alert>}
    return <div className="text-center text-xs text-muted-foreground p-2 rounded-md bg-secondary">{msg.message}</div>;
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="space-y-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Link href={`/users/${opponent?.userId || ''}`}>
                    <Avatar className="h-10 w-10"><AvatarImage src={opponent?.photoURL} /><AvatarFallback><DefaultAvatar /></AvatarFallback></Avatar>
                </Link>
                <div>
                    <div className="flex items-center gap-1.5">
                        <Link href={`/users/${opponent?.userId || ''}`} className="font-semibold hover:underline">{opponent?.userId}</Link>
                        {opponent?.country && <FlagIcon countryCode={opponent.country} />}
                        <Button variant="ghost" size="icon" onClick={onInfoClick} className="h-6 w-6"><Info className="h-4 w-4" /></Button>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2"><span>{activityText}</span></div>
                </div>
            </div>
            <div className="text-right">
                <div className="flex items-center gap-4 text-sm"><div className="flex items-center gap-1.5"><ThumbsUp className="h-4 w-4 text-green-500" /><span>{opponent?.positiveFeedback || 0}</span></div><div className="flex items-center gap-1.5"><ThumbsDown className="h-4 w-4 text-red-500" /><span>{opponent?.negativeFeedback || 0}</span></div></div>
                <div className="text-sm font-semibold font-mono flex items-center gap-1.5 justify-end mt-1"><Clock className="h-4 w-4" />{stopwatch}</div>
            </div>
        </div>
        <TradeSummaryBar trade={trade} isBuyer={isBuyer} />
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden"><ScrollArea className="h-[50vh] lg:h-full pr-4" ref={scrollAreaRef}>{areMessagesLoading ? <div className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-12" /></div> : <div className="space-y-4">{displayMessages.map((msg) => {if(msg.senderId === 'system') { return <div key={msg.id} className="py-2">{renderSystemMessageContent(msg)}</div>; } const isCurrentUser = msg.senderId === currentUserId; let senderName: string | React.ReactNode = isCurrentUser ? 'You' : opponent?.userId || 'Opponent'; if (msg.isModerator) senderName = 'Moderator'; const senderAvatar = isCurrentUser ? null : msg.isModerator ? <Avatar className="h-8 w-8"><AvatarFallback className="bg-blue-500"><Shield className="h-4 w-4 text-white" /></AvatarFallback></Avatar> : <Avatar className="h-8 w-8"><AvatarImage src={opponent?.photoURL} /><AvatarFallback>{opponent?.userId?.substring(0, 2)}</AvatarFallback></Avatar>; return (<div key={msg.id} className={cn('flex items-end gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}>{!isCurrentUser && (<div className="self-end">{senderAvatar}</div>)}<div className={cn('max-w-[75%] rounded-lg p-3 text-sm flex flex-col items-start gap-1', isCurrentUser && !msg.isModerator && 'bg-primary text-primary-foreground', !isCurrentUser && !msg.isModerator && 'bg-muted', msg.isModerator && 'bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700')}><p className="font-bold text-xs">{senderName}</p>{msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}{msg.mediaUrl && msg.mediaType === 'image' && (<a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"><Image src={msg.mediaUrl} alt="Uploaded attachment" width={200} height={200} className="rounded-md mt-2 max-w-full h-auto" /></a>)}{msg.mediaUrl && (msg.mediaType === 'video' || msg.mediaType === 'audio' || msg.mediaType === undefined) && <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">View Attached File</a>}<p className="text-xs mt-1 opacity-70 text-right w-full">{toDate(msg.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? 'sending...'}</p></div></div>);})}</div>}</ScrollArea></CardContent>
      <CardFooter><form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2"><input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,video/*,application/pdf" /><Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading || isTradeFinished}>{isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}</Button><Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Write a message..." autoComplete="off" disabled={isUploading || isTradeFinished} /><Button type="submit" size="icon" disabled={isUploading || !newMessage.trim() || isTradeFinished}><Send className="h-5 w-5" /><span className="sr-only">Send</span></Button></form></CardFooter>
    </Card>
  );
}

// --- Sub-component: CounterpartyInfoPanel ---
function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number | undefined }) {
    if (value === undefined || value === null) return null;
    return (<div className="flex items-center gap-3 py-2 border-b"><div className="text-muted-foreground">{icon}</div><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium text-sm">{value}</p></div></div>);
}
function CounterpartyInfoPanel({ user, open, onOpenChange }: { user: User | null | undefined; open: boolean; onOpenChange: (open: boolean) => void; }) {
  if (!user) return null;
  const createdDate = toDate(user.createdAt);
  const dob = toDate(user.dob);
  const joinedAgo = createdDate ? formatDistanceToNow(createdDate) + ' ago' : 'N/A';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}><SheetContent>
        <SheetHeader><SheetTitle>Trader Information</SheetTitle><SheetDescription>Details for {user.userId}</SheetDescription></SheetHeader>
        <div className="py-4 space-y-6"><div className="flex flex-col items-center gap-2"><Avatar className="h-24 w-24 border-4 border-secondary"><AvatarImage src={user.photoURL} /><AvatarFallback><DefaultAvatar /></AvatarFallback></Avatar><h2 className="text-xl font-bold">{user.fullName}</h2><p className="text-sm text-muted-foreground">@{user.userId}</p></div>
        <div className="space-y-1">
             <DetailItem icon={<Calendar size={16} />} label="Date of Birth" value={dob ? format(dob, 'LLLL d, yyyy') : 'N/A'} />
             <DetailItem icon={<Calendar size={16} />} label="Joined" value={joinedAgo} />
             <DetailItem icon={<CheckCircle size={16} />} label="Completed Trades" value={user.completedTrades?.toLocaleString()} />
             <DetailItem icon={<ThumbsUp size={16} />} label="Positive Feedback" value={`${user.feedbackScore || 100}% (${user.positiveFeedback || 0})`} />
             <DetailItem icon={<ThumbsDown size={16} />} label="Negative Feedback" value={user.negativeFeedback || 0} />
             <DetailItem icon={<ShieldBan size={16} />} label="Users Blocked" value={user.blockedUsers?.length || 0} />
             <p className="text-xs text-muted-foreground pt-2">Information on how many users have blocked this trader is not available.</p>
        </div></div>
    </SheetContent></Sheet>
  );
}

// --- Main Page Component ---
function TradePageContent({ tradeId }: { tradeId: string }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const { isAdmin } = useAdminStatus();
  const [mobileView, setMobileView] = useState<'chat' | 'details'>('chat');
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  // Memoized Firestore references
  const tradeRef = useMemoFirebase(() => (firestore && tradeId ? doc(firestore, "trades", tradeId) : null), [firestore, tradeId]);
  const { data: trade, isLoading, error } = useDoc<Trade>(tradeRef);

  // Stabilize dependencies by extracting IDs from the trade object
  const adId = trade?.adId;
  const buyerId = trade?.buyerId;
  const sellerId = trade?.sellerId;

  const adRef = useMemoFirebase(() => (firestore && adId ? doc(firestore, 'p2p_ads', adId) : null), [firestore, adId]);
  const { data: ad } = useDoc<P2PAd>(adRef);

  const buyerRef = useMemoFirebase(() => (firestore && buyerId ? doc(firestore, 'users', buyerId) : null), [firestore, buyerId]);
  const { data: buyerProfile } = useDoc<User>(buyerRef);

  const sellerRef = useMemoFirebase(() => (firestore && sellerId ? doc(firestore, 'users', sellerId) : null), [firestore, sellerId]);
  const { data: sellerProfile } = useDoc<User>(sellerRef);
  
  if (isLoading) { return <div className="grid lg:grid-cols-3 gap-8 h-full"><Skeleton className="lg:col-span-1 h-full" /><Skeleton className="lg:col-span-2 h-full" /></div>; }
  if (error) { return (<Card className="border-destructive"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle /> Error Loading Trade</CardTitle><CardDescription className="text-destructive">There was a problem loading the trade data. This could be due to a network issue or a problem with the trade document itself.</CardDescription></CardHeader><CardContent><h3 className="font-semibold">Error Details:</h3><pre className="mt-2 w-full whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm text-muted-foreground">{error.message}</pre></CardContent></Card>); }
  if (!trade || !user) { return <Card><CardHeader><CardTitle>Trade Not Found</CardTitle><CardDescription>This trade may have been completed or does not exist.</CardDescription></CardHeader></Card>; }
  if (!trade.buyer || !trade.seller) { return (<Card><CardHeader><CardTitle>Incomplete Trade Data</CardTitle><CardDescription>This trade document is missing critical participant information and cannot be displayed.</CardDescription></CardHeader><CardContent><p>This may be due to old data. Please contact support if this is a recent trade.</p></CardContent></Card>); }
  
  const currentUserRole = user.uid === trade.buyerId ? "buy" : "sell";
  const opponentProfile = user.uid === trade.buyerId ? sellerProfile : buyerProfile;
  
  const handleAdminCancelTrade = async () => { if (!firestore) return; try { await cancelTrade(firestore, trade.id); toast({ title: "Trade Cancelled by Admin" }); } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); } }

  return (
    <div className="flex flex-col h-full w-full">
        <div className="flex items-center justify-between mb-4 flex-shrink-0"><h1 className="text-lg font-semibold md:text-2xl">Trade {trade.tradeId}</h1></div>
        {isAdmin && (<Card className="mb-4 border-amber-500 flex-shrink-0"><CardHeader className="flex flex-row items-center gap-4 space-y-0"><Shield className="h-6 w-6 text-amber-500" /><div className="grid gap-1"><CardTitle>Admin Controls</CardTitle><CardDescription>You are viewing this trade as an administrator.</CardDescription></div></CardHeader><CardContent className="flex gap-4">{(trade.status === "active" || trade.status === "paid") && <Button variant="destructive" onClick={handleAdminCancelTrade}>Admin: Cancel Trade</Button>}</CardContent></Card>)}
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8 flex-grow min-h-0">
            <div className={cn("lg:col-span-1 space-y-6", mobileView === 'details' ? 'block' : 'hidden lg:block')}><TradeDetails trade={trade} sellerTerms={ad?.terms} currentUserRole={currentUserRole} /></div>
            <div className={cn("lg:col-span-2 flex-grow flex flex-col min-h-0", mobileView === 'chat' ? 'flex' : 'hidden lg:flex')}><TradeChat currentUserId={user.uid} trade={trade} opponent={opponentProfile} isAdmin={isAdmin} onInfoClick={() => setIsInfoPanelOpen(true)} /></div>
        </div>
        <div className="md:hidden grid grid-cols-2 gap-2 border-t pt-2 mt-2 bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mb-2 sm:-mb-4 lg:-mb-6 px-2 sm:px-4 lg:px-6 sticky bottom-0">
            <Button variant={mobileView === 'details' ? 'default' : 'outline'} onClick={() => setMobileView('details')}><ListDetails className="mr-2 h-4 w-4" /> Details</Button>
            <Button variant={mobileView === 'chat' ? 'default' : 'outline'} onClick={() => setMobileView('chat')}><MessageSquare className="mr-2 h-4 w-4" /> Chat</Button>
        </div>
        <CounterpartyInfoPanel user={opponentProfile} open={isInfoPanelOpen} onOpenChange={setIsInfoPanelOpen} />
    </div>
  );
}


export default function TradePage({ params }: { params: { id: string } }) {
    return (
      <div className="flex flex-col h-full">
        <ErrorBoundary>
            <TradePageContent tradeId={params.id} />
        </ErrorBoundary>
      </div>
    )
}
