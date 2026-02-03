"use client";

import { useFirebase, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Minus, Plus, BookOpen, ShieldCheck, LifeBuoy, FileText } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { BtcLogo, EthLogo, UsdtLogo, LtcLogo } from "@/components/icons";
import type { CryptoCurrency, User, UserWallet, P2PAd } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrices } from "@/context/price-context";

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
}

function DashboardCardSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
        </Card>
    );
}


export default function DashboardPage() {
    const { firestore, user: authUser } = useFirebase();
    const { prices } = usePrices();
    
    const userRef = useMemoFirebase(() => authUser ? doc(firestore, "users", authUser.uid) : null, [firestore, authUser]);
    const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);

    const walletsRef = useMemoFirebase(() => authUser ? collection(firestore, "users", authUser.uid, "wallets") : null, [firestore, authUser]);
    const { data: wallets, isLoading: areWalletsLoading } = useCollection<UserWallet>(walletsRef);
    
    const adsQuery = useMemoFirebase(() => authUser ? query(collection(firestore, "p2p_ads"), where("userId", "==", authUser.uid), where("active", "==", true)) : null, [firestore, authUser]);
    const { data: activeAds, isLoading: areAdsLoading } = useCollection<P2PAd>(adsQuery);
    
    const totalWalletValue = wallets?.reduce((acc, wallet) => {
        const value = (wallet.balance + wallet.lockedBalance) * (prices[wallet.crypto] || 0);
        return acc + value;
    }, 0) || 0;

  return (
    <>
        <div className="flex flex-col gap-2 mb-6">
            {isUserLoading ? <Skeleton className="h-9 w-64" /> : <h1 className="text-2xl font-semibold md:text-3xl">Welcome back, {user?.userId || authUser?.displayName}!</h1>}
            <p className="text-muted-foreground">
                Here's a complete overview of your P2P trading activity. You can manage your wallet, view your reputation, and stay on top of your trades.
            </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            {isUserLoading ? <DashboardCardSkeleton /> : (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                        <span className="text-sm text-muted-foreground">USD</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${parseFloat(user?.tradeVolume || "0").toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">+0% from last month</p>
                    </CardContent>
                </Card>
            )}
             {isUserLoading ? <DashboardCardSkeleton /> : (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed Trades</CardTitle>
                        <span className="text-sm text-muted-foreground">Total</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user?.completedTrades || 0}</div>
                        <p className="text-xs text-muted-foreground">+0 since last week</p>
                    </CardContent>
                </Card>
            )}
             {isUserLoading ? <DashboardCardSkeleton /> : (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Feedback Score</CardTitle>
                        <span className="text-sm text-muted-foreground">Positive</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user?.feedbackScore || 100}%</div>
                        <Progress value={user?.feedbackScore || 100} className="h-2 mt-2" />
                    </CardContent>
                </Card>
            )}
             {areAdsLoading ? <DashboardCardSkeleton /> : (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Ads</CardTitle>
                        <span className="text-sm text-muted-foreground">My Ads</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeAds?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeAds?.filter(ad => ad.adType === 'sell').length || 0} Sell, {activeAds?.filter(ad => ad.adType === 'buy').length || 0} Buy
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
             <Card className="xl:col-span-2">
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>My Wallet</CardTitle>
                        <CardDescription>
                            Total estimated value: ${totalWalletValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </CardDescription>
                    </div>
                    <div className="ml-auto flex gap-2">
                         <Button size="sm" variant="outline" asChild><Link href="/wallets"><Minus className="h-4 w-4 mr-1" /> Withdraw</Link></Button>
                         <Button size="sm" asChild><Link href="/wallets"><Plus className="h-4 w-4 mr-1" /> Deposit</Link></Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {areWalletsLoading ? <Skeleton className="h-40 w-full" /> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Balance</TableHead>
                                    <TableHead className="text-right">USD Value (est.)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {wallets?.map(wallet => {
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
                                        <TableCell className="text-right">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                )})}
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
                    <CardTitle>Platform Resources</CardTitle>
                    <CardDescription>Get help, read our policies, and learn more about secure trading practices.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Link href="/faq" className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border">
                        <LifeBuoy className="h-8 w-8 text-accent" />
                        <div>
                            <h3 className="font-semibold">FAQ</h3>
                            <p className="text-sm text-muted-foreground">Find answers to common questions.</p>
                        </div>
                    </Link>
                    <Link href="/support" className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border">
                        <BookOpen className="h-8 w-8 text-accent" />
                        <div>
                            <h3 className="font-semibold">Guides</h3>
                            <p className="text-sm text-muted-foreground">Learn how to trade safely.</p>
                        </div>
                    </Link>
                    <Link href="/terms" className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border">
                        <FileText className="h-8 w-8 text-accent" />
                        <div>
                            <h3 className="font-semibold">Terms of Service</h3>
                            <p className="text-sm text-muted-foreground">Read the platform rules.</p>
                        </div>
                    </Link>
                    <Link href="/policy" className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border">
                        <ShieldCheck className="h-8 w-8 text-accent" />
                        <div>
                            <h3 className="font-semibold">Privacy Policy</h3>
                            <p className="text-sm text-muted-foreground">How we protect your data.</p>
                        </div>
                    </Link>
                </CardContent>
            </Card>
        </div>
    </>
  );
}
