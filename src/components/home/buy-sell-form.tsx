"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from '@/components/icons';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Combobox } from '../ui/combobox';
import { currencies } from '@/lib/currencies';
import { SUPPORTED_CRYPTOS } from '@/lib/constants';
import type { CryptoCurrency } from '@/lib/types';
import { useRouter } from 'next/navigation';

const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency, className?: string }) => {
    switch (crypto) {
        case 'BTC': return <BtcLogo className={className} />;
        case 'ETH': return <EthLogo className={className} />;
        case 'LTC': return <LtcLogo className={className} />;
        case 'USDT': return <UsdtLogo className={className} />;
        default: return null;
    }
}

export function BuySellForm() {
  return (
    <Card className="bg-secondary/60 border-none shadow-lg rounded-xl w-full max-w-md">
        <CardContent className="p-6">
            <Tabs defaultValue="buy" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted p-1">
                    <TabsTrigger value="buy">I want to buy</TabsTrigger>
                    <TabsTrigger value="sell">I want to sell</TabsTrigger>
                </TabsList>
                <TabsContent value="buy">
                    <FormContent type="buy" />
                </TabsContent>
                 <TabsContent value="sell">
                    <FormContent type="sell" />
                </TabsContent>
            </Tabs>
      </CardContent>
    </Card>
  );
}

function FormContent({ type }: { type: 'buy' | 'sell' }) {
    const router = useRouter();
    const [crypto, setCrypto] = useState<string>(SUPPORTED_CRYPTOS[0].name.toLowerCase());
    const [fiat, setFiat] = useState<string>('usd');

    const fiatOptions = currencies.map((c) => ({ value: c.toLowerCase(), label: c }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.push(`/${type}`);
    }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
            <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">I want to {type}</Label>
                <Select value={crypto} onValueChange={setCrypto}>
                    <SelectTrigger className="bg-white h-12 text-base">
                        <SelectValue>
                            <div className="flex items-center gap-2">
                                <CryptoLogo crypto={crypto.toUpperCase() as CryptoCurrency} className="h-6 w-6" />
                                <span className="font-medium">{crypto.toUpperCase()}</span>
                            </div>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {SUPPORTED_CRYPTOS.map(c => (
                             <SelectItem key={c.name} value={c.name.toLowerCase()}>
                                <div className="flex items-center gap-2">
                                    <CryptoLogo crypto={c.name} className="h-6 w-6" />
                                    <span className="font-medium">{c.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">For</Label>
                <Combobox
                    options={fiatOptions}
                    value={fiat}
                    onChange={setFiat}
                    placeholder="Select currency"
                    className="bg-white h-12"
                 />
             </div>
        </div>

        <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Amount</Label>
            <Input placeholder="Enter amount" className="bg-white h-12" />
        </div>
      
      <div>
        <Button type="submit" className="w-full h-12 text-base font-semibold" size="lg">
          <Search className="mr-2 h-5 w-5" />
          Find Offers
        </Button>
      </div>
    </form>
  );
}
