"use client";

import { useState } from 'react';
import { ArrowRight, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Combobox } from '@/components/ui/combobox';
import { SUPPORTED_CRYPTOS } from '@/lib/constants';
import { currencies } from '@/lib/currencies';
import { useRouter } from 'next/navigation';

export function BuySellForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('buy');
  const [amount, setAmount] = useState('');
  const [crypto, setCrypto] = useState('btc');
  const [fiat, setFiat] = useState('usd');

  const cryptoOptions = SUPPORTED_CRYPTOS.map(c => ({ value: c.name.toLowerCase(), label: c.name }));
  const fiatOptions = currencies.map(c => ({ value: c.toLowerCase(), label: c }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would build a query string and navigate
    router.push(`/${activeTab}`);
  };

  return (
    <Tabs defaultValue="buy" onValueChange={setActiveTab} className="w-full max-w-lg">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="buy">Buy</TabsTrigger>
        <TabsTrigger value="sell">Sell</TabsTrigger>
      </TabsList>
      <TabsContent value="buy">
        <FormContent type="buy" onSubmit={handleSubmit} crypto={crypto} setCrypto={setCrypto} fiat={fiat} setFiat={setFiat} amount={amount} setAmount={setAmount} />
      </TabsContent>
      <TabsContent value="sell">
        <FormContent type="sell" onSubmit={handleSubmit} crypto={crypto} setCrypto={setCrypto} fiat={fiat} setFiat={setFiat} amount={amount} setAmount={setAmount}/>
      </TabsContent>
    </Tabs>
  );
}

function FormContent({ type, onSubmit, crypto, setCrypto, fiat, setFiat, amount, setAmount }: any) {
  const youPayLabel = type === 'buy' ? 'You Pay' : 'You Receive';
  const youGetLabel = type === 'buy' ? 'You Receive' : 'You Pay';

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${type}-pay`}>{youPayLabel}</Label>
          <div className="flex">
            <Input 
              id={`${type}-pay`} 
              placeholder="100.00" 
              className="rounded-r-none" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Combobox 
              options={type === 'buy' ? fiatOptions : cryptoOptions} 
              value={type === 'buy' ? fiat : crypto}
              onChange={type === 'buy' ? setFiat : setCrypto}
              placeholder="Currency"
              className="w-[120px] rounded-l-none border-l-0"
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`${type}-get`}>{youGetLabel}</Label>
          <div className="flex">
            <Input id={`${type}-get`} placeholder="0.0015" className="rounded-r-none" readOnly />
             <Combobox 
              options={type === 'buy' ? cryptoOptions : fiatOptions} 
              value={type === 'buy' ? crypto : fiat}
              onChange={type === 'buy' ? setCrypto : setFiat}
              placeholder="Currency"
              className="w-[120px] rounded-l-none border-l-0"
            />
          </div>
        </div>
      </div>
      <div>
        <Button type="submit" className="w-full" size="lg">
          {type === 'buy' ? 'Find Offers' : 'Find Buyers'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
