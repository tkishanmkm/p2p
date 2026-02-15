
"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useFirebase, useDoc } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useCountdown } from "@/hooks/use-countdown";
import type { Deposit } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Copy, Hourglass, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { processAutomatedDeposit } from "@/lib/wallet";

const depositConfirmationSchema = z.object({
  txId: z.string().min(10, { message: "Transaction Hash is required and must be at least 10 characters." }),
});

type DepositConfirmationFormValues = z.infer<typeof depositConfirmationSchema>;


function CountdownDisplay({ targetDate }: { targetDate: string }) {
  const { hours, minutes, seconds, isFinished } = useCountdown(targetDate);
  const displayTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className={`text-2xl font-semibold font-mono ${isFinished ? 'text-destructive' : ''}`}>
      {isFinished ? "Expired" : displayTime}
    </div>
  );
}

function DepositPageContent() {
  const params = useParams();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const depositId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const depositRef = firestore && depositId ? doc(firestore, "deposits", depositId) : null;
  const { data: deposit, isLoading } = useDoc<Deposit>(depositRef);

  const form = useForm<DepositConfirmationFormValues>({
    resolver: zodResolver(depositConfirmationSchema),
    defaultValues: { txId: "" },
  });
  
  const { isFinished } = useCountdown(deposit?.timerEnd || new Date());

  useEffect(() => {
    // Automatically expire the deposit if the timer runs out and it's still pending
    if (deposit && deposit.status === 'pending' && isFinished && depositRef) {
      const expireDeposit = async () => {
        try {
          await updateDoc(depositRef, { status: 'expired' });
          // The page will re-render with the new status via the useDoc hook
        } catch (e) {
          // Log error but don't show a toast, as this is a background action
          console.error("Failed to auto-expire deposit request:", e);
        }
      };
      expireDeposit();
    }
  }, [deposit, isFinished, depositRef]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Address copied to clipboard." });
  };
  
  const onSubmit = async (values: DepositConfirmationFormValues) => {
    if (!depositRef || !firestore || !deposit) return;
    setIsSubmitting(true);

    try {
        await updateDoc(depositRef, { 
            txId: values.txId,
            status: 'awaiting_confirmation'
        });

        // Immediately try to process it automatically
        await processAutomatedDeposit(firestore, { ...deposit, status: 'awaiting_confirmation' });

        toast({ title: "Deposit Confirmed!", description: "Your deposit has been processed and your balance updated." });
    } catch (error: any) {
        console.error("Error confirming deposit:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not process your deposit automatically. An admin will review it shortly." });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="w-full max-w-2xl mx-auto h-96" />;
  }

  if (!deposit) {
    return <Card><CardHeader><CardTitle>Deposit Not Found</CardTitle></CardHeader></Card>;
  }

  if (deposit.status === 'awaiting_confirmation') {
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto w-fit p-3 rounded-full bg-secondary">
                    <Clock className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="mt-4">Deposit Awaiting Confirmation</CardTitle>
                <CardDescription>Your transfer has been noted. An administrator will review and approve your deposit shortly.</CardDescription>
            </CardHeader>
        </Card>
    );
  }
  
  if (deposit.status !== 'pending') {
    const isCompleted = deposit.status === 'approved';
    const isDeclinedOrExpired = deposit.status === 'declined' || deposit.status === 'expired';
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto w-fit p-3 rounded-full bg-secondary">
                    {isCompleted ? <CheckCircle className="h-10 w-10 text-green-500" /> : <AlertCircle className="h-10 w-10 text-destructive" />}
                </div>
                <CardTitle className="mt-4">Deposit {deposit.status}</CardTitle>
                 <CardDescription>
                    {isCompleted ? `Your balance has been credited with ${deposit.finalAmount || deposit.amount} ${deposit.crypto}.` : 'This deposit request has been closed.'}
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Deposit</CardTitle>
        <CardDescription>Send exactly {deposit.amount} {deposit.crypto} to the address below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive">
          <Hourglass className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            You must complete the transfer within the time limit. The request will expire if not completed.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground">Time Remaining</p>
            <CountdownDisplay targetDate={deposit.timerEnd} />
        </div>

        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Scan QR code or copy address</p>
          <div className="flex justify-center bg-white p-4 rounded-md w-fit mx-auto">
            <Image src={deposit.qrCodeUrl} alt="Deposit QR Code" width={200} height={200} />
          </div>
          <div className="relative p-3 bg-secondary rounded-md">
            <p className="text-sm break-all font-mono">{deposit.walletAddress}</p>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-2 -translate-y-1/2"
              onClick={() => copyToClipboard(deposit.walletAddress)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
           <p className="text-xs text-muted-foreground">Network: {deposit.chain}</p>
        </div>

        <div className="space-y-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        I Have Made The Transfer
                    </Button>
                </form>
            </Form>
            <p className="text-center text-xs text-muted-foreground">
                After you submit, your deposit will be automatically confirmed.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}


export default function DepositPage() {
    return <DepositPageContent />
}
