"use client";

import { useState } from "react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CryptoDepositAddress, CryptoCurrency } from "@/lib/types";
import { CHAINS, SUPPORTED_CRYPTOS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const addressSchema = z.object({
  crypto: z.string().min(1),
  chain: z.string().min(1),
  address: z.string().min(1, "Address is required."),
  qrCodeUrl: z.string().url("Must be a valid URL."),
});

type AddressFormValues = z.infer<typeof addressSchema>;

export default function WalletSettingsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableChains, setAvailableChains] = useState<string[]>([]);

  const addressesQuery = useMemoFirebase(() => firestore ? collection(firestore, "crypto_deposit_addresses") : null, [firestore]);
  const { data: addresses, isLoading: areAddressesLoading } = useCollection<CryptoDepositAddress>(addressesQuery);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
  });

  const handleCryptoChange = (value: CryptoCurrency) => {
    form.setValue("crypto", value);
    setAvailableChains(CHAINS[value] || []);
    form.setValue("chain", "");
  };

  const onSubmit = async (values: AddressFormValues) => {
    if (!firestore) return;
    setIsLoading(true);
    try {
      const id = `${values.crypto}-${values.chain}`;
      const addressRef = doc(firestore, "crypto_deposit_addresses", id);
      await setDoc(addressRef, { id, ...values });
      toast({ title: "Address Saved", description: "The deposit address has been updated." });
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Are you sure you want to delete this address?")) return;
    try {
      await deleteDoc(doc(firestore, "crypto_deposit_addresses", id));
      toast({ title: "Address Deleted" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete address." });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Wallet Settings</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Address</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add/Edit Deposit Address</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="crypto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crypto</FormLabel>
                      <Select onValueChange={(v) => handleCryptoChange(v as CryptoCurrency)} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger></FormControl>
                        <SelectContent>{SUPPORTED_CRYPTOS.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="chain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chain</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableChains.length === 0}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select chain" /></SelectTrigger></FormControl>
                        <SelectContent>{availableChains.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
                      <FormLabel>Deposit Address</FormLabel>
                      <FormControl><Input placeholder="bc1..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="qrCodeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>QR Code Image URL</FormLabel>
                      <FormControl><Input placeholder="https://example.com/qr.png" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Address
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Deposit Addresses</CardTitle>
          <CardDescription>These are the addresses users will be shown when they make a deposit.</CardDescription>
        </CardHeader>
        <CardContent>
          {areAddressesLoading && <p>Loading...</p>}
          {!areAddressesLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crypto</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addresses?.map(addr => (
                  <TableRow key={addr.id}>
                    <TableCell className="font-semibold">{addr.crypto}</TableCell>
                    <TableCell>{addr.chain}</TableCell>
                    <TableCell className="font-mono text-xs">{addr.address}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(addr.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           {!areAddressesLoading && !addresses?.length && (
            <p className="text-center text-muted-foreground py-8">No addresses configured.</p>
           )}
        </CardContent>
      </Card>
    </>
  );
}
