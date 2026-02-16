
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
import { UserWallet } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle } from "lucide-react";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: UserWallet | null;
}

export function DepositDialog({ open, onOpenChange, wallet }: DepositDialogProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (!wallet?.depositAddress) return;
    navigator.clipboard.writeText(wallet.depositAddress);
    toast({ title: "Address Copied!" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit {wallet?.crypto}</DialogTitle>
          <DialogDescription>
            Send only {wallet?.crypto} to this address.
          </DialogDescription>
        </DialogHeader>

        {wallet?.depositAddress ? (
            <div className="flex flex-col items-center gap-4 my-4">
                <div className="p-4 bg-white rounded-lg">
                    <QRCode value={wallet.depositAddress} size={200} />
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md w-full">
                    <p className="font-mono text-sm break-all text-center flex-grow">{wallet.depositAddress}</p>
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
                <p>Deposit address for {wallet?.crypto} is not available.</p>
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
