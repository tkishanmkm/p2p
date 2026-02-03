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
import { mockP2PAds } from "@/lib/mock-data";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { ListFilter, Search } from "lucide-react";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import { currencies } from "@/lib/currencies";
import { countries } from "@/lib/countries";

export default function BuyPage() {
  const sellAds = mockP2PAds.filter(ad => ad.adType === 'sell');

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
          {sellAds.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </CardContent>
      </Card>
    </>
  );
}
