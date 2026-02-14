
"use client";

import { useState, useEffect } from "react";
import { useFirebase, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from "@/components/icons";
import { CryptoCurrency, User, UserWallet, Deposit, Withdrawal } from "@/lib/types";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import { Plus, Wallet, ArrowDownToLine, ArrowUpFromLine, RotateCcw, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DepositDialog } from "@/components/wallets/deposit-dialog";
import { WithdrawDialog } from "@/components/wallets/withdraw-dialog";
import { Badge } from "@/components/ui/badge";
import { cn, toDate } from "@/lib/utils";
import { cancelWithdrawal } from "@/lib/wallet";
import { useRouter } from 'next/navigation';
import { usePrices } from "@/context/price-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency; className?: string }) => {
  switch (crypto) {
    case 'BTC': return <BtcLogo className={className} />;
    case 'ETH': return <EthLogo className={className} />;
    case 'LTC': return <LtcLogo className={className} />;
    case 'USDT': return <UsdtLogo className={className} />;
    default: return null;
  }
};

const depositStatusColors: Record<Deposit['status'], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  awaiting_confirmation: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

const withdrawalStatusColors: Record<Withdrawal['status'], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};


export default function WalletsPage() {
  const { firestore, user: authUser, isUserLoading: isAuthLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
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
  
  const depositsQuery = useMemoFirebase(() => 
    authUser 
      ? query(collection(firestore, "deposits"), where("userId", "==", authUser.uid), orderBy("createdAt", "desc")) 
      : null,
    [authUser, firestore]
  );
  const { data: deposits, isLoading: isDepositsLoading, error: depositsError } = useCollection<Deposit>(depositsQuery);

  const withdrawalsQuery = useMemoFirebase(() => 
    authUser 
      ? query(collection(firestore, "users", authUser.uid, "withdrawals"), orderBy("createdAt", "desc"))
      : null,
    [authUser, firestore]
  );
  const { data: withdrawals, isLoading: isWithdrawalsLoading, error: withdrawalsError } = useCollection<Withdrawal>(withdrawalsQuery);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Address copied to clipboard." });
  };
  
    const totalWalletValueUSD =
    wallets?.reduce((acc, wallet) => {
      const value = (wallet.balance || 0) * (prices[wallet.crypto] || 0);
      return acc + value;
    }, 0) || 0;

  const preferredCurrency = user?.preferredCurrency || 'USD';
  const exchangeRate = fiatRates[preferredCurrency] || 1;
  const totalWalletValueConverted = totalWalletValueUSD * exchangeRate;

  const handleCancelWithdrawal = async (withdrawal: Withdrawal) => {
    if (!firestore || !authUser) return;
    if (!confirm("Are you sure you want to cancel this withdrawal request?")) return;
    try {
      await cancelWithdrawal(firestore, withdrawal);
      toast({ title: "Withdrawal Cancelled", description: "Your funds have been returned to your available balance." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Cancellation Failed", description: e.message });
    }
  };

  const isDepositDisabled = isUserLoading || !!user?.isBanned || !!user?.isOnHold;

  if (isAuthLoading || !authUser) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <DepositDialog open={isDepositOpen} onOpenChange={setIsDepositOpen} />
      <WithdrawDialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} userWallets={wallets || []} />
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">My Wallets</h1>
      </div>
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Available Value</CardTitle>
            <CardDescription>
              This is the estimated total value of your available (unlocked) crypto assets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
                {isWalletsLoading || isUserLoading ? (
                    <Skeleton className="h-9 w-48" />
                ) : (
                    totalWalletValueConverted.toLocaleString(undefined, { style: 'currency', currency: preferredCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2 })
                )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center">
            <div className="grid gap-2 flex-grow">
              <CardTitle>Crypto Balances</CardTitle>
              <CardDescription>
                Your personal cryptocurrency wallets on the platform.
              </CardDescription>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              <Button variant="outline" onClick={() => setIsWithdrawOpen(true)} className="w-full md:w-auto">
                <ArrowUpFromLine className="mr-2 h-4 w-4" /> Withdraw
              </Button>
              <Button onClick={() => setIsDepositOpen(true)} disabled={isDepositDisabled} className="w-full md:w-auto">
                <ArrowDownToLine className="mr-2 h-4 w-4" /> Deposit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isWalletsLoading && <p>Loading wallets...</p>}
            {!isWalletsLoading && (!wallets || wallets.length === 0) && (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Wallets Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Click "Deposit" to create your first wallet.</p>
              </div>
            )}
            {!isWalletsLoading && wallets && wallets.length > 0 && (
              <>
                {/* Desktop Table */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Available Balance</TableHead>
                      <TableHead>Locked Balance</TableHead>
                      <TableHead className="text-right">Value ({preferredCurrency})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wallets.map(wallet => {
                      const valueUSD = (wallet.balance || 0) * (prices[wallet.crypto] || 0);
                      const valueConverted = valueUSD * exchangeRate;
                      return (
                      <TableRow key={wallet.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <CryptoLogo crypto={wallet.crypto} />
                            <span className="font-medium">{wallet.crypto}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{(wallet.balance || 0).toFixed(8)}</TableCell>
                        <TableCell className="font-medium">{(wallet.lockedBalance || 0).toFixed(8)}</TableCell>
                        <TableCell className="text-right font-medium">{valueConverted.toLocaleString(undefined, { style: 'currency', currency: preferredCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {wallets.map(wallet => {
                      const valueUSD = (wallet.balance || 0) * (prices[wallet.crypto] || 0);
                      const valueConverted = valueUSD * exchangeRate;
                      return (
                    <Card key={wallet.id}>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                         <div className="flex items-center gap-3">
                            <CryptoLogo crypto={wallet.crypto} />
                            <CardTitle className="text-lg">{wallet.crypto}</CardTitle>
                          </div>
                          <div className="font-semibold text-right">
                            {valueConverted.toLocaleString(undefined, { style: 'currency', currency: preferredCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Available</span>
                          <span className="font-medium">{(wallet.balance || 0).toFixed(8)}</span>
                        </div>
                         <div className="flex justify-between">
                          <span className="text-muted-foreground">Locked</span>
                          <span className="font-medium">{(wallet.lockedBalance || 0).toFixed(8)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )})}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Deposit History</CardTitle>
                <CardDescription>A log of your past and pending deposits.</CardDescription>
            </CardHeader>
            <CardContent>
                {isDepositsLoading && <p>Loading history...</p>}
                {depositsError && (
                  <Alert variant="destructive">
                    <AlertTitle>Error Loading Deposits</AlertTitle>
                    <AlertDescription>{depositsError.message}</AlertDescription>
                  </Alert>
                )}
                {!isDepositsLoading && !depositsError && (!deposits || deposits.length === 0) && (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Deposits Found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Click "Deposit" to get started.</p>
                    </div>
                )}
                 {!isDepositsLoading && !depositsError && deposits && deposits.length > 0 && (
                   <>
                    {/* Desktop Table */}
                    <Table className="hidden md:table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Asset</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Chain</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deposits.map(deposit => (
                                <TableRow key={deposit.id}>
                                    <TableCell className="text-muted-foreground">{toDate(deposit.createdAt)?.toLocaleString() ?? 'Invalid Date'}</TableCell>
                                    <TableCell className="font-medium">{deposit.crypto}</TableCell>
                                    <TableCell>{(deposit.finalAmount ?? deposit.amount).toFixed(8)}</TableCell>
                                    <TableCell>{deposit.chain}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("capitalize", depositStatusColors[deposit.status])}>{deposit.status.replace(/_/g, ' ')}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-4">
                      {deposits.map(deposit => (
                        <Card key={deposit.id}>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                              <CardTitle className="text-base">{(deposit.finalAmount ?? deposit.amount).toFixed(4)} {deposit.crypto}</CardTitle>
                              <Badge variant="outline" className={cn("capitalize", depositStatusColors[deposit.status])}>{deposit.status.replace(/_/g, ' ')}</Badge>
                          </CardHeader>
                          <CardContent className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Date</span>
                              <span>{toDate(deposit.createdAt)?.toLocaleString() ?? 'N/A'}</span>
                            </div>
                             <div className="flex justify-between">
                              <span className="text-muted-foreground">Chain</span>
                              <span>{deposit.chain}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                   </>
                 )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Withdrawal History</CardTitle>
                <CardDescription>A log of your past and pending withdrawals.</CardDescription>
            </CardHeader>
            <CardContent>
                {isWithdrawalsLoading && <p>Loading history...</p>}
                {withdrawalsError && (
                  <Alert variant="destructive">
                    <AlertTitle>Error Loading Withdrawals</AlertTitle>
                    <AlertDescription>{withdrawalsError.message}</AlertDescription>
                  </Alert>
                )}
                {!isWithdrawalsLoading && !withdrawalsError && (!withdrawals || withdrawals.length === 0) && (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Withdrawals Found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Click "Withdraw" to get started.</p>
                    </div>
                )}
                 {!isWithdrawalsLoading && !withdrawalsError && withdrawals && withdrawals.length > 0 && (
                    <>
                      {/* Desktop Table */}
                      <Table className="hidden md:table">
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Asset</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>Address</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Action</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {withdrawals.map(w => (
                                  <TableRow key={w.id}>
                                      <TableCell className="text-muted-foreground">{toDate(w.createdAt)?.toLocaleString() ?? 'Invalid Date'}</TableCell>
                                      <TableCell className="font-medium">{w.crypto}</TableCell>
                                      <TableCell>{w.amount.toFixed(8)}</TableCell>
                                      <TableCell className="font-mono text-xs max-w-[150px] truncate">{w.address}</TableCell>
                                      <TableCell>
                                          <Badge variant="outline" className={cn("capitalize", withdrawalStatusColors[w.status])}>{w.status}</Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                          {w.status === 'pending' && (
                                              <Button variant="ghost" size="sm" onClick={() => handleCancelWithdrawal(w)}>
                                                  <RotateCcw className="mr-2 h-4 w-4"/>
                                                  Cancel
                                              </Button>
                                          )}
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                       {/* Mobile Cards */}
                      <div className="md:hidden space-y-4">
                        {withdrawals.map(w => (
                          <Card key={w.id}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base">{w.amount.toFixed(4)} {w.crypto}</CardTitle>
                                <Badge variant="outline" className={cn("capitalize", withdrawalStatusColors[w.status])}>{w.status}</Badge>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                              <div className="flex justify-between items-start">
                                <span className="text-muted-foreground">Address</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs max-w-[150px] truncate">{w.address}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(w.address)}>
                                      <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Date</span>
                                <span>{toDate(w.createdAt)?.toLocaleString() ?? 'N/A'}</span>
                              </div>
                              {w.status === 'pending' && (
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => handleCancelWithdrawal(w)}>
                                  <RotateCcw className="mr-2 h-4 w-4"/>
                                  Cancel Request
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                 )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}

    