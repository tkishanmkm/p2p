
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
import { Wallet, Landmark, CreditCard, Smartphone, Car, Search } from "lucide-react";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import { currencies } from "@/lib/currencies";
import { countries } from "@/lib/countries";
import { Skeleton } from "@/components/ui/skeleton";
import type { P2PAd } from "@/lib/types";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    bankTransfers,
    onlineWallets,
    mobileMoney,
    cashPayments,
    giftCardPaymentMethods,
} from "@/lib/payment-methods";


function BuyPageContent() {
  const { firestore } = useFirebase();

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedCoin, setSelectedCoin] = useState("");
  const [selectedFiat, setSelectedFiat] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");

  const allPaymentMethods = useMemo(() => [
    { category: 'Bank Transfers', methods: bankTransfers, icon: Landmark },
    { category: 'Online Wallets', methods: onlineWallets, icon: Wallet },
    { category: 'Mobile Money', methods: mobileMoney, icon: Smartphone },
    { category: 'Cash Payments', methods: cashPayments, icon: Car },
    { category: 'Gift Cards', methods: giftCardPaymentMethods, icon: CreditCard },
  ], []);

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
             <Button type="button" variant="outline" className="w-full justify-start text-left font-normal" onClick={() => setIsPaymentSheetOpen(true)}>
                {paymentMethod || 'All Payment Methods'}
            </Button>
            
            {/* Country Filter */}
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
      
      <Sheet open={isPaymentSheetOpen} onOpenChange={setIsPaymentSheetOpen}>
        <SheetContent className="flex flex-col">
            <SheetHeader>
                <SheetTitle>Filter by Payment Method</SheetTitle>
            </SheetHeader>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search all methods..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    className="pl-10"
                />
            </div>
            <ScrollArea className="flex-grow -mx-6">
                <div className="px-6 py-4 space-y-1">
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => { setPaymentMethod(''); setIsPaymentSheetOpen(false); }}
                    >
                        All Payment Methods
                    </Button>
                    {allPaymentMethods.map(({ category, methods, icon: Icon }) => {
                        const filteredMethods = methods.filter(m => m.toLowerCase().includes(paymentSearch.toLowerCase()));
                        if (paymentSearch && filteredMethods.length === 0) return null;
                        return (
                            <Accordion type="single" collapsible key={category}>
                                <AccordionItem value={category} className="border-b-0">
                                    <AccordionTrigger className="hover:no-underline"><Icon className="mr-2 h-4 w-4" />{category}</AccordionTrigger>
                                    <AccordionContent className="pl-4">
                                        {filteredMethods.map(method => (
                                            <Button
                                                key={method}
                                                variant="ghost"
                                                className="w-full justify-start font-normal h-auto py-2"
                                                onClick={() => { setPaymentMethod(method); setIsPaymentSheetOpen(false); }}
                                            >
                                                {method}
                                            </Button>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        );
                    })}
                </div>
            </ScrollArea>
            {paymentSearch && (
                <SheetFooter>
                    <Button className="w-full" onClick={() => { setPaymentMethod(paymentSearch); setIsPaymentSheetOpen(false); }}>
                        <Search className="mr-2 h-4 w-4" />
                        Search for "{paymentSearch}"
                    </Button>
                </SheetFooter>
            )}
        </SheetContent>
      </Sheet>
    </>
  );
}


export default function BuyPage() {
    return <BuyPageContent />;
}
