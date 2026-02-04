"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useFirebase, useDoc } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useCountdown } from "@/hooks/use-countdown";
import type { Deposit } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Copy, Hourglass, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";

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
  const { firestore, user } = useFirebase();
  const depositId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const depositRef = firestore && user ? doc(firestore, "users", user.uid, "deposits", depositId) : null;
  const { data: deposit, isLoading } = useDoc<Deposit>(depositRef);

  const form = useForm({
    defaultValues: { txId: "" },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Address copied to clipboard." });
  };
  
  const onSubmit = async (values: { txId: string }) => {
    if (!depositRef) return;
    setIsSubmitting(true);
    try {
        // We only update the txId. The status remains 'pending' for the admin to review.
        await updateDoc(depositRef, { txId: values.txId || "" });
        toast({ title: "Confirmation Received", description: "Your deposit is pending review by an administrator. You will be notified upon approval." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "Could not save your confirmation." });
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
  
  if (deposit.status !== 'pending') {
    const isCompleted = deposit.status === 'approved';
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto w-fit p-3 rounded-full bg-secondary">
                    {isCompleted ? <CheckCircle className="h-10 w-10 text-green-500" /> : <AlertCircle className="h-10 w-10 text-destructive" />}
                </div>
                <CardTitle className="mt-4">Deposit {deposit.status}</CardTitle>
                <CardDescription>This deposit request is now closed.</CardDescription>
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
                                <Input {...field} placeholder="Enter Transaction Hash (Optional)" />
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
                After you submit, your deposit will be reviewed. You will be notified once it's approved.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}


export default function DepositPage() {
    return <DepositPageContent />
}
