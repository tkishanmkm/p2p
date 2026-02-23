'use client';

import { useMemo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, where, limit, getDocs, orderBy } from 'firebase/firestore';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, ArrowUp, ArrowDown, AlertCircle, Copy } from 'lucide-react';
import { CryptoCurrency, User, UserWallet, CoinTransfer } from '@/lib/types';
import { CHAINS } from '@/lib/constants';
import { toDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const transferSchema = z.object({
  recipientUsername: z.string().min(3, 'Recipient User ID is required.'),
  crypto: z.string().min(1, 'Please select a cryptocurrency.'),
  chain: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  password: z.string().min(1, "Your password is required to authorize the transfer."),
}).superRefine((data, ctx) => {
  const cryptoChains = CHAINS[data.crypto as CryptoCurrency];
  if (cryptoChains && cryptoChains.length > 1 && !data.chain) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select a network.",
      path: ["chain"],
    });
  }
});


type TransferFormValues = z.infer<typeof transferSchema>;

function TransferHistoryTable({
  transfers,
  isLoading,
  type,
  currentUsername,
  onRowClick
}: {
  transfers: CoinTransfer[] | null;
  isLoading: boolean;
  type: 'sent' | 'received';
  currentUsername: string;
  onRowClick: (transfer: CoinTransfer) => void;
}) {
  if (isLoading) {
    return (
        <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
    );
  }
  if (!transfers || transfers.length === 0) {
      return (
        <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
            No {type} transfers yet.
        </div>
      );
  }
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
        {transfers?.map((t) => (
            <TableRow key={t.id} onClick={() => onRowClick(t)} className="cursor-pointer">
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
      </TableBody>
    </Table>
  );
}

export default function TransferPage() {
  const { firestore, user: authUser, isUserLoading: isAuthLoading, auth } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const [selectedTransfer, setSelectedTransfer] = useState<CoinTransfer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isAuthLoading, router]);

  const walletsRef = useMemoFirebase(() => (authUser ? collection(firestore, 'users', authUser.uid, 'wallets') : null), [authUser, firestore]);
  const { data: wallets } = useCollection<UserWallet>(walletsRef);

  const aggregatedWallets = useMemo(() => {
    if (!wallets) return [];
    const summary = wallets.reduce((acc, wallet) => {
        if (!acc[wallet.crypto]) {
            acc[wallet.crypto] = { balance: 0, chains: [] };
        }
        acc[wallet.crypto].balance += wallet.balance || 0;
        acc[wallet.crypto].chains.push(wallet.chain);
        return acc;
    }, {} as Record<string, { balance: number, chains: string[] }>);

    return Object.entries(summary).map(([crypto, data]) => ({
        crypto: crypto as CryptoCurrency,
        balance: data.balance,
        chains: data.chains
    }));
  }, [wallets]);


  const sentQuery = useMemoFirebase(() => (authUser ? query(collection(firestore, 'transfers'), where('senderId', '==', authUser.uid), orderBy('createdAt', 'desc')) : null), [firestore, authUser]);
  const { data: sentTransfers, isLoading: isLoadingSent } = useCollection<CoinTransfer>(sentQuery);

  const receivedQuery = useMemoFirebase(() => (authUser ? query(collection(firestore, 'transfers'), where('recipientId', '==', authUser.uid), orderBy('createdAt', 'desc')) : null), [firestore, authUser]);
  const { data: receivedTransfers, isLoading: isLoadingReceived } = useCollection<CoinTransfer>(receivedQuery);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      password: ""
    }
  });

  const selectedCrypto = form.watch('crypto') as CryptoCurrency;
  const selectedChain = form.watch('chain');
  const chainsForSelectedCrypto = useMemo(() => CHAINS[selectedCrypto] || [], [selectedCrypto]);
  const showChainSelector = chainsForSelectedCrypto.length > 1;

  const availableBalanceForForm = useMemo(() => {
    if (!selectedCrypto) return 0;
    if (!showChainSelector) {
        return aggregatedWallets.find(w => w.crypto === selectedCrypto)?.balance || 0;
    }
    if (selectedChain) {
        return wallets?.find(w => w.crypto === selectedCrypto && w.chain === selectedChain)?.balance || 0;
    }
    // If chain is not selected for multi-chain asset, show total
    return aggregatedWallets.find(w => w.crypto === selectedCrypto)?.balance || 0;
  }, [selectedCrypto, selectedChain, showChainSelector, aggregatedWallets, wallets]);

  
  const recipientUsernameValue = form.watch('recipientUsername');

  useEffect(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    if (recipientUsernameValue && recipientUsernameValue.length >= 2) {
      setIsSearching(true);
      const timeout = setTimeout(async () => {
        if (!firestore) return;
        const usersRef = collection(firestore, 'users');
        const q = query(
          usersRef,
          where('userId', '>=', recipientUsernameValue),
          where('userId', '<=', recipientUsernameValue + '\uf8ff'),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as User)).filter(u => u.id !== authUser?.uid && !u.isAdminAccount);
        setSearchResults(users);
        setIsSearching(false);
      }, 500); // 500ms debounce
      setDebounceTimeout(timeout as any);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientUsernameValue, firestore, authUser]);


  async function onSubmit(values: TransferFormValues) {
    if (!firestore || !authUser || !auth) return;
    setIsProcessing(true);

    const balanceToCheck = availableBalanceForForm;
    if (values.amount > balanceToCheck) {
      form.setError('amount', {
        type: 'manual',
        message: 'Amount exceeds available balance for selected network.',
      });
      setIsProcessing(false);
      return;
    }

    // Pre-flight check for recipient status
    try {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where("userId", "==", values.recipientUsername), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            form.setError("recipientUsername", { type: 'manual', message: "Recipient user not found." });
            setIsProcessing(false);
            return;
        }
        const recipientData = snapshot.docs[0].data() as User;
        if (recipientData.isBanned || recipientData.isOnHold) {
            form.setError("recipientUsername", { type: 'manual', message: `Cannot transfer. User is ${recipientData.isBanned ? 'banned' : 'on hold'}.`});
            setIsProcessing(false);
            return;
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Validation Error', description: e.message });
        setIsProcessing(false);
        return;
    }

    try {
      if (!auth.currentUser || !auth.currentUser.email) {
        throw new Error("Could not verify your identity.");
      }
      const credential = EmailAuthProvider.credential(auth.currentUser.email, values.password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      const chainToSendFrom = values.chain || chainsForSelectedCrypto[0];

      const transferId = await sendCoinToUser(
        firestore,
        { uid: authUser.uid, displayName: authUser.displayName },
        values.recipientUsername,
        values.crypto as CryptoCurrency,
        chainToSendFrom,
        values.amount
      );
      toast({
        title: 'Transfer Successful!',
        description: `Sent ${values.amount} ${values.crypto} to ${values.recipientUsername}. ID: ${transferId}`,
      });
      form.reset({
          recipientUsername: '',
          crypto: '',
          chain: '',
          amount: undefined,
          password: ''
      });
      setSearchResults([]);

    } catch (error: any) {
        if (error.code === 'auth/wrong-password') {
            form.setError("password", { type: 'manual', message: "The password you entered is incorrect." });
        } else {
             console.error('Transfer failed:', error);
             toast({
                variant: 'destructive',
                title: 'Transfer Failed',
                description: error.message,
            });
        }
    } finally {
        setIsProcessing(false);
    }
  }

  const handleRowClick = (transfer: CoinTransfer) => {
    setSelectedTransfer(transfer);
    setIsDetailsOpen(true);
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

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
                        <Input placeholder="Enter user ID to search" {...field} autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {(isSearching || searchResults.length > 0) && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                        {isSearching && <div className="p-2 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Searching...</div>}
                        {!isSearching && searchResults.length > 0 && (
                            <>
                                {searchResults.map(user => (
                                <div 
                                    key={user.id} 
                                    className="p-2 flex items-center gap-2 cursor-pointer hover:bg-muted"
                                    onClick={() => {
                                    form.setValue('recipientUsername', user.userId);
                                    setSearchResults([]);
                                    }}
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.photoURL} />
                                        <AvatarFallback>{user.userId.slice(0,2)}</AvatarFallback>
                                    </Avatar>
                                    <span>{user.userId}</span>
                                </div>
                                ))}
                            </>
                        )}
                    </div>
                 )}
                <FormField
                  control={form.control}
                  name="crypto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coin to Send</FormLabel>
                      <Select
                        onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('chain', undefined); // Reset chain on crypto change
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a coin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {aggregatedWallets && aggregatedWallets.length > 0 ? (
                            aggregatedWallets
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
                
                {showChainSelector && (
                    <FormField
                        control={form.control}
                        name="chain"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Network</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a network" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {chainsForSelectedCrypto.map(chain => {
                                            const chainBalance = wallets?.find(w => w.crypto === selectedCrypto && w.chain === chain)?.balance || 0;
                                            return (
                                                <SelectItem key={chain} value={chain} disabled={chainBalance <= 0}>
                                                    <div className="flex justify-between w-full">
                                                        <span>{chain}</span>
                                                        <span className="text-muted-foreground">{chainBalance.toFixed(6)}</span>
                                                    </div>
                                                </SelectItem>
                                            )
                                        })}
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
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                        <FormDescription>
                          Available: {availableBalanceForForm.toFixed(8)}{' '}
                          {selectedCrypto} {selectedChain && `(${selectedChain})`}
                        </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password to confirm" {...field} />
                      </FormControl>
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
                  disabled={isProcessing}
                >
                  {isProcessing && (
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
                  transfers={receivedTransfers}
                  isLoading={isLoadingReceived}
                  type="received"
                  currentUsername={authUser?.displayName || ''}
                  onRowClick={handleRowClick}
                />
              </TabsContent>
              <TabsContent value="sent" className="mt-4">
                <TransferHistoryTable
                  transfers={sentTransfers}
                  isLoading={isLoadingSent}
                  type="sent"
                  currentUsername={authUser?.displayName || ''}
                  onRowClick={handleRowClick}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

       <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Transfer Details</DialogTitle>
                <DialogDescription>Public ID: {selectedTransfer?.publicId}</DialogDescription>
            </DialogHeader>
            {selectedTransfer && (
                 <div className="space-y-4 py-4 text-sm">
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">System ID</span><div className="flex items-center gap-2"><span className="font-mono text-xs">{selectedTransfer.id}</span><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(selectedTransfer.id!)}><Copy className="h-3 w-3" /></Button></div></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Sender</span><span className="font-medium">{selectedTransfer.senderUsername}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Recipient</span><span className="font-medium">{selectedTransfer.recipientUsername}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Amount</span><Badge variant="outline">{selectedTransfer.amount.toFixed(8)} {selectedTransfer.crypto}</Badge></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Date</span><span className="font-medium">{toDate(selectedTransfer.createdAt)?.toLocaleString()}</span></div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}