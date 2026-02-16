
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UserWallet } from "@/lib/types";
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { createWithdrawalRequest } from '@/lib/wallet';
import { usePrices } from '@/context/price-context';
import { FIXED_WITHDRAWAL_FEES_USD } from '@/lib/constants';

const withdrawSchema = z.object({
  address: z.string().min(1, "Recipient address is required."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
});

type WithdrawFormValues = z.infer<typeof withdrawSchema>;

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: UserWallet | null;
  totalAvailableBalance?: number;
}

export function WithdrawDialog({ open, onOpenChange, wallet, totalAvailableBalance }: WithdrawDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { prices, isLoading: arePricesLoading } = usePrices();
  
  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
  });
  
  const watchedAmount = form.watch('amount');

  const feeKey = wallet?.crypto === 'USDT' ? `USDT-${wallet.chain}` : wallet?.crypto;
  const feeInUsd = feeKey ? FIXED_WITHDRAWAL_FEES_USD[feeKey] || 0 : 0;
  const cryptoPrice = wallet ? prices[wallet.crypto] : 0;
  const feeInCrypto = cryptoPrice > 0 ? feeInUsd / cryptoPrice : 0;

  const amountToReceive = Math.max(0, (watchedAmount || 0) - feeInCrypto);
  const availableBalance = totalAvailableBalance !== undefined ? totalAvailableBalance : wallet?.balance || 0;


  async function onSubmit(values: WithdrawFormValues) {
    if (!user || !wallet) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot process withdrawal request.' });
        return;
    }
    if (values.amount > availableBalance) {
      form.setError("amount", {
        type: "manual",
        message: "Amount exceeds available balance.",
      });
      return;
    }
    
    setIsLoading(true);
    try {
        await createWithdrawalRequest(firestore, user, wallet.crypto, wallet.chain, values.amount, values.address, feeInCrypto);
        toast({
            title: "Withdrawal Request Submitted",
            description: `Your request to withdraw ${values.amount} ${wallet.crypto} is awaiting admin approval.`,
        });
        onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || "An unknown error occurred during withdrawal.";
      toast({ variant: 'destructive', title: "Withdrawal Failed", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleSetMax = () => {
      if (!wallet) return;
      form.setValue('amount', availableBalance, { shouldValidate: true });
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Withdrawal: {wallet?.crypto} ({wallet?.chain})</DialogTitle>
          <DialogDescription>Withdrawal requests are reviewed and processed by an administrator.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Recipient Address ({wallet?.chain})</FormLabel>
                        <FormControl><Input placeholder="Enter the destination address" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount to Withdraw</FormLabel>
                        <div className="relative">
                            <FormControl><Input type="number" step="any" placeholder="0.00" {...field} /></FormControl>
                            <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2" onClick={handleSetMax}>Max</Button>
                        </div>
                        <FormDescription>
                            {wallet ? `Available: ${availableBalance.toFixed(8)} ${wallet.crypto}` : ''}
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                 <div className="text-sm space-y-1 border rounded-md p-3 bg-secondary/50">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Fee:</span>
                        {arePricesLoading ? <Skeleton className="h-4 w-20" /> : <span className="font-medium">{feeInCrypto.toFixed(8)} {wallet?.crypto} (~${feeInUsd.toFixed(2)})</span>}
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">You will receive:</span>
                        {arePricesLoading ? <Skeleton className="h-4 w-24" /> : <span className="font-semibold">{amountToReceive.toFixed(8)} {wallet?.crypto}</span>}
                    </div>
                </div>
                
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                        Double-check the address and network. Sending funds to the wrong address or network may result in permanent loss. Transactions are irreversible.
                    </AlertDescription>
                </Alert>
                
                 <DialogFooter className="gap-2 sm:justify-end">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Request
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
