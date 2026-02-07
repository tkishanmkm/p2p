
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
import { Wallet } from "lucide-react";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import { currencies } from "@/lib/currencies";
import { countries } from "@/lib/countries";
import { Skeleton } from "@/components/ui/skeleton";
import type { P2PAd } from "@/lib/types";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

function BuyPageContent() {
  const { firestore } = useFirebase();

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedCoin, setSelectedCoin] = useState("");
  const [selectedFiat, setSelectedFiat] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");

  const sellAdsQuery = useMemoFirebase(() => 
    firestore 
      ? query(collection(firestore, "p2p_ads"), where("adType", "==", "sell"), where("active", "==", true))
      : null,
    [firestore]
  );
  const { data: sellAds, isLoading } = useCollection<P2PAd>(sellAdsQuery);

  const filteredAds = useMemo(() => {
    if (!sellAds) return [];

    return sellAds.filter(ad => {
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
  }, [sellAds, amount, paymentMethod, selectedCoin, selectedFiat, selectedCountry]);

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Buy Coin</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Find Offers to Buy From</CardTitle>
          <CardDescription>
            Filter through available ads to find the best offer for you.
          </CardDescription>
          <div className="mt-4 space-y-4">
            {/* Coin Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
                  {selectedCoin || 'All Coins'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
                <DropdownMenuRadioGroup value={selectedCoin} onValueChange={setSelectedCoin}>
                  <DropdownMenuRadioItem value="">All Coins</DropdownMenuRadioItem>
                  <DropdownMenuSeparator />
                  {SUPPORTED_CRYPTOS.map(c => <DropdownMenuRadioItem key={c.name} value={c.name}>{c.name}</DropdownMenuRadioItem>)}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Payment Method */}
            <Input
              placeholder="Payment method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />

            {/* Amount and Fiat */}
            <div className="flex items-center">
              <Input
                placeholder="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-r-none"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-l-none border-l-0 min-w-[100px]">
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
            </div>
             {/* Country Filter - keeping it for now but separate */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {selectedCountry ? countries.find(c=>c.code === selectedCountry)?.name : 'All Countries'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
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
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
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


export default function BuyPage() {
    return <BuyPageContent />;
}
