'use client';

import { useState, useEffect } from 'react';
import { TradeDetails } from '@/components/trade/trade-details';
import { TradeChat } from '@/components/trade/trade-chat';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, MessageSquare, ListDetails } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cancelTrade, markTradeAsPaid, releaseFundsFromEscrow, claimFundsForTrade } from '@/lib/wallet';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trade, P2PAd, User } from '@/lib/types';
import { cn, toDate } from '@/lib/utils';
import { useAdminStatus } from '@/hooks/use-admin-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OpenDisputeDialog } from '@/components/trade/open-dispute-dialog';
import { CounterpartyInfoPanel } from '@/components/trade/counterparty-info-panel';

function TradePageContent({ tradeId }: { tradeId: string }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const { isAdmin } = useAdminStatus();

  // All hooks at the top level
  const tradeRef = useMemoFirebase(() => (firestore && tradeId ? doc(firestore, "trades", tradeId) : null), [firestore, tradeId]);
  const { data: trade, isLoading, error } = useDoc<Trade>(tradeRef);

  const adRef = useMemoFirebase(() => (firestore && trade?.adId ? doc(firestore, 'p2p_ads', trade.adId) : null), [firestore, trade]);
  const { data: ad } = useDoc<P2PAd>(adRef);

  const buyerRef = useMemoFirebase(() => (firestore && trade?.buyerId ? doc(firestore, 'users', trade.buyerId) : null), [firestore, trade]);
  const { data: buyerProfile } = useDoc<User>(buyerRef);

  const sellerRef = useMemoFirebase(() => (firestore && trade?.sellerId ? doc(firestore, 'users', trade.sellerId) : null), [firestore, trade]);
  const { data: sellerProfile } = useDoc<User>(sellerRef);

  const [mobileView, setMobileView] = useState<'chat' | 'details'>('chat');
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  // useEffect hooks
  useEffect(() => {
    if (trade && trade.status === 'active' && firestore && tradeRef) {
        const expiresAtDate = toDate(trade.expiresAt);
        if (expiresAtDate && new Date() > expiresAtDate) {
            cancelTrade(firestore, trade.id)
                .catch((e) => {
                    console.error("Auto-cancellation of expired trade failed:", e);
                });
        }
    }
  }, [trade, firestore, tradeRef]);

  useEffect(() => {
    if (trade?.status === "released" && user?.uid === trade.buyerId && !trade.claimedByBuyer && firestore) {
      claimFundsForTrade(firestore, trade.id, user.uid)
        .catch((e) => {
          console.error("Claiming funds failed:", e);
          toast({ variant: "destructive", title: "Claiming Failed", description: e.message });
        });
    }
  }, [trade, firestore, user?.uid, toast]);


  if (isLoading) {
    return <div className="grid lg:grid-cols-3 gap-8"><Skeleton className="lg:col-span-1 h-96" /><Skeleton className="lg:col-span-2 h-[600px]" /></div>;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>There was a problem loading the trade.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error.message}</p>
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
  
  const handleMarkAsPaid = async () => {
    if (!firestore) return;
    try {
      await markTradeAsPaid(firestore, trade.id);
      toast({ title: "Success", description: "Seller has been notified that you've paid." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleReleaseCrypto = async () => {
    if (!firestore) return;
    try {
      await releaseFundsFromEscrow(firestore, trade.id);
      toast({ title: "Crypto Released", description: "The crypto has been sent to the buyer." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleCancelTrade = async () => {
     if (!firestore) return;
     try {
      await cancelTrade(firestore, trade.id);
      toast({ title: "Trade Cancelled" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  }
  
  const ActionButtons = () => (
    <div className="space-y-2">
      {currentUserRole === "buy" && trade.status === "active" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full" size="lg">Mark as Paid</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Have you sent <span className="font-bold">{trade.fiatAmount} {trade.fiatCurrency}</span> to the seller? Only confirm after you have fully sent the payment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkAsPaid}>Yes, I Have Paid</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {currentUserRole === "sell" && trade.status === "paid" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full" size="lg">Release Crypto</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Release Cryptocurrency?</AlertDialogTitle>
              <AlertDialogDescription>
                Confirm you have received <span className="font-bold">{trade.fiatAmount} {trade.fiatCurrency}</span>. This action is irreversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReleaseCrypto}>Confirm and Release</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {trade.status === 'active' && currentUserRole === 'buy' && (
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">Cancel Trade</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Trade?</AlertDialogTitle>
                      <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>No</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelTrade}>Yes, Cancel</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}
      {trade.status === 'paid' && (
          <OpenDisputeDialog 
              trade={trade}
              currentUserId={user.uid}
              currentUsername={user.displayName || 'user'}
          />
      )}
      <div className="text-xs p-3 bg-red-100 border-l-4 border-red-500 text-red-900 rounded-r-md flex gap-2 items-start">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          <strong>Warning:</strong> To avoid scams, never communicate or trade outside of this platform.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full">
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
                    {trade.status === "paid" && <Button variant="outline" onClick={handleReleaseCrypto}>Admin: Force Release</Button>}
                    {(trade.status === "active" || trade.status === "paid") && <Button variant="destructive" onClick={handleCancelTrade}>Admin: Cancel Trade</Button>}
                </CardContent>
            </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8 flex-grow">
            {/* Details (Left on Desktop, conditional on mobile) */}
            <div className={cn("lg:col-span-1 space-y-6", mobileView === 'details' ? 'block' : 'hidden lg:block')}>
                <TradeDetails trade={trade} sellerTerms={ad?.terms} currentUserRole={currentUserRole} />
                <ActionButtons />
            </div>
            
            {/* Chat (Right on Desktop, conditional on mobile) */}
            <div className={cn("lg:col-span-2 flex-grow flex flex-col", mobileView === 'chat' ? 'flex' : 'hidden lg:flex')}>
                <TradeChat 
                    currentUserId={user.uid} 
                    trade={trade} 
                    ad={ad} 
                    opponent={opponentProfile} 
                    isAdmin={isAdmin} 
                    onInfoClick={() => setIsInfoPanelOpen(true)}
                />
            </div>
        </div>

        {/* Bottom Nav for Mobile */}
        <div className="sticky bottom-0 left-0 right-0 md:hidden bg-background border-t p-2 flex gap-2">
            <Button variant={mobileView === 'chat' ? 'default' : 'outline'} className="flex-1" onClick={() => setMobileView('chat')}>
                <MessageSquare className="mr-2 h-4 w-4" /> Chat
            </Button>
            <Button variant={mobileView === 'details' ? 'default' : 'outline'} className="flex-1" onClick={() => setMobileView('details')}>
                <ListDetails className="mr-2 h-4 w-4" /> Details
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
      <div className="flex flex-col h-full">
         <TradePageContent tradeId={params.id} />
      </div>
    )
}
