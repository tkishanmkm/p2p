'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import QRCode from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Copy, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import type { UserWallet, Deposit, CryptoCurrency, DepositAddressSet } from '@/lib/types';
import { createDepositRequest } from '@/lib/wallet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCountdown } from '@/hooks/use-countdown';
import { Skeleton } from '../ui/skeleton';
import { doc } from 'firebase/firestore';

const amountSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
  chain: z.string().optional(),
}).refine(data => {
    // This validation will be handled dynamically based on available chains
    return true;
});
type AmountFormValues = z.infer<typeof amountSchema>;

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
  const countdown = useCountdown(createdDeposit?.timerEnd || new Date(0));

  const addressSetRef = useMemoFirebase(() => (firestore && walletIndex) ? doc(firestore, "crypto_deposit_addresses", String(walletIndex)) : null, [firestore, walletIndex]);
  const { data: addressSetData, isLoading: isAddressSetLoading } = useDoc<DepositAddressSet>(addressSetRef);

  const availableChains = useMemo(() => {
    if (!addressSetData || !wallet) return [];
    const chains: string[] = [];
    for (const key in addressSetData.addresses) {
        if (key.startsWith(`${wallet.crypto}-`)) {
            const chainName = key.substring(wallet.crypto.length + 1);
            chains.push(chainName);
        }
    }
    return chains;
  }, [addressSetData, wallet]);
  
  const showChainSelector = availableChains.length > 1;

  const amountForm = useForm<AmountFormValues>({
    resolver: zodResolver(amountSchema.refine(data => {
        if (showChainSelector) return !!data.chain;
        return true;
    }, {
        message: "Please select a network.",
        path: ["chain"],
    })),
  });

  useEffect(() => {
    // If only one chain is available, pre-select it
    if (availableChains.length === 1) {
        amountForm.setValue('chain', availableChains[0]);
    } else {
        amountForm.setValue('chain', undefined);
    }
  }, [availableChains, amountForm, open]);


  const handleCreateRequest = async (values: AmountFormValues) => {
    if (!wallet || !user || !user.displayName || walletIndex === undefined) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create request. User data missing.' });
      return;
    }
    setIsLoading(true);
    try {
      const chainToUse = values.chain!;
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
          amountForm.reset();
          setStep(1);
          setCreatedDeposit(null);
      }, 300);
    }
    onOpenChange(isOpen);
  };
  
  const bitcoinInstructions = "Ensure you are sending Bitcoin (BTC) from a wallet on the Bitcoin network. Other assets sent to this address may be lost.";
  const ethereumInstructions = "Ensure you are sending Ethereum (ETH) from a wallet on the Ethereum (ERC20) network. Other assets sent to this address may be lost.";
  const litecoinInstructions = "Ensure you are sending Litecoin (LTC) from a wallet on the Litecoin network. Other assets sent to this address may be lost.";
  const usdtInstructions = "Ensure you select the correct network (e.g., ERC20, TRC20, BEP20) that matches your sending wallet. Sending to the wrong network may result in a permanent loss of funds.";
  
  const instructionsMap: Record<CryptoCurrency, string> = {
    BTC: bitcoinInstructions,
    ETH: ethereumInstructions,
    LTC: litecoinInstructions,
    USDT: usdtInstructions,
    BNB: "",
    MATIC: "",
    TRX: ""
  }
  const currentInstruction = wallet ? instructionsMap[wallet.crypto] : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 1 && (
            <>
            <DialogHeader>
                <DialogTitle>Deposit {wallet?.crypto}</DialogTitle>
                <DialogDescription>
                    Enter the amount and network you wish to deposit.
                </DialogDescription>
            </DialogHeader>
            <Form {...amountForm}>
                <form onSubmit={amountForm.handleSubmit(handleCreateRequest)} className="space-y-4 pt-4">
                    {isAddressSetLoading && <Skeleton className="h-20 w-full" />}
                    {!isAddressSetLoading && (
                       <FormField
                            control={amountForm.control}
                            name="chain"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Network</FormLabel>
                                    {showChainSelector ? (
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a network" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {availableChains.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input value={availableChains[0] || 'Loading...'} disabled />
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <FormField
                        control={amountForm.control}
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
                           <p>{currentInstruction}</p>
                           <p>After creating the request, you must send the crypto to the unique address shown and then submit the transaction hash (TxID).</p>
                        </AlertDescription>
                    </Alert>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading || isAddressSetLoading} className="w-full">
                            {(isLoading || isAddressSetLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Deposit
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
            </>
        )}
        {step === 2 && createdDeposit && (
            // This step is now handled by the SubmitTxHashDialog
            // This logic is moved there and triggered from the history table.
            // Keeping this structure allows for future re-integration if the UX flow changes back.
             <DialogHeader>
                <DialogTitle>Request Created!</DialogTitle>
                <DialogDescription>
                    Your deposit request for {createdDeposit.amount} {createdDeposit.crypto} has been created. You can find it in your transaction history on the Wallets page to submit your transaction hash.
                </DialogDescription>
                 <DialogFooter>
                    <Button onClick={() => handleOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}