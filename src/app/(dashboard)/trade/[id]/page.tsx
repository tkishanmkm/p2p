
'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { P2PAd, Trade, User } from '@/lib/types';
import { Loader2, Info, MessageSquare } from 'lucide-react';
import { TradeDetails } from '@/components/trade/trade-details';
import { TradeChat } from '@/components/trade/trade-chat';
import { CounterpartyInfoPanel } from '@/components/trade/counterparty-info-panel';
import { Button } from '@/components/ui/button';
import { useAdminStatus } from '@/hooks/use-admin-status';

function TradePageContent() {
  const params = useParams();
  const { firestore, user: authUser, isUserLoading } = useFirebase();
  const { isAdmin } = useAdminStatus();
  const tradeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [activeView, setActiveView] = useState<'chat' | 'details'>('details');
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  const tradeRef = useMemoFirebase(
    () => (tradeId && firestore ? doc(firestore, 'trades', tradeId as string) : null),
    [tradeId, firestore]
  );
  const { data: trade, isLoading: isTradeLoading } = useDoc<Trade>(tradeRef);

  const opponentId = useMemo(() => {
    if (!trade || !authUser) return null;
    return authUser.uid === trade.buyerId ? trade.sellerId : trade.buyerId;
  }, [trade, authUser]);

  const opponentRef = useMemoFirebase(
    () => (opponentId && firestore ? doc(firestore, 'users', opponentId) : null),
    [opponentId, firestore]
  );
  const { data: opponent, isLoading: isOpponentLoading } = useDoc<User>(opponentRef);
  
  const currentUserRole = useMemo(() => {
    if(!trade || !authUser) return 'sell';
    return authUser.uid === trade.buyerId ? 'buy' : 'sell';
  }, [trade, authUser])
  
  const adDocRef = useMemoFirebase(() => (trade ? doc(firestore, 'p2p_ads', trade.adId) : null), [trade, firestore]);
  const { data: ad, isLoading: isAdLoading } = useDoc<P2PAd>(adDocRef);


  if (isUserLoading || isTradeLoading || isOpponentLoading || isAdLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <p>Trade not found.</p>
      </div>
    );
  }

  if (!authUser) {
      return (
          <div className="flex flex-1 items-center justify-center h-full">
            <p>Please log in to view this trade.</p>
          </div>
      )
  }

  return (
    <div className="h-full flex flex-col">
      <CounterpartyInfoPanel user={opponent} open={isInfoPanelOpen} onOpenChange={setIsInfoPanelOpen} />
      
      {/* Desktop Layout */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-6 h-full overflow-hidden">
        <div className="md:col-span-1 lg:col-span-1 h-full overflow-hidden">
          <TradeDetails trade={trade} sellerTerms={ad?.terms} currentUserRole={currentUserRole} />
        </div>
        <div className="md:col-span-2 lg:col-span-3 h-full overflow-hidden">
          <TradeChat
            currentUserId={authUser.uid}
            trade={trade}
            opponent={opponent}
            isAdmin={isAdmin}
            sellerTerms={ad?.terms}
            onInfoClick={() => setIsInfoPanelOpen(true)}
          />
        </div>
      </div>
      
      {/* Mobile Layout */}
       <div className="md:hidden flex flex-col h-full bg-background">
        <div className="flex-1 min-h-0">
          {activeView === 'details' && (
            <div className="p-2 h-full overflow-y-auto">
              <TradeDetails trade={trade} sellerTerms={ad?.terms} currentUserRole={currentUserRole} />
            </div>
          )}
          {activeView === 'chat' && (
            <div className="h-full">
              <TradeChat
                currentUserId={authUser.uid}
                trade={trade}
                opponent={opponent}
                isAdmin={isAdmin}
                sellerTerms={ad?.terms}
                onInfoClick={() => setIsInfoPanelOpen(true)}
              />
            </div>
          )}
        </div>
        <div className="sticky bottom-0 left-0 right-0 z-10 grid grid-cols-2 gap-2 p-2 border-t bg-background shadow-lg">
          <Button variant={activeView === 'details' ? 'secondary' : 'ghost'} onClick={() => setActiveView('details')}>
            <Info className="mr-2 h-4 w-4" />
            Details
          </Button>
          <Button variant={activeView === 'chat' ? 'secondary' : 'ghost'} onClick={() => setActiveView('chat')}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <TradePageContent />
    </Suspense>
  );
}
