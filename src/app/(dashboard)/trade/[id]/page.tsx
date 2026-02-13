
'use client';

import { useState, useEffect } from 'react';
import { TradeDetails } from '@/components/trade/trade-details';
import { TradeChat } from '@/components/trade/trade-chat';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, MessageSquare, ListDetails } from 'lucide-react';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cancelTrade } from '@/lib/wallet';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trade, P2PAd, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAdminStatus } from '@/hooks/use-admin-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CounterpartyInfoPanel } from '@/components/trade/counterparty-info-panel';
import ErrorBoundary from '@/components/ErrorBoundary';


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
  
  // Loading state
  if (isLoading) {
    return <div className="grid lg:grid-cols-3 gap-8"><Skeleton className="lg:col-span-1 h-96" /><Skeleton className="lg:col-span-2 h-[600px]" /></div>;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
             <AlertCircle /> Error Loading Trade
          </CardTitle>
          <CardDescription className="text-destructive">
            There was a problem loading the trade data. This could be due to a network issue or a problem with the trade document itself.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <h3 className="font-semibold">Error Details:</h3>
            <pre className="mt-2 w-full whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm text-muted-foreground">
                {error.message}
            </pre>
        </CardContent>
      </Card>
    );
  }

  if (!trade || !user) {
    return <Card><CardHeader><CardTitle>Trade Not Found</CardTitle><CardDescription>This trade may have been completed or does not exist.</CardDescription></CardHeader></Card>;
  }
  
  if (!trade.buyer || !trade.seller) {
    return (
      <Card>
          <CardHeader>
              <CardTitle>Incomplete Trade Data</CardTitle>
              <CardDescription>This trade document is missing critical participant information and cannot be displayed.</CardDescription>
          </CardHeader>
          <CardContent>
              <p>This may be due to old data. Please contact support if this is a recent trade.</p>
          </CardContent>
      </Card>
    );
  }
  
  const currentUserRole = user.uid === trade.buyerId ? "buy" : "sell";
  const opponentProfile = user.uid === trade.buyerId ? sellerProfile : buyerProfile;
  
  const handleAdminCancelTrade = async () => {
     if (!firestore) return;
     try {
      await cancelTrade(firestore, trade.id);
      toast({ title: "Trade Cancelled by Admin" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  }

  return (
    <>
        <div className="flex-grow flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-semibold md:text-2xl">Trade {trade.tradeId}</h1>
            </div>

            {isAdmin && (
                <Card className="mb-4 border-amber-500">
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                        <Shield className="h-6 w-6 text-amber-500" />
                        <div className="grid gap-1">
                            <CardTitle>Admin Controls</CardTitle>
                            <CardDescription>You are viewing this trade as an administrator.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                        {(trade.status === "active" || trade.status === "paid") && <Button variant="destructive" onClick={handleAdminCancelTrade}>Admin: Cancel Trade</Button>}
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8 flex-grow min-h-0">
                {/* Desktop: Details on left */}
                <div className="lg:col-span-1 space-y-6 hidden lg:block">
                    <TradeDetails trade={trade} sellerTerms={ad?.terms} currentUserRole={currentUserRole} />
                </div>

                {/* Desktop: Chat on right */}
                <div className="lg:col-span-2 flex-grow flex-col min-h-0 hidden lg:flex">
                    <TradeChat 
                        currentUserId={user.uid} 
                        trade={trade} 
                        opponent={opponentProfile} 
                        isAdmin={isAdmin} 
                        onInfoClick={() => setIsInfoPanelOpen(true)}
                    />
                </div>
                
                {/* Mobile View */}
                <div className="lg:hidden flex-grow flex flex-col min-h-0">
                    {mobileView === 'chat' ? (
                        <TradeChat 
                            currentUserId={user.uid} 
                            trade={trade} 
                            opponent={opponentProfile} 
                            isAdmin={isAdmin} 
                            onInfoClick={() => setIsInfoPanelOpen(true)}
                        />
                    ) : (
                         <ScrollArea className="flex-grow">
                            <div className="space-y-6 pr-4">
                                <TradeDetails trade={trade} sellerTerms={ad?.terms} currentUserRole={currentUserRole} />
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </div>
        </div>
        
        <div className="sticky bottom-0 mt-auto grid grid-cols-2 gap-2 lg:hidden bg-background p-2 border-t -mx-2 sm:-mx-4 -mb-2 sm:-mb-4 md:-mb-6">
            <Button
                variant={mobileView === 'details' ? 'default' : 'outline'}
                onClick={() => setMobileView('details')}
                className="flex items-center gap-2"
            >
                <ListDetails className="h-4 w-4" />
                Details
            </Button>
            <Button
                variant={mobileView === 'chat' ? 'default' : 'outline'}
                onClick={() => setMobileView('chat')}
                className="flex items-center gap-2"
            >
                <MessageSquare className="h-4 w-4" />
                Chat
            </Button>
        </div>
        
        <CounterpartyInfoPanel 
            user={opponentProfile}
            open={isInfoPanelOpen}
            onOpenChange={setIsInfoPanelOpen}
        />
    </>
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
