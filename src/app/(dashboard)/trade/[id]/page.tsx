
"use client";

import { useState, useEffect } from "react";
import { TradeDetails } from "@/components/trade/trade-details";
import { TradeChat } from "@/components/trade/trade-chat";
import { TradeStatusStepper } from "@/components/trade/trade-status";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldCheck, Flag, ArrowLeftRight, Award, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDoc, useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, limit } from "firebase/firestore";
import { cancelTrade, markTradeAsPaid, releaseFundsFromEscrow, claimFundsForTrade } from "@/lib/wallet";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trade, Dispute, P2PAd, User } from "@/lib/types";
import { cn, toDate } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAdminStatus } from "@/hooks/use-admin-status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenDisputeDialog } from "@/components/trade/open-dispute-dialog";

function TradePageContent({ tradeId }: { tradeId: string }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isDetailsLeft, setIsDetailsLeft] = useState(true);
  const { isAdmin } = useAdminStatus();

  const tradeRef = firestore && tradeId ? doc(firestore, "trades", tradeId) : null;
  const { data: trade, isLoading, error } = useDoc<Trade>(tradeRef);
  
  const adRef = useMemoFirebase(() => (firestore && trade?.adId ? doc(firestore, 'p2p_ads', trade.adId) : null), [firestore, trade]);
  const { data: ad } = useDoc<P2PAd>(adRef);
  
  const disputeQuery = useMemoFirebase(() => firestore && tradeId ? query(collection(firestore, `trades/${tradeId}/disputes`), where('status', '==', 'resolved'), limit(1)) : null, [firestore, tradeId]);
  const { data: resolvedDisputes } = useCollection<Dispute>(disputeQuery);
  const resolvedDispute = resolvedDisputes?.[0];

  // Fetch full user profiles for opponent status
  const buyerRef = useMemoFirebase(() => (firestore && trade?.buyerId ? doc(firestore, 'users', trade.buyerId) : null), [firestore, trade]);
  const { data: buyerProfile } = useDoc<User>(buyerRef);

  const sellerRef = useMemoFirebase(() => (firestore && trade?.sellerId ? doc(firestore, 'users', trade.sellerId) : null), [firestore, trade]);
  const { data: sellerProfile } = useDoc<User>(sellerRef);

  const opponentProfile = user?.uid === trade?.buyerId ? sellerProfile : buyerProfile;


  const currentUserRole = user?.uid === trade?.buyerId ? "buy" : "sell";

  // Effect for handling expired trades
  useEffect(() => {
    if (trade && trade.status === 'active' && toDate(trade.expiresAt) && new Date() > toDate(trade.expiresAt)!) {
        if (tradeRef && trade.status === 'active') {
             console.log("Trade is expired, attempting to cancel...");
            cancelTrade(firestore, trade.id)
                .then(() => {
                    toast({ title: "Trade Expired", description: "The trade was automatically cancelled and funds returned to the seller." });
                })
                .catch((e) => {
                    console.error("Auto-cancellation of expired trade failed:", e);
                });
        }
    }
  }, [trade, firestore, toast, tradeRef]);

  // Effect for buyer to auto-claim funds
  useEffect(() => {
    if (trade?.status === "released" && currentUserRole === "buy" && !trade.claimedByBuyer) {
      console.log("Attempting to claim funds...");
      claimFundsForTrade(firestore, trade.id, user.uid)
        .then(() => {
          toast({ title: "Funds Claimed", description: "The crypto has been added to your wallet." });
        })
        .catch((e) => {
          console.error("Claiming funds failed:", e);
          toast({ variant: "destructive", title: "Claiming Failed", description: e.message });
        });
    }
  }, [trade, currentUserRole, firestore, user?.uid, toast]);

  if (isLoading) {
    return <Skeleton className="w-full h-96" />;
  }

  if (error) {
    return <div className="text-red-500">Error loading trade: {error.message}</div>;
  }

  if (!trade || !user) {
    return <div>Trade not found or user not loaded.</div>;
  }

  const handleMarkAsPaid = async () => {
    try {
      await markTradeAsPaid(firestore, trade.id);
      toast({ title: "Success", description: "Seller has been notified that you've paid." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleReleaseCrypto = async () => {
    try {
      await releaseFundsFromEscrow(firestore, trade.id);
      toast({ title: "Crypto Released", description: "The crypto has been sent to the buyer." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleCancelTrade = async () => {
     try {
      await cancelTrade(firestore, trade.id);
      toast({ title: "Trade Cancelled", description: "The funds have been returned to the seller." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  }
  
  const toggleView = () => setIsDetailsLeft(prev => !prev);
  
  const isTradeClosed = ['released', 'cancelled', 'expired', 'disputed'].includes(trade.status);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Trade {trade.tradeId}</h1>
        <Button variant="outline" size="sm" onClick={toggleView} className="hidden lg:flex">
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Switch View
        </Button>
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

      <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
        
        <div className={cn("lg:col-span-1 grid gap-4 auto-rows-min", { "lg:order-last": !isDetailsLeft })}>
          <TradeDetails trade={trade} sellerTerms={ad?.terms}/>
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
                      Have you sent <span className="font-bold">{trade.fiatAmount} {trade.fiatCurrency}</span> to the seller? Only confirm after you have fully sent the payment. Falsely confirming payment may result in a dispute and suspension of your account.
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
                  <Button className="w-full" size="lg"><ShieldCheck className="mr-2 h-4 w-4" /> Release Crypto</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Release Cryptocurrency?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirm that you have received <span className="font-bold">{trade.fiatAmount} {trade.fiatCurrency}</span> in your account. This action is irreversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReleaseCrypto}>Confirm and Release</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {trade.status === 'active' && currentUserRole !== 'sell' && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full">Cancel Trade</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Trade?</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure you want to cancel? This cannot be undone.</AlertDialogDescription>
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
                <strong>Warning:</strong> If the other party asks you to cancel the trade for any reason, it may be an attempt to scam.
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
        </div>

        <div className={cn("lg:col-span-2 grid gap-4", { "lg:order-first": !isDetailsLeft })}>
            <div className="p-6 bg-background rounded-lg border">
                <TradeStatusStepper currentStatus={trade.status} tradeType={currentUserRole} />
            </div>
            <div className="h-[60vh] lg:h-auto">
                <TradeChat currentUserId={user?.uid || ""} trade={trade} opponent={opponentProfile} isAdmin={isAdmin} />
            </div>
        </div>
      </div>
    </>
  );
}


export default function TradePage({ params }: { params: { id: string } }) {
    return <TradePageContent tradeId={params.id} />
}
