"use client";

import { useState } from "react";
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
import { Send, Paperclip, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeChatMessage, User } from "@/lib/types";
import { mockTradeChatMessages, mockUsers } from "@/lib/mock-data";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TradeChatProps {
  currentUserId: string;
}

export function TradeChat({ currentUserId }: TradeChatProps) {
  const [messages, setMessages] = useState<TradeChatMessage[]>(mockTradeChatMessages);
  const [newMessage, setNewMessage] = useState("");
  const [showUsernames, setShowUsernames] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageToSend = newMessage;
    setNewMessage("");

    const tempMessage: TradeChatMessage = {
      id: `temp-${Date.now()}`,
      tradeId: "trade-1",
      senderId: currentUserId,
      senderUsername: mockUsers.find(u => u.id === currentUserId)?.userId || 'You',
      message: messageToSend,
      isModerator: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);
  };

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
                      "max-w-[75%] rounded-lg p-3 text-sm flex items-start gap-2",
                      isCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div>
                        <p className="font-bold mb-1">{senderName}</p>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
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
          <Button variant="ghost" size="icon">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            autoComplete="off"
          />
          <Button type="submit" size="icon">
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
