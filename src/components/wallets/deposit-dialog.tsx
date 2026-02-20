
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
import { Copy, AlertTriangle, Loader2, Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import type { UserWallet, Deposit, CryptoCurrency, DepositAddressSet } from '@/lib/types';
import { createDepositRequest, confirmDepositWithTxId } from '@/lib/wallet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCountdown } from '@/hooks/use-countdown';
import { Skeleton } from '../ui/skeleton';
import { doc } from 'firebase/firestore';
import { SUPPORTED_CRYPTOS } from '@/lib/constants';
import { add, isPast } from 'date-fns';
import { toDate, cn } from '@/lib/utils';
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from '@/components/icons';
import { ScrollArea } from '../ui/scroll-area';


const amountSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
  chain: z.string().optional(),
});
type AmountFormValues = z.infer<typeof amountSchema>;

const txIdSchema = z.object({
  txId: z.string().min(10, "Please enter a valid transaction hash."),
});
type TxIdFormValues = z.infer<typeof txIdSchema>;

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: UserWallet | null;
  walletIndex: number | undefined;
}

const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency, className?: string }) => {
    switch (crypto) {
        case 'BTC': return <BtcLogo className={className} />;
        case 'ETH': return <EthLogo className={className} />;
        case 'LTC': return <LtcLogo className={className} />;
        case 'USDT': return <UsdtLogo className={className} />;
        default: return null;
    }
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
    if (!wallet) return [];
    const supported = SUPPORTED_CRYPTOS.find(c => c.name === wallet.crypto);
    return supported?.chains || [];
  }, [wallet]);
  
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

  const txIdForm = useForm<TxIdFormValues>({
    resolver: zodResolver(txIdSchema),
  });

  useEffect(() => {
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
  
  async function handleTxIdSubmit(values: TxIdFormValues) {
    if (!createdDeposit) return;
    setIsLoading(true);
    try {
      await confirmDepositWithTxId(firestore, createdDeposit.id, values.txId);
      toast({ title: 'Transaction Submitted', description: 'Your deposit is now awaiting admin confirmation.' });
      handleOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }


  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Address Copied!" });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => {
          amountForm.reset();
          txIdForm.reset();
          setStep(1);
          setCreatedDeposit(null);
      }, 300);
    }
    onOpenChange(isOpen);
  };
  
  const currentInstruction = wallet ? instructionsMap[wallet.crypto] : "";
  
  const qrCodeValue = createdDeposit ? 
    (createdDeposit.crypto === 'BTC' || createdDeposit.crypto === 'LTC')
        ? `${createdDeposit.crypto.toLowerCase()}:${createdDeposit.walletAddress}?amount=${createdDeposit.amount}`
        : createdDeposit.walletAddress
    : '';

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
                            Create Request
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
            </>
        )}
        {step === 2 && createdDeposit && (
            <>
                <DialogHeader>
                    <DialogTitle>Confirm Your Deposit</DialogTitle>
                    <DialogDescription>
                        Your deposit request has been created.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] -mr-6 pr-6">
                    <div className="space-y-4">
                        {countdown.isFinished || isPast(toDate(createdDeposit.timerEnd)!) ? (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Request Expired</AlertTitle>
                                <AlertDescription>
                                    This deposit request has expired. Please create a new deposit request.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Send exactly</p>
                                    <div className="flex items-center justify-center gap-3 mt-1">
                                        <CryptoLogo crypto={createdDeposit.crypto} className="h-8 w-8" />
                                        <span className="text-3xl font-bold">{createdDeposit.amount}</span>
                                        <span className="text-2xl text-muted-foreground">{createdDeposit.crypto}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <div className="p-2 bg-white rounded-lg border">
                                        <QRCode value={qrCodeValue} size={180} includeMargin={true} />
                                    </div>
                                    <div className="flex items-center gap-1 p-1 bg-muted rounded-md w-full max-w-sm mx-auto">
                                        <p className="font-mono text-xs break-all text-center flex-grow p-2">{createdDeposit.walletAddress}</p>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleCopy(createdDeposit.walletAddress)}><Copy className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="p-4 border-2 border-dashed border-destructive/50 rounded-lg">
                                    <div className="flex justify-center gap-2 sm:gap-4">
                                        <div className="flex flex-col items-center w-20">
                                            <span className="text-4xl font-mono text-destructive font-bold">{String(countdown.hours).padStart(2, '0')}</span>
                                            <span className="text-xs text-muted-foreground">HRS</span>
                                        </div>
                                        <div className="text-4xl font-bold text-destructive">:</div>
                                        <div className="flex flex-col items-center w-20">
                                            <span className="text-4xl font-mono text-destructive font-bold">{String(countdown.minutes).padStart(2, '0')}</span>
                                            <span className="text-xs text-muted-foreground">MIN</span>
                                        </div>
                                        <div className="text-4xl font-bold text-destructive">:</div>
                                        <div className="flex flex-col items-center w-20">
                                            <span className="text-4xl font-mono text-destructive font-bold">{String(countdown.seconds).padStart(2, '0')}</span>
                                            <span className="text-xs text-muted-foreground">SEC</span>
                                        </div>
                                    </div>
                                </div>
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Important Instructions</AlertTitle>
                                    <AlertDescription className="text-xs space-y-1">
                                    <p>{currentInstruction}</p>
                                    <p>After sending, copy the transaction hash (TxID) from your wallet and paste it below to confirm.</p>
                                    </AlertDescription>
                                </Alert>
                                <Form {...txIdForm}>
                                    <form onSubmit={txIdForm.handleSubmit(handleTxIdSubmit)} className="space-y-4 pt-4">
                                        <FormField
                                            control={txIdForm.control}
                                            name="txId"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Transaction Hash (TxID)</FormLabel>
                                                <FormControl><Input placeholder="Enter the transaction hash from your wallet" {...field} /></FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" disabled={isLoading} className="w-full">
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Confirm Deposit
                                        </Button>
                                    </form>
                                </Form>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const instructionsMap: Record<CryptoCurrency, string> = {
    BTC: "Ensure you are sending Bitcoin (BTC) from a wallet on the BTC network. Other assets sent to this address may be lost.",
    ETH: "Ensure you are sending Ethereum (ETH) from a wallet on the ETH network. Other assets sent to this address may be lost.",
    LTC: "Ensure you are sending Litecoin (LTC) from a wallet on the LTC network. Other assets sent to this address may be lost.",
    USDT: "Ensure you select the correct network (e.g., ERC20, TRC20, BEP20) that matches your sending wallet. Sending to the wrong network may result in a permanent loss of funds.",
    BNB: "",
    MATIC: "",
    TRX: ""
};





