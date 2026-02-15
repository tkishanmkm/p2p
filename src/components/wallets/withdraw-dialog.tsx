'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserWallet } from "@/lib/types";

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userWallets: UserWallet[];
}

export function WithdrawDialog({ open, onOpenChange, userWallets }: WithdrawDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {userWallets.map(w => (
            <div key={w.crypto}>
              <p>{w.crypto}: {w.balance.toFixed(8)}</p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2">Withdrawal functionality coming soon.</p>
        </div>
        <DialogFooter className="sm:justify-center mt-4">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
