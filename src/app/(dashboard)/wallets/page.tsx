
'use client';

import { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { UserWallet, CryptoCurrency, Deposit, Withdrawal } from '@/lib/types';
import { DepositDialog } from '@/components/wallets/deposit-dialog';
import { WithdrawDialog } from '@/components/wallets/withdraw-dialog';
import { WalletDisplayCard } from '@/components/wallets/wallet-display-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, Copy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createMissingUserWallets } from '@/lib/wallet';
import { SUPPORTED_CRYPTOS, CHAINS } from '@/lib/constants';

export default function WalletPage() {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [selectedTx, setSelectedTx] = useState<Deposit | Withdrawal | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreatingWallets, setIsCreatingWallets] = useState(false);


  const walletsRef = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/wallets`) : null),
    [firestore, user]
  );
  const { data: wallets, isLoading: areWalletsLoading } = useCollection<UserWallet>(walletsRef);

  const depositsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'deposits'), where('userId', '==', user.uid), orderBy('createdAt', 'desc')) : null, [firestore, user]);
  const { data: deposits, isLoading: areDepositsLoading } = useCollection<Deposit>(depositsQuery);

  const withdrawalsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/withdrawals`), orderBy('createdAt', 'desc')) : null, [firestore, user]);
  const { data: withdrawals, isLoading: areWithdrawalsLoading } = useCollection<Withdrawal>(withdrawalsQuery);
  
  const isLoading = isUserLoading || areWalletsLoading || areDepositsLoading || areWithdrawalsLoading;
  
  const allPossibleWallets = useMemo(() => {
    const all = [];
    for (const crypto of SUPPORTED_CRYPTOS) {
        for (const chain of CHAINS[crypto.name]) {
            all.push({ crypto: crypto.name, chain, id: `${crypto.name}-${chain}` });
        }
    }
    return all;
  }, []);

  const missingWallets = useMemo(() => {
    if (!wallets) return allPossibleWallets.map(w => `${w.crypto} (${w.chain})`);
    const existingWalletIds = wallets.map(w => w.id);
    return allPossibleWallets
      .filter(w => !existingWalletIds.includes(w.id))
      .map(w => `${w.crypto} (${w.chain})`);
  }, [wallets, allPossibleWallets]);
  
  const groupedWallets = useMemo(() => {
    if (!wallets) return {};
    return wallets.reduce((acc, wallet) => {
      const crypto = wallet.crypto;
      if (!acc[crypto]) {
        acc[crypto] = [];
      }
      acc[crypto].push(wallet);
      return acc;
    }, {} as Record<string, UserWallet[]>);
  }, [wallets]);


  const handleCreateMissing = async () => {
    if (!firestore || !user || !wallets) return;
    setIsCreatingWallets(true);
    try {
      await createMissingUserWallets(firestore, user.uid, wallets);
      toast({ title: 'Wallets Created', description: 'Your new wallets are being set up. Addresses will appear shortly.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create wallets.' });
    } finally {
      setIsCreatingWallets(false);
    }
  };

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
  
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">My Wallets</h1>
      </div>

       {missingWallets.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Missing Wallets</CardTitle>
            <CardDescription>
              You can create wallets for the following: {missingWallets.join(', ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateMissing} disabled={isCreatingWallets}>
              {isCreatingWallets && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Missing Wallets
            </Button>
          </CardContent>
        </Card>
      )}

      {wallets && wallets.length === 0 && missingWallets.length === 0 && (
        <Card>
          <CardHeader><CardTitle>No Wallets Yet</CardTitle></CardHeader>
          <CardContent>Create wallets to start using crypto. Some may be created on your first deposit.</CardContent>
        </Card>
      )}
      
      {wallets && wallets.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 mb-8">
            {Object.entries(groupedWallets).map(([crypto, walletsForCoin]) => (
                <WalletDisplayCard key={crypto} coin={crypto as CryptoCurrency} wallets={walletsForCoin} />
            ))}
        </div>
      )}

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
                                    <TableCell>{d.crypto} <span className="text-muted-foreground text-xs">({d.chain})</span></TableCell>
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
                                    <TableCell>{w.crypto} <span className="text-muted-foreground text-xs">({w.chain})</span></TableCell>
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
                      <Badge variant="outline" className="capitalize">{('status' in selectedTx && selectedTx.status) ? selectedTx.status.replace(/_/g, ' ') : 'N/A'}</Badge>
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
                    {'txHash' in selectedTx && selectedTx.txHash && (
                       <div className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground">Blockchain TxID:</span> 
                         <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-right break-all">{selectedTx.txHash}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(selectedTx.txHash!)}><Copy className="h-3 w-3"/></Button>
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
