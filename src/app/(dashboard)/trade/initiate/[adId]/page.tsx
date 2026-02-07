
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDoc, useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { P2PAd, Trade, UserWallet, User } from "@/lib/types";
import { initiateTrade } from "@/lib/wallet";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrices } from "@/context/price-context";
import { AccountStatusAlert } from "@/components/p2p/account-status-alert";

function ActiveTradePrompt({ trade }: { trade: Trade }) {
  const router = useRouter();
  const { user } = useFirebase();
  const isBuyer = user?.uid === trade.buyerId;
  const partner = isBuyer ? trade.seller : trade.buyer;

  return (
    <div className="flex justify-center items-start pt-10">
        <Card className="w-full max-w-2xl">
        <CardHeader>
            <CardTitle>Active Trade Found</CardTitle>
            <CardDescription>
            You already have an active trade for this advertisement.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="p-4 border rounded-md bg-secondary/50 space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Trade ID</span>
                    <span className="font-mono">{trade.tradeId}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Your Role</span>
                    <Badge variant={isBuyer ? "default" : "secondary"}>{isBuyer ? "Buyer" : "Seller"}</Badge>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Partner</span>
                    <span>{partner.userId}</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">{trade.amount} {trade.crypto}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="capitalize">{trade.status}</Badge>
                </div>
            </div>
            <Button onClick={() => router.push(`/trade/${trade.id}`)} className="w-full" size="lg">
            Go to Trade Room
            </Button>
        </CardContent>
        </Card>
    </div>
  );
}

export default function InitiateTradePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { firestore, user: authUser, isUserLoading: isAuthLoading } = useFirebase();
  
  useEffect(() => {
    if (!isAuthLoading && !authUser) {
      router.push(`/login?redirect=/trade/initiate/${params.adId}`);
    }
  }, [authUser, isAuthLoading, router, params.adId]);

  const { prices } = usePrices();
  const adId = Array.isArray(params.adId) ? params.adId[0] : params.adId;

  const userRef = useMemoFirebase(() => (authUser ? doc(firestore, "users", authUser.uid) : null), [firestore, authUser]);
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);

  const adRef = firestore && adId ? doc(firestore, "p2p_ads", adId) : null;
  const { data: ad, isLoading: isAdLoading } = useDoc<P2PAd>(adRef);
  
  const tradesRef = useMemoFirebase(() => (firestore ? collection(firestore, "trades") : null), [firestore]);

  const activeTradeAsBuyerQuery = useMemoFirebase(() => (
    tradesRef && authUser && adId
      ? query(tradesRef, where("adId", "==", adId), where("buyerId", "==", authUser.uid), where("status", "in", ["active", "paid"]))
      : null
  ), [tradesRef, authUser, adId]);
  const { data: activeBuyerTrades, isLoading: isLoadingBuyer } = useCollection<Trade>(activeTradeAsBuyerQuery);
  
  const activeTradeAsSellerQuery = useMemoFirebase(() => (
    tradesRef && authUser && adId
      ? query(tradesRef, where("adId", "==", adId), where("sellerId", "==", authUser.uid), where("status", "in", ["active", "paid"]))
      : null
  ), [tradesRef, authUser, adId]);
  const { data: activeSellerTrades, isLoading: isLoadingSeller } = useCollection<Trade>(activeTradeAsSellerQuery);
  
  const sellerWalletRef = useMemoFirebase(() => 
    (firestore && ad && ad.adType === 'sell') ? doc(firestore, 'users', ad.userId, 'wallets', ad.crypto) : null,
    [firestore, ad]
  );
  const { data: sellerWallet, isLoading: isSellerWalletLoading } = useDoc<UserWallet>(sellerWalletRef);

  const activeTrade = activeBuyerTrades?.[0] || activeSellerTrades?.[0];
  const isLoadingActiveTrade = isLoadingBuyer || isLoadingSeller;

  const [fiatAmount, setFiatAmount] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [effectiveMaxAmount, setEffectiveMaxAmount] = useState<number | null>(null);
  const [balanceInfo, setBalanceInfo] = useState<string | null>(null);
  const [isEligible, setIsEligible] = useState(true);
  const [eligibilityMessage, setEligibilityMessage] = useState('');

  useEffect(() => {
    if (user && ad) {
      const userCountry = user.country;
      const targeted = ad.targetedCountries;
      const blocked = ad.blockedCountries;

      if (!userCountry) {
        setIsEligible(false);
        setEligibilityMessage("You must set your country in your profile to initiate this trade.");
        return;
      }

      if (ad.minCompletedTrades && ad.minCompletedTrades > 0) {
        if ((user.completedTrades || 0) < ad.minCompletedTrades) {
          setIsEligible(false);
          setEligibilityMessage(`This offer requires you to have at least ${ad.minCompletedTrades} completed trades. You have ${user.completedTrades || 0}.`);
          return;
        }
      }

      if (targeted && targeted.length > 0 && !targeted.includes('all')) {
        if (!targeted.includes(userCountry)) {
          setIsEligible(false);
          setEligibilityMessage("This ad is not available for users from your country.");
          return;
        }
      }

      if (blocked && blocked.length > 0) {
        if (blocked.includes(userCountry)) {
          setIsEligible(false);
          setEligibilityMessage("This ad is not available for users from your country.");
          return;
        }
      }
      
      setIsEligible(true);
      setEligibilityMessage('');
    }
  }, [user, ad]);


  useEffect(() => {
    if (ad && prices[ad.crypto]) {
        let maxAmount = ad.maxAmount;
        if (ad.adType === 'sell' && !isSellerWalletLoading) {
             const marketPrice = prices[ad.crypto];
             const adPrice = ad.rateType === 'fixed' 
                ? ad.fixedRate! 
                : marketPrice * (1 + (ad.ratePercent || 0) / 100);

            if (sellerWallet && adPrice > 0) {
                const maxFiatFromBalance = sellerWallet.balance * adPrice;
                const realMax = Math.floor(Math.min(ad.maxAmount, maxFiatFromBalance));
                
                if (realMax < ad.maxAmount) {
                    setBalanceInfo(`The maximum amount has been adjusted to ${realMax.toLocaleString()} ${ad.fiatCurrency} based on the seller's current balance.`);
                }
                maxAmount = realMax;

            } else {
                maxAmount = 0; // No wallet, no funds
            }
        }
        setEffectiveMaxAmount(maxAmount);
        if (maxAmount < ad.minAmount) {
             setError("Seller has insufficient funds to cover the minimum trade amount.");
        }
    }
  }, [ad, sellerWallet, isSellerWalletLoading, prices]);


  const handleFiatAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFiatAmount(value);
    validateAmount(parseFloat(value));
    if (ad && value) {
      const marketPrice = prices[ad.crypto] || 0;
      const price = ad.rateType === "fixed" ? ad.fixedRate! : marketPrice * (1 + (ad.ratePercent || 0) / 100);
      setCryptoAmount(price > 0 ? (parseFloat(value) / price).toFixed(8) : "0");
    } else {
      setCryptoAmount("");
    }
  };

  const validateAmount = (value: number) => {
    if (!ad || effectiveMaxAmount === null) return;
    if (isNaN(value)) {
        setError("");
        return;
    }
    if (value < ad.minAmount) {
      setError(`Amount must be at least ${ad.minAmount} ${ad.fiatCurrency}.`);
    } else if (value > effectiveMaxAmount) {
      setError(`Amount must be less than ${effectiveMaxAmount.toLocaleString()} ${ad.fiatCurrency} due to seller's balance.`);
    } else {
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (error || !fiatAmount || !ad || !user || !paymentMethod) {
        if (!paymentMethod) {
            setError("Please select a payment method.");
        }
        return;
    };
    setIsSubmitting(true);

    try {
      const tradeId = await initiateTrade(
        firestore,
        authUser!.uid,
        ad,
        parseFloat(cryptoAmount),
        parseFloat(fiatAmount),
        paymentMethod
      );
      toast({ title: "Trade Initiated!", description: "You are being redirected to the trade page." });
      router.push(`/trade/${tradeId}`);
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Trade Failed", description: e.message });
      setIsSubmitting(false);
    }
  };
  
  const isLoading = isAuthLoading || isUserLoading || isAdLoading || isLoadingActiveTrade || (ad?.adType === 'sell' && isSellerWalletLoading);

  if (isLoading || !authUser) {
    return (
        <div className="flex flex-1 items-center justify-center pt-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
  }
  
  if (activeTrade) {
    return <ActiveTradePrompt trade={activeTrade} />;
  }

  if (!ad) {
    return <div>Ad not found.</div>;
  }
  
  if (ad.userId === authUser?.uid) {
    return (
        <div className="pt-10">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Action Not Allowed</AlertTitle>
            <AlertDescription>You cannot trade with yourself.</AlertDescription>
        </Alert>
        </div>
    );
  }

  if (user && (user.isBanned || user.isOnHold)) {
    return (
      <div className="flex justify-center items-start pt-10">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Action Not Allowed</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountStatusAlert user={user} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isEligible) {
    return (
      <div className="flex justify-center items-start pt-10">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Trade Not Allowed</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>You cannot trade this ad</AlertTitle>
              <AlertDescription>{eligibilityMessage}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTradePossible = effectiveMaxAmount !== null && effectiveMaxAmount >= ad.minAmount;

  return (
    <div className="flex justify-center items-start pt-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Initiate Trade</CardTitle>
          <CardDescription>
            You are {ad.adType === 'sell' ? 'buying' : 'selling'} {ad.crypto} from {ad.user.userId}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <Label>You Pay ({ad.fiatCurrency})</Label>
                <Input
                  type="number"
                  value={fiatAmount}
                  onChange={handleFiatAmountChange}
                  placeholder={effectiveMaxAmount !== null ? `${ad.minAmount} - ${Math.floor(effectiveMaxAmount).toLocaleString()}` : `${ad.minAmount} - ${ad.maxAmount}`}
                  disabled={!isTradePossible}
                />
              </div>
              <div>
                <Label>You Get ({ad.crypto})</Label>
                <Input type="text" value={cryptoAmount} readOnly disabled />
              </div>
            </div>
            
            <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={!isTradePossible}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a payment method" />
                    </SelectTrigger>
                    <SelectContent>
                        {ad.paymentMethods.map(pm => (
                            <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            {error && <p className="text-sm text-destructive">{error}</p>}

            {balanceInfo && (
                <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Please Note</AlertTitle>
                    <AlertDescription>{balanceInfo}</AlertDescription>
                </Alert>
            )}
            
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Trade Summary</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>Seller: {ad.user.userId}</li>
                        <li>Available Methods: {ad.paymentMethods.join(', ')}</li>
                        <li>Price: {ad.rateType === 'fixed' ? `${ad.fixedRate} ${ad.fiatCurrency}` : `Market rate`}</li>
                        <li>Seller's Terms: {ad.terms}</li>
                    </ul>
                </AlertDescription>
            </Alert>

            <Button type="submit" className="w-full" size="lg" disabled={!!error || !fiatAmount || !paymentMethod || isSubmitting || !isTradePossible}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Starting Trade...' : 'Buy Now'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
