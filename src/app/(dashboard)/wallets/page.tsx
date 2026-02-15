
'use client';

import { useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { UserWallet, CryptoDepositAddress, CryptoCurrency } from '@/lib/types';
import { DepositDialog } from '@/components/wallets/deposit-dialog';
import { WithdrawDialog } from '@/components/wallets/withdraw-dialog';
import QRCode from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function WalletPage() {
  const { firestore, user, isUserLoading } = useFirebase();
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const walletsRef = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/wallets`) : null),
    [firestore, user]
  );
  const { data: wallets, isLoading: areWalletsLoading } = useCollection<UserWallet>(walletsRef);

  const depositAddressesRef = useMemoFirebase(
    () => (firestore ? collection(firestore, "crypto_deposit_addresses") : null),
    [firestore]
  );
  const { data: depositAddresses, isLoading: areAddressesLoading } = useCollection<CryptoDepositAddress>(depositAddressesRef);

  const isLoading = isUserLoading || areWalletsLoading || areAddressesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const selectedDepositAddress = depositAddresses?.find(a => a.crypto === selectedCrypto);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">My Wallets</h1>

      {wallets && wallets.length === 0 && (
        <Card>
          <CardHeader><CardTitle>No Wallets Yet</CardTitle></CardHeader>
          <CardContent>Create wallets to start using crypto. Some may be created on your first deposit.</CardContent>
        </Card>
      )}

      {wallets && wallets.map(wallet => {
        const depositAddress = depositAddresses?.find(a => a.crypto === wallet.crypto);
        return (
          <Card key={wallet.crypto} className="mb-4">
            <CardHeader><CardTitle>{wallet.crypto}</CardTitle></CardHeader>
            <CardContent>
              <p>Total: {((wallet.balance || 0) + (wallet.lockedBalance || 0)).toFixed(8)}</p>
              <p>Available: {(wallet.balance || 0).toFixed(8)}</p>
              <p>Locked: {(wallet.lockedBalance || 0).toFixed(8)}</p>
              {depositAddress && (
                <div className="mt-4">
                    <p>Deposit Address:</p>
                    <div className="p-2 inline-block bg-white rounded-lg mt-2">
                        <QRCode value={depositAddress.address} size={128}/>
                    </div>
                    <p className="font-mono text-xs break-all max-w-[200px] mt-2 p-2 bg-muted rounded-md">{depositAddress.address}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={() => { setSelectedCrypto(wallet.crypto); setIsDepositOpen(true); }}>Deposit</Button>
              <Button onClick={() => setIsWithdrawOpen(true)}>Withdraw</Button>
            </CardFooter>
          </Card>
        );
      })}

      <DepositDialog
        open={isDepositOpen}
        onOpenChange={setIsDepositOpen}
        selectedCrypto={selectedCrypto}
        depositAddress={selectedDepositAddress}
      />
      <WithdrawDialog
        open={isWithdrawOpen}
        onOpenChange={setIsWithdrawOpen}
        userWallets={wallets || []}
      />
    </div>
  );
}
