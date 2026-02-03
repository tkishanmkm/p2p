"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Paperclip, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeChatMessage, User, Trade } from "@/lib/types";
import { mockTradeChatMessages, mockUsers } from "@/lib/mock-data";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFirebase } from "@/firebase";
import { addReceiptToTrade } from "@/lib/wallet";
import { useToast } from "@/hooks/use-toast";

interface TradeChatProps {
  currentUserId: string;
  trade: Trade;
}

export function TradeChat({ currentUserId, trade }: TradeChatProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [messages, setMessages] = useState<TradeChatMessage[]>(mockTradeChatMessages);
  const [newMessage, setNewMessage] = useState("");
  const [showUsernames, setShowUsernames] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async (e: React.FormEvent, mediaUrl?: string, mediaType?: 'image') => {
    e.preventDefault();
    if (!newMessage.trim() && !mediaUrl) return;

    const messageToSend = newMessage;
    setNewMessage("");

    // This is a simulation. In a real app, you would upload the file to Firebase Storage
    // and then add a new message document to the 'messages' subcollection in the trade.
    const tempMessage: TradeChatMessage = {
      id: `temp-${Date.now()}`,
      tradeId: trade.id,
      senderId: currentUserId,
      senderUsername: mockUsers.find(u => u.id === currentUserId)?.userId || 'You',
      message: messageToSend,
      mediaUrl,
      mediaType,
      isModerator: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);
    
    if (mediaUrl) {
        try {
            await addReceiptToTrade(firestore, trade.id, mediaUrl);
            toast({ title: "Receipt Uploaded", description: "The seller has been notified." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Upload Failed", description: error.message });
            // remove the optimistic message
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        }
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    // Simulate upload and get a URL
    const reader = new FileReader();
    reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
            handleSendMessage(new Event('submit'), result, 'image');
        }
        setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const isBuyer = currentUserId === trade.buyerId;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Trade Chat</CardTitle>
                <CardDescription>Communicate with the other party.</CardDescription>
            </div>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => setShowUsernames(!showUsernames)}>
                            <Info className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{showUsernames ? 'Hide' : 'Show'} full usernames</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
        <div className="mt-2 text-xs p-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-r-md">
            <p><strong>Safety Notice:</strong> Only trade on the TradeFlow platform. Do not contact users outside of this chat.</p>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {messages.map((msg) => {
              const user = mockUsers.find(u => u.id === msg.senderId);
              const isCurrentUser = msg.senderId === currentUserId;
              const senderName = showUsernames ? msg.senderUsername : (isCurrentUser ? 'You' : 'Trader');
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-end gap-2",
                    isCurrentUser ? "justify-end" : "justify-start"
                  )}
                >
                  {!isCurrentUser && (
                    <Avatar className="h-8 w-8">
                       <AvatarImage src={`https://picsum.photos/seed/${user?.id}/100/100`} />
                       <AvatarFallback>{user?.userId.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg p-3 text-sm flex flex-col items-start gap-2",
                      isCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div>
                        <p className="font-bold mb-1">{senderName}</p>
                        {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}
                         {msg.mediaUrl && msg.mediaType === 'image' && (
                            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                                <Image src={msg.mediaUrl} alt="Uploaded receipt" width={200} height={200} className="rounded-md mt-2 max-w-full h-auto" />
                            </a>
                        )}
                        <p className="text-xs mt-1 opacity-70 text-right">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          {isBuyer && (
             <>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
                <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                </Button>
             </>
          )}
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            autoComplete="off"
            disabled={isUploading}
          />
          <Button type="submit" size="icon" disabled={isUploading || !newMessage.trim()}>
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
