
'use client';

import { useState } from "react";
import { useFirebase } from "@/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { CryptoCurrency, CryptoDepositAddress, Deposit } from "@/lib/types";
import { addDoc, collection } from "firebase/firestore";
import { add } from "date-fns";
import { processAutomatedDeposit } from "@/lib/wallet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

const depositConfirmationSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
  txId: z.string().min(10, { message: "Transaction Hash is required and must be at least 10 characters." }),
});

type DepositConfirmationFormValues = z.infer<typeof depositConfirmationSchema>;

interface DepositFormProps {
  crypto: CryptoCurrency;
  chain: string;
  depositInfo: CryptoDepositAddress;
}

export function DepositForm({ crypto, chain, depositInfo }: DepositFormProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DepositConfirmationFormValues>({
    resolver: zodResolver(depositConfirmationSchema),
    defaultValues: { txId: "" },
  });

  const onSubmit = async (values: DepositConfirmationFormValues) => {
    if (!firestore || !user || !user.displayName) return;
    setIsSubmitting(true);

    try {
        const depositRequest: Omit<Deposit, 'id'> = {
            userId: user.uid,
            userDisplayName: user.displayName,
            crypto: crypto,
            chain: chain,
            amount: values.amount,
            txId: values.txId,
            walletAddress: depositInfo.address,
            qrCodeUrl: depositInfo.qrCodeUrl,
            status: 'awaiting_confirmation', // Set status for processing
            timerEnd: add(new Date(), { minutes: 60 }).toISOString(), // Not super relevant here but good to have
            createdAt: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(firestore, "deposits"), depositRequest);
        const newDepositData = { ...depositRequest, id: docRef.id };
        
        await processAutomatedDeposit(firestore, newDepositData);

        toast({ title: "Deposit Confirmed!", description: `Your balance has been credited with ${values.amount} ${crypto}.` });
        form.reset();

    } catch (error: any) {
        console.error("Error confirming deposit:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not process your deposit automatically. An admin will review it shortly." });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-6">
        <CardHeader>
            <CardTitle>Confirm Your Deposit</CardTitle>
            <CardDescription>After sending funds to the address above, fill out this form to have your balance updated automatically.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField 
                        control={form.control}
                        name="amount"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Amount Deposited ({crypto})</FormLabel>
                                <FormControl>
                                    <Input type="number" step="any" {...field} placeholder="0.00000000" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField 
                        control={form.control}
                        name="txId"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Transaction Hash / ID</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Enter the transaction hash from your wallet" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm & Credit My Account
                    </Button>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}
