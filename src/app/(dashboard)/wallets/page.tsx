
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useFirebase, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { collection, doc, query, orderBy, where } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from "@/components/icons";
import { CryptoCurrency, User, UserWallet, Deposit, Withdrawal, CoinTransfer, CryptoDepositAddress } from "@/lib/types";
import { SUPPORTED_CRYPTOS, CHAINS } from "@/lib/constants";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, RotateCcw, Copy, Loader2, Send, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { WithdrawDialog } from "@/components/wallets/withdraw-dialog";
import { Badge } from "@/components/ui/badge";
import { cn, toDate } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { usePrices } from "@/context/price-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNow } from "date-fns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency; className?: string }) => {
  switch (crypto) {
    case 'BTC': return <BtcLogo className={className} />;
    case 'ETH': return <EthLogo className={className} />;
    case 'LTC': return <LtcLogo className={className} />;
    case 'USDT': return <UsdtLogo className={className} />;
    default: return null;
  }
};

const transactionStatusColors: Record<string, string> = {
  pending: "text-yellow-600",
  awaiting_confirmation: "text-yellow-600",
  approved: "text-green-600",
  declined: "text-red-600",
  expired: "text-gray-500",
  cancelled: "text-gray-500",
};

function WalletView({ crypto, wallet, deposits, withdrawals, transfers, depositAddresses, onWithdrawClick }: {
    crypto: CryptoCurrency;
    wallet: UserWallet | undefined;
    deposits: Deposit[];
    withdrawals: Withdrawal[];
    transfers: any[];
    depositAddresses: CryptoDepositAddress[];
    onWithdrawClick: () => void;
}) {
    const [showDeposit, setShowDeposit] = useState(true);
    const { prices, fiatRates } = usePrices();
    const { user: authUser } = useFirebase();

    const balance = wallet?.balance ?? 0;
    const lockedBalance = wallet?.lockedBalance ?? 0;
    const valueUSD = balance * (prices[crypto] || 0);
    const preferredCurrency = authUser?.preferredCurrency || 'USD';
    const exchangeRate = fiatRates[preferredCurrency] || 1;
    const valueConverted = valueUSD * exchangeRate;
    
    const chains = CHAINS[crypto] || [];

    const allTransactions = useMemo(() => {
        const txs = [
            ...deposits.map(d => ({ ...d, type: 'Deposit', date: toDate(d.createdAt) })),
            ...withdrawals.map(w => ({ ...w, type: 'Withdrawal', date: toDate(w.createdAt) })),
            ...transfers.map(t => ({ ...t, type: t.senderId === authUser?.uid ? 'Transfer Out' : 'Transfer In', date: toDate(t.createdAt) })),
        ];
        return txs.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
    }, [deposits, withdrawals, transfers, authUser]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CryptoLogo crypto={crypto} className="h-6 w-6" />
                            {crypto} Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Balance</p>
                            <p className="text-2xl font-bold">{(balance + lockedBalance).toFixed(8)}</p>
                        </div>
                        <div className="text-sm space-y-1">
                            <div className="flex justify-between"><span>Available:</span><span>{balance.toFixed(8)}</span></div>
                            <div className="flex justify-between"><span>Locked:</span><span>{lockedBalance.toFixed(8)}</span></div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            ≈ {valueConverted.toLocaleString(undefined, { style: 'currency', currency: preferredCurrency, minimumFractionDigits: 2 })}
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2">
                        <Button variant="outline" className="flex-col h-20 gap-1" onClick={() => setShowDeposit(true)}>
                            <ArrowDownToLine className="h-5 w-5"/>
                            <span>Deposit</span>
                        </Button>
                         <Button variant="outline" className="flex-col h-20 gap-1" onClick={onWithdrawClick}>
                            <ArrowUpFromLine className="h-5 w-5"/>
                            <span>Withdraw</span>
                        </Button>
                         <Button variant="outline" className="flex-col h-20 gap-1" disabled>
                            <Repeat className="h-5 w-5"/>
                            <span>Swap</span>
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            {/* Right Column */}
            <div className="lg:col-span-2 space-y-6">
                {showDeposit && (
                    <Card>
                        <CardHeader>
                             <CardTitle>Deposit {crypto}</CardTitle>
                             <CardDescription>Send only {crypto} to this address. Sending any other asset will result in permanent loss.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue={chains[0]} className="w-full">
                                {chains.length > 1 && (
                                    <TabsList className="grid w-full grid-cols-3">
                                        {chains.map(chain => <TabsTrigger key={chain} value={chain}>{chain}</TabsTrigger>)}
                                    </TabsList>
                                )}
                                {chains.map(chain => {
                                    const depositInfo = depositAddresses.find(addr => addr.crypto === crypto && addr.chain === chain);
                                    if (!depositInfo) {
                                        return (
                                            <TabsContent key={chain} value={chain}>
                                                <Alert variant="destructive">
                                                    <AlertTitle>Address Not Configured</AlertTitle>
                                                    <AlertDescription>No deposit address has been configured for the {chain} network. Please contact support.</AlertDescription>
                                                </Alert>
                                            </TabsContent>
                                        )
                                    }
                                    return (
                                        <TabsContent key={chain} value={chain} className="mt-4">
                                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                                <div className="p-2 bg-white rounded-lg">
                                                    <Image src={depositInfo.qrCodeUrl} alt={`${chain} QR Code`} width={160} height={160}/>
                                                </div>
                                                <div className="space-y-4 flex-grow w-full">
                                                    <div className="space-y-1">
                                                        <Label htmlFor={`${chain}-address`}>{chain} Address</Label>
                                                        <div className="relative">
                                                            <Input id={`${chain}-address`} value={depositInfo.address} readOnly className="pr-10 font-mono text-xs"/>
                                                            <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => navigator.clipboard.writeText(depositInfo.address)}>
                                                                <Copy className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    )
                                })}
                            </Tabs>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle>Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="all">
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="deposits">Deposits</TabsTrigger>
                                <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                                <TabsTrigger value="transfers">Transfers</TabsTrigger>
                            </TabsList>
                            <div className="mt-4">
                                <TransactionTable transactions={allTransactions} type="all" />
                                <TransactionTable transactions={allTransactions} type="Deposit" />
                                <TransactionTable transactions={allTransactions} type="Withdrawal" />
                                <TransactionTable transactions={allTransactions} type="Transfer" />
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function TransactionTable({ transactions, type }: { transactions: any[], type: 'all' | 'Deposit' | 'Withdrawal' | 'Transfer' }) {
    const filtered = useMemo(() => {
        if (type === 'all') return transactions;
        if (type === 'Transfer') return transactions.filter(t => t.type === 'Transfer In' || t.type === 'Transfer Out');
        return transactions.filter(t => t.type === type);
    }, [transactions, type]);

    const content = (
         <div className="max-h-96 overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status/Partner</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.length > 0 ? filtered.map(tx => (
                        <TableRow key={tx.id}>
                            <TableCell className="font-medium">{tx.type}</TableCell>
                            <TableCell className={cn(tx.type.includes('In') || tx.type.includes('Deposit') ? 'text-green-600' : 'text-red-600')}>
                                {(tx.type.includes('In') || tx.type.includes('Deposit') ? '+' : '-') + (tx.finalAmount ?? tx.amount).toFixed(8)}
                            </TableCell>
                            <TableCell className={cn("capitalize", transactionStatusColors[tx.status])}>
                                {tx.type.includes('Transfer') ? (tx.type === 'Transfer In' ? tx.senderUsername : tx.recipientUsername) : tx.status?.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{tx.date ? formatDistanceToNow(tx.date, { addSuffix: true }) : 'N/A'}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">No {type !== 'all' ? type.toLowerCase() : ''} transactions found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )

    return (
        <TabsContent value={type === 'Transfer' ? 'transfers' : type.toLowerCase()}>
            {content}
        </TabsContent>
    );
}

export default function WalletsPage() {
  const { firestore, user: authUser, isUserLoading: isAuthLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const { prices, fiatRates } = usePrices();

  useEffect(() => {
    if (!isAuthLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isAuthLoading, router]);

  const userRef = useMemoFirebase(() => (authUser ? doc(firestore, 'users', authUser.uid) : null), [firestore, authUser]);
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);

  const walletsCollectionRef = useMemoFirebase(() => authUser ? collection(firestore, "users", authUser.uid, "wallets") : null, [firestore, authUser]);
  const { data: wallets, isLoading: isWalletsLoading } = useCollection<UserWallet>(walletsCollectionRef);
  
  const depositsQuery = useMemoFirebase(() => authUser ? query(collection(firestore, "deposits"), where("userId", "==", authUser.uid)) : null, [authUser, firestore]);
  const { data: deposits, isLoading: isDepositsLoading } = useCollection<Deposit>(depositsQuery);
  
  const withdrawalsQuery = useMemoFirebase(() => authUser ? query(collection(firestore, `users/${authUser.uid}/withdrawals`)) : null, [authUser, firestore]);
  const { data: withdrawals, isLoading: isWithdrawalsLoading } = useCollection<Withdrawal>(withdrawalsQuery);
  
  const addressesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "crypto_deposit_addresses")) : null, [firestore]);
  const { data: depositAddresses, isLoading: areAddressesLoading } = useCollection<CryptoDepositAddress>(addressesQuery);

  const sentTransfersQuery = useMemoFirebase(() => authUser ? query(collection(firestore, 'transfers'), where('senderId', '==', authUser.uid)) : null, [firestore, authUser]);
  const { data: sentTransfers, isLoading: sentLoading } = useCollection<CoinTransfer>(sentTransfersQuery);

  const receivedTransfersQuery = useMemoFirebase(() => authUser ? query(collection(firestore, 'transfers'), where('recipientId', '==', authUser.uid)) : null, [firestore, authUser]);
  const { data: receivedTransfers, isLoading: receivedLoading } = useCollection<CoinTransfer>(receivedTransfersQuery);
  
  const allTransfers = useMemo(() => [...(sentTransfers || []), ...(receivedTransfers || [])], [sentTransfers, receivedTransfers]);

  const isLoading = isAuthLoading || isUserLoading || isWalletsLoading || isDepositsLoading || isWithdrawalsLoading || areAddressesLoading || sentLoading || receivedLoading;

  if (isLoading || !authUser) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <WithdrawDialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} userWallets={wallets || []} />
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">My Wallets</h1>
      </div>
       <Tabs defaultValue="BTC" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                {SUPPORTED_CRYPTOS.map(c => (
                    <TabsTrigger key={c.name} value={c.name} className="py-2">
                        <div className="flex items-center gap-2">
                            <CryptoLogo crypto={c.name} className="h-5 w-5" />
                            <span className="font-semibold">{c.name}</span>
                        </div>
                    </TabsTrigger>
                ))}
            </TabsList>
            {SUPPORTED_CRYPTOS.map(c => (
                 <TabsContent key={c.name} value={c.name} className="mt-6">
                    <WalletView
                        crypto={c.name}
                        wallet={wallets?.find(w => w.crypto === c.name)}
                        deposits={deposits?.filter(d => d.crypto === c.name) || []}
                        withdrawals={withdrawals?.filter(w => w.crypto === c.name) || []}
                        transfers={allTransfers.filter(t => t.crypto === c.name) || []}
                        depositAddresses={depositAddresses || []}
                        onWithdrawClick={() => setIsWithdrawOpen(true)}
                    />
                </TabsContent>
            ))}
       </Tabs>
    </>
  );
}
