import { TradeDetails } from "@/components/trade/trade-details";
import { TradeChat } from "@/components/trade/trade-chat";
import { TradeStatusStepper } from "@/components/trade/trade-status";
import { mockTrade, mockP2PAds } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldCheck, Flag } from "lucide-react";
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
} from "@/components/ui/alert-dialog"

export default function TradePage({ params }: { params: { id: string } }) {
  const trade = mockTrade;
  // This is a sell ad, so current user is the seller
  const currentUserRole = 'sell'; 
  const currentUserId = 'user-1';

  const sellerTerms = mockP2PAds.find(ad => ad.id === trade.adId)?.terms || "No terms specified.";
  
  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Trade {trade.tradeId}</h1>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4">
          <div className="p-6 bg-background rounded-lg border">
            <TradeStatusStepper currentStatus={trade.status} tradeType={currentUserRole === 'buy' ? 'buy' : 'sell'} />
          </div>
          <div className="h-[60vh] lg:h-auto">
             <TradeChat currentUserId={currentUserId} />
          </div>
        </div>
        <div className="lg:col-span-1 grid gap-4 auto-rows-min">
            <TradeDetails trade={trade} sellerTerms={sellerTerms} />
             <div className="space-y-2">
                 {currentUserRole === 'buy' && trade.status === 'active' && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button className="w-full" size="lg">Mark as Paid</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Have you sent <span className="font-bold">{trade.fiatAmount}</span> to the seller? Do not click confirm if you haven't paid.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction>Yes, I Have Paid</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 )}
                 {currentUserRole === 'sell' && trade.status === 'paid' && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button className="w-full" size="lg"><ShieldCheck className="mr-2 h-4 w-4" /> Release Crypto</Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Release Cryptocurrency?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Confirm that you have received <span className="font-bold">{trade.fiatAmount}</span> in your account. This action is irreversible.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction>Confirm and Release</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 )}
                 {trade.status === 'active' && (
                     <Button variant="outline" className="w-full">Cancel Trade</Button>
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
      </div>
    </>
  );
}
