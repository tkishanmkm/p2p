'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Copy, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useFirebase } from '@/firebase';
import type { UserWallet, Deposit, CryptoCurrency } from '@/lib/types';
import { createDepositRequest } from '@/lib/wallet';
import { SUPPORTED_CRYPTOS } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
  chain: z.string().optional(),
  isMultiChain: z.boolean().optional(),
}).refine(data => {
    if (data.isMultiChain) {
        return !!data.chain;
    }
    return true;
}, {
    message: "Please select a network for USDT.",
    path: ["chain"],
});

type FormValues = z.infer<typeof formSchema>;

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: UserWallet | null;
  walletIndex: number | undefined;
}

export function DepositDialog({ open, onOpenChange, wallet, walletIndex }: DepositDialogProps) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [createdDeposit, setCreatedDeposit] = useState<Deposit | null>(null);

  const isMultiChain = wallet?.crypto === 'USDT';
  const chains = SUPPORTED_CRYPTOS.find(c => c.name === wallet?.crypto)?.chains || [];
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        isMultiChain: isMultiChain
    }
  });

  const handleCreateRequest = async (values: FormValues) => {
    if (!wallet || !user || !user.displayName || walletIndex === undefined) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create request. User data missing.' });
      return;
    }
    setIsLoading(true);
    try {
      const chainToUse = isMultiChain ? values.chain! : (chains[0] || '');
      const newDeposit = await createDepositRequest(firestore, user.uid, user.displayName, walletIndex, wallet.crypto, chainToUse, values.amount);
      setCreatedDeposit(newDeposit);
      setStep(2);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to Create Deposit Request', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Address Copied!" });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => {
          form.reset({ isMultiChain: isMultiChain });
          setStep(1);
          setCreatedDeposit(null);
      }, 300); // Delay to allow animation
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 1 && (
            <>
            <DialogHeader>
                <DialogTitle>Deposit {wallet?.crypto}</DialogTitle>
                <DialogDescription>
                    Enter the amount and network you wish to deposit to. A request will be created with a unique address.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateRequest)} className="space-y-4 pt-4">
                    {isMultiChain && (
                        <FormField
                            control={form.control}
                            name="chain"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Network</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a network" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {chains.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount in {wallet?.crypto}</FormLabel>
                                <FormControl><Input type="number" step="any" placeholder="0.00" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Instructions</AlertTitle>
                        <AlertDescription className="text-xs space-y-1">
                            <p>1. Enter the exact amount you wish to deposit.</p>
                            <p>2. For USDT, select the correct destination network.</p>
                            <p>3. After creating the request, you will receive a unique deposit address. Send your crypto to this address from your personal wallet or exchange.</p>
                            <p>4. After sending, return to your wallet history to submit the transaction hash (TxID).</p>
                        </AlertDescription>
                    </Alert>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Deposit Request
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
            </>
        )}
        {step === 2 && createdDeposit && (
            <>
            <DialogHeader>
                <DialogTitle>Deposit Request Created</DialogTitle>
                <DialogDescription>
                    Send exactly {createdDeposit.amount} {createdDeposit.crypto} ({createdDeposit.chain}) to the address below.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 my-4">
                <div className="p-4 bg-white rounded-lg">
                     <QRCode value={`${createdDeposit.crypto.toLowerCase()}:${createdDeposit.walletAddress}?amount=${createdDeposit.amount}`} size={200} />
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md w-full">
                    <p className="font-mono text-sm break-all text-center flex-grow">{createdDeposit.walletAddress}</p>
                    <Button variant="ghost" size="icon" onClick={() => handleCopy(createdDeposit.walletAddress)}><Copy className="h-4 w-4" /></Button>
                </div>
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Next Step</AlertTitle>
                    <AlertDescription>
                       After sending the funds, go to your Wallets page. You can find this pending deposit in your history to submit the Transaction ID and complete the process.
                    </AlertDescription>
                </Alert>
            </div>
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                    Done
                </Button>
            </DialogFooter>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}
