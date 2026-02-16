
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Loader2 } from 'lucide-react';
import QRCode from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { useDepositListener } from '@/hooks/useDepositListener';
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from '@/components/icons';
import type { CryptoCurrency } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';


const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency; className?: string }) => {
    switch (crypto) {
        case 'BTC': return <BtcLogo className={className} />;
        case 'ETH': return <EthLogo className={className} />;
        case 'LTC': return <LtcLogo className={className} />;
        case 'TRX': return <BtcLogo className={className} />; // Placeholder
        case 'USDT': return <UsdtLogo className={className} />;
        default: return null;
    }
};

const supportedCoins: CryptoCurrency[] = ['BTC', 'LTC', 'ETH'];

export default function DepositPage() {
  const { user, db } = useFirebase();
  const { toast } = useToast();
  const [selectedCoin, setSelectedCoin] = useState<CryptoCurrency>('BTC');
  const [walletData, setWalletData] = useState<{ address: string; balance: number } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // This hook will run in the background polling for deposits
  useDepositListener();

  useEffect(() => {
    if (!user || !db) return;

    setIsLoading(true);
    const walletRef = ref(db, `users/${user.uid}/wallets/${selectedCoin.toLowerCase()}`);
    const transactionsRef = ref(db, `users/${user.uid}/transactions/${selectedCoin.toLowerCase()}`);

    const unsubscribeWallet = onValue(walletRef, (snapshot) => {
      if (snapshot.exists()) {
        setWalletData(snapshot.val());
      } else {
        setWalletData(null);
      }
      setIsLoading(false);
    });

    const unsubscribeTransactions = onValue(transactionsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const txList = Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a,b) => b.time - a.time);
            setTransactions(txList);
        } else {
            setTransactions([]);
        }
    });

    return () => {
      unsubscribeWallet();
      unsubscribeTransactions();
    };
  }, [user, db, selectedCoin]);

  const handleCopy = () => {
    if (walletData?.address) {
      navigator.clipboard.writeText(walletData.address);
      toast({ title: 'Address Copied!' });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Deposit Crypto</h1>
      <Card>
        <CardHeader>
          <CardTitle>Select Asset to Deposit</CardTitle>
          <CardDescription>
            Select the cryptocurrency you want to deposit into your wallet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCoin} onValueChange={(v) => setSelectedCoin(v as CryptoCurrency)}>
            <SelectTrigger className="w-full md:w-1/2">
              <SelectValue placeholder="Select a coin" />
            </SelectTrigger>
            <SelectContent>
              {supportedCoins.map((coin) => (
                <SelectItem key={coin} value={coin}>
                  <div className="flex items-center gap-2">
                    <CryptoLogo crypto={coin} className="h-5 w-5" />
                    <span>{coin}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your {selectedCoin} Deposit Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-40 w-40" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : walletData?.address ? (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-lg">
                  <QRCode value={walletData.address} size={160} />
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md w-full">
                  <p className="font-mono text-sm break-all text-center flex-grow">
                    {walletData.address}
                  </p>
                  <Button variant="ghost" size="icon" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-destructive text-center">
                  Send only {selectedCoin} to this address. Sending any other asset will result in permanent loss.
                </p>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-10">
                Deposit address not configured or wallet not created.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Wallet Balance</CardTitle>
             <CardDescription>Your current {selectedCoin} balance.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-3/4" />
            ): (
                <div className="text-3xl font-bold">
                    {(walletData?.balance || 0).toFixed(8)} {selectedCoin}
                </div>
            )}
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>Recent {selectedCoin} Deposits</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length > 0 ? (
                        transactions.map(tx => (
                            <TableRow key={tx.id}>
                                <TableCell className="font-mono text-xs max-w-[200px] truncate">{tx.id}</TableCell>
                                <TableCell className="font-medium text-green-600">+{tx.amount.toFixed(8)}</TableCell>
                                <TableCell>{new Date(tx.time).toLocaleString()}</TableCell>
                            </TableRow>
                        ))
                    ): (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center h-24">No recent deposits.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
