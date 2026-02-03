
"use client";

import { useState } from "react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from "@/components/icons";
import { CryptoCurrency, UserWallet, Deposit, Withdrawal } from "@/lib/types";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import { Plus, Wallet, ArrowDownToLine, ArrowUpFromLine, RotateCcw } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { cancelWithdrawal } from "@/lib/wallet";


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
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const walletsCollectionRef = useMemoFirebase(() => user ? collection(firestore, "users", user.uid, "wallets") : null, [firestore, user]);
  const { data: wallets, isLoading: isWalletsLoading } = useCollection<UserWallet>(walletsCollectionRef);
  
  const depositsQuery = useMemoFirebase(() => user ? query(collection(firestore, "users", user.uid, "deposits"), orderBy("createdAt", "desc")) : null, [firestore, user]);
  const { data: deposits, isLoading: isDepositsLoading } = useCollection<Deposit>(depositsQuery);
  
  const withdrawalsQuery = useMemoFirebase(() => user ? query(collection(firestore, "users", user.uid, "withdrawals"), orderBy("createdAt", "desc")) : null, [firestore, user]);
  const { data: withdrawals, isLoading: isWithdrawalsLoading } = useCollection<Withdrawal>(withdrawalsQuery);


  const handleCancelWithdrawal = async (withdrawal: Withdrawal) => {
    if (!firestore || !user) return;
    if (!confirm("Are you sure you want to cancel this withdrawal request?")) return;
    try {
      await cancelWithdrawal(firestore, withdrawal);
      toast({ title: "Withdrawal Cancelled", description: "Your funds have been returned to your available balance." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Cancellation Failed", description: e.message });
    }
  };


  return (
    <>
      <DepositDialog open={isDepositOpen} onOpenChange={setIsDepositOpen} />
      <WithdrawDialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} userWallets={wallets || []} />
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">My Wallets</h1>
      </div>
      <div className="grid gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Crypto Balances</CardTitle>
              <CardDescription>
                Your personal cryptocurrency wallets on the platform.
              </CardDescription>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => setIsWithdrawOpen(true)}>
                <ArrowUpFromLine className="mr-2 h-4 w-4" /> Withdraw
              </Button>
              <Button onClick={() => setIsDepositOpen(true)}>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Total Balance</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Locked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map(wallet => (
                    <TableRow key={wallet.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <CryptoLogo crypto={wallet.crypto} />
                          <span className="font-medium">{wallet.crypto}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{(wallet.balance + wallet.lockedBalance).toFixed(8)}</TableCell>
                      <TableCell>{wallet.balance.toFixed(8)}</TableCell>
                      <TableCell className="text-muted-foreground">{wallet.lockedBalance.toFixed(8)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                {!isDepositsLoading && (!deposits || deposits.length === 0) && (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Deposits Found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Click "Deposit" to get started.</p>
                    </div>
                )}
                 {!isDepositsLoading && deposits && deposits.length > 0 && (
                    <Table>
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
                                    <TableCell className="text-muted-foreground">{new Date(deposit.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-medium">{deposit.crypto}</TableCell>
                                    <TableCell>{deposit.amount.toFixed(8)}</TableCell>
                                    <TableCell>{deposit.chain}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("capitalize", depositStatusColors[deposit.status])}>{deposit.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
                {!isWithdrawalsLoading && (!withdrawals || withdrawals.length === 0) && (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Withdrawals Found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Click "Withdraw" to get started.</p>
                    </div>
                )}
                 {!isWithdrawalsLoading && withdrawals && withdrawals.length > 0 && (
                    <Table>
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
                                    <TableCell className="text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</TableCell>
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
                 )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}
