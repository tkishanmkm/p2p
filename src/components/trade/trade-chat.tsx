
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Plus, Info, Loader2, Shield, AlertTriangle, ThumbsUp, ThumbsDown, XCircle, CheckCircle, Clock } from 'lucide-react';
import { cn, toDate } from '@/lib/utils';
import type { TradeChatMessage, Trade, User, P2PAd, TradeStatus } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { addReceiptToTrade } from '@/lib/wallet';
import { useToast } from '@/hooks/use-toast';
import { useCountdown } from '@/hooks/use-countdown';
import { collection, addDoc, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { FeedbackForm } from './feedback-form';
import { DefaultAvatar } from '../icons';
import { FlagIcon } from '../ui/flag-icon';


const blockedWords = [
  'telegram', 'whatsapp', 'instagram', 'ig', 'signal', 'discord', 'skype',
  'snapchat', 'facebook', 'fb', 'phone', 'contact', 'number', 'email', 'gmail',
  'fucking', 'bitch', 'asshole', 'dick', 'pussy', 'cunt', 'motherfucker',
];

const checkMessageForBlockedWords = (message: string): boolean => {
  const lowerCaseMessage = message.toLowerCase();
  return blockedWords.some((word) => lowerCaseMessage.includes(word));
};

interface TradeChatProps {
  currentUserId: string;
  trade: Trade;
  opponent: User | null | undefined;
  isAdmin: boolean;
  onInfoClick: () => void;
}

const FinalStatusMessage = ({ trade }: { trade: Trade }) => {
    if (trade.status === 'active' || trade.status === 'paid' || trade.status === 'disputed') {
        return null;
    }
    
    if (trade.status === 'released') {
        return (
            <Card className="mt-4 border-green-500 bg-green-50 text-center">
                <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col items-center gap-3">
                        <CheckCircle className="h-10 w-10 text-green-600"/>
                        <div>
                            <h3 className="font-bold text-green-800">Congratulations! Trade is completed.</h3>
                            <p className="text-sm text-green-700">Coin has been released by seller. Please leave feedback.</p>
                        </div>
                    </div>
                    <FeedbackForm trade={trade} />
                </CardContent>
            </Card>
        )
    }

    if (trade.status === 'cancelled') {
        return (
            <Card className="mt-4 border-red-500 bg-red-50 text-center">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-3">
                        <XCircle className="h-10 w-10 text-red-600"/>
                        <div>
                            <h3 className="font-bold text-red-800">Trade is cancelled.</h3>
                            <p className="text-sm text-red-700">Kindly do not pay. If you have already paid, please reopen the trade.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (trade.status === 'expired') {
        return (
            <Card className="mt-4 border-gray-400 bg-gray-50 text-center">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-3">
                        <AlertTriangle className="h-10 w-10 text-gray-600"/>
                        <div>
                            <h3 className="font-bold text-gray-800">Trade is expired.</h3>
                            <p className="text-sm text-gray-700">Kindly do not pay. If you have already paid, please open a new trade.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return null;
}

const CountdownDisplay = ({ targetDate, tradeStatus }: { targetDate: string, tradeStatus: TradeStatus }) => {
    const { hours, minutes, seconds, isFinished } = useCountdown(targetDate);
    
    if (isFinished || !['active', 'paid'].includes(tradeStatus)) {
        return <div className="text-sm font-semibold font-mono text-muted-foreground">--:--:--</div>;
    }

    const displayTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
    return (
      <div className="text-sm font-semibold font-mono text-destructive flex items-center gap-1.5">
        <Clock className="h-4 w-4" />
        {displayTime}
      </div>
    );
}

const TradeSummaryBar = ({ trade, isBuyer }: { trade: Trade, isBuyer: boolean }) => {
    const bgColor = isBuyer ? 'bg-green-600/10' : 'bg-red-600/10';
    const textColor = isBuyer ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300';
    const roleText = isBuyer ? 'Buying' : 'Selling';

    return (
        <div className={`p-3 rounded-lg text-sm font-medium text-center ${bgColor} ${textColor}`}>
            {roleText} {trade.amount} {trade.crypto} for {trade.fiatAmount.toLocaleString()} {trade.fiatCurrency} – {trade.paymentMethod}
        </div>
    )
}

export function TradeChat({ currentUserId, trade, opponent, isAdmin, onInfoClick }: TradeChatProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'trades', trade.id, 'messages'), orderBy('createdAt', 'asc')) : null),
    [firestore, trade.id]
  );
  const { data: messages, isLoading: areMessagesLoading } = useCollection<TradeChatMessage>(messagesQuery);

  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent, mediaUrl?: string, mediaType?: 'image' | 'video' | 'audio') => {
    e.preventDefault();
    if ((!newMessage.trim() && !mediaUrl) || !firestore || !user) return;

    if (checkMessageForBlockedWords(newMessage)) {
      toast({
        variant: 'destructive',
        title: 'Message Blocked',
        description: 'Your message contains content that violates our chat policy. Please remove any contact information or offensive language.',
      });
      return;
    }

    const messageToSend = newMessage;
    setNewMessage('');

    const messageData: any = {
      tradeId: trade.id,
      senderId: currentUserId,
      senderUsername: user.displayName || 'User',
      message: messageToSend,
      isModerator: isAdmin,
      createdAt: new Date().toISOString(),
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || 'none',
    };

    try {
      const messagesCollection = collection(firestore, 'trades', trade.id, 'messages');
      await addDoc(messagesCollection, messageData);

      if (mediaUrl && trade.status === 'active') {
        await addReceiptToTrade(firestore, trade.id, mediaUrl);
        toast({ title: 'Receipt Uploaded', description: 'The seller has been notified.' });
      }
    } catch (error: any) {
      console.error('Failed to send message', error);
      toast({ variant: 'destructive', title: 'Send Failed', description: error.message });
    }
  };
  
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        let mediaType: 'image' | 'video' | 'audio' = 'image'; // default
        if (file.type.startsWith('video/')) mediaType = 'video';
        if (file.type.startsWith('audio/')) mediaType = 'audio';
        
        handleSendMessage(new Event('submit'), result, mediaType).finally(() => {
          setIsUploading(false);
          if(fileInputRef.current) fileInputRef.current.value = "";
        });
      } else {
        setIsUploading(false);
      }
    };
     reader.onerror = () => {
        setIsUploading(false);
        toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read the selected file.' });
    };
    reader.readAsDataURL(file);
  };

  const isBuyer = currentUserId === trade.buyerId;
  const opponentLastActive = opponent?.lastActive ? toDate(opponent.lastActive) : null;
  let activityText = 'Offline';
  if (opponentLastActive) {
      activityText = `Seen ${formatDistanceToNow(opponentLastActive)} ago`;
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="space-y-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={opponent?.photoURL} />
                    <AvatarFallback><DefaultAvatar /></AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-center gap-1.5">
                        <p className="font-semibold">{opponent?.userId}</p>
                        {opponent?.country && <FlagIcon countryCode={opponent.country} />}
                        <Button variant="ghost" size="icon" onClick={onInfoClick} className="h-6 w-6">
                            <Info className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{activityText}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                    <span>{opponent?.positiveFeedback || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                    <span>{opponent?.negativeFeedback || 0}</span>
                </div>
                <CountdownDisplay targetDate={trade.expiresAt} tradeStatus={trade.status} />
            </div>
        </div>
        <TradeSummaryBar trade={trade} isBuyer={isBuyer} />
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-[40vh] lg:h-full pr-4" ref={scrollAreaRef}>
          {areMessagesLoading && (
            <div className="space-y-4">
              <Skeleton className="h-16" /><Skeleton className="h-12" />
            </div>
          )}
          <div className="space-y-4">
            {messages?.map((msg) => {
              const isCurrentUser = msg.senderId === currentUserId;
              const isBlocked = checkMessageForBlockedWords(msg.message);

              let senderName: string | React.ReactNode = isCurrentUser
                ? 'You'
                : trade.buyerId === msg.senderId
                ? trade.buyer.username
                : trade.seller.username;

              if (msg.isModerator) senderName = 'Moderator';

              const senderAvatar = (
                <Avatar className="h-8 w-8"><AvatarImage src={opponent?.photoURL} /><AvatarFallback>{msg.senderUsername.substring(0, 2)}</AvatarFallback></Avatar>
              );

              return (
                <div key={msg.id} className={cn('flex items-end gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}>
                  {!isCurrentUser && !msg.isModerator && (
                    <Link href={`/users/${msg.senderUsername}`} className="self-end">{senderAvatar}</Link>
                  )}
                  {!isCurrentUser && msg.isModerator && <div className="self-end">{senderAvatar}</div>}
                  <div
                    className={cn(
                      'max-w-[75%] rounded-lg p-3 text-sm flex flex-col items-start gap-2',
                      isCurrentUser && !msg.isModerator && 'bg-primary text-primary-foreground',
                      !isCurrentUser && !msg.isModerator && 'bg-muted',
                      msg.isModerator && 'bg-amber-100 text-amber-900 border border-amber-200'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {msg.isModerator && <Shield className="h-4 w-4 text-amber-600" />}
                      <p className="font-bold">
                        {!isCurrentUser && !msg.isModerator ? (
                          <Link href={`/users/${msg.senderUsername}`} className="hover:underline">{senderName}</Link>
                        ) : ( senderName )}
                      </p>
                    </div>

                    {isBlocked ? (
                      <div className="flex items-start gap-2 text-destructive-foreground bg-destructive/80 p-2 rounded-md">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-xs">Message Blocked</p>
                          <p className="text-xs">This message violates chat policy.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}
                        {msg.mediaUrl && msg.mediaType === 'image' && (
                          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                            <Image src={msg.mediaUrl} alt="Uploaded attachment" width={200} height={200} className="rounded-md mt-2 max-w-full h-auto" />
                          </a>
                        )}
                         {msg.mediaUrl && (msg.mediaType === 'video' || msg.mediaType === 'audio') && <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">View Attached File</a>}
                      </>
                    )}
                    <p className="text-xs mt-1 opacity-70 text-right w-full">
                      {toDate(msg.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? 'sending...'}
                    </p>
                  </div>
                </div>
              );
            })}
             <FinalStatusMessage trade={trade} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,video/*,audio/*"
            />
            <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Write a message..."
            autoComplete="off"
            disabled={isUploading}
          />
          <Button type="submit" size="icon" disabled={isUploading || !newMessage.trim()}>
            <Send className="h-5 w-5" /><span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
