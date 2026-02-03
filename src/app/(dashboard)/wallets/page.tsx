// This is a new file
"use client";

import { useFirebase, useCollection } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from "@/components/icons";
import { CryptoCurrency, SUPPORTED_CRYPTOS, UserWallet } from "@/lib/types";
import { Plus, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency; className?: string }) => {
  switch (crypto) {
    case 'BTC': return <BtcLogo className={className} />;
    case 'ETH': return <EthLogo className={className} />;
    case 'LTC': return <LtcLogo className={className} />;
    case 'USDT': return <UsdtLogo className={className} />;
    default: return null;
  }
};

export default function WalletsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const walletsCollectionRef = user ? collection(firestore, "users", user.uid, "wallets") : null;
  const { data: wallets, isLoading } = useCollection<UserWallet>(walletsCollectionRef);

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
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">My Wallets</h1>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center">
          <div className="grid gap-2">
            <CardTitle>Crypto Balances</CardTitle>
            <CardDescription>
              Your personal cryptocurrency wallets on the platform.
            </CardDescription>
          </div>
          <div className="ml-auto flex gap-2">
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
          {isLoading && <p>Loading wallets...</p>}
          {!isLoading && (!wallets || wallets.length === 0) && (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Wallets Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Click "Add Wallet" to create your first wallet.</p>
            </div>
          )}
          {!isLoading && wallets && wallets.length > 0 && (
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
    </>
  );
}
