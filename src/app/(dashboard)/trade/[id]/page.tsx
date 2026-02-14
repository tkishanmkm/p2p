
'use client';

import { useState, useMemo } from 'react';
import { TradeDetails } from '@/components/trade/trade-details';
import { TradeChat } from '@/components/trade/trade-chat';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, MessageSquare, ListDetails } from 'lucide-react';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cancelTrade } from '@/lib/wallet';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trade, P2PAd, User } from '@/lib/types';
import { useAdminStatus } from '@/hooks/use-admin-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CounterpartyInfoPanel } from '@/components/trade/counterparty-info-panel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';

function TradePageContent({ tradeId }: { tradeId: string }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const { isAdmin } = useAdminStatus();
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'chat' | 'details'>('chat'); // State for mobile view

  // Memoized Firestore references
  const tradeRef = useMemoFirebase(() => (firestore && tradeId ? doc(firestore, "trades", tradeId) : null), [firestore, tradeId]);
  const { data: trade, isLoading, error } = useDoc<Trade>(tradeRef);

  const adId = trade?.adId;
  const buyerId = trade?.buyerId;
  const sellerId = trade?.sellerId;

  const adRef = useMemoFirebase(() => (firestore && adId ? doc(firestore, 'p2p_ads', adId) : null), [firestore, adId]);
  const { data: ad } = useDoc<P2PAd>(adRef);

  const buyerRef = useMemoFirebase(() => (firestore && buyerId ? doc(firestore, 'users', buyerId) : null), [firestore, buyerId]);
  const { data: buyerProfile } = useDoc<User>(buyerRef);

  const sellerRef = useMemoFirebase(() => (firestore && sellerId ? doc(firestore, 'users', sellerId) : null), [firestore, sellerId]);
  const { data: sellerProfile } = useDoc<User>(sellerRef);
  
  if (isLoading) {
    return <div className="grid lg:grid-cols-3 gap-8 p-4"><Skeleton className="lg:col-span-1 h-96" /><Skeleton className="lg:col-span-2 h-[600px]" /></div>;
  }

  if (error) {
    return (
      <Card className="m-4 border-destructive">
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
    return <Card className="m-4"><CardHeader><CardTitle>Trade Not Found</CardTitle><CardDescription>This trade may have been completed or does not exist.</CardDescription></CardHeader></Card>;
  }
  
  if (!trade.buyer || !trade.seller) {
    return (
      <Card className="m-4">
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
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 md:grid md:grid-cols-3 md:gap-6">
        {/* Desktop View: Details Panel */}
        <div className="hidden md:block overflow-y-auto pr-2">
          <TradeDetails trade={trade} sellerTerms={ad?.terms} currentUserRole={currentUserRole} />
        </div>

        {/* Mobile View: Content Area */}
        <div className="md:hidden h-full flex flex-col">
          {mobileView === 'details' && (
            <div className="overflow-y-auto p-4">
               <TradeDetails trade={trade} sellerTerms={ad?.terms} currentUserRole={currentUserRole} />
            </div>
          )}
           {mobileView === 'chat' && (
             <div className="flex-1 min-h-0">
                <TradeChat 
                    currentUserId={user.uid} 
                    trade={trade} 
                    opponent={opponentProfile} 
                    isAdmin={isAdmin} 
                    onInfoClick={() => setIsInfoPanelOpen(true)}
                />
             </div>
           )}
        </div>
        
        {/* Desktop View: Chat Panel */}
        <div className="hidden md:flex md:col-span-2 flex-col min-h-0">
             <TradeChat 
                currentUserId={user.uid} 
                trade={trade} 
                opponent={opponentProfile} 
                isAdmin={isAdmin} 
                onInfoClick={() => setIsInfoPanelOpen(true)}
            />
        </div>
      </div>
      
      {/* Admin Controls - Placed outside the main scrolling content */}
      {isAdmin && (
        <div className="p-4">
            <Card className="border-amber-500">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                    <Shield className="h-6 w-6 text-amber-500" />
                    <div className="grid gap-1">
                        <CardTitle>Admin Controls</CardTitle>
                        <CardDescription>You are viewing this trade as an administrator.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex gap-4">
                    {(trade.status === "active" || trade.status === "paid") && <Button variant="destructive" onClick={handleAdminCancelTrade}>Admin: Cancel Trade</Button>}
                </CardContent>
            </Card>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="md:hidden grid grid-cols-2 gap-2 p-2 border-t bg-background">
        <Button 
          variant={mobileView === 'details' ? 'default' : 'outline'} 
          onClick={() => setMobileView('details')}
          className="h-12"
        >
          <ListDetails className="mr-2 h-4 w-4" />
          Details
        </Button>
        <Button 
          variant={mobileView === 'chat' ? 'default' : 'outline'} 
          onClick={() => setMobileView('chat')}
          className="h-12"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Chat
        </Button>
      </div>

      <CounterpartyInfoPanel 
          user={opponentProfile}
          open={isInfoPanelOpen}
          onOpenChange={setIsInfoPanelOpen}
      />
    </div>
  );
}

export default function TradePage({ params }: { params: { id: string } }) {
    return (
      <div className="h-full overflow-hidden">
        <ErrorBoundary>
            <TradePageContent tradeId={params.id} />
        </ErrorBoundary>
      </div>
    )
}
