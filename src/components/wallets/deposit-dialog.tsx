'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import QRCode from "qrcode.react";
import { Button } from "@/components/ui/button";
import { CryptoDepositAddress, CryptoCurrency } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle } from "lucide-react";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCrypto: CryptoCurrency | null;
  depositAddress: CryptoDepositAddress | undefined;
}

export function DepositDialog({ open, onOpenChange, selectedCrypto, depositAddress }: DepositDialogProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (depositAddress?.address) {
      navigator.clipboard.writeText(depositAddress.address);
      toast({ title: "Address Copied!" });
    }
  };

  const address = depositAddress?.address || "No deposit address configured for this asset.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit {selectedCrypto}</DialogTitle>
          <DialogDescription>
            Scan this QR code or copy the address to deposit {selectedCrypto}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 mt-4">
          {depositAddress?.address ? (
            <>
              <Alert variant="destructive" className="text-center">
                 <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Only send {selectedCrypto} to this address. Sending any other coin may result in the loss of your funds.
                </AlertDescription>
              </Alert>
              <div className="p-4 bg-white rounded-lg">
                <QRCode value={depositAddress.address} size={200} />
              </div>
              <p className="font-mono text-sm break-all text-center p-2 bg-muted rounded-md">{depositAddress.address}</p>
              <Button onClick={handleCopy} className="w-full">Copy Address</Button>
            </>
          ) : (
             <p className="text-destructive text-center p-4">{address}</p>
          )}
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
