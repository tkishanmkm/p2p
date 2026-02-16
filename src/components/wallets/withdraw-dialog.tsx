
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from 'axios';
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

const withdrawSchema = z.object({
  address: z.string().min(1, "Recipient address is required."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
});

type WithdrawFormValues = z.infer<typeof withdrawSchema>;

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: UserWallet | null;
}

export function WithdrawDialog({ open, onOpenChange, wallet }: WithdrawDialogProps) {
  const { user } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [fees, setFees] = useState<{ gasFee: number; serviceFee: number; totalFee: number } | null>(null);

  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
  });

  const watchedAmount = form.watch('amount');

  useEffect(() => {
    async function fetchFee() {
      if (open && wallet) {
        setIsFeeLoading(true);
        setFees(null);
        try {
          const res = await axios.post('/api/wallet/estimate-fee', {
            crypto: wallet.crypto,
            chain: wallet.chain,
          });
          setFees(res.data);
        } catch (error) {
          console.error("Failed to fetch fee:", error);
          toast({ variant: 'destructive', title: 'Fee Estimation Failed', description: 'Could not calculate transaction fees.' });
        } finally {
          setIsFeeLoading(false);
        }
      }
    }
    fetchFee();
  }, [open, wallet, toast]);

  async function onSubmit(values: WithdrawFormValues) {
    if (!user || !wallet) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot process withdrawal request.' });
        return;
    }
    const totalDeduction = values.amount + (fees?.totalFee || 0);
    if (totalDeduction > wallet.balance) {
      form.setError("amount", {
        type: "manual",
        message: "Amount plus fees exceeds available balance.",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken(true);
      const res = await axios.post('/api/wallet/withdraw', {
          idToken,
          crypto: wallet.crypto,
          chain: wallet.chain,
          amount: values.amount,
          address: values.address
      });
      
      if (res.data.success) {
          toast({
              title: "Withdrawal Submitted",
              description: `Your request to withdraw ${values.amount} ${wallet.crypto} is being processed. Tx: ${res.data.txHash}`,
          });
          onOpenChange(false);
      } else {
           throw new Error(res.data.error || "An unknown error occurred.");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || "An unknown error occurred during withdrawal.";
      toast({ variant: 'destructive', title: "Withdrawal Failed", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleSetMax = () => {
      if (!wallet || !fees) return;
      const maxAmount = wallet.balance - fees.totalFee;
      if (maxAmount > 0) {
          form.setValue('amount', maxAmount, { shouldValidate: true });
      } else {
           form.setValue('amount', 0, { shouldValidate: true });
           toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'Balance is too low to cover transaction fees.'});
      }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setFees(null);
    }
    onOpenChange(isOpen);
  };

  const amountToWithdraw = watchedAmount || 0;
  const transactionFee = fees?.totalFee || 0;
  const totalDeduction = amountToWithdraw + transactionFee;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw {wallet?.crypto} ({wallet?.chain})</DialogTitle>
          <DialogDescription>Withdrawal requests are processed by the admin wallet. This is an on-chain transaction.</DialogDescription>
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
                            {wallet ? `Available: ${wallet.balance.toFixed(8)} ${wallet.crypto}` : ''}
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                <div className="p-3 border rounded-md space-y-2 text-sm bg-muted/50">
                    {isFeeLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ) : (
                        <>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Transaction Fee</span>
                            <span>{transactionFee.toFixed(8)} {wallet?.crypto}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                            <span>Total Deduction</span>
                            <span>{totalDeduction > 0 ? totalDeduction.toFixed(8) : '0.00'} {wallet?.crypto}</span>
                        </div>
                        </>
                    )}
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
                    <Button type="submit" disabled={isLoading || isFeeLoading}>
                      {(isLoading || isFeeLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Withdrawal
                    </Button>
                </DialogFooter>

            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
