'use client';

import { useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { UserWallet, Deposit, Withdrawal, CryptoCurrency, CryptoDepositAddress } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from '@/components/icons';
import { usePrices } from '@/context/price-context';
import { cn, toDate } from '@/lib/utils';
import { DepositDialog } from '@/components/wallets/deposit-dialog';
import { WithdrawDialog } from '@/components/wallets/withdraw-dialog';
import { createMissingUserWallets } from '@/lib/wallet';
import { useToast } from '@/hooks/use-toast';

const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency; className?: string }) => {
  switch (crypto) {
    case 'BTC': return <BtcLogo className={className} />;
    case 'ETH': return <EthLogo className={className} />;
    case 'LTC': return <LtcLogo className={className} />;
    case 'USDT': return <UsdtLogo className={className} />;
    default: return null;
  }
};

const statusColors: Record<string, string> = {
  pending: "border-gray-500/50 text-gray-600 bg-gray-50",
  awaiting_confirmation: "border-yellow-500/50 text-yellow-600 bg-yellow-50",
  approved: "border-green-500/50 text-green-600 bg-green-50",
  declined: "border-red-500/50 text-red-600 bg-red-50",
  expired: "border-orange-500/50 text-orange-600 bg-orange-50",
  cancelled: "border-gray-500/50 text-gray-600 bg-gray-50",
};

function TransactionHistory({ userId, crypto }: { userId: string, crypto: CryptoCurrency }) {
  const { firestore } = useFirebase();

  const depositsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, "deposits"), where("userId", "==", userId), where("crypto", "==", crypto), orderBy("createdAt", "desc")) : null,
    [firestore, userId, crypto]
  );
  const { data: deposits, isLoading: depositsLoading } = useCollection<Deposit>(depositsQuery);

  const withdrawalsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, "users", userId, "withdrawals"), where("crypto", "==", crypto), orderBy("createdAt", "desc")) : null,
    [firestore, userId, crypto]
  );
  const { data: withdrawals, isLoading: withdrawalsLoading } = useCollection<Withdrawal>(withdrawalsQuery);

  const combined = [
    ...(deposits?.map(d => ({ ...d, type: 'Deposit' })) || []),
    ...(withdrawals?.map(w => ({ ...w, type: 'Withdrawal' })) || [])
  ].sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));

  if (depositsLoading || withdrawalsLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {combined.length > 0 ? combined.map(tx => (
              <TableRow key={`${tx.type}-${tx.id}`}>
                <TableCell>{tx.type}</TableCell>
                <TableCell>{tx.amount.toFixed(8)}</TableCell>
                <TableCell><Badge variant="outline" className={cn("capitalize", statusColors[tx.status])}>{tx.status.replace(/_/g, ' ')}</Badge></TableCell>
                <TableCell>{toDate(tx.createdAt)?.toLocaleString()}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={4} className="text-center h-24">No transactions yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


export default function WalletsPage() {
  const { user, isUserLoading, firestore } = useFirebase();
  const { toast } = useToast();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency | null>(null);
  const [isCreatingWallets, setIsCreatingWallets] = useState(false);

  const walletsRef = useMemoFirebase(() => (user ? collection(firestore, 'users', user.uid, 'wallets') : null), [user, firestore]);
  const { data: wallets, isLoading: walletsLoading } = useCollection<UserWallet>(walletsRef);
  
  const depositAddressesRef = useMemoFirebase(() => firestore ? collection(firestore, 'crypto_deposit_addresses') : null, [firestore]);
  const { data: depositAddresses, isLoading: depositAddressesLoading } = useCollection<CryptoDepositAddress>(depositAddressesRef);

  const { prices, isLoading: pricesLoading } = usePrices();
  const isLoading = isUserLoading || walletsLoading || pricesLoading || depositAddressesLoading;

  const handleCreateWallets = async () => {
    if (!firestore || !user) return;
    setIsCreatingWallets(true);
    try {
        await createMissingUserWallets(firestore, user.uid, wallets || []);
        toast({ title: 'Success', description: 'Your wallets have been created.' });
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create wallets.'});
    } finally {
        setIsCreatingWallets(false);
    }
  }

  if (isLoading && !wallets) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!wallets?.length) {
    return (
        <Card className="max-w-lg mx-auto">
            <CardHeader>
                <CardTitle>Welcome to Your Wallet</CardTitle>
                <CardDescription>It looks like you don't have any wallets set up yet. Create them now to get started.</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button onClick={handleCreateWallets} disabled={isCreatingWallets}>
                    {isCreatingWallets && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Create Initial Wallets
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <>
      <DepositDialog
        open={isDepositOpen}
        onOpenChange={setIsDepositOpen}
        selectedCrypto={selectedCrypto}
        depositAddresses={depositAddresses || []}
      />
       <WithdrawDialog
        open={isWithdrawOpen}
        onOpenChange={setIsWithdrawOpen}
        userWallets={wallets || []}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">My Wallets</h1>
      </div>
      <Tabs defaultValue="USDT" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="USDT">USDT</TabsTrigger>
          <TabsTrigger value="BTC">BTC</TabsTrigger>
          <TabsTrigger value="ETH">ETH</TabsTrigger>
          <TabsTrigger value="LTC">LTC</TabsTrigger>
        </TabsList>
        {wallets.map(wallet => {
            const usdValue = (wallet.balance + wallet.lockedBalance) * (prices[wallet.crypto] || 0);
            return (
                 <TabsContent value={wallet.crypto} key={wallet.crypto}>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                                <CryptoLogo crypto={wallet.crypto} className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{(wallet.balance + wallet.lockedBalance).toFixed(8)}</div>
                                <p className="text-xs text-muted-foreground">~ ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Available</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{wallet.balance.toFixed(8)}</div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Locked in Trade</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{wallet.lockedBalance.toFixed(8)}</div>
                            </CardContent>
                        </Card>
                        <div className="flex flex-col gap-2">
                           <Button size="lg" className="h-full" onClick={() => { setSelectedCrypto(wallet.crypto); setIsDepositOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Deposit</Button>
                           <Button size="lg" variant="outline" className="h-full" onClick={() => { setIsWithdrawOpen(true); }}><Minus className="mr-2 h-4 w-4" /> Withdraw</Button>
                        </div>
                    </div>
                    <div className="mt-6">
                        {user && <TransactionHistory userId={user.uid} crypto={wallet.crypto} />}
                    </div>
                </TabsContent>
            )
        })}
      </Tabs>
    </>
  );
}
