
"use client";

import { useState } from "react";
import { useFirebase } from "@/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  FormDescription,
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
import { CryptoCurrency, UserWallet } from "@/lib/types";
import { CHAINS } from "@/lib/constants";
import { requestWithdrawal } from "@/lib/wallet";

const withdrawSchema = z.object({
  crypto: z.string().min(1, "Please select a cryptocurrency."),
  chain: z.string().min(1, "Please select a network chain."),
  amount: z.coerce.number().positive("Amount must be positive."),
  address: z.string().min(10, "Please enter a valid withdrawal address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type WithdrawFormValues = z.infer<typeof withdrawSchema>;

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userWallets: UserWallet[];
}

export function WithdrawDialog({ open, onOpenChange, userWallets }: WithdrawDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableChains, setAvailableChains] = useState<string[]>([]);

  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
  });

  const selectedCrypto = form.watch("crypto") as CryptoCurrency;
  const selectedWallet = userWallets.find(w => w.crypto === selectedCrypto);

  const handleCryptoChange = (value: CryptoCurrency) => {
    form.setValue("crypto", value);
    setAvailableChains(CHAINS[value] || []);
    form.setValue("chain", "");
    form.clearErrors("amount");
  };

  async function onSubmit(values: WithdrawFormValues) {
    if (!firestore || !user) return;

    if (selectedWallet && values.amount > selectedWallet.balance) {
      form.setError("amount", {
        type: "manual",
        message: "Withdrawal amount cannot exceed your available balance.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await requestWithdrawal(firestore, user, values);
      toast({ title: "Withdrawal Requested", description: "Your request has been submitted for review." });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Withdrawal failed:", error);
      toast({ variant: "destructive", title: "Withdrawal Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Crypto Withdrawal</DialogTitle>
          <DialogDescription>
            Enter the details below to withdraw funds to an external wallet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      {userWallets.filter(w => w.balance > 0).map(w => (
                        <SelectItem key={w.crypto} value={w.crypto}>
                          <div className="flex justify-between w-full">
                            <span>{w.crypto}</span>
                            <span className="text-muted-foreground">{w.balance.toFixed(6)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCrypto && (
              <FormField
                control={form.control}
                name="chain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Network/Chain</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableChains.length === 0}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger></FormControl>
                      <SelectContent>{availableChains.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Withdrawal Address</FormLabel>
                  <FormControl><Input placeholder="Enter destination address" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount {selectedCrypto ? `in ${selectedCrypto}` : ''}</FormLabel>
                  <FormControl><Input type="number" step="any" placeholder="0.00" {...field} /></FormControl>
                  {selectedWallet && <FormDescription>Available balance: {selectedWallet.balance.toFixed(8)} {selectedWallet.crypto}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Enter your password for verification" {...field} /></FormControl>
                   <FormDescription>For security, please confirm your password.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Submitting..." : "Submit Withdrawal Request"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
