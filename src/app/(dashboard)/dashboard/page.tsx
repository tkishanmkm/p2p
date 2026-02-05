

'use client';

import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Minus, Plus, BookOpen, ShieldCheck, LifeBuoy, FileText, ArrowRight, ArrowLeftRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { BtcLogo, EthLogo, UsdtLogo, LtcLogo } from '@/components/icons';
import type { CryptoCurrency, User, UserWallet, P2PAd, Trade } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrices } from '@/context/price-context';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn, toDate } from '@/lib/utils';
import { statusColors } from '@/lib/status-colors';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';


const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency; className?: string }) => {
  switch (crypto) {
    case 'BTC':
      return <BtcLogo className={className} />;
    case 'ETH':
      return <EthLogo className={className} />;
    case 'LTC':
      return <LtcLogo className={className} />;
    case 'USDT':
      return <UsdtLogo className={className} />;
    default:
      return null;
  }
};

export default function DashboardPage() {
  const { firestore, user: authUser, isUserLoading: isAuthLoading } = useFirebase();
  const router = useRouter();
  const { prices } = usePrices();

  useEffect(() => {
    if (!isAuthLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isAuthLoading, router]);

  const userRef = useMemoFirebase(
    () => (authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);

  const walletsRef = useMemoFirebase(
    () => (authUser ? collection(firestore, 'users', authUser.uid, 'wallets') : null),
    [firestore, authUser]
  );
  const { data: wallets, isLoading: areWalletsLoading } = useCollection<UserWallet>(walletsRef);
  
  const totalWalletValue =
    wallets?.reduce((acc, wallet) => {
      const value = (wallet.balance + wallet.lockedBalance) * (prices[wallet.crypto] || 0);
      return acc + value;
    }, 0) || 0;

  const activeTradesAsBuyerQuery = useMemoFirebase(() => authUser ? query(collection(firestore, 'trades'), where('buyerId', '==', authUser.uid), where('status', 'in', ['active', 'paid'])) : null, [firestore, authUser]);
  const { data: activeBuyerTrades, isLoading: activeBuyerTradesLoading } = useCollection<Trade>(activeTradesAsBuyerQuery);

  const activeTradesAsSellerQuery = useMemoFirebase(() => authUser ? query(collection(firestore, 'trades'), where('sellerId', '==', authUser.uid), where('status', 'in', ['active', 'paid'])) : null, [firestore, authUser]);
  const { data: activeSellerTrades, isLoading: activeSellerTradesLoading } = useCollection<Trade>(activeTradesAsSellerQuery);

  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const isLoadingActiveTrades = activeBuyerTradesLoading || activeSellerTradesLoading;

  useEffect(() => {
    if (activeBuyerTrades || activeSellerTrades) {
      const combined = [...(activeBuyerTrades || []), ...(activeSellerTrades || [])];
      const uniqueTrades = Array.from(new Map(combined.map(trade => [trade.id, trade])).values());
      uniqueTrades.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
      setActiveTrades(uniqueTrades);
    }
  }, [activeBuyerTrades, activeSellerTrades]);

  if (isAuthLoading || !authUser) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2 mb-6">
        {isUserLoading ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <h1 className="text-2xl font-semibold md:text-3xl">Welcome back, {user?.userId || authUser?.displayName}!</h1>
        )}
        <p className="text-muted-foreground">
          Here's a complete overview of your P2P trading activity. You can manage your wallet, view your reputation, and
          stay on top of your trades.
        </p>
      </div>
      
      <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                <CardTitle>My Wallet</CardTitle>
                <CardDescription>
                    Total estimated value: $
                    {totalWalletValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardDescription>
                </div>
                <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" asChild>
                    <Link href="/wallets">
                    <Minus className="h-4 w-4 mr-1" /> Withdraw
                    </Link>
                </Button>
                <Button size="sm" asChild>
                    <Link href="/wallets">
                    <Plus className="h-4 w-4 mr-1" /> Deposit
                    </Link>
                </Button>
                </div>
            </CardHeader>
            <CardContent>
                {areWalletsLoading ? (
                <Skeleton className="h-40 w-full" />
                ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead className="text-right">USD Value (est.)</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {wallets?.map((wallet) => {
                        const value = (wallet.balance + wallet.lockedBalance) * (prices[wallet.crypto] || 0);
                        return (
                        <TableRow key={wallet.crypto}>
                            <TableCell>
                            <div className="flex items-center gap-3">
                                <CryptoLogo crypto={wallet.crypto} />
                                <span className="font-medium">{wallet.crypto}</span>
                            </div>
                            </TableCell>
                            <TableCell>{(wallet.balance + wallet.lockedBalance).toFixed(8)}</TableCell>
                            <TableCell className="text-right">
                            ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                        </TableRow>
                        );
                    })}
                    {(!wallets || wallets.length === 0) && (
                        <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                            No wallets created yet.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                )}
            </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Active Trades</CardTitle>
                    <CardDescription>Trades that require your attention.</CardDescription>
                </CardHeader>
                <CardContent>
                     {isLoadingActiveTrades && <Skeleton className="h-24 w-full" />}
                     {!isLoadingActiveTrades && activeTrades.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Partner</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeTrades.map(trade => {
                                    const isBuyer = trade.buyerId === authUser?.uid;
                                    const partner = isBuyer ? trade.seller : trade.buyer;
                                    return (
                                        <TableRow key={trade.id}>
                                            <TableCell className="font-medium">{partner.userId}</TableCell>
                                            <TableCell>{trade.amount.toFixed(6)} {trade.crypto}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("capitalize", statusColors[trade.status])}>{trade.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/trade/${trade.id}`}>View Trade <ArrowRight className="ml-2 h-3 w-3" /></Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                     )}
                     {!isLoadingActiveTrades && activeTrades.length === 0 && (
                         <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                            <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground/50"/>
                            <h3 className="mt-4 text-lg font-semibold">No Active Trades</h3>
                            <p className="mt-1 text-sm">You have no trades that require immediate action.</p>
                         </div>
                     )}
                </CardContent>
            </Card>

        </div>

        <div className="lg:col-span-1">
            <Card>
            <CardHeader>
                <CardTitle>Platform Resources</CardTitle>
                <CardDescription>Get help, read our policies, and learn more about secure trading practices.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <Link
                href="/faq"
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border"
                >
                <LifeBuoy className="h-8 w-8 text-accent" />
                <div>
                    <h3 className="font-semibold">FAQ</h3>
                    <p className="text-sm text-muted-foreground">Find answers to common questions.</p>
                </div>
                </Link>
                <Link
                href="/guides"
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border"
                >
                <BookOpen className="h-8 w-8 text-accent" />
                <div>
                    <h3 className="font-semibold">Guides</h3>
                    <p className="text-sm text-muted-foreground">Learn how to trade safely.</p>
                </div>
                </Link>
                <Link
                href="/terms"
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border"
                >
                <FileText className="h-8 w-8 text-accent" />
                <div>
                    <h3 className="font-semibold">Terms of Service</h3>
                    <p className="text-sm text-muted-foreground">Read the platform rules.</p>
                </div>
                </Link>
                <Link
                href="/policy"
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border"
                >
                <ShieldCheck className="h-8 w-8 text-accent" />
                <div>
                    <h3 className="font-semibold">Privacy Policy</h3>
                    <p className="text-sm text-muted-foreground">How we protect your data.</p>
                </div>
                </Link>
            </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
