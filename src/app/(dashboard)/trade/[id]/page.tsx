
'use client';

import { useState, useEffect } from 'react';
import { TradeDetails } from '@/components/trade/trade-details';
import { TradeChat } from '@/components/trade/trade-chat';
import { TradeStatusStepper } from '@/components/trade/trade-status';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Award, Tabs, TabsList, TabsTrigger } from 'lucide-react';
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
import { useDoc, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import { cancelTrade, markTradeAsPaid, releaseFundsFromEscrow, claimFundsForTrade } from '@/lib/wallet';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trade, Dispute, P2PAd, User } from '@/lib/types';
import { cn, toDate } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAdminStatus } from '@/hooks/use-admin-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OpenDisputeDialog } from '@/components/trade/open-dispute-dialog';

function TradePageContent({ tradeId }: { tradeId: string }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const { isAdmin } = useAdminStatus();

  const [mobileView, setMobileView] = useState<'chat' | 'details'>('chat');

  const tradeRef = useMemoFirebase(() => (firestore && tradeId ? doc(firestore, "trades", tradeId) : null), [firestore, tradeId]);
  
  const { data: trade, isLoading, error } = useDoc<Trade>(tradeRef);

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
  
  const adRef = useMemoFirebase(() => (firestore && trade?.adId ? doc(firestore, 'p2p_ads', trade.adId) : null), [firestore, trade]);
  const { data: ad } = useDoc<P2PAd>(adRef);
  
  const disputeQuery = useMemoFirebase(() => firestore && tradeId ? query(collection(firestore, `trades/${tradeId}/disputes`), where('status', '==', 'resolved'), limit(1)) : null, [firestore, tradeId]);
  const { data: resolvedDisputes } = useCollection<Dispute>(disputeQuery);
  const resolvedDispute = resolvedDisputes?.[0];

  const buyerRef = useMemoFirebase(() => (firestore && trade?.buyerId ? doc(firestore, 'users', trade.buyerId) : null), [firestore, trade]);
  const { data: buyerProfile } = useDoc<User>(buyerRef);

  const sellerRef = useMemoFirebase(() => (firestore && trade?.sellerId ? doc(firestore, 'users', trade.sellerId) : null), [firestore, trade]);
  const { data: sellerProfile } = useDoc<User>(sellerRef);


  if (isLoading) {
    return <Skeleton className="w-full h-96" />;
  }

  if (error) {
    return <div className="text-red-500">Error loading trade: {error.message}</div>;
  }

  if (!trade || !user) {
    return <Card><CardHeader><CardTitle>Trade Not Found</CardTitle><CardDescription>This trade may have been completed or does not exist.</CardDescription></CardHeader></Card>;
  }
  
  if (!trade.buyer || !trade.seller) {
    return (
        <Card>
            <CardHeader><CardTitle>Incomplete Trade Data</CardTitle></CardHeader>
            <CardContent>
                <p>This trade document is missing critical participant information and cannot be displayed. This may be due to old data. Please contact support if this is a recent trade.</p>
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
       {resolvedDispute && (
          <Alert className="border-green-500 text-green-700">
              <Award className="h-4 w-4" />
              <AlertTitle>Dispute Resolved</AlertTitle>
              <AlertDescription>
                  A moderator has awarded this trade to the <span className="font-bold">{resolvedDispute.winnerId === trade.buyerId ? 'Buyer' : 'Seller'}</span>.
              </AlertDescription>
          </Alert>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">Trade {trade.tradeId}</h1>
      </div>

       {isAdmin && (
        <Card className="my-4 border-amber-500">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Shield className="h-6 w-6 text-amber-500" />
                <div className="grid gap-1">
                    <CardTitle>Admin Controls</CardTitle>
                    <CardDescription>You are viewing this trade as an administrator.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex gap-4">
                 {trade.status === "paid" && (
                     <Button variant="outline" onClick={handleReleaseCrypto}>Admin: Force Release</Button>
                 )}
                 {(trade.status === "active" || trade.status === "paid") && (
                     <Button variant="destructive" onClick={handleCancelTrade}>Admin: Cancel Trade</Button>
                 )}
            </CardContent>
        </Card>
      )}
      
      <div className="p-4 bg-background rounded-lg border mb-4">
        <TradeStatusStepper currentStatus={trade.status} tradeType={currentUserRole} />
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden sticky top-16 bg-background z-10 py-2">
        <Tabs value={mobileView} onValueChange={(value) => setMobileView(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid lg:grid-cols-3 lg:gap-8 mt-4">
          {/* Desktop: Details on left */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
              <TradeDetails trade={trade} sellerTerms={ad?.terms} currentUserRole={currentUserRole}/>
              <ActionButtons />
          </div>

          {/* Mobile: Conditional rendering for Details */}
          <div className={cn("lg:hidden", mobileView !== 'details' && 'hidden')}>
              <div className="space-y-6">
                  <TradeDetails trade={trade} sellerTerms={ad?.terms} currentUserRole={currentUserRole}/>
                  <ActionButtons />
              </div>
          </div>

          {/* Chat: Always on right for desktop, conditional for mobile */}
          <div className={cn("lg:col-span-2", mobileView !== 'chat' && 'hidden lg:block')}>
              <TradeChat currentUserId={user.uid} trade={trade} ad={ad} opponent={opponentProfile} isAdmin={isAdmin} />
          </div>
      </div>
    </>
  );
}


export default function TradePage({ params }: { params: { id: string } }) {
    return <TradePageContent tradeId={params.id} />
}
