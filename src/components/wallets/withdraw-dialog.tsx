'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
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
import { FIXED_WITHDRAWAL_FEES_USD, SUPPORTED_CRYPTOS } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const withdrawSchema = z.object({
  address: z.string().min(1, "Recipient address is required."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  chain: z.string().min(1, "Please select a network."),
  password: z.string().min(1, "Your password is required to authorize this withdrawal."),
});

type WithdrawFormValues = z.infer<typeof withdrawSchema>;

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: UserWallet | null;
  totalAvailableBalance?: number;
}

export function WithdrawDialog({ open, onOpenChange, wallet, totalAvailableBalance }: WithdrawDialogProps) {
  const { firestore, user, auth } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { prices, isLoading: arePricesLoading } = usePrices();

  const chains = useMemo(() => SUPPORTED_CRYPTOS.find(c => c.name === wallet?.crypto)?.chains || [], [wallet?.crypto]);
  const isMultiChain = chains.length > 1;

  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
  });

  useEffect(() => {
    form.reset({
      address: '',
      amount: undefined,
      chain: chains.length === 1 ? chains[0] : undefined,
      password: '',
    });
  }, [open, wallet, chains, form]);
  
  const watchedAmount = form.watch('amount');
  const watchedChain = form.watch('chain');

  const { feeInCrypto, feeInUsd } = useMemo(() => {
    if (!wallet?.crypto || arePricesLoading || !watchedChain) {
      return { feeInCrypto: 0, feeInUsd: 0 };
    }

    const key = `${wallet.crypto}-${watchedChain}`;
    const usdFee = FIXED_WITHDRAWAL_FEES_USD[key] || FIXED_WITHDRAWAL_FEES_USD[wallet.crypto] || 0;
    
    const price = prices[wallet.crypto];
    const cryptoFee = price > 0 ? usdFee / price : 0;

    return { feeInCrypto: cryptoFee, feeInUsd: usdFee };
  }, [wallet, arePricesLoading, watchedChain, prices]);

  const amountToReceive = Math.max(0, (watchedAmount || 0) - feeInCrypto);
  const availableBalance = totalAvailableBalance !== undefined ? totalAvailableBalance : wallet?.balance || 0;

  async function onSubmit(values: WithdrawFormValues) {
    if (!user || !wallet || !auth?.currentUser?.email) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot process withdrawal request. User or wallet data missing.' });
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
      const credential = EmailAuthProvider.credential(auth.currentUser.email, values.password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      await createWithdrawalRequest(firestore, user, wallet.crypto, values.chain, values.amount, values.address, feeInCrypto);
      toast({
          title: "Withdrawal Request Submitted",
          description: `Your request to withdraw ${values.amount} ${wallet.crypto} is awaiting admin approval.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      let errorMessage = error.message || "An unknown error occurred during withdrawal.";
      if (error.code === 'auth/wrong-password' || error.code === "auth/invalid-credential") {
          errorMessage = "The password you entered is incorrect.";
          form.setError("password", { type: "manual", message: errorMessage });
      }
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

  const dynamicInstruction = `Ensure the recipient address supports the ${watchedChain || 'selected'} network. Withdrawals to other networks are irreversible and may result in a permanent loss of funds.`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Withdraw {wallet?.crypto}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          <Form {...form}>
            <form id="withdraw-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>{dynamicInstruction}</AlertDescription>
                </Alert>
                <FormField
                    control={form.control}
                    name="chain"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Network</FormLabel>
                        {isMultiChain ? (
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a network" /></SelectTrigger></FormControl>
                            <SelectContent>
                            {chains.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        ) : (
                        <Input value={chains[0]} disabled />
                        )}
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Recipient Address</FormLabel>
                        <FormControl><Input placeholder={`Enter the destination ${wallet?.crypto} address`} {...field} /></FormControl>
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
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Your Password</FormLabel>
                        <FormControl><Input type="password" placeholder="Enter password to confirm" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="text-sm space-y-1 border rounded-md p-3 bg-secondary/50">
                    <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee:</span>
                    {arePricesLoading || !watchedChain ? <Skeleton className="h-4 w-20" /> : <span className="font-medium">{feeInCrypto.toFixed(8)} {wallet?.crypto} (~${feeInUsd.toFixed(2)})</span>}
                    </div>
                    <div className="flex justify-between">
                    <span className="text-muted-foreground">You will receive:</span>
                    {arePricesLoading || !watchedChain ? <Skeleton className="h-4 w-24" /> : <span className="font-semibold">{amountToReceive.toFixed(8)} {wallet?.crypto}</span>}
                    </div>
                </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="pt-4 flex-shrink-0">
            <DialogClose asChild>
            <Button type="button" variant="secondary" className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="withdraw-form" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Withdrawal
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
