
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UserWallet, CryptoCurrency } from "@/lib/types";
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { CHAINS } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';

const withdrawSchema = z.object({
  chain: z.string().min(1, "Please select a network/chain."),
  address: z.string().min(1, "Recipient address is required."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
});

type WithdrawFormValues = z.infer<typeof withdrawSchema>;

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userWallets: UserWallet[];
  selectedCrypto: CryptoCurrency | null;
}

export function WithdrawDialog({ open, onOpenChange, userWallets, selectedCrypto }: WithdrawDialogProps) {
  const { user } = useFirebase();
  const { toast } = useToast();
  const [availableChains, setAvailableChains] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
  });

  const selectedWallet = userWallets.find(w => w.crypto === selectedCrypto);

  useEffect(() => {
    if (open && selectedCrypto) {
      form.reset({
        chain: '',
        address: '',
        amount: undefined,
      });
      setAvailableChains(CHAINS[selectedCrypto] || []);
    }
  }, [open, selectedCrypto, form]);

  async function onSubmit(values: WithdrawFormValues) {
    if (!user || !selectedCrypto) {
        toast({ variant: 'destructive', title: 'Error', description: 'User or crypto not selected.' });
        return;
    }

    if (selectedWallet && values.amount > selectedWallet.balance) {
      form.setError("amount", {
        type: "manual",
        message: "Amount exceeds available balance.",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // This assumes a backend API endpoint is available at /api/withdraw
      const res = await axios.post('/api/withdraw', { 
          userId: user.uid, 
          crypto: selectedCrypto, 
          amount: values.amount, 
          address: values.address 
      });
      
      if (res.data.success) {
        toast({
            title: "Withdrawal Initiated",
            description: `Your withdrawal is processing. TxID: ${res.data.txHash}`,
        });
        onOpenChange(false);
      } else {
          throw new Error(res.data.error || 'Unknown backend error.');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || "An unknown error occurred.";
      toast({ variant: 'destructive', title: "Withdrawal Failed", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
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
          <DialogTitle>Withdraw {selectedCrypto}</DialogTitle>
          <DialogDescription>Your request will be processed by the backend wallet system.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="chain"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Network / Chain</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={availableChains.length === 0}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {availableChains.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
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
                        <FormLabel>Amount</FormLabel>
                        <FormControl><Input type="number" step="any" placeholder="0.00" {...field} /></FormControl>
                        <FormDescription>
                            {selectedWallet ? `Available: ${selectedWallet.balance.toFixed(8)} ${selectedWallet.crypto}` : ''}
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                        Double-check the address and network. Sending funds to the wrong address or network may result in permanent loss.
                    </AlertDescription>
                </Alert>
                
                 <DialogFooter className="gap-2 sm:justify-end">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Request Withdrawal
                    </Button>
                </DialogFooter>

            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
