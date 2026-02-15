'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import type { CryptoCurrency, Deposit, CryptoDepositAddress } from '@/lib/types';
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Copy, AlertTriangle } from "lucide-react";
import { CHAINS } from "@/lib/constants";
import QRCode from "qrcode.react";
import { createDepositRequest } from "@/lib/wallet";

const depositSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
  chain: z.string().min(1, "Please select a network."),
});

type DepositFormValues = z.infer<typeof depositSchema>;

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCrypto: CryptoCurrency | null;
  depositAddresses: CryptoDepositAddress[];
}

export function DepositDialog({ open, onOpenChange, selectedCrypto, depositAddresses }: DepositDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [createdDeposit, setCreatedDeposit] = useState<Deposit | null>(null);

  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
  });

  const selectedChain = form.watch("chain");

  const depositAddressInfo = useMemo(() => {
    if (!selectedCrypto || !selectedChain) return null;
    return depositAddresses.find(addr => addr.crypto === selectedCrypto && addr.chain === selectedChain);
  }, [selectedCrypto, selectedChain, depositAddresses]);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setTimeout(() => {
        form.reset();
        setStep(1);
        setIsLoading(false);
        setCreatedDeposit(null);
      }, 300);
    } else if (selectedCrypto) {
      const chains = CHAINS[selectedCrypto];
      if (chains.length === 1) {
        form.setValue("chain", chains[0]);
      }
    }
  }, [open, selectedCrypto, form]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Address Copied!" });
  };

  const onSubmit = async (values: DepositFormValues) => {
    if (!firestore || !user || !user.displayName || !selectedCrypto || !depositAddressInfo) return;
    setIsLoading(true);
    try {
      const deposit = await createDepositRequest(firestore, user, {
        crypto: selectedCrypto,
        chain: values.chain,
        amount: values.amount,
        walletAddress: depositAddressInfo.address,
        qrCodeUrl: depositAddressInfo.qrCodeUrl,
      });
      setCreatedDeposit(deposit);
      setStep(2);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Deposit {selectedCrypto}</DialogTitle>
              <DialogDescription>
                Initiate a deposit request. Once submitted, you will be given an address to send funds to.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount to Deposit</FormLabel>
                      <FormControl><Input type="number" step="any" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="chain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Network/Chain</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={CHAINS[selectedCrypto!]?.length <= 1}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger></FormControl>
                        <SelectContent>{CHAINS[selectedCrypto!]?.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading || !selectedChain}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Proceed to Deposit
                </Button>
              </form>
            </Form>
          </>
        )}
        {step === 2 && createdDeposit && depositAddressInfo && (
           <>
            <DialogHeader>
              <DialogTitle>Send {createdDeposit.amount} {createdDeposit.crypto}</DialogTitle>
              <DialogDescription>
                Send the exact amount to the address below. Your balance will be credited after network confirmations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-center">
                <div className="mx-auto bg-white p-4 rounded-lg inline-block">
                    <QRCode value={depositAddressInfo.address} size={160} />
                </div>
                 <div className="space-y-1">
                    <Label>Deposit Address ({createdDeposit.chain})</Label>
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                        <p className="text-sm font-mono break-all">{depositAddressInfo.address}</p>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(depositAddressInfo.address)}>
                            <Copy className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
                 <Separator />
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                   Only send {createdDeposit.crypto} via the {createdDeposit.chain} network to this address. Sending any other asset or using a different network will result in the permanent loss of your funds.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => onOpenChange(false)} className="w-full">I Have Sent The Funds</Button>
            </div>
           </>
        )}
      </DialogContent>
    </Dialog>
  );
}
