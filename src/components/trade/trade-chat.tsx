
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

import { DefaultAvatar } from '@/components/icons';
import { Logo } from '@/components/logo';
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

            toast({ title: 'Feedback Submitted', description: 'Thank you for your feedback!' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to submit feedback: ${error.message}` });
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
        ? `You're buying ${trade.amount.toFixed(8)} ${trade.crypto} for ${trade.fiatAmount.toLocaleString()} ${trade.fiatCurrency}.`
        : `You're selling ${trade.amount.toFixed(8)} ${trade.crypto} for ${trade.fiatAmount.toLocaleString()} ${trade.fiatCurrency}.`;
    
    const subtitle = "The crypto is now in escrow.";
    
    const buyerInstructions = [
        "Wait for the seller to provide their payment details in the chat.",
        "Make your payment using the details provided.",
        "Mark the trade as 'Paid' and upload proof of payment if necessary.",
        "Wait for your trade partner to confirm they have received your payment.",
        "Your trade partner will release the crypto to you.",
    ];
    const sellerInstructions = [
        "Share your payment details with the buyer in the chat.",
        "Wait for the buyer to make the payment.",
        "Once payment is received and confirmed in your account, release the crypto.",
        "Do not release funds based on payment proof alone. Always verify in your account.",
        "If the buyer doesn't pay within the time limit, the trade will automatically expire.",
    ];

    const instructions = isBuyer ? buyerInstructions : sellerInstructions;
    
    return (
        <Alert className="bg-amber-100 border-amber-200 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800/50 dark:text-amber-200">
            <InfoIcon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            <AlertTitle className="font-bold text-amber-900 dark:text-amber-100">
                {title}
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200/90">
                <p>{subtitle}</p>
                <ol className="list-decimal list-inside space-y-1 text-xs mt-2">
                    {instructions.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
            </AlertDescription>
        </Alert>
    );
}

// --- Sub-component: SystemMessage ---
function SystemMessage({ title, children, timestamp, variant }: { title: string; children: React.ReactNode; timestamp: string, variant?: 'default' | 'destructive' | 'success' | 'warning' }) {
    const timeString = toDate(timestamp)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '';

    const variants = {
        default: "bg-blue-100 border-blue-200 text-blue-900 dark:bg-blue-950/60 dark:border-blue-800/50 dark:text-blue-200",
        destructive: "bg-red-100 border-red-200 text-red-900 dark:bg-red-950/60 dark:border-red-800/50 dark:text-red-200",
        success: "bg-green-100 border-green-200 text-green-900 dark:bg-green-950/60 dark:border-green-800/50 dark:text-green-200",
        warning: "bg-gray-100 border-gray-200 text-gray-900 dark:bg-gray-800/60 dark:border-gray-700/50 dark:text-gray-200",
    }

    return (
        <div className={cn("text-center text-xs p-3 rounded-md border", variants[variant || 'default'])}>
            <p className="font-bold mb-1">{title}</p>
            <div className="text-left text-xs">{children}</div>
            <p className="text-right text-xs opacity-70 mt-2">{timeString}</p>
        </div>
    );
}


// --- Sub-component: TradeSummaryBar ---
const TradeSummaryBar = ({ trade, currentUserRole }: { trade: Trade, currentUserRole: 'buy' | 'sell' }) => {
    const isBuyer = currentUserRole === 'buy';
    const bgColor = isBuyer ? 'bg-green-600' : 'bg-destructive';
    const textColor = 'text-destructive-foreground'; 
    const roleText = isBuyer ? 'Buying' : 'Selling';
    
    return (
        <div className={cn('p-4 rounded-lg text-base font-semibold text-center', bgColor, textColor)}>
            {roleText} {trade.amount.toFixed(8)} {trade.crypto} for {trade.fiatAmount.toLocaleString()} {trade.fiatCurrency}
        </div>
    );
}

export function TradeChat({ currentUserId, trade, opponent, isAdmin, sellerTerms, onInfoClick }: { currentUserId: string; trade: Trade; opponent: User | null | undefined; isAdmin: boolean; sellerTerms?: string; onInfoClick: () => void; }) {
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
    if (!messages) return [];
    const allMessages = [...messages];
    allMessages.sort((a, b) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0));
    return allMessages;
  }, [messages]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) { viewport.scrollTop = viewport.scrollHeight; }
    }
  }, [displayMessages]);
  
  useEffect(() => {
    if (trade.status === 'released' && !trade.claimedByBuyer && currentUserId === trade.buyerId && firestore) {
        const claim = async () => {
            try {
                await claimFundsForTrade(firestore, trade.id, currentUserId);
                toast({ title: 'Funds Claimed', description: `The ${trade.crypto} has been added to your wallet.` });
            } catch (error: any) {
                console.error("Auto-claiming funds failed:", error);
                toast({ variant: 'destructive', title: 'Claim Failed', description: error.message });
            }
        };
        claim();
    }
  }, [trade.status, trade.claimedByBuyer, currentUserId, trade.id, trade.crypto, firestore, toast]);

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
        <TradeSummaryBar trade={trade} currentUserRole={isBuyer ? 'buy' : 'sell'} />
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden min-h-0">
        <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            <TradeInstructions trade={trade} isBuyer={isBuyer} />
            {sellerTerms && (
              <SystemMessage title="Seller's Terms & Conditions" timestamp={trade.createdAt}>
                <p className="whitespace-pre-wrap">{sellerTerms}</p>
              </SystemMessage>
            )}
            {areMessagesLoading ? <div className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-12" /></div> : 
              <div className="space-y-4">
                {displayMessages.map((msg) => {
                  if (msg.senderId === 'system') {
                     if (msg.message.includes("disputed")) {
                        return <SystemMessage key={msg.id} title="Trade is disputed. A moderator will join the chat shortly." timestamp={msg.createdAt}>{msg.message}</SystemMessage>;
                    }
                    if (msg.message.includes("Congratulations!")) {
                        return (
                            <SystemMessage key={msg.id} title="Congratulations! The trade is completed. Kindly leave feedback." timestamp={msg.createdAt} variant="success">
                                <p>{msg.message}</p>
                                <FeedbackForm trade={trade} />
                            </SystemMessage>
                        );
                    }
                    if (msg.message.includes("cancelled")) {
                        return <SystemMessage key={msg.id} title="Trade is cancelled." timestamp={msg.createdAt} variant="destructive">{msg.message}</SystemMessage>;
                    }
                    if (msg.message.includes("expired")) {
                        return <SystemMessage key={msg.id} title="Trade is expired." timestamp={msg.createdAt} variant="warning">{msg.message}</SystemMessage>;
                    }
                    if (msg.message.includes("Buyer has marked the trade as Paid")) {
                        return <SystemMessage key={msg.id} title="Buyer has marked the trade as Paid." timestamp={msg.createdAt} variant="success">{msg.message}</SystemMessage>;
                    }
                    // Fallback for any other system message
                    return <SystemMessage key={msg.id} title="System Message" timestamp={msg.createdAt}>{msg.message}</SystemMessage>;
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
                          msg.isModerator && 'bg-blue-100 border-blue-200 text-blue-900 dark:bg-blue-950/60 dark:border-blue-800/50 dark:text-blue-200'
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
