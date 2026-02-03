// This is a new file
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDoc, useFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { P2PAd } from "@/lib/types";
import { initiateTrade } from "@/lib/wallet";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export default function InitiateTradePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const adId = Array.isArray(params.adId) ? params.adId[0] : params.adId;

  const adRef = firestore && adId ? doc(firestore, "p2p_ads", adId) : null;
  const { data: ad, isLoading: isAdLoading } = useDoc<P2PAd>(adRef);

  const [fiatAmount, setFiatAmount] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFiatAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFiatAmount(value);
    if (ad && value) {
      const price = ad.rateType === "fixed" ? ad.fixedRate! : 65000; // Replace with real market price
      setCryptoAmount((parseFloat(value) / price).toFixed(8));
      validateAmount(parseFloat(value));
    } else {
      setCryptoAmount("");
    }
  };

  const validateAmount = (value: number) => {
    if (!ad) return;
    if (value < ad.minAmount) {
      setError(`Amount must be at least ${ad.minAmount} ${ad.fiatCurrency}.`);
    } else if (value > ad.maxAmount) {
      setError(`Amount must be less than ${ad.maxAmount} ${ad.fiatCurrency}.`);
    } else {
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (error || !fiatAmount || !ad || !user) return;
    setIsSubmitting(true);

    try {
      const tradeId = await initiateTrade(
        firestore,
        user.uid,
        ad,
        parseFloat(cryptoAmount),
        parseFloat(fiatAmount)
      );
      toast({ title: "Trade Initiated!", description: "You are being redirected to the trade page." });
      router.push(`/trade/${tradeId}`);
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Trade Failed", description: e.message });
      setIsSubmitting(false);
    }
  };

  if (isAdLoading) {
    return <Skeleton className="h-96 w-full max-w-2xl mx-auto" />;
  }

  if (!ad) {
    return <div>Ad not found.</div>;
  }
  
  if (ad.userId === user?.uid) {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Action Not Allowed</AlertTitle>
            <AlertDescription>You cannot trade with yourself.</AlertDescription>
        </Alert>
    );
  }

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
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <Label>You Pay ({ad.fiatCurrency})</Label>
                <Input
                  type="number"
                  value={fiatAmount}
                  onChange={handleFiatAmountChange}
                  placeholder={`${ad.minAmount} - ${ad.maxAmount}`}
                />
              </div>
              <div>
                <Label>You Get ({ad.crypto})</Label>
                <Input type="text" value={cryptoAmount} readOnly disabled />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Trade Summary</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>Seller: {ad.user.userId}</li>
                        <li>Payment Method: {ad.paymentMethods.join(', ')}</li>
                        <li>Price: {ad.rateType === 'fixed' ? `${ad.fixedRate} ${ad.fiatCurrency}` : `Market rate`}</li>
                        <li>Seller's Terms: {ad.terms}</li>
                    </ul>
                </AlertDescription>
            </Alert>

            <Button type="submit" className="w-full" size="lg" disabled={!!error || !fiatAmount || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Starting Trade...' : 'Buy Now'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
