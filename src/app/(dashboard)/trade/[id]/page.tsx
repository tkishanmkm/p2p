"use client";

import { useState, useEffect } from "react";
import { TradeDetails } from "@/components/trade/trade-details";
import { TradeChat } from "@/components/trade/trade-chat";
import { TradeStatusStepper } from "@/components/trade/trade-status";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldCheck, Flag, ArrowLeftRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDoc, useFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { cancelTrade, markTradeAsPaid, releaseFundsFromEscrow, claimFundsForTrade } from "@/lib/wallet";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

function TradePageContent({ tradeId }: { tradeId: string }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const { data: trade, isLoading, error } = useDoc<Trade>(
    firestore && tradeId ? doc(firestore, "trades", tradeId) : null
  );
  const [isDetailsLeft, setIsDetailsLeft] = useState(true);

  const currentUserRole = user?.uid === trade?.buyerId ? "buy" : "sell";

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
  }, [trade, currentUserRole, firestore, user, toast]);

  if (isLoading) {
    return <Skeleton className="w-full h-96" />;
  }

  if (error) {
    return <div className="text-red-500">Error loading trade: {error.message}</div>;
  }

  if (!trade) {
    return <div>Trade not found.</div>;
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
      await cancelTrade(firestore, trade.id, trade.sellerId, trade.crypto, trade.amount);
      toast({ title: "Trade Cancelled", description: "The funds have been returned to the seller." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  }
  
  const toggleView = () => setIsDetailsLeft(prev => !prev);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Trade {trade.tradeId}</h1>
        <Button variant="outline" size="sm" onClick={toggleView} className="hidden lg:flex">
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Switch View
        </Button>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
        
        <div className={cn("lg:col-span-1 grid gap-4 auto-rows-min", { "lg:order-last": !isDetailsLeft })}>
          <TradeDetails trade={trade} />
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
                      Have you sent <span className="font-bold">{trade.fiatAmount} {trade.fiatCurrency}</span> to the seller? Do not click confirm if you haven't paid.
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
            {trade.status === 'active' && (
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
              <Button variant="destructive" className="w-full"><Flag className="mr-2 h-4 w-4" /> Open Dispute</Button>
            )}
            <div className="text-xs p-3 bg-red-100 border-l-4 border-red-500 text-red-900 rounded-r-md flex gap-2 items-start">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                <strong>Warning:</strong> If the other party asks you to cancel the trade for any reason, it may be an attempt to scam.
              </p>
            </div>
          </div>
        </div>

        <div className={cn("lg:col-span-2 grid gap-4", { "lg:order-first": !isDetailsLeft })}>
            <div className="p-6 bg-background rounded-lg border">
                <TradeStatusStepper currentStatus={trade.status} tradeType={currentUserRole} />
            </div>
            <div className="h-[60vh] lg:h-auto">
                <TradeChat currentUserId={user?.uid || ""} />
            </div>
        </div>
      </div>
    </>
  );
}


export default function TradePage({ params }: { params: { id: string } }) {
    return <TradePageContent tradeId={params.id} />
}
