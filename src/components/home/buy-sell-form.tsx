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
        <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="buy" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted p-1 h-auto">
                    <TabsTrigger value="buy" className="py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">I want to buy</TabsTrigger>
                    <TabsTrigger value="sell" className="py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">I want to sell</TabsTrigger>
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
    const [crypto, setCrypto] = useState<CryptoCurrency>('BTC');
    const [fiatAmount, setFiatAmount] = useState('');
    const [cryptoAmount, setCryptoAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');

    const DUMMY_PRICE = 65000; // Price for BTC in USD for dummy conversion

    const handleFiatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFiatAmount(value);
        if(value && !isNaN(parseFloat(value))) {
            setCryptoAmount((parseFloat(value) / DUMMY_PRICE).toFixed(6));
        } else {
            setCryptoAmount('');
        }
    }
    
    const handleCryptoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCryptoAmount(value);
        if(value && !isNaN(parseFloat(value))) {
            setFiatAmount((parseFloat(value) * DUMMY_PRICE).toFixed(2));
        } else {
            setFiatAmount('');
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.push(`/${type}`);
    }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-6">
        <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">All crypto</Label>
            <Select value={crypto} onValueChange={(v) => setCrypto(v as CryptoCurrency)}>
                <SelectTrigger className="bg-white h-11 text-sm">
                    <SelectValue>
                        <div className="flex items-center gap-2">
                            <CryptoLogo crypto={crypto} className="h-6 w-6" />
                            <span className="font-medium">{crypto}</span>
                        </div>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {SUPPORTED_CRYPTOS.map(c => (
                         <SelectItem key={c.name} value={c.name}>
                            <div className="flex items-center gap-2">
                                <CryptoLogo crypto={c.name} className="h-6 w-6" />
                                <span className="font-medium">{c.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="i-have-amount" className="text-xs font-medium text-muted-foreground mb-1.5 block">I have</Label>
                <Input id="i-have-amount" value={cryptoAmount} onChange={handleCryptoChange} placeholder="Amount" className="bg-white h-11" />
            </div>
             <div>
                <Label htmlFor="payment-method" className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment method</Label>
                <Input id="payment-method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} placeholder="e.g. Bank transfer" className="bg-white h-11" />
             </div>
        </div>

        <div>
            <Label htmlFor="fiat-amount" className="text-xs font-medium text-muted-foreground mb-1.5 block">Amount (USD)</Label>
            <Input id="fiat-amount" value={fiatAmount} onChange={handleFiatChange} placeholder="Enter amount" className="bg-white h-11" />
        </div>
      
      <div>
        <Button type="submit" className="w-full h-12 text-base font-semibold" size="lg">
          <Search className="mr-2 h-5 w-5" />
          Search
        </Button>
      </div>
    </form>
  );
}
