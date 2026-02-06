
"use client";

import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdCard } from "@/components/p2p/ad-card";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ListFilter, Search, Wallet } from "lucide-react";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import { currencies } from "@/lib/currencies";
import { countries } from "@/lib/countries";
import { Skeleton } from "@/components/ui/skeleton";
import type { P2PAd } from "@/lib/types";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";


function SellPageContent() {
  const { firestore } = useFirebase();

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedCoin, setSelectedCoin] = useState("");
  const [selectedFiat, setSelectedFiat] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  
  const buyAdsQuery = useMemoFirebase(() =>
    firestore
      ? query(collection(firestore, "p2p_ads"), where("adType", "==", "buy"), where("active", "==", true))
      : null,
    [firestore]
  );
  const { data: buyAds, isLoading } = useCollection<P2PAd>(buyAdsQuery);

  const filteredAds = useMemo(() => {
    if (!buyAds) return [];

    return buyAds.filter(ad => {
      const amountNum = parseFloat(amount);
      if (amount && !isNaN(amountNum)) {
        if (amountNum < ad.minAmount || amountNum > ad.maxAmount) {
          return false;
        }
      }
      if (paymentMethod) {
          const hasMethod = ad.paymentMethods.some(pm => pm.toLowerCase().includes(paymentMethod.toLowerCase()));
          if (!hasMethod) return false;
      }
      if (selectedCoin && ad.crypto !== selectedCoin) {
        return false;
      }
      if (selectedFiat && ad.fiatCurrency !== selectedFiat) {
        return false;
      }
      if (selectedCountry && ad.user.country !== selectedCountry) {
        return false;
      }
      return true;
    });
  }, [buyAds, amount, paymentMethod, selectedCoin, selectedFiat, selectedCountry]);

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Sell Coin</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Find Buyers for Your Crypto</CardTitle>
          <CardDescription>
            Filter through available buy ads to find the best offer for your assets.
          </CardDescription>
           <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="grid sm:grid-cols-2 gap-4 flex-1">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Amount" 
                        className="pl-10" 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Payment method" 
                        className="pl-10" 
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1 sm:flex-initial">
                        <ListFilter className="mr-2 h-4 w-4" />
                        {selectedCoin || 'Coin'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuRadioGroup value={selectedCoin} onValueChange={setSelectedCoin}>
                            <DropdownMenuRadioItem value="">All Coins</DropdownMenuRadioItem>
                            <DropdownMenuSeparator />
                            {SUPPORTED_CRYPTOS.map(c => <DropdownMenuRadioItem key={c.name} value={c.name}>{c.name}</DropdownMenuRadioItem>)}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1 sm:flex-initial">
                        <ListFilter className="mr-2 h-4 w-4" />
                        {selectedFiat || 'Fiat'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <ScrollArea className="h-64">
                            <DropdownMenuRadioGroup value={selectedFiat} onValueChange={setSelectedFiat}>
                                <DropdownMenuRadioItem value="">All Fiats</DropdownMenuRadioItem>
                                <DropdownMenuSeparator />
                                {currencies.map(c => <DropdownMenuRadioItem key={c.code} value={c.code}>{c.name}</DropdownMenuRadioItem>)}
                            </DropdownMenuRadioGroup>
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1 sm:flex-initial">
                        <ListFilter className="mr-2 h-4 w-4" />
                        {selectedCountry || 'Country'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <ScrollArea className="h-64">
                            <DropdownMenuRadioGroup value={selectedCountry} onValueChange={setSelectedCountry}>
                                <DropdownMenuRadioItem value="">All Countries</DropdownMenuRadioItem>
                                <DropdownMenuSeparator />
                                {countries.map(c => <DropdownMenuRadioItem key={c.code} value={c.code}>{c.name}</DropdownMenuRadioItem>)}
                            </DropdownMenuRadioGroup>
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {!isLoading && filteredAds && filteredAds.length > 0 && (
            filteredAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))
          )}
          {!isLoading && (!filteredAds || filteredAds.length === 0) && (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Ads Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">No ads match your current filter criteria. Try adjusting your filters.</p>
              </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}


export default function SellPage() {
    return <SellPageContent />;
}
