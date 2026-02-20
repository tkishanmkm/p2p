
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
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { DepositDialog } from '@/components/wallets/deposit-dialog';
import { WithdrawDialog } from '@/components/wallets/withdraw-dialog';
import { SubmitTxHashDialog } from '@/components/wallets/submit-tx-hash-dialog';
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from '@/components/icons';
import { cancelWithdrawalRequest } from '@/lib/wallet';
import { FIXED_WITHDRAWAL_FEES_USD, SUPPORTED_CRYPTOS } from '@/lib/constants';
import { usePrices } from '@/context/price-context';
import { statusColors } from '@/lib/status-colors';

const depositStatusText: Record<Deposit['status'], string> = {
  pending: "Awaiting Your Confirmation",
  awaiting_confirmation: "Pending Admin Approval",
  approved: "Approved",
  declined: "Declined by Admin",
  expired: "Expired",
};

function DepositsHistory({ deposits, isLoading, onRowClick }: { deposits: Deposit[] | null, isLoading: boolean, onRowClick: (deposit: Deposit) => void }) {
  if (isLoading) {
    return (
        <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
    );
  }
  if (!deposits?.length) {
    return <p className="text-center text-muted-foreground py-4">No deposit history.</p>;
  }
  return (
    <Table>
        <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
        <TableBody>
            {deposits?.map(d => (
                <TableRow key={d.id} onClick={() => onRowClick(d)} className={"cursor-pointer hover:bg-muted/50"}>
                    <TableCell>{d.crypto} <span className="text-muted-foreground text-xs">({d.chain})</span></TableCell>
                    <TableCell>{d.amount}</TableCell>
                    <TableCell><Badge variant="outline" className={cn("capitalize", statusColors[d.status])}>{depositStatusText[d.status]}</Badge></TableCell>
                    <TableCell>{toDate(d.createdAt)?.toLocaleString('default', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4"/>
                        </Button>
                    </TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
  );
}


export default function WalletPage() {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const { prices, fiatRates } = usePrices();

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, "users", user.uid) : null), [firestore, user]);
  const { data: userData } = useDoc<User>(userDocRef);

  const [selectedTx, setSelectedTx] = useState<Deposit | Withdrawal | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isSubmitTxHashOpen, setIsSubmitTxHashOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  
  const [selectedWalletForDialog, setSelectedWalletForDialog] = useState<UserWallet | null>(null);
  const [totalBalanceForDialog, setTotalBalanceForDialog] = useState<number | undefined>(undefined);

  const walletsRef = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/wallets`) : null),
    [firestore, user]
  );
  const { data: wallets, isLoading: areWalletsLoading } = useCollection<UserWallet>(walletsRef);

  const depositsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'deposits'), where('userId', '==', user.uid), orderBy('createdAt', 'desc')) : null, [firestore, user]);
  const { data: deposits, isLoading: areDepositsLoading } = useCollection<Deposit>(depositsQuery);

  const withdrawalsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/withdrawals`), orderBy('createdAt', 'desc')) : null, [firestore, user]);
  const { data: withdrawals, isLoading: areWithdrawalsLoading } = useCollection<Withdrawal>(withdrawalsQuery);

  const isLoading = isUserLoading || areWalletsLoading;

  const walletSummary = useMemo(() => {
    if (!wallets) return [];

    const summaryMap = new Map<CryptoCurrency, { totalBalance: number; totalLockedBalance: number; fiatValue: number; }>();

    for (const crypto of SUPPORTED_CRYPTOS) {
      summaryMap.set(crypto.name, { totalBalance: 0, totalLockedBalance: 0, fiatValue: 0 });
    }
  
    wallets.forEach(wallet => {
        const summary = summaryMap.get(wallet.crypto);
        if (summary) {
            summary.totalBalance += wallet.balance || 0;
            summary.totalLockedBalance += wallet.lockedBalance || 0;
        }
    });

    const preferredCurrency = userData?.preferredCurrency || 'USD';
    const exchangeRate = fiatRates[preferredCurrency] || 1;

    const summaryArray = Array.from(summaryMap.entries()).map(([coin, data]) => {
        const totalCrypto = data.totalBalance + data.totalLockedBalance;
        const priceInUsd = prices[coin] || 0;
        data.fiatValue = totalCrypto * priceInUsd * exchangeRate;
        return { coin, ...data };
    });
    
    summaryArray.sort((a, b) => b.fiatValue - a.fiatValue);
    
    return summaryArray;

  }, [wallets, userData, prices, fiatRates]);

  const handleDepositClick = (coin: CryptoCurrency) => {
    // We create a "shell" wallet object because the dialog can handle deposits even if no specific wallet document exists yet.
    const walletShell: UserWallet = {
        id: coin,
        userId: user!.uid,
        crypto: coin,
        chain: '', 
        balance: 0,
        lockedBalance: 0,
        updatedAt: '',
    };
    setSelectedWalletForDialog(walletShell);
    setIsDepositOpen(true);
  };

  const handleWithdrawClick = (coin: CryptoCurrency, totalBalance: number) => {
      const walletShell: UserWallet = {
        id: coin,
        userId: user!.uid,
        crypto: coin,
        chain: '',
        balance: totalBalance,
        lockedBalance: 0,
        updatedAt: '',
    };
    setSelectedWalletForDialog(walletShell);
    setTotalBalanceForDialog(totalBalance);
    setIsWithdrawOpen(true);
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };
  
  const handleHistoryRowClick = (tx: Deposit | Withdrawal) => {
    const isDeposit = 'walletAddress' in tx;
    if (isDeposit && tx.status === 'pending') {
        setSelectedDeposit(tx);
        setIsSubmitTxHashOpen(true);
    } else {
        setSelectedTx(tx);
        setIsDetailsOpen(true);
    }
  };
  
  const handleCancelWithdrawal = async (withdrawal: Withdrawal) => {
    if (!firestore || !user || !withdrawal) return;
    try {
      await cancelWithdrawalRequest(db, user.uid, withdrawal.id);
      toast({ title: "Withdrawal Cancelled", description: "Your funds have been returned to your available balance." });
      setIsDetailsOpen(false);
      setSelectedTx(null);
    } catch(e: any) {
       toast({ variant: 'destructive', title: 'Cancellation Failed', description: e.message });
    }
  }

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
      <WithdrawDialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} wallet={selectedWalletForDialog} totalAvailableBalance={totalBalanceForDialog} />
      <SubmitTxHashDialog open={isSubmitTxHashOpen} onOpenChange={setIsSubmitTxHashOpen} deposit={selectedDeposit} />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">My Wallets</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 mb-8">
        {walletSummary.map((data) => {
          const { coin, totalBalance, totalLockedBalance } = data;
          if (!data) return null;
          const totalWalletBalance = totalBalance + totalLockedBalance;

          return (
            <Card key={coin}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-xl font-bold">{coin}</CardTitle>
                <CoinLogo coin={coin} className="h-8 w-8 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">{totalWalletBalance.toFixed(6)}</div>
                  <p className="text-xs text-muted-foreground">Total Balance</p>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available:</span>
                    <span>{totalBalance.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Locked:</span>
                    <span>{totalLockedBalance.toFixed(6)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button size="sm" className="w-full" onClick={() => handleDepositClick(coin as CryptoCurrency)}>
                    <ArrowDown className="mr-2 h-4 w-4" />Deposit
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleWithdrawClick(coin as CryptoCurrency, totalBalance)}>
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
                     <DepositsHistory deposits={deposits} isLoading={areDepositsLoading} onRowClick={handleHistoryRowClick} />
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
                                        <TableCell><Badge variant="outline" className={cn("capitalize", statusColors[w.status])}>{w.status}</Badge></TableCell>
                                        <TableCell>{toDate(w.createdAt)?.toLocaleString('default', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                                        <TableCell className="text-right"><Button variant="ghost" size="icon"><Eye className="h-4 w-4"/></Button></TableCell>
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
                      <Badge variant="outline" className={cn("capitalize", statusColors[selectedTx.status])}>
                        {'status' in selectedTx ? selectedTx.status.replace(/_/g, ' ') : 'N/A'}
                      </Badge>
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
                    {'walletAddress' in selectedTx && (
                       <div className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground">Deposit Address:</span> 
                        <div className="flex items-center gap-2">
                           <span className="font-mono text-xs text-right break-all">{selectedTx.walletAddress}</span>
                           <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(selectedTx.walletAddress)}><Copy className="h-3 w-3"/></Button>
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
                    {'fee' in selectedTx && (selectedTx as Withdrawal).fee !== undefined && (
                       <div className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground">Network Fee:</span> 
                         <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-right break-all">{(selectedTx as Withdrawal).fee!.toFixed(8)} {selectedTx.crypto}</span>
                            <span className="text-muted-foreground text-xs">(~${(FIXED_WITHDRAWAL_FEES_USD[`${selectedTx.crypto}-${(selectedTx as Withdrawal).chain}`] || FIXED_WITHDRAWAL_FEES_USD[selectedTx.crypto] || 0).toFixed(2)})</span>
                        </div>
                      </div>
                    )}
                </div>
              )}
              {selectedTx && 'address' in selectedTx && selectedTx.status === 'pending' && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full mt-4">Cancel Withdrawal</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will cancel your withdrawal request and return the funds to your available balance. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Back</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelWithdrawal(selectedTx as Withdrawal)}>
                                Yes, Cancel
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              )}
          </DialogContent>
      </Dialog>
    </>
  );
}
