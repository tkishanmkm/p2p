
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode.react";
import { CryptoDepositAddress, CryptoCurrency } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";
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
    if (!depositAddress?.address) return;
    navigator.clipboard.writeText(depositAddress.address);
    toast({ title: "Address Copied!" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit {selectedCrypto}</DialogTitle>
          <DialogDescription>
            Send only {selectedCrypto} ({depositAddress?.chain}) to this address.
          </DialogDescription>
        </DialogHeader>

        {depositAddress ? (
            <div className="flex flex-col items-center gap-4 my-4">
                <div className="p-4 bg-white rounded-lg">
                    <QRCode value={depositAddress.address} size={200} />
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md w-full">
                    <p className="font-mono text-sm break-all text-center flex-grow">{depositAddress.address}</p>
                    <Button variant="ghost" size="icon" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
                </div>
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                        Sending any other asset to this address will result in the permanent loss of your funds.
                    </AlertDescription>
                </Alert>
            </div>
        ) : (
             <div className="py-8 text-center text-muted-foreground">
                <p>Deposit address for {selectedCrypto} is not configured.</p>
             </div>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
