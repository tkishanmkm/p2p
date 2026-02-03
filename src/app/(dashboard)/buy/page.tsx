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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { ListFilter, Search, Wallet } from "lucide-react";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import { currencies } from "@/lib/currencies";
import { countries } from "@/lib/countries";
import { Skeleton } from "@/components/ui/skeleton";
import type { P2PAd } from "@/lib/types";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

function BuyPageContent() {
  const { firestore } = useFirebase();

  const sellAdsQuery = useMemoFirebase(() => 
    firestore 
      ? query(collection(firestore, "p2p_ads"), where("adType", "==", "sell"), where("active", "==", true))
      : null,
    [firestore]
  );
  const { data: sellAds, isLoading } = useCollection<P2PAd>(sellAdsQuery);

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Buy Crypto</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Find Offers to Buy From</CardTitle>
          <CardDescription>
            Filter through available ads to find the best offer for you.
          </CardDescription>
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by amount or payment method" className="pl-10" />
            </div>
            <div className="flex gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1 sm:flex-initial">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Crypto
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {SUPPORTED_CRYPTOS.map(c => <DropdownMenuCheckboxItem key={c.name}>{c.name}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1 sm:flex-initial">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Fiat
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                        {currencies.map(c => <DropdownMenuCheckboxItem key={c}>{c}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1 sm:flex-initial">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Country
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                        {countries.map(c => <DropdownMenuCheckboxItem key={c}>{c}</DropdownMenuCheckboxItem>)}
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
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {!isLoading && sellAds && sellAds.length > 0 && (
            sellAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))
          )}
          {!isLoading && (!sellAds || sellAds.length === 0) && (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Ads Available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">There are currently no ads to buy crypto. Check back later or create a 'buy' ad yourself!</p>
              </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}


export default function BuyPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 md:px-6 py-8">
                <BuyPageContent />
            </main>
            <Footer />
        </div>
    );
}