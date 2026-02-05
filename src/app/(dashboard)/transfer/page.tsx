
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { sendCoinToUser } from '@/lib/wallet';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Send, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { CryptoCurrency, UserWallet, CoinTransfer } from '@/lib/types';
import { SUPPORTED_CRYPTOS } from '@/lib/constants';
import { toDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

const transferSchema = z.object({
  recipientUsername: z.string().min(3, 'Recipient User ID is required.'),
  crypto: z.string().min(1, 'Please select a cryptocurrency.'),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
});

type TransferFormValues = z.infer<typeof transferSchema>;

function TransferHistoryTable({
  transfers,
  isLoading,
  type,
  currentUsername,
}: {
  transfers: CoinTransfer[] | null;
  isLoading: boolean;
  type: 'sent' | 'received';
  currentUsername: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>{type === 'sent' ? 'Recipient' : 'Sender'}</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
          <TableRow>
            <TableCell colSpan={4}>
              <Skeleton className="h-10 w-full" />
            </TableCell>
          </TableRow>
        )}
        {!isLoading &&
          transfers?.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono text-xs">{t.publicId}</TableCell>
              <TableCell>
                {type === 'sent' ? t.recipientUsername : t.senderUsername}
              </TableCell>
              <TableCell className="font-medium">
                {t.amount.toFixed(8)} {t.crypto}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {toDate(t.createdAt)?.toLocaleString() ?? 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        {!isLoading && (!transfers || transfers.length === 0) && (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
              No {type} transfers yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default function TransferPage() {
  const { firestore, user: authUser, isUserLoading: isAuthLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isAuthLoading, router]);

  const walletsRef = useMemoFirebase(() => (authUser ? collection(firestore, 'users', authUser.uid, 'wallets') : null), [authUser, firestore]);
  const { data: wallets } = useCollection<UserWallet>(walletsRef);

  // Original queries without ordering
  const sentQuery = useMemoFirebase(() => (authUser ? query(collection(firestore, 'transfers'), where('senderId', '==', authUser.uid)) : null), [firestore, authUser]);
  const { data: sentTransfers, isLoading: isLoadingSent } = useCollection<CoinTransfer>(sentQuery);

  const receivedQuery = useMemoFirebase(() => (authUser ? query(collection(firestore, 'transfers'), where('recipientId', '==', authUser.uid)) : null), [firestore, authUser]);
  const { data: receivedTransfers, isLoading: isLoadingReceived } = useCollection<CoinTransfer>(receivedQuery);

  // State for sorted data
  const [sortedSent, setSortedSent] = useState<CoinTransfer[] | null>(null);
  const [sortedReceived, setSortedReceived] = useState<CoinTransfer[] | null>(null);

  // Effect for sorting sent transfers
  useEffect(() => {
    if (sentTransfers) {
      const sorted = [...sentTransfers].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
      setSortedSent(sorted);
    }
  }, [sentTransfers]);

  // Effect for sorting received transfers
  useEffect(() => {
    if (receivedTransfers) {
      const sorted = [...receivedTransfers].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
      setSortedReceived(sorted);
    }
  }, [receivedTransfers]);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
  });

  const selectedCrypto = form.watch('crypto') as CryptoCurrency;
  const selectedWallet = wallets?.find((w) => w.crypto === selectedCrypto);

  async function onSubmit(values: TransferFormValues) {
    if (!firestore || !authUser) return;

    if (selectedWallet && values.amount > selectedWallet.balance) {
      form.setError('amount', {
        type: 'manual',
        message: 'Amount exceeds available balance.',
      });
      return;
    }

    try {
      const transferId = await sendCoinToUser(
        firestore,
        { uid: authUser.uid, displayName: authUser.displayName },
        values.recipientUsername,
        values.crypto as CryptoCurrency,
        values.amount
      );
      toast({
        title: 'Transfer Successful!',
        description: `Sent ${values.amount} ${values.crypto} to ${values.recipientUsername}. ID: ${transferId}`,
      });
      form.reset();
    } catch (error: any) {
      console.error('Transfer failed:', error);
      toast({
        variant: 'destructive',
        title: 'Transfer Failed',
        description: error.message,
      });
    }
  }

  if (isAuthLoading || !authUser) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Transfer Coins</h1>
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Send to User</CardTitle>
            <CardDescription>
              Directly send coins to another user on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="recipientUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient's User ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter user ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="crypto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coin to Send</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a coin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wallets && wallets.length > 0 ? (
                            wallets
                              .filter((w) => w.balance > 0)
                              .map((w) => (
                                <SelectItem key={w.crypto} value={w.crypto}>
                                  <div className="flex justify-between w-full">
                                    <span>{w.crypto}</span>
                                    <span className="text-muted-foreground">
                                      {w.balance.toFixed(6)}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                          ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">No wallets with balance.</div>
                          )}
                        </SelectContent>
                      </Select>
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
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      {selectedWallet && (
                        <FormDescription>
                          Available: {selectedWallet.balance.toFixed(8)}{' '}
                          {selectedWallet.crypto}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                        Transfers are final and cannot be reversed. Double-check the recipient's User ID before sending.
                    </AlertDescription>
                </Alert>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send Coins
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Transfer History</CardTitle>
            <CardDescription>
              A record of your user-to-user transfers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="received">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="received">
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Received
                </TabsTrigger>
                <TabsTrigger value="sent">
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Sent
                </TabsTrigger>
              </TabsList>
              <TabsContent value="received" className="mt-4">
                <TransferHistoryTable
                  transfers={sortedReceived}
                  isLoading={isLoadingReceived}
                  type="received"
                  currentUsername={authUser?.displayName || ''}
                />
              </TabsContent>
              <TabsContent value="sent" className="mt-4">
                <TransferHistoryTable
                  transfers={sortedSent}
                  isLoading={isLoadingSent}
                  type="sent"
                  currentUsername={authUser?.displayName || ''}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
