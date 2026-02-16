
'use client';

import { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import type { UserWallet, CryptoCurrency, Deposit, Withdrawal, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowDown, ArrowUp, Copy, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { DepositDialog } from '@/components/wallets/deposit-dialog';
import { WithdrawDialog } from '@/components/wallets/withdraw-dialog';
import { SubmitTxHashDialog } from '@/components/wallets/submit-tx-hash-dialog';
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from '@/components/icons';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function WalletPage() {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, "users", user.uid) : null), [firestore, user]);
  const { data: userData } = useDoc<User>(userDocRef);

  const [selectedTx, setSelectedTx] = useState<Deposit | Withdrawal | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isSubmitTxHashOpen, setIsSubmitTxHashOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedWalletForDialog, setSelectedWalletForDialog] = useState<UserWallet | null>(null);

  const [isUsdtChainSelectorOpen, setIsUsdtChainSelectorOpen] = useState(false);
  const [usdtAction, setUsdtAction] = useState<'deposit' | 'withdraw' | null>(null);
  const [selectedUsdtChain, setSelectedUsdtChain] = useState<string>('');

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

  const walletSummary = useMemo(() => {
    if (!wallets) return {};
    
    const summary: Record<string, { totalBalance: number; totalLockedBalance: number; chains: UserWallet[] }> = {};
    
    const mainCoins: CryptoCurrency[] = ['BTC', 'ETH', 'LTC', 'USDT'];
    mainCoins.forEach(coin => {
      summary[coin] = { totalBalance: 0, totalLockedBalance: 0, chains: [] };
    });

    wallets.forEach(wallet => {
      if (summary[wallet.crypto]) {
          summary[wallet.crypto].totalBalance += wallet.balance || 0;
          summary[wallet.crypto].totalLockedBalance += wallet.lockedBalance || 0;
          summary[wallet.crypto].chains.push(wallet);
      }
    });

    return mainCoins.reduce((acc, coin) => {
        acc[coin] = summary[coin];
        return acc;
    }, {} as typeof summary);
  }, [wallets]);


  const handleDepositClick = (wallet?: UserWallet) => {
    if (wallet) {
      setSelectedWalletForDialog(wallet);
      setIsDepositOpen(true);
    }
  };

  const handleWithdrawClick = (wallet?: UserWallet) => {
    if (wallet) {
      setSelectedWalletForDialog(wallet);
      setIsWithdrawOpen(true);
    }
  };

  const handleUsdtActionClick = (action: 'deposit' | 'withdraw') => {
      setUsdtAction(action);
      setSelectedUsdtChain('');
      setIsUsdtChainSelectorOpen(true);
  }

  const handleUsdtChainSelectAndContinue = () => {
      if (!walletSummary['USDT']) return;
      const selected = walletSummary['USDT'].chains.find(c => c.chain === selectedUsdtChain);
      if (selected) {
          setIsUsdtChainSelectorOpen(false);
          if (usdtAction === 'deposit') {
              handleDepositClick(selected);
          } else if (usdtAction === 'withdraw') {
              handleWithdrawClick(selected);
          }
      }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };
  
  const handleHistoryRowClick = (tx: Deposit | Withdrawal) => {
    if ('status' in tx && tx.status === 'pending') {
        setSelectedDeposit(tx);
        setIsSubmitTxHashOpen(true);
    } else {
        setSelectedTx(tx);
        setIsDetailsOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const CoinLogo = ({ coin, className }: { coin: string, className?: string }) => {
    switch (coin) {
      case 'BTC': return <BtcLogo className={className} />;
      case 'ETH': return <EthLogo className={className} />;
      case 'LTC': return <LtcLogo className={className} />;
      case 'USDT': return <UsdtLogo className={className} />;
      default: return null;
    }
  }

  return (
    <>
      <DepositDialog open={isDepositOpen} onOpenChange={setIsDepositOpen} wallet={selectedWalletForDialog} walletIndex={userData?.walletIndex} />
      <WithdrawDialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} wallet={selectedWalletForDialog} />
      <SubmitTxHashDialog open={isSubmitTxHashOpen} onOpenChange={setIsSubmitTxHashOpen} deposit={selectedDeposit} />
      
      <Dialog open={isUsdtChainSelectorOpen} onOpenChange={setIsUsdtChainSelectorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select USDT Network</DialogTitle>
            <DialogDescription>Please select the network for your {usdtAction} action.</DialogDescription>
          </DialogHeader>
          {walletSummary['USDT']?.chains.length > 0 ? (
            <>
              <RadioGroup value={selectedUsdtChain} onValueChange={setSelectedUsdtChain} className="my-4 space-y-2">
                {walletSummary['USDT'].chains.map(chainWallet => (
                  <Label key={chainWallet.chain} htmlFor={chainWallet.chain} className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary">
                    <span>{chainWallet.chain}</span>
                    <RadioGroupItem value={chainWallet.chain} id={chainWallet.chain} />
                  </Label>
                ))}
              </RadioGroup>
              <Button onClick={handleUsdtChainSelectAndContinue} disabled={!selectedUsdtChain}>
                Continue
              </Button>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-4">No USDT wallets found.</p>
          )}
        </DialogContent>
      </Dialog>
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">My Wallets</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 mb-8">
        {Object.entries(walletSummary).map(([coin, data]) => {
          if (!data) return null;
          const isMultiChain = coin === 'USDT' && data.chains.length > 1;
          const totalBalance = data.totalBalance + data.totalLockedBalance;

          return (
            <Card key={coin}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-xl font-bold">{coin}</CardTitle>
                <CoinLogo coin={coin} className="h-8 w-8 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">{totalBalance.toFixed(6)}</div>
                  <p className="text-xs text-muted-foreground">Total Balance</p>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available:</span>
                    <span>{data.totalBalance.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Locked:</span>
                    <span>{data.totalLockedBalance.toFixed(6)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button size="sm" className="w-full" onClick={() => isMultiChain ? handleUsdtActionClick('deposit') : handleDepositClick(data.chains[0])}>
                    <ArrowDown className="mr-2 h-4 w-4" />Deposit
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => isMultiChain ? handleUsdtActionClick('withdraw') : handleWithdrawClick(data.chains[0])}>
                    <ArrowUp className="mr-2 h-4 w-4" />Withdraw
                </Button>
              </CardFooter>
            </Card>
          )
        })}
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
                     {areDepositsLoading ? <Skeleton className="h-24 w-full" /> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {deposits?.map(d => (
                                    <TableRow key={d.id} onClick={() => handleHistoryRowClick(d)} className={d.status === 'pending' ? 'cursor-pointer' : ''}>
                                        <TableCell>{d.crypto} <span className="text-muted-foreground text-xs">({d.chain})</span></TableCell>
                                        <TableCell>{d.amount}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize">{d.status.replace(/_/g, ' ')}</Badge></TableCell>
                                        <TableCell>{toDate(d.createdAt)?.toLocaleString()}</TableCell>
                                        <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleHistoryRowClick(d)}><Eye className="h-4 w-4"/></Button></TableCell>
                                    </TableRow>
                                ))}
                                {!deposits?.length && <TableRow><TableCell colSpan={5} className="text-center h-24">No deposit history.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                     )}
                </TabsContent>
                <TabsContent value="withdrawals" className="mt-4">
                     {areWithdrawalsLoading ? <Skeleton className="h-24 w-full" /> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {withdrawals?.map(w => (
                                    <TableRow key={w.id} onClick={() => handleHistoryRowClick(w)} className="cursor-pointer">
                                        <TableCell>{w.crypto} <span className="text-muted-foreground text-xs">({w.chain})</span></TableCell>
                                        <TableCell>{w.amount}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize">{w.status}</Badge></TableCell>
                                        <TableCell>{toDate(w.createdAt)?.toLocaleString()}</TableCell>
                                        <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleHistoryRowClick(w)}><Eye className="h-4 w-4"/></Button></TableCell>
                                    </TableRow>
                                ))}
                                {!withdrawals?.length && <TableRow><TableCell colSpan={5} className="text-center h-24">No withdrawal history.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                     )}
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
