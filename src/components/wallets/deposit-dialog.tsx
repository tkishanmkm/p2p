
'use client';

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import QRCode from "qrcode.react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useCountdown } from "@/hooks/use-countdown";

import { CryptoDepositAddress, CryptoCurrency, Deposit } from "@/lib/types";
import { useFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { createDepositRequest, confirmDeposit } from "@/lib/wallet";
import { CHAINS } from "@/lib/constants";
import { Loader2, Copy, AlertTriangle } from "lucide-react";

const depositSchema = z.object({
  crypto: z.string().min(1, "Please select a cryptocurrency."),
  chain: z.string().min(1, "Please select a network/chain."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
});

const confirmSchema = z.object({
  txId: z.string().min(10, "Please enter a valid transaction ID/hash."),
});

type DepositFormValues = z.infer<typeof depositSchema>;
type ConfirmFormValues = z.infer<typeof confirmSchema>;

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCrypto: CryptoCurrency | null;
  depositAddresses: CryptoDepositAddress[] | undefined;
}

export function DepositDialog({ open, onOpenChange, selectedCrypto, depositAddresses }: DepositDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeDeposit, setActiveDeposit] = useState<Deposit | null>(null);
  const countdown = useCountdown(activeDeposit?.timerEnd || new Date());

  const depositForm = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: { crypto: selectedCrypto || "" }
  });

  const confirmForm = useForm<ConfirmFormValues>({
    resolver: zodResolver(confirmSchema),
  });

  const watchedCrypto = depositForm.watch("crypto");
  const availableChains = useMemo(() => CHAINS[watchedCrypto as CryptoCurrency] || [], [watchedCrypto]);
  const watchedChain = depositForm.watch("chain");

  const depositAddress = useMemo(() => {
    return depositAddresses?.find(a => a.crypto === watchedCrypto && a.chain === watchedChain);
  }, [depositAddresses, watchedCrypto, watchedChain]);
  
  useEffect(() => {
    if (selectedCrypto) {
      depositForm.setValue('crypto', selectedCrypto);
    }
  }, [selectedCrypto, depositForm]);

  useEffect(() => {
    if (countdown.isFinished && activeDeposit) {
      // In a real app, you might want to automatically mark this as 'expired' in Firestore.
      // For now, we'll just close the dialog and inform the user.
      toast({ variant: 'destructive', title: 'Deposit Request Expired', description: 'Your deposit request has expired. Please create a new one.' });
      handleClose();
    }
  }, [countdown.isFinished, activeDeposit]);

  const handleCreateRequest = async (values: DepositFormValues) => {
    if (!firestore || !user || !depositAddress) return;
    setIsLoading(true);
    try {
      const depositData = await createDepositRequest(firestore, user, { ...values, walletAddress: depositAddress.address, qrCodeUrl: depositAddress.qrCodeUrl });
      setActiveDeposit(depositData);
      toast({ title: 'Request Created', description: 'Please send your funds to the address shown.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmDeposit = async (values: ConfirmFormValues) => {
    if (!firestore || !activeDeposit) return;
    setIsLoading(true);
    try {
      await confirmDeposit(firestore, activeDeposit.id, values.txId);
      toast({ title: 'Deposit Confirmed', description: 'Your deposit is now awaiting admin approval.' });
      handleClose();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Confirmation Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Address Copied!" });
  };

  const handleClose = () => {
    setActiveDeposit(null);
    depositForm.reset({ crypto: selectedCrypto || '' });
    confirmForm.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!activeDeposit ? (
          <>
            <DialogHeader>
              <DialogTitle>Request a Deposit</DialogTitle>
              <DialogDescription>Specify the amount you wish to deposit. An admin will approve it.</DialogDescription>
            </DialogHeader>
            <Form {...depositForm}>
              <form onSubmit={depositForm.handleSubmit(handleCreateRequest)} className="space-y-4">
                <FormField control={depositForm.control} name="crypto" render={({ field }) => (
                  <FormItem><FormLabel>Coin</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{SUPPORTED_CRYPTOS.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={depositForm.control} name="chain" render={({ field }) => (
                  <FormItem><FormLabel>Network / Chain</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={availableChains.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger></FormControl><SelectContent>{availableChains.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={depositForm.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="any" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={isLoading || !depositAddress}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {depositAddress ? 'Create Deposit Request' : 'Select a valid chain'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Deposit {activeDeposit.crypto}</DialogTitle>
              <DialogDescription>Send exactly <span className="font-bold">{activeDeposit.amount} {activeDeposit.crypto}</span> to the address below.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 my-4">
              <div className="p-4 bg-white rounded-lg"><QRCode value={activeDeposit.walletAddress} size={200} /></div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md w-full">
                <p className="font-mono text-sm break-all text-center flex-grow">{activeDeposit.walletAddress}</p>
                <Button variant="ghost" size="icon" onClick={() => handleCopy(activeDeposit.walletAddress)}><Copy className="h-4 w-4" /></Button>
              </div>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>This request expires in <span className="font-mono">{`${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}`}</span></AlertTitle>
                <AlertDescription>Only send {activeDeposit.crypto} ({activeDeposit.chain}) to this address. Sending any other asset will result in loss of funds.</AlertDescription>
              </Alert>
            </div>
            <Form {...confirmForm}>
                <form onSubmit={confirmForm.handleSubmit(handleConfirmDeposit)} className="space-y-4">
                    <FormField control={confirmForm.control} name="txId" render={({field}) => (
                        <FormItem>
                            <FormLabel>Transaction ID / Hash</FormLabel>
                            <FormControl><Input placeholder="Enter the transaction hash from your wallet" {...field}/></FormControl>
                            <FormDescription>After sending, paste the TxID here and confirm.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} I Have Paid</Button>
                    </DialogFooter>
                </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
