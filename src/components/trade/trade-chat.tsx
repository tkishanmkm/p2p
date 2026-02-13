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
import { Send, Paperclip, Info, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { cn, toDate } from '@/lib/utils';
import type { TradeChatMessage, Trade, User, P2PAd } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { addReceiptToTrade } from '@/lib/wallet';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { countries } from '@/lib/countries';
import { TradeHeader } from './trade-header';
import { TradeStatusAlert } from './trade-status-alert';

const blockedWords = [
  'telegram',
  'whatsapp',
  'instagram',
  'ig',
  'signal',
  'discord',
  'skype',
  'snapchat',
  'facebook',
  'fb',
  'phone',
  'contact',
  'number',
  'email',
  'gmail',
  'fucking',
  'bitch',
  'asshole',
  'dick',
  'pussy',
  'cunt',
  'motherfucker',
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
  ad: P2PAd | null | undefined;
}

export function TradeChat({ currentUserId, trade, opponent, isAdmin, ad }: TradeChatProps) {
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

  const opponentCountryName = countries.find(c => c.code === opponent?.country)?.name;
  const opponentIpCountryName = countries.find(c => c.code === opponent?.ipBasedCountry)?.name;

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
    };

    if (mediaUrl && mediaType) {
        messageData.mediaUrl = mediaUrl;
        messageData.mediaType = mediaType;
    } else {
        messageData.mediaUrl = null;
        messageData.mediaType = 'none';
    }


    try {
      const messagesCollection = collection(firestore, 'trades', trade.id, 'messages');
      await addDoc(messagesCollection, messageData);

      if (mediaUrl) {
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
        let mediaType: 'image' | 'video' | 'audio' = 'image';
        if (file.type.startsWith('video/')) mediaType = 'video';
        if (file.type.startsWith('audio/')) mediaType = 'audio';
        handleSendMessage(new Event('submit'), result, mediaType);
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const isBuyer = currentUserId === trade.buyerId;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <TradeHeader trade={trade} ad={ad} opponent={opponent} currentUserRole={isBuyer ? 'buy' : 'sell'} />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                 {opponent && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Username:</strong> {opponent.userId}</p>
                      <p><strong>Country:</strong> {opponentCountryName || 'N/A'}</p>
                      <p><strong>IP-based Country:</strong> {opponentIpCountryName || 'N/A'}</p>
                    </div>
                  )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
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
                <Avatar className="h-8 w-8"><AvatarImage src={`https://picsum.photos/seed/${msg.senderId}/100/100`} /><AvatarFallback>{msg.senderUsername.substring(0, 2)}</AvatarFallback></Avatar>
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
                            <Image src={msg.mediaUrl} alt="Uploaded receipt" width={200} height={200} className="rounded-md mt-2 max-w-full h-auto" />
                          </a>
                        )}
                         {/* Basic placeholders for other media types */}
                        {msg.mediaUrl && msg.mediaType === 'video' && <p className="text-xs">[Video Attached]</p>}
                        {msg.mediaUrl && msg.mediaType === 'audio' && <p className="text-xs">[Audio Attached]</p>}
                      </>
                    )}
                    <p className="text-xs mt-1 opacity-70 text-right w-full">
                      {toDate(msg.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? 'sending...'}
                    </p>
                  </div>
                </div>
              );
            })}
             <TradeStatusAlert trade={trade} />
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
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
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
