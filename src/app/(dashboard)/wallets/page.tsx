// This is a new file
"use client";

import { useState } from "react";
import { useFirebase, useCollection } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from "@/components/icons";
import { CryptoCurrency, SUPPORTED_CRYPTOS, UserWallet, Deposit } from "@/lib/types";
import { Plus, Wallet, ArrowDownToLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DepositDialog } from "@/components/wallets/deposit-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency; className?: string }) => {
  switch (crypto) {
    case 'BTC': return <BtcLogo className={className} />;
    case 'ETH': return <EthLogo className={className} />;
    case 'LTC': return <LtcLogo className={className} />;
    case 'USDT': return <UsdtLogo className={className} />;
    default: return null;
  }
};

const statusColors: Record<Deposit['status'], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};


export default function WalletsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  const walletsCollectionRef = user ? collection(firestore, "users", user.uid, "wallets") : null;
  const { data: wallets, isLoading: isWalletsLoading } = useCollection<UserWallet>(walletsCollectionRef);
  
  const depositsCollectionRef = user ? collection(firestore, "users", user.uid, "deposits") : null;
  const depositsQuery = depositsCollectionRef ? query(depositsCollectionRef, orderBy("createdAt", "desc")) : null;
  const { data: deposits, isLoading: isDepositsLoading } = useCollection<Deposit>(depositsQuery);


  const existingWalletCryptos = wallets?.map(w => w.crypto) || [];
  const availableCryptos = SUPPORTED_CRYPTOS.filter(c => !existingWalletCryptos.includes(c.name));

  const handleCreateWallet = async (crypto: CryptoCurrency) => {
    if (!user || !firestore) return;

    try {
      const batch = writeBatch(firestore);
      const walletRef = doc(firestore, "users", user.uid, "wallets", crypto);
      const newWallet: UserWallet = {
        id: crypto,
        userId: user.uid,
        crypto: crypto,
        balance: 0,
        lockedBalance: 0,
        updatedAt: new Date().toISOString(),
      };
      batch.set(walletRef, newWallet);
      await batch.commit();
      toast({ title: "Wallet Created", description: `Your ${crypto} wallet is ready.` });
    } catch (error: any) {
      console.error("Error creating wallet:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not create wallet." });
    }
  };

  return (
    <>
      <DepositDialog open={isDepositOpen} onOpenChange={setIsDepositOpen} />
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
              <Button variant="outline" onClick={() => setIsDepositOpen(true)}>
                <ArrowDownToLine className="mr-2 h-4 w-4" /> Deposit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={availableCryptos.length === 0}>
                    <Plus className="mr-2 h-4 w-4" /> Add Wallet
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Select Crypto</DropdownMenuLabel>
                  {availableCryptos.map(crypto => (
                    <DropdownMenuItem key={crypto.name} onClick={() => handleCreateWallet(crypto.name)}>
                      {crypto.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {isWalletsLoading && <p>Loading wallets...</p>}
            {!isWalletsLoading && (!wallets || wallets.length === 0) && (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Wallets Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Click "Add Wallet" to create your first wallet.</p>
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
                                        <Badge variant="outline" className={cn("capitalize", statusColors[deposit.status])}>{deposit.status}</Badge>
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
    