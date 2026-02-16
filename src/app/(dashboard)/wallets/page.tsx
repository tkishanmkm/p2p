
'use client';

import { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { UserWallet, CryptoDepositAddress, CryptoCurrency, Deposit, Withdrawal } from '@/lib/types';
import { DepositDialog } from '@/components/wallets/deposit-dialog';
import { WithdrawDialog } from '@/components/wallets/withdraw-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowDown, ArrowUp, Copy, Eye } from 'lucide-react';
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from '@/components/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency, className?: string }) => {
    switch (crypto) {
        case 'BTC': return <BtcLogo className={className} />;
        case 'ETH': return <EthLogo className={className} />;
        case 'LTC': return <LtcLogo className={className} />;
        case 'USDT': return <UsdtLogo className={className} />;
        default: return null;
    }
}

export default function WalletPage() {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Deposit | Withdrawal | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const walletsRef = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/wallets`) : null),
    [firestore, user]
  );
  const { data: wallets, isLoading: areWalletsLoading } = useCollection<UserWallet>(walletsRef);

  const depositAddressesRef = useMemoFirebase(
    () => (firestore ? collection(firestore, "crypto_deposit_addresses") : null),
    [firestore]
  );
  const { data: depositAddresses, isLoading: areAddressesLoading } = useCollection<CryptoDepositAddress>(depositAddressesRef);

  const depositsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'deposits'), where('userId', '==', user.uid), orderBy('createdAt', 'desc')) : null, [firestore, user]);
  const { data: deposits, isLoading: areDepositsLoading } = useCollection<Deposit>(depositsQuery);

  const withdrawalsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/withdrawals`), orderBy('createdAt', 'desc')) : null, [firestore, user]);
  const { data: withdrawals, isLoading: areWithdrawalsLoading } = useCollection<Withdrawal>(withdrawalsQuery);
  
  const isLoading = isUserLoading || areWalletsLoading || areAddressesLoading || areDepositsLoading || areWithdrawalsLoading;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };
  
  const openDetails = (tx: Deposit | Withdrawal) => {
    setSelectedTx(tx);
    setIsDetailsOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const selectedDepositAddress = depositAddresses?.find(a => a.crypto === selectedCrypto);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">My Wallets</h1>
      </div>

      {wallets && wallets.length === 0 && (
        <Card>
          <CardHeader><CardTitle>No Wallets Yet</CardTitle></CardHeader>
          <CardContent>Create wallets to start using crypto. Some may be created on your first deposit.</CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {wallets && wallets.map(wallet => (
          <Card key={wallet.crypto}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{wallet.crypto}</CardTitle>
                <CryptoLogo crypto={wallet.crypto} className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{((wallet.balance || 0) + (wallet.lockedBalance || 0)).toFixed(6)}</div>
              <p className="text-xs text-muted-foreground">Available: {(wallet.balance || 0).toFixed(6)}</p>
               <p className="text-xs text-muted-foreground">Locked: {(wallet.lockedBalance || 0).toFixed(6)}</p>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => { setSelectedCrypto(wallet.crypto); setIsDepositOpen(true); }}><ArrowDown className="mr-2 h-4 w-4"/>Deposit</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedCrypto(wallet.crypto); setIsWithdrawOpen(true); }}><ArrowUp className="mr-2 h-4 w-4"/>Withdraw</Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="deposits">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="deposits">Deposits</TabsTrigger>
                    <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                </TabsList>
                <TabsContent value="deposits" className="mt-4">
                    <Table>
                        <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {deposits?.map(d => (
                                <TableRow key={d.id}>
                                    <TableCell>{d.crypto}</TableCell>
                                    <TableCell>{d.amount}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{d.status.replace(/_/g, ' ')}</Badge></TableCell>
                                    <TableCell>{toDate(d.createdAt)?.toLocaleString()}</TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => openDetails(d)}><Eye className="h-4 w-4"/></Button></TableCell>
                                </TableRow>
                            ))}
                             {!deposits?.length && <TableRow><TableCell colSpan={5} className="text-center h-24">No deposit history.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TabsContent>
                <TabsContent value="withdrawals" className="mt-4">
                    <Table>
                        <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {withdrawals?.map(w => (
                                <TableRow key={w.id}>
                                    <TableCell>{w.crypto}</TableCell>
                                    <TableCell>{w.amount}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{w.status}</Badge></TableCell>
                                    <TableCell>{toDate(w.createdAt)?.toLocaleString()}</TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => openDetails(w)}><Eye className="h-4 w-4"/></Button></TableCell>
                                </TableRow>
                            ))}
                            {!withdrawals?.length && <TableRow><TableCell colSpan={5} className="text-center h-24">No withdrawal history.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>

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
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Transaction Details</DialogTitle>
              </DialogHeader>
              {selectedTx && (
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tx ID:</span> 
                      <span className="font-mono text-xs max-w-[200px] truncate">{selectedTx.id}</span>
                    </div>
                     <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span> 
                      <span className="font-medium">{selectedTx.amount} {selectedTx.crypto}</span>
                    </div>
                     <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span> 
                      <Badge variant="outline" className="capitalize">{selectedTx.status.replace(/_/g, ' ')}</Badge>
                    </div>
                    {'address' in selectedTx && (
                       <div className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground">Address:</span> 
                        <div className="flex items-center gap-2">
                           <span className="font-mono text-xs text-right break-all">{selectedTx.address}</span>
                           <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(selectedTx.address)}><Copy className="h-3 w-3"/></Button>
                        </div>
                      </div>
                    )}
                     {'txId' in selectedTx && selectedTx.txId && (
                       <div className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground">Blockchain TxID:</span> 
                         <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-right break-all">{selectedTx.txId}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(selectedTx.txId!)}><Copy className="h-3 w-3"/></Button>
                        </div>
                      </div>
                    )}
                </div>
              )}
          </DialogContent>
      </Dialog>
    </>
  );
}
