'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import QRCode from "qrcode.react";
import { Button } from "@/components/ui/button";
import { CryptoDepositAddress, CryptoCurrency } from "@/lib/types";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCrypto: CryptoCurrency | null;
  depositAddresses: CryptoDepositAddress[];
}

export function DepositDialog({ open, onOpenChange, selectedCrypto, depositAddresses }: DepositDialogProps) {
  const address = depositAddresses.find(a => a.crypto === selectedCrypto)?.address || "none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit {selectedCrypto}</DialogTitle>
          <DialogDescription>
            Scan this QR code or copy the address to deposit funds.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 mt-4">
          <QRCode value={address} size={200} />
          <p className="font-mono text-sm break-all text-center">{address}</p>
          <Button onClick={() => navigator.clipboard.writeText(address)}>Copy Address</Button>
        </div>

        <DialogClose asChild>
          <Button variant="outline" className="mt-4 w-full">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
