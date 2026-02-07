
"use client";

import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdCard } from "@/components/p2p/ad-card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, Landmark, CreditCard, Smartphone, Car, Search, Loader2, ArrowDown, ArrowUp, PlusCircle, SlidersHorizontal, RefreshCw, BookOpen, HelpCircle } from "lucide-react";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import { currencies } from "@/lib/currencies";
import { countries } from "@/lib/countries";
import { Skeleton } from "@/components/ui/skeleton";
import type { P2PAd, CryptoCurrency } from "@/lib/types";
import { useState, useMemo, Suspense, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from 'next/link';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from '@/components/icons';
import {
    bankTransfers,
    onlineWallets,
    mobileMoney,
    cashPayments,
    giftCardPaymentMethods,
} from "@/lib/payment-methods";
import { FlagIcon } from "@/components/ui/flag-icon";
import { cn } from "@/lib/utils";
import { usePrices } from "@/context/price-context";


const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency, className?: string }) => {
    switch (crypto) {
        case 'BTC': return <BtcLogo className={className} />;
        case 'ETH': return <EthLogo className={className} />;
        case 'LTC': return <LtcLogo className={className} />;
        case 'USDT': return <UsdtLogo className={className} />;
        default: return null;
    }
}

function SellPageContent() {
  const { firestore } = useFirebase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [amount, setAmount] = useState(searchParams.get('amount') || "");
  const [paymentMethod, setPaymentMethod] = useState(searchParams.get('paymentMethod') || "");
  const [selectedCoin, setSelectedCoin] = useState<CryptoCurrency>(searchParams.get('coin') as CryptoCurrency || "BTC");
  const [selectedFiat, setSelectedFiat] = useState(searchParams.get('fiat') || "USD");
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || "");

  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [isFiatSheetOpen, setIsFiatSheetOpen] = useState(false);
  const [fiatSearch, setFiatSearch] = useState("");
  const [isCountrySheetOpen, setIsCountrySheetOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);

  const { prices } = usePrices();

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (amount) params.set('amount', amount); else params.delete('amount');
    if (paymentMethod) params.set('paymentMethod', paymentMethod); else params.delete('paymentMethod');
    if (selectedCoin) params.set('coin', selectedCoin); else params.delete('coin');
    if (selectedFiat) params.set('fiat', selectedFiat); else params.delete('fiat');
    if (selectedCountry) params.set('country', selectedCountry); else params.delete('country');
    router.replace(`${pathname}?${params.toString()}`);
  }, [amount, paymentMethod, selectedCoin, selectedFiat, selectedCountry, pathname, router, searchParams]);

  const allPaymentMethods = useMemo(() => [
    { category: 'Bank Transfers', methods: bankTransfers, icon: Landmark },
    { category: 'Online Wallets', methods: onlineWallets, icon: Wallet },
    { category: 'Mobile Money', methods: mobileMoney, icon: Smartphone },
    { category: 'Cash Payments', methods: cashPayments, icon: Car },
    { category: 'Gift Cards', methods: giftCardPaymentMethods, icon: CreditCard },
  ], []);

  const buyAdsQuery = useMemoFirebase(() =>
    firestore
      ? query(collection(firestore, "p2p_ads"), where("adType", "==", "buy"), where("active", "==", true))
      : null,
    [firestore]
  );
  const { data: buyAds, isLoading } = useCollection<P2PAd>(buyAdsQuery);

  const filteredFiats = useMemo(() => {
    return currencies.filter(c => 
        c.name.toLowerCase().includes(fiatSearch.toLowerCase()) || 
        c.code.toLowerCase().includes(fiatSearch.toLowerCase())
    );
  }, [fiatSearch]);

  const filteredCountries = useMemo(() => {
    return countries.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
    );
  }, [countrySearch]);

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
  
  const handleToggle = (page: 'buy' | 'sell') => {
    router.push(`/${page}`);
  }

  const pageTitle = `Sell ${selectedCoin === 'BTC' ? 'Bitcoin' : selectedCoin === 'ETH' ? 'Ethereum' : selectedCoin === 'LTC' ? 'Litecoin' : 'Tether'}`;
  const marketPrice = prices[selectedCoin] || 0;
  const marketPriceText = `1 ${selectedCoin} ≈ ${marketPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
            <h1 className="text-2xl font-bold md:text-3xl">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground">{marketPriceText}</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
            <Link href="/guides" className="flex items-center gap-2 hover:text-primary transition-colors"><BookOpen className="h-4 w-4" /> Academy</Link>
            <Link href="#" className="flex items-center gap-2 hover:text-primary transition-colors"><HelpCircle className="h-4 w-4" /> Take a Tour</Link>
        </div>
      </div>
      
      {/* FILTER BAR */}
      <div className="flex items-center gap-2 rounded-lg bg-card border p-2 flex-wrap mb-6">
        {/* Desktop view */}
        <div className="hidden md:flex items-center gap-2 w-full">
            <div className="flex items-center bg-muted p-1 rounded-md">
                <Button size="sm" onClick={() => handleToggle('buy')} className={cn('bg-transparent text-muted-foreground hover:bg-muted/50', pathname.includes('/buy') && 'bg-green-600 hover:bg-green-700 text-white shadow-md')}>
                    <ArrowDown className="mr-2 h-4 w-4" /> Buy
                </Button>
                <Button size="sm" onClick={() => handleToggle('sell')} className={cn('bg-transparent text-muted-foreground hover:bg-muted/50', pathname.includes('/sell') && 'bg-red-600 hover:bg-red-700 text-white shadow-md')}>
                    <ArrowUp className="mr-2 h-4 w-4" /> Sell
                </Button>
            </div>

            <Select value={selectedCoin} onValueChange={(v) => setSelectedCoin(v as CryptoCurrency)}>
                <SelectTrigger className="h-10 w-[120px] rounded-md border bg-background shadow-sm">
                    <SelectValue>
                        <div className="flex items-center gap-2">
                            <CryptoLogo crypto={selectedCoin} className="h-5 w-5" />
                            <span className="font-semibold">{selectedCoin}</span>
                        </div>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                     {SUPPORTED_CRYPTOS.map(c => (
                        <SelectItem key={c.name} value={c.name}>
                            <div className="flex items-center gap-2">
                                <CryptoLogo crypto={c.name} className="h-5 w-5" />
                                <span className="font-medium">{c.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            
            <div className="relative flex items-center max-w-xs flex-1">
                <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 rounded-md bg-background pl-4 pr-20"/>
                <Button type="button" variant="ghost" className="absolute right-1 h-8 px-3 rounded-md" onClick={() => setIsFiatSheetOpen(true)}>
                    {selectedFiat}
                </Button>
            </div>

            <Button type="button" variant="outline" className="h-10 rounded-md bg-background min-w-[150px] justify-start text-left font-normal" onClick={() => setIsPaymentSheetOpen(true)}>
                {paymentMethod || 'Payment method'}
            </Button>

             <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" asChild>
                    <Link href="/ads/create"><PlusCircle className="mr-2 h-4 w-4" /> Create an offer</Link>
                </Button>
                <Button variant="outline" size="icon" onClick={() => setIsFiltersSheetOpen(true)}>
                    <SlidersHorizontal className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {/* Mobile View */}
         <div className="md:hidden flex items-center gap-2 w-full">
            <div className="flex items-center bg-muted p-1 rounded-md flex-1">
                <Button size="sm" onClick={() => handleToggle('buy')} className={cn('flex-1', pathname.includes('/buy') && 'bg-green-600 hover:bg-green-700 text-white shadow-md')}>Buy</Button>
                <Button size="sm" onClick={() => handleToggle('sell')} className={cn('flex-1', pathname.includes('/sell') && 'bg-red-600 hover:bg-red-700 text-white shadow-md')}>Sell</Button>
            </div>
             <Button variant="outline" size="icon" onClick={() => setIsFiltersSheetOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" />
            </Button>
         </div>
      </div>
      
      <div className="space-y-4">
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
      </div>
      
      <Sheet open={isFiltersSheetOpen} onOpenChange={setIsFiltersSheetOpen}>
        <SheetContent>
            <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
            <div className="py-4 space-y-6">
                {/* Filters for mobile */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Coin</label>
                    <Select value={selectedCoin} onValueChange={(v) => setSelectedCoin(v as CryptoCurrency)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{SUPPORTED_CRYPTOS.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Amount</label>
                     <div className="relative flex items-center">
                        <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        <Button type="button" variant="ghost" className="absolute right-1 h-8 px-3 rounded-md" onClick={() => { setIsFiltersSheetOpen(false); setIsFiatSheetOpen(true); }}>
                            {selectedFiat}
                        </Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Method</label>
                     <Button type="button" variant="outline" className="w-full justify-start text-left font-normal" onClick={() => { setIsFiltersSheetOpen(false); setIsPaymentSheetOpen(true); }}>
                        {paymentMethod || 'All Payment Methods'}
                    </Button>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <Button type="button" variant="outline" className="w-full justify-start text-left font-normal" onClick={() => { setIsFiltersSheetOpen(false); setIsCountrySheetOpen(true); }}>
                        {selectedCountry ? countries.find(c=>c.code === selectedCountry)?.name : 'All Countries'}
                    </Button>
                </div>
            </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isPaymentSheetOpen} onOpenChange={setIsPaymentSheetOpen}>
        <SheetContent className="flex flex-col">
            <SheetHeader><SheetTitle>Filter by Payment Method</SheetTitle></SheetHeader>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search all methods..." value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)} className="pl-10" />
            </div>
            <ScrollArea className="flex-grow -mx-6">
                <div className="px-6 py-4 space-y-1">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { setPaymentMethod(''); setIsPaymentSheetOpen(false); }}>All Payment Methods</Button>
                    {allPaymentMethods.map(({ category, methods, icon: Icon }) => {
                        const filteredMethods = methods.filter(m => m.toLowerCase().includes(paymentSearch.toLowerCase()));
                        if (paymentSearch && filteredMethods.length === 0) return null;
                        return (
                            <Accordion type="single" collapsible key={category}>
                                <AccordionItem value={category} className="border-b-0">
                                    <AccordionTrigger className="hover:no-underline"><Icon className="mr-2 h-4 w-4" />{category}</AccordionTrigger>
                                    <AccordionContent className="pl-4">
                                        {filteredMethods.map(method => (
                                            <Button key={method} variant="ghost" className="w-full justify-start font-normal h-auto py-2" onClick={() => { setPaymentMethod(method); setIsPaymentSheetOpen(false); }}>{method}</Button>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        );
                    })}
                </div>
            </ScrollArea>
            {paymentSearch && <SheetFooter><Button className="w-full" onClick={() => { setPaymentMethod(paymentSearch); setIsPaymentSheetOpen(false); }}><Search className="mr-2 h-4 w-4" />Search for "{paymentSearch}"</Button></SheetFooter>}
        </SheetContent>
      </Sheet>

      <Sheet open={isFiatSheetOpen} onOpenChange={setIsFiatSheetOpen}>
        <SheetContent className="flex flex-col">
            <SheetHeader><SheetTitle>Select Fiat Currency</SheetTitle></SheetHeader>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search currency or code..." value={fiatSearch} onChange={(e) => setFiatSearch(e.target.value)} className="pl-10" />
            </div>
            <ScrollArea className="flex-grow -mx-6">
                <div className="px-6 py-4 space-y-1">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { setSelectedFiat(''); setIsFiatSheetOpen(false); }}>All Fiats</Button>
                    {filteredFiats.map(currency => (
                        <Button key={currency.code} variant="ghost" className="w-full justify-start font-normal h-auto py-2" onClick={() => { setSelectedFiat(currency.code); setIsFiatSheetOpen(false); }}>{currency.name} ({currency.code})</Button>
                    ))}
                </div>
            </ScrollArea>
        </SheetContent>
      </Sheet>
      
      <Sheet open={isCountrySheetOpen} onOpenChange={setIsCountrySheetOpen}>
        <SheetContent className="flex flex-col">
            <SheetHeader><SheetTitle>Select Country</SheetTitle></SheetHeader>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search country..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="pl-10" />
            </div>
            <ScrollArea className="flex-grow -mx-6">
                <div className="px-6 py-4 space-y-1">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { setSelectedCountry(''); setIsCountrySheetOpen(false); }}>All Countries</Button>
                    {filteredCountries.map(country => (
                        <Button key={country.code} variant="ghost" className="w-full justify-start font-normal h-auto py-2 flex items-center gap-2" onClick={() => { setSelectedCountry(country.code); setIsCountrySheetOpen(false); }}>
                            <FlagIcon countryCode={country.code} />
                            {country.name}
                        </Button>
                    ))}
                </div>
            </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}


export default function SellPage() {
    return (
         <Suspense fallback={
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <SellPageContent />
        </Suspense>
    );
}

