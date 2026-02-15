'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UserWallet } from "@/lib/types";

interface WalletCardProps {
  wallet: UserWallet;
}

export function WalletCard({ wallet }: WalletCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{wallet.crypto}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Balance: {wallet.balance.toFixed(8)}</p>
        <p>Locked: {wallet.lockedBalance.toFixed(8)}</p>
        <div className="flex gap-2 mt-4">
            <Button>Send</Button>
            <Button>Receive</Button>
            <Button disabled>Swap</Button>
        </div>
      </CardContent>
    </Card>
  );
}
