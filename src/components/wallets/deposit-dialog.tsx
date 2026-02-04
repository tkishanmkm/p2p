"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { add, set } from "date-fns";
import { useFirebase } from "@/firebase";
import { addDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { CryptoCurrency, CryptoDepositAddress, Deposit } from "@/lib/types";
import { SUPPORTED_CRYPTOS, CHAINS } from "@/lib/constants";

const depositSchema = z.object({
  crypto: z.string().min(1, "Please select a cryptocurrency."),
  chain: z.string().min(1, "Please select a network chain."),
  amount: z.coerce.number().positive("Amount must be positive."),
});

type DepositFormValues = z.infer<typeof depositSchema>;

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepositDialog({ open, onOpenChange }: DepositDialogProps) {
  const router = useRouter();
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableChains, setAvailableChains] = useState<string[]>([]);

  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
  });
  
  const selectedCrypto = form.watch("crypto") as CryptoCurrency;

  const handleCryptoChange = (value: CryptoCurrency) => {
    form.setValue("crypto", value);
    setAvailableChains(CHAINS[value] || []);
    form.setValue("chain", "");
  };

  async function onSubmit(values: DepositFormValues) {
    if (!firestore || !user) return;
    setIsLoading(true);

    try {
      // 1. Find the admin-set deposit address for the selected crypto and chain
      const addressQuery = query(
        collection(firestore, "crypto_deposit_addresses"),
        where("crypto", "==", values.crypto),
        where("chain", "==", values.chain)
      );
      const addressSnapshot = await getDocs(addressQuery);
      
      if (addressSnapshot.empty) {
        throw new Error(`No deposit address configured for ${values.crypto} on ${values.chain}. Please contact support.`);
      }
      const depositAddressDoc = addressSnapshot.docs[0].data() as CryptoDepositAddress;
      
      // 2. Create a new deposit document for the user in the top-level 'deposits' collection
      const depositsRef = collection(firestore, "deposits");
      const newDepositData: Omit<Deposit, "id"> = {
        userId: user.uid,
        userDisplayName: user.displayName || 'Unknown',
        crypto: values.crypto as CryptoCurrency,
        chain: values.chain,
        amount: values.amount,
        walletAddress: depositAddressDoc.address,
        qrCodeUrl: depositAddressDoc.qrCodeUrl,
        status: 'pending',
        timerEnd: add(new Date(), { minutes: 181 }).toISOString(),
        createdAt: new Date().toISOString(), // This will be replaced by server timestamp
      };

      const docRef = await addDoc(depositsRef, {
        ...newDepositData,
        createdAt: serverTimestamp()
      });
      
      toast({ title: "Deposit Initiated", description: "Redirecting to deposit page..." });
      router.push(`/deposit/${docRef.id}`);

    } catch (error: any) {
      console.error("Deposit failed:", error);
      toast({ variant: "destructive", title: "Deposit Failed", description: error.message });
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Initiate Crypto Deposit</DialogTitle>
          <DialogDescription>
            Select the asset and amount you wish to deposit into your wallet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="crypto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cryptocurrency</FormLabel>
                  <Select onValueChange={(value) => handleCryptoChange(value as CryptoCurrency)} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUPPORTED_CRYPTOS.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {availableChains.length > 0 && (
                 <FormField
                  control={form.control}
                  name="chain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Network/Chain</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Initiating..." : "Proceed to Deposit"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
