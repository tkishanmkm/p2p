
"use client";

import { useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
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
import { Wallet, Landmark, CreditCard, Smartphone, Car, Search, Loader2, ArrowDown, ArrowUp, PlusCircle, SlidersHorizontal, RefreshCw, BookOpen, HelpCircle, BarChart, X, Globe, ChevronRight, Info, ChevronDown } from "lucide-react";
import { SUPPORTED_CRYPTOS, AD_TAGS } from "@/lib/constants";
import { currencies } from "@/lib/currencies";
import { countries } from "@/lib/countries";
import { Skeleton } from "@/components/ui/skeleton";
import type { P2PAd, CryptoCurrency, User } from "@/lib/types";
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
import { cn, toDate } from "@/lib/utils";
import { usePrices } from "@/context/price-context";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { FormItem, FormControl, FormLabel } from "@/components/ui/form";


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
  const { firestore, user: authUser } = useFirebase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const userRef = useMemoFirebase(() => (authUser ? doc(firestore, "users", authUser.uid) : null), [firestore, authUser]);
  const { data: currentUserData } = useDoc<User>(userRef);

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

  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'price');
  const [selectedTags, setSelectedTags] = useState<string[]>(searchParams.get('tags')?.split(',').filter(Boolean) || []);
  const [showTopRated, setShowTopRated] = useState(searchParams.get('topRated') === 'true');
  const [showVerified, setShowVerified] = useState(searchParams.get('verified') === 'true');
  const [showRecentlyActive, setShowRecentlyActive] = useState(searchParams.get('recentlyActive') === 'true');
  const [showAcceptable, setShowAcceptable] = useState(searchParams.get('acceptable') === 'true');
  const [isOfferTagsSheetOpen, setIsOfferTagsSheetOpen] = useState(false);

  const { prices } = usePrices();

  const handleResetFilters = () => {
    setAmount('');
    setPaymentMethod('');
    setSelectedCoin('BTC');
    setSelectedFiat('USD');
    setSelectedCountry('');
    setSortBy('price');
    setSelectedTags([]);
    setShowTopRated(false);
    setShowVerified(false);
    setShowRecentlyActive(false);
    setShowAcceptable(false);
    setIsFiltersSheetOpen(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (amount) params.set('amount', amount); else params.delete('amount');
    if (paymentMethod) params.set('paymentMethod', paymentMethod); else params.delete('paymentMethod');
    if (selectedCoin) params.set('coin', selectedCoin); else params.delete('coin');
    if (selectedFiat) params.set('fiat', selectedFiat); else params.delete('fiat');
    if (selectedCountry) params.set('country', selectedCountry); else params.delete('country');
    if(sortBy !== 'price') params.set('sortBy', sortBy); else params.delete('sortBy');
    if(selectedTags.length > 0) params.set('tags', selectedTags.join(',')); else params.delete('tags');
    if(showTopRated) params.set('topRated', 'true'); else params.delete('topRated');
    if(showVerified) params.set('verified', 'true'); else params.delete('verified');
    if(showRecentlyActive) params.set('recentlyActive', 'true'); else params.delete('recentlyActive');
    if(showAcceptable) params.set('acceptable', 'true'); else params.delete('acceptable');
    router.replace(`${pathname}?${params.toString()}`);
  }, [amount, paymentMethod, selectedCoin, selectedFiat, selectedCountry, sortBy, selectedTags, showTopRated, showVerified, showRecentlyActive, showAcceptable, pathname, router, searchParams]);

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

    let ads = buyAds.filter(ad => {
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
      if (showTopRated) {
        if (!ad.user.badges?.includes('power')) return false;
      }
      if (showVerified) {
        if (!ad.user.badges?.includes('verified')) return false;
      }
      if (showRecentlyActive) {
        if (!ad.user.lastActive) return false;
        const lastActiveDate = toDate(ad.user.lastActive);
        if (!lastActiveDate || (new Date().getTime() - lastActiveDate.getTime()) > 30 * 60 * 1000) {
            return false;
        }
      }
      if (selectedTags.length > 0) {
          if (!ad.tags || !selectedTags.every(tag => ad.tags!.includes(tag))) {
              return false;
          }
      }
      if (showAcceptable && currentUserData) {
        if (ad.userId === currentUserData.id) return false;
        if ((ad.minCompletedTrades || 0) > (currentUserData.completedTrades || 0)) return false;
        if (ad.targetedCountries && ad.targetedCountries.length > 0 && !ad.targetedCountries.includes('all')) {
            if (!currentUserData.country || !ad.targetedCountries.includes(currentUserData.country)) return false;
        }
        if (ad.blockedCountries && ad.blockedCountries.length > 0) {
            if (currentUserData.country && ad.blockedCountries.includes(currentUserData.country)) return false;
        }
      }
      return true;
    });

    ads.sort((a, b) => {
        if (sortBy === 'price') {
            const priceA = a.rateType === 'fixed' ? a.fixedRate! : prices[a.crypto] * (1 + (a.ratePercent || 0) / 100);
            const priceB = b.rateType === 'fixed' ? b.fixedRate! : prices[b.crypto] * (1 + (b.ratePercent || 0) / 100);
            return priceB - priceA; // Higher price is better for seller
        }
        if (sortBy === 'rating') {
            return (b.user.feedbackScore || 0) - (a.user.feedbackScore || 0);
        }
        if (sortBy === 'popular') {
            return (b.user.completedTrades || 0) - (a.user.completedTrades || 0);
        }
        return 0;
    });

    return ads;
  }, [buyAds, amount, paymentMethod, selectedCoin, selectedFiat, selectedCountry, showTopRated, showVerified, showRecentlyActive, showAcceptable, selectedTags, currentUserData, sortBy, prices]);
  
  const handleToggle = (page: 'buy' | 'sell') => {
    router.push(`/${page}`);
  }

  const coinFullName = selectedCoin === 'BTC' ? 'Bitcoin' : selectedCoin === 'ETH' ? 'Ethereum' : selectedCoin === 'LTC' ? 'Litecoin' : 'Tether';
  const marketPrice = prices[selectedCoin] || 0;
  const marketPriceText = `1 ${selectedCoin} ≈ ${marketPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;

  return (
    <>
      {/* Desktop Title & Header */}
      <div className="hidden md:block bg-primary text-primary-foreground md:-mt-4 md:-mx-4 lg:-mt-6 lg:-mx-6 p-6 mb-6">
        <div className="container mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold md:text-3xl">Sell <span className="text-orange-400">{coinFullName}</span></h1>
                    <p className="text-sm text-primary-foreground/80">{marketPriceText}</p>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium">
                    <Link href="/guides" className="flex items-center gap-2 hover:text-primary-foreground/80 transition-colors"><BookOpen className="h-4 w-4" /> Academy</Link>
                    <Link href="#" className="flex items-center gap-2 hover:text-primary-foreground/80 transition-colors"><HelpCircle className="h-4 w-4" /> Take a Tour</Link>
                </div>
            </div>
        </div>
      </div>
      
      {/* Desktop Filter Bar */}
      <div className="container mx-auto hidden md:flex items-start gap-4 mb-6">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 items-center gap-2 rounded-lg bg-primary text-primary-foreground p-2">
            <div className="flex items-center bg-black/20 p-1 rounded-md">
                <Button size="sm" onClick={() => handleToggle('buy')} className={cn('flex-1 bg-transparent text-primary-foreground/80 hover:bg-black/30', pathname.includes('/buy') && 'bg-green-600 hover:bg-green-700 text-white shadow-md')}>
                    <ArrowDown className="mr-2 h-3.5 w-3.5" /> Buy
                </Button>
                <Button size="sm" onClick={() => handleToggle('sell')} className={cn('flex-1 bg-transparent text-primary-foreground/80 hover:bg-black/30', pathname.includes('/sell') && 'bg-red-600 hover:bg-red-700 text-white shadow-md')}>
                    <ArrowUp className="mr-2 h-3.5 w-3.5" /> Sell
                </Button>
            </div>

            <Select value={selectedCoin} onValueChange={(v) => setSelectedCoin(v as CryptoCurrency)}>
                <SelectTrigger className="h-10 w-full rounded-md border-0 bg-background shadow-sm text-foreground">
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
            
            <div className="relative flex items-center">
                <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 pl-3 pr-20 border-0 bg-background text-foreground"/>
                <Button type="button" variant="ghost" className="absolute right-1 h-8 px-3 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground" onClick={() => setIsFiatSheetOpen(true)}>
                    {selectedFiat}
                    <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
                </Button>
            </div>
            
            <Button type="button" variant="outline" className="h-10 w-full flex justify-between items-center text-left font-normal truncate bg-background border-0 text-foreground" onClick={() => setIsPaymentSheetOpen(true)}>
                <span className="truncate">{paymentMethod || 'Payment method'}</span>
                <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
            </Button>
        </div>

        <div className="flex items-center gap-2">
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
      
      {/* Mobile Filter UI */}
       <div className="md:hidden -mx-2 -mt-2 sm:-mx-4 sm:-mt-4 mb-6">
        <div className="bg-primary text-primary-foreground p-4 rounded-b-lg shadow-md">
          <div className="flex items-center justify-between gap-4 my-2">
            <div>
              <h1 className="text-2xl font-bold">
                Sell <span className="text-orange-400">{coinFullName}</span>
              </h1>
              <p className="text-sm text-primary-foreground/80">{marketPriceText}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link href="/guides"><BookOpen className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link href="/faq"><HelpCircle className="h-5 w-5" /></Link>
              </Button>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <div className="flex items-center gap-2 rounded-lg bg-card/80 backdrop-blur-sm p-2 text-card-foreground">
              <div className="flex items-center bg-background/20 p-1 rounded-md flex-grow">
                <Button size="sm" onClick={() => handleToggle('buy')} className={cn('flex-1 bg-transparent text-muted-foreground hover:bg-muted/50', pathname.includes('/buy') && 'bg-green-600 hover:bg-green-700 text-white shadow-md')}>
                    <ArrowDown className="mr-1 h-4 w-4" /> Buy
                </Button>
                <Button size="sm" onClick={() => handleToggle('sell')} className={cn('flex-1 bg-transparent text-muted-foreground hover:bg-muted/50', pathname.includes('/sell') && 'bg-red-600 hover:bg-red-700 text-white shadow-md')}>
                    <ArrowUp className="mr-1 h-4 w-4" /> Sell
                </Button>
              </div>
              <Select value={selectedCoin} onValueChange={(v) => setSelectedCoin(v as CryptoCurrency)}>
                  <SelectTrigger className="h-10 rounded-md border-0 bg-transparent shadow-none w-[130px]">
                      <SelectValue>
                          <div className="flex items-center gap-2 font-semibold">
                              <CryptoLogo crypto={selectedCoin} className="h-6 w-6" />
                              <span>{selectedCoin}</span>
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
            </div>
            <div className="text-center text-xs font-bold tracking-widest text-primary-foreground/70 relative my-1">
              <span className="bg-primary px-2 relative z-10">USING</span>
              <div className="absolute left-0 top-1/2 w-full h-px bg-primary-foreground/20 -z-0"></div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-card/80 backdrop-blur-sm p-2 text-card-foreground">
              <div className="relative flex items-center">
                    <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 pl-4 pr-24 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"/>
                    <Button type="button" variant="ghost" className="absolute right-1 h-10 px-3 flex items-center gap-1 rounded-md bg-background/20 hover:bg-background/30" onClick={() => setIsFiatSheetOpen(true)}>
                        {selectedFiat}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </div>
                <Button type="button" variant="outline" className="h-12 flex justify-between items-center text-left font-normal truncate bg-transparent border-0" onClick={() => setIsPaymentSheetOpen(true)}>
                    <span className="truncate">{paymentMethod || 'Payment method'}</span>
                    <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Offers</h2>
          <div className="flex items-center gap-2">
              <Button variant="outline" asChild size="icon">
                  <Link href="/ads/create"><PlusCircle className="h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" size="icon" onClick={() => setIsFiltersSheetOpen(true)}>
                  <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4" />
              </Button>
          </div>
      </div>
      
       <div className="space-y-1">
        {isLoading && (
            <div className="space-y-1">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
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
            <SheetHeader className="flex-row items-center justify-between border-b -mt-2 pb-4">
                <SheetTitle>Filters</SheetTitle>
                <div className="flex items-center">
                    <Button variant="ghost" size="sm" onClick={handleResetFilters}>Reset all filters</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFiltersSheetOpen(false)}><X className="h-4 w-4" /></Button>
                </div>
            </SheetHeader>
            <div className="py-4 space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Coin</Label>
                        <Select value={selectedCoin} onValueChange={(v) => setSelectedCoin(v as CryptoCurrency)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{SUPPORTED_CRYPTOS.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <div className="relative flex items-center">
                            <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                            <Button type="button" variant="ghost" className="absolute right-1 h-8 px-3 rounded-md bg-muted hover:bg-muted/80" onClick={() => { setIsFiltersSheetOpen(false); setIsFiatSheetOpen(true); }}>
                                {selectedFiat}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Button type="button" variant="outline" className="w-full justify-start text-left font-normal" onClick={() => { setIsFiltersSheetOpen(false); setIsPaymentSheetOpen(true); }}>
                            {paymentMethod || 'All Payment Methods'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Country</Label>
                    <Button type="button" variant="outline" className="w-full justify-between font-normal" onClick={() => { setIsFiltersSheetOpen(false); setIsCountrySheetOpen(true); }}>
                        <span>{selectedCountry ? countries.find(c=>c.code === selectedCountry)?.name : 'All Countries'}</span>
                        <Globe className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center justify-between">
                    <Label>Sorting</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="price">Price</SelectItem>
                            <SelectItem value="rating">Rating</SelectItem>
                            <SelectItem value="popular">Popular</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between">
                    <Label>Offer tags</Label>
                    <Button variant="ghost" className="text-muted-foreground" onClick={() => setIsOfferTagsSheetOpen(true)}>
                        <span>{selectedTags.length > 0 ? `${selectedTags.length} selected` : 'All'}</span>
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
                
                <div className="space-y-1 pt-4 border-t">
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <Label htmlFor="top-rated-switch" className="cursor-pointer">Show only top-rated traders</Label>
                            <p className="text-xs text-muted-foreground">Experienced traders with badges</p>
                        </div>
                        <Switch id="top-rated-switch" checked={showTopRated} onCheckedChange={setShowTopRated} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <Label htmlFor="verified-switch" className="cursor-pointer">Verified users only</Label>
                            <p className="text-xs text-muted-foreground">Show offers from ID-verified users</p>
                        </div>
                        <Switch id="verified-switch" checked={showVerified} onCheckedChange={setShowVerified} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <Label htmlFor="active-switch" className="cursor-pointer">Recently active</Label>
                            <p className="text-xs text-muted-foreground">Last seen 30 mins ago</p>
                        </div>
                        <Switch id="active-switch" checked={showRecentlyActive} onCheckedChange={setShowRecentlyActive} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <Label htmlFor="acceptable-switch" className="cursor-pointer">Acceptable only</Label>
                            <p className="text-xs text-muted-foreground">Show only offers that I can accept now</p>
                        </div>
                        <Switch id="acceptable-switch" checked={showAcceptable} onCheckedChange={setShowAcceptable} />
                    </div>
                </div>
            </div>
        </SheetContent>
      </Sheet>
      
      <Sheet open={isOfferTagsSheetOpen} onOpenChange={setIsOfferTagsSheetOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>Filter by Offer Tags</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-1">
                {AD_TAGS.map((tag) => (
                    <div key={tag} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                        <Checkbox
                            id={`tag-${tag}`}
                            checked={selectedTags.includes(tag)}
                            onCheckedChange={(checked) => {
                                return checked
                                ? setSelectedTags([...selectedTags, tag])
                                : setSelectedTags(selectedTags.filter(t => t !== tag))
                            }}
                        />
                        <Label htmlFor={`tag-${tag}`} className="font-normal cursor-pointer w-full">{tag}</Label>
                    </div>
                ))}
            </div>
            <SheetFooter>
                <Button onClick={() => setIsOfferTagsSheetOpen(false)} className="w-full">Done</Button>
            </SheetFooter>
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

    

    

    
