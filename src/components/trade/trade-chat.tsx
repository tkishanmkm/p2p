
'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatDistanceToNow } from 'date-fns';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAdminStatus } from '@/hooks/use-admin-status';
import { useStopwatch } from '@/hooks/use-stopwatch';

import { addReceiptToTrade } from '@/lib/wallet';
import { cn, toDate } from '@/lib/utils';
import type { Trade, User, TradeChatMessage } from '@/lib/types';

import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

import { DefaultAvatar, Logo } from '@/components/icons';
import { FlagIcon } from '@/components/ui/flag-icon';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Shield, Clock, Send, Plus, Info as InfoIcon, Loader2, ThumbsUp, ThumbsDown, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { claimFundsForTrade } from '@/lib/wallet';


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

            // Claim funds after leaving feedback
            if (user.uid === trade.buyerId) {
                await claimFundsForTrade(firestore, trade.id, user.uid);
            }

            toast({ title: 'Feedback Submitted', description: 'Thank you for your feedback!' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to submit feedback. ${error.message}` });
        } finally {
             setIsSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold text-center text-sm text-foreground">Leave Feedback</h4>
            <RadioGroup onValueChange={(v) => setRating(v as any)} value={rating || ''} className="flex gap-4 justify-center">
                <FormItem>
                    <FormControl>
                        <RadioGroupItem value="positive" id="rating-positive" className="sr-only" />
                    </FormControl>
                    <FormLabel htmlFor="rating-positive" className="flex items-center gap-2 cursor-pointer p-2 border rounded-md has-[:checked]:border-green-500 has-[:checked]:bg-green-100 dark:has-[:checked]:bg-green-900/30">
                        <ThumbsUp className="h-5 w-5 text-green-600" /> Positive
                    </FormLabel>
                </FormItem>
                <FormItem>
                     <FormControl>
                        <RadioGroupItem value="negative" id="rating-negative" className="sr-only" />
                    </FormControl>
                    <FormLabel htmlFor="rating-negative" className="flex items-center gap-2 cursor-pointer p-2 border rounded-md has-[:checked]:border-red-500 has-[:checked]:bg-red-100 dark:has-[:checked]:bg-red-900/30">
                        <ThumbsDown className="h-5 w-5 text-red-600" /> Negative
                    </FormLabel>
                </FormItem>
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

// --- Sub-component: TradeInstructions ---
function TradeInstructions({ trade, isBuyer }: { trade: Trade, isBuyer: boolean }) {
    const title = isBuyer 
        ? `You're buying ${trade.amount.toFixed(8)} ${trade.crypto} for ${trade.fiatAmount.toLocaleString()} ${trade.fiatCurrency} via ${trade.paymentMethod}.`
        : `You're selling ${trade.amount.toFixed(8)} ${trade.crypto} for ${trade.fiatAmount.toLocaleString()} ${trade.fiatCurrency} via ${trade.paymentMethod}.`;
    
    const instructions = isBuyer ? [
        "When the seller is ready to start the transaction, they'll share their bank account details in the trade chat.",
        "Make your payment.",
        "Mark the trade as Paid and upload proof of payment.",
        "Wait for your trade partner to confirm your payment.",
        "Your trade partner will release the BTC to you.",
    ] : [
        "Wait for the buyer to make the payment.",
        "Once payment is received and confirmed in your account, release the BTC.",
        "Do not release funds based on payment proof alone. Always verify in your account.",
        "If the buyer doesn't pay within the time limit, the trade will automatically expire.",
    ];

    return (
        <Alert className="bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200">
            <InfoIcon className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="font-bold">
                {title}
            </AlertTitle>
            <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                <p className="mb-2">The crypto is now in escrow and it's safe to make your payment.</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                    {instructions.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
            </AlertDescription>
        </Alert>
    );
}

// --- Sub-component: SystemMessage ---
function SystemMessage({ type, children }: { type: 'dispute' | 'success' | 'error' | 'warning' | 'info'; children: React.ReactNode }) {
    const variants = {
        dispute: 'border-blue-500/50 text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20',
        success: 'border-green-500/50 text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-900/20',
        error: 'border-destructive/50 text-destructive bg-destructive/10',
        warning: 'border-yellow-500/50 text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20',
        info: 'border-gray-500/50 text-muted-foreground bg-secondary',
    };
    return <div className={cn("text-center text-xs p-3 rounded-md border", variants[type])}>{children}</div>;
}


// --- Sub-component: TradeSummaryBar ---
const TradeSummaryBar = ({ trade, isBuyer }: { trade: Trade, isBuyer: boolean }) => {
    const bgColor = isBuyer ? 'bg-green-600/10' : 'bg-red-500/20';
    const textColor = isBuyer ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-400';
    const roleText = isBuyer ? 'Buying' : 'Selling';
    return (<div className={cn('p-4 rounded-lg text-base font-semibold text-center', bgColor, textColor)}>{roleText} {trade.amount.toFixed(8)} {trade.crypto} for {trade.fiatAmount.toLocaleString()} {trade.fiatCurrency}</div>);
}

export default function TradeChat({ currentUserId, trade, opponent, isAdmin, onInfoClick }: { currentUserId: string; trade: Trade; opponent: User | null | undefined; isAdmin: boolean; onInfoClick: () => void; }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'trades', trade.id, 'messages'), orderBy('createdAt', 'asc')) : null), [firestore, trade.id]);
  const { data: messages, isLoading: areMessagesLoading } = useCollection<TradeChatMessage>(messagesQuery);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTradeFinished = ['released', 'cancelled', 'expired'].includes(trade.status);
  const stopwatch = useStopwatch(trade.createdAt, isTradeFinished);

  const displayMessages = useMemo(() => {
    const baseMessages = messages || [];
    const systemMessages: TradeChatMessage[] = [];

    // This message is generated by the `markTradeAsPaid` function now
    // We just need to handle the other system-level status changes.

    if (trade.status === 'disputed' && !baseMessages.some(m => m.id === 'system-dispute-alert')) {
      systemMessages.push({
        id: 'system-dispute-alert',
        tradeId: trade.id,
        senderId: 'system',
        senderUsername: 'System',
        message: 'This trade has been marked as disputed. Please do not release any crypto or make any further payment until the moderator reviews the case. A TradeFlow moderator will join the chat shortly to investigate and provide instructions. Kindly cooperate and share any required proof or details in the chat.',
        isModerator: true,
        createdAt: new Date().toISOString(),
      });
    }

    if (trade.status === 'released' && trade.claimedByBuyer && !baseMessages.some(m => m.id === 'system-final')) {
      systemMessages.push({
        id: 'system-final',
        tradeId: trade.id,
        senderId: 'system',
        senderUsername: 'System',
        message: 'Congratulations! This trade has been successfully completed. The crypto has been released to the buyer, and the transaction is now closed. If you are satisfied with the trade, please leave feedback for your trade partner.',
        isModerator: true,
        createdAt: trade.releasedAt || new Date().toISOString(),
      });
    }
    
    if (trade.status === 'cancelled' && !baseMessages.some(m => m.id === 'system-final')) {
       systemMessages.push({
        id: 'system-final',
        tradeId: trade.id,
        senderId: 'system',
        senderUsername: 'System',
        message: 'This trade has been cancelled. Do not make any payment if you have not already paid. If you have already made a payment, immediately contact support and share proof of payment in the chat. Do not release or expect any crypto from this trade, as it is no longer active.',
        isModerator: true,
        createdAt: new Date().toISOString(),
      });
    }

    if (trade.status === 'expired' && !baseMessages.some(m => m.id === 'system-final')) {
       systemMessages.push({
        id: 'system-final',
        tradeId: trade.id,
        senderId: 'system',
        senderUsername: 'System',
        message: 'This trade has expired due to inactivity or time limit. Do not make any payment, as the trade is no longer valid. If you still wish to proceed, please create a new trade.',
        isModerator: true,
        createdAt: trade.expiresAt,
      });
    }
    
    const allMessages = [...baseMessages, ...systemMessages];
    allMessages.sort((a, b) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0));

    return allMessages;
  }, [messages, trade]);

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

  const renderSystemMessage = (msg: TradeChatMessage) => {
    if (msg.message.startsWith("Congratulations!")) {
      return <SystemMessage type="success"><p className="font-bold">Trade Completed</p><p>{msg.message}</p><FeedbackForm trade={trade} /></SystemMessage>
    }
    if (msg.message.startsWith("This trade has been cancelled")) {
      return <SystemMessage type="error"><p className="font-bold">Trade Cancelled</p><p>{msg.message}</p></SystemMessage>
    }
    if (msg.message.startsWith("This trade has expired")) {
      return <SystemMessage type="info"><p className="font-bold">Trade Expired</p><p>{msg.message}</p></SystemMessage>
    }
    if (msg.message.startsWith("This trade has been marked as disputed")) {
      return <SystemMessage type="dispute"><p className="font-bold">Trade is Disputed. A moderator will join shortly.</p><p>{msg.message}</p></SystemMessage>
    }
     if (msg.message.startsWith("Buyer has marked the trade as Paid")) {
      return <SystemMessage type="success">{msg.message}</SystemMessage>
    }
    // Default system message for dispute open, etc.
    return <SystemMessage type="info">{msg.message}</SystemMessage>
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
                        <Button variant="ghost" size="icon" onClick={onInfoClick} className="h-6 w-6"><InfoIcon className="h-4 w-4" /></Button>
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
      <CardContent className="flex-grow overflow-hidden min-h-[400px]">
        <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            <TradeInstructions trade={trade} isBuyer={isBuyer} />
            {areMessagesLoading ? <div className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-12" /></div> : 
              <div className="space-y-4">
                {displayMessages.map((msg) => {
                  if (msg.senderId === 'system') {
                    return <div key={msg.id} className="py-2">{renderSystemMessage(msg)}</div>;
                  }
                  const isCurrentUser = msg.senderId === currentUserId;
                  let senderName: string | React.ReactNode = isCurrentUser ? 'You' : opponent?.userId || 'Opponent';
                  if (msg.isModerator) senderName = 'Moderator';
                  
                  const senderAvatar = isCurrentUser 
                    ? null 
                    : msg.isModerator 
                      ? <Avatar className="h-8 w-8"><AvatarFallback className="bg-transparent"><Logo /></AvatarFallback></Avatar> 
                      : <Avatar className="h-8 w-8"><AvatarImage src={opponent?.photoURL} /><AvatarFallback>{opponent?.userId?.substring(0, 2)}</AvatarFallback></Avatar>;

                  return (
                    <div key={msg.id} className={cn('flex items-end gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}>
                      {!isCurrentUser && (<div className="self-end">{senderAvatar}</div>)}
                      <div className={cn(
                          'max-w-[75%] rounded-lg p-3 text-sm flex flex-col items-start gap-1',
                          isCurrentUser && !msg.isModerator && 'bg-primary text-primary-foreground',
                          !isCurrentUser && !msg.isModerator && 'bg-muted',
                          msg.isModerator && 'bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700'
                      )}>
                        <p className="font-bold text-xs">{senderName}</p>
                        {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}
                        {msg.mediaUrl && msg.mediaType === 'image' && (<a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"><Image src={msg.mediaUrl} alt="Uploaded attachment" width={200} height={200} className="rounded-md mt-2 max-w-full h-auto" /></a>)}
                        {msg.mediaUrl && (msg.mediaType === 'video' || msg.mediaType === 'audio' || msg.mediaType === undefined) && <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">View Attached File</a>}
                        <p className="text-xs mt-1 opacity-70 text-right w-full">{toDate(msg.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? 'sending...'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,video/*,application/pdf" />
            <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading || isTradeFinished}>
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            </Button>
            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Write a message..." autoComplete="off" disabled={isUploading || isTradeFinished} />
            <Button type="submit" size="icon" disabled={isUploading || !newMessage.trim() || isTradeFinished}>
              <Send className="h-5 w-5" /><span className="sr-only">Send</span>
            </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
