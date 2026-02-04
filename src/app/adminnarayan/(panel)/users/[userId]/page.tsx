// This is a new file
'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, doc, orderBy } from 'firebase/firestore';
import type { User, P2PAd, Trade, UserWallet, Deposit, Withdrawal } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { DefaultAvatar } from '@/components/icons';
import { AdCard } from '@/components/p2p/ad-card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, CheckCircle, Clock, DollarSign, Percent, FileText, User as UserIcon, UserCheck, KeyRound, Wallet, ArrowLeftRight } from 'lucide-react';
import { cn, toDate } from '@/lib/utils';
import Link from 'next/link';

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number | undefined }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-4">
            <div className="text-muted-foreground mt-1">{icon}</div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
            </div>
        </div>
    );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const { firestore } = useFirebase();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

  const userRef = useMemoFirebase(
    () => (firestore && userId ? doc(firestore, 'users', userId) : null),
    [firestore, userId]
  );
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);
  
  // Data queries
  const adsQuery = useMemoFirebase(() => (firestore && userId ? query(collection(firestore, "p2p_ads"), where("userId", "==", userId)) : null), [firestore, userId]);
  const walletsQuery = useMemoFirebase(() => (firestore && userId ? collection(firestore, `users/${userId}/wallets`) : null), [firestore, userId]);
  const depositsQuery = useMemoFirebase(() => (firestore && userId ? query(collection(firestore, `users/${userId}/deposits`), orderBy('createdAt', 'desc')) : null), [firestore, userId]);
  const withdrawalsQuery = useMemoFirebase(() => (firestore && userId ? query(collection(firestore, `users/${userId}/withdrawals`), orderBy('createdAt', 'desc')) : null), [firestore, userId]);
  
  const tradesAsBuyerQuery = useMemoFirebase(() => firestore && userId ? query(collection(firestore, 'trades'), where('buyerId', '==', userId), orderBy('createdAt', 'desc')) : null, [firestore, userId]);
  const tradesAsSellerQuery = useMemoFirebase(() => firestore && userId ? query(collection(firestore, 'trades'), where('sellerId', '==', userId), orderBy('createdAt', 'desc')) : null, [firestore, userId]);

  // Data hooks
  const { data: ads, isLoading: areAdsLoading } = useCollection<P2PAd>(adsQuery);
  const { data: wallets, isLoading: areWalletsLoading } = useCollection<UserWallet>(walletsQuery);
  const { data: deposits, isLoading: areDepositsLoading } = useCollection<Deposit>(depositsQuery);
  const { data: withdrawals, isLoading: areWithdrawalsLoading } = useCollection<Withdrawal>(withdrawalsQuery);
  const { data: buyerTrades, isLoading: buyerTradesLoading } = useCollection<Trade>(tradesAsBuyerQuery);
  const { data: sellerTrades, isLoading: sellerTradesLoading } = useCollection<Trade>(tradesAsSellerQuery);
  
  const allTrades = [...(buyerTrades || []), ...(sellerTrades || [])].sort((a,b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
  const isLoadingTrades = buyerTradesLoading || sellerTradesLoading;
  
  if (isUserLoading) {
    return <div className="space-y-6"><Skeleton className="h-48 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!user) {
    return <Card><CardHeader><CardTitle>User Not Found</CardTitle><CardDescription>The user with ID "{userId}" does not exist.</CardDescription></CardHeader></Card>;
  }

  const dobDate = toDate(user.dob);
  const createdDate = toDate(user.createdAt);
  const lastTradeDate = toDate(user.lastTradeAt);

  return (
    <>
        <div className="flex items-center mb-6">
             <h1 className="text-lg font-semibold md:text-2xl">User Details</h1>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <Avatar className="h-32 w-32 mb-4 border-4 border-secondary shadow-lg">
                            {user.photoURL ? <Image src={user.photoURL} alt={user.userId} width={128} height={128} className="object-cover"/> : <AvatarFallback className="bg-transparent"><DefaultAvatar /></AvatarFallback>}
                        </Avatar>
                        <h2 className="text-2xl font-bold">{user.userId}</h2>
                        <p className="text-muted-foreground">{user.fullName}</p>
                        <div className="flex gap-2 mt-4">
                            {user.isBanned && <Badge variant="destructive">Banned</Badge>}
                            {user.isOnHold && <Badge variant="secondary" className="bg-yellow-500 text-white">On Hold</Badge>}
                            {!user.isBanned && !user.isOnHold && <Badge className="bg-green-500">Active</Badge>}
                        </div>
                    </CardContent>
                </Card>
                <SectionCard title="User Information">
                     <div className="space-y-4">
                        <DetailItem icon={<UserIcon size={20} />} label="Full Name" value={user.fullName} />
                        <DetailItem icon={<UserCheck size={20} />} label="User ID" value={user.userId} />
                        {user.oldUserId && <DetailItem icon={<UserIcon size={20} />} label="Previous User ID" value={user.oldUserId} />}
                        <DetailItem icon={<Calendar size={20} />} label="Date of Birth" value={dobDate ? format(dobDate, "LLLL d, yyyy") : 'N/A'} />
                        <DetailItem icon={<Clock size={20} />} label="Member Since" value={createdDate ? `${format(createdDate, "PP")} (${formatDistanceToNow(createdDate)} ago)` : 'N/A'} />
                        <DetailItem icon={<DollarSign size={20} />} label="Preferred Currency" value={user.preferredCurrency || 'USD'} />
                        <DetailItem icon={<KeyRound size={20} />} label="Security Question" value={user.securityQuestion} />
                        <DetailItem icon={<KeyRound size={20} />} label="Security Answer" value={user.securityAnswer} />
                     </div>
                </SectionCard>
                 <SectionCard title="User Statistics">
                    <div className="space-y-4">
                        <DetailItem icon={<DollarSign size={20} />} label="Total Trade Volume" value={`$${parseFloat(user.tradeVolume).toLocaleString()}`} />
                        <DetailItem icon={<CheckCircle size={20} />} label="Completed Trades" value={user.completedTrades} />
                        <DetailItem icon={<Percent size={20} />} label="Positive Feedback" value={`${user.feedbackScore}%`} />
                        <DetailItem icon={<Clock size={20} />} label="Last Trade" value={lastTradeDate ? format(lastTradeDate, "PPpp") : 'No trades yet'} />
                    </div>
                </SectionCard>
            </div>
            <div className="lg:col-span-2 space-y-6">
                <SectionCard title="Wallets">
                    {areWalletsLoading ? <Skeleton className="h-24 w-full" /> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Available</TableHead><TableHead>Locked</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {wallets?.length ? wallets.map(w => <TableRow key={w.id}><TableCell>{w.crypto}</TableCell><TableCell>{w.balance.toFixed(8)}</TableCell><TableCell>{w.lockedBalance.toFixed(8)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={3} className="text-center">No wallets</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    )}
                </SectionCard>
                 <SectionCard title="Active Ads">
                    {areAdsLoading ? <Skeleton className="h-24 w-full" /> : (
                        <div className="space-y-4">
                            {ads?.length ? ads.map(ad => <AdCard key={ad.id} ad={ad} />) : <p className="text-center text-muted-foreground py-4">No active ads</p>}
                        </div>
                    )}
                </SectionCard>
                <SectionCard title="Trade History">
                     {isLoadingTrades ? <Skeleton className="h-48 w-full" /> : (
                         <Table>
                             <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Role</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                             <TableBody>
                                 {allTrades.length ? allTrades.map(t => (
                                     <TableRow key={t.id}>
                                         <TableCell className="font-mono text-xs">{t.tradeId}</TableCell>
                                         <TableCell><Badge variant={t.buyerId === userId ? 'default' : 'secondary'}>{t.buyerId === userId ? 'Buyer' : 'Seller'}</Badge></TableCell>
                                         <TableCell>{t.amount.toFixed(6)} {t.crypto}</TableCell>
                                         <TableCell><Badge variant="outline" className="capitalize">{t.status}</Badge></TableCell>
                                         <TableCell><Button asChild variant="outline" size="sm"><Link href={`/trade/${t.id}`}><ArrowLeftRight className="mr-2 h-3 w-3" />View</Link></Button></TableCell>
                                     </TableRow>
                                 )) : <TableRow><TableCell colSpan={5} className="text-center">No trades found</TableCell></TableRow>}
                             </TableBody>
                         </Table>
                     )}
                </SectionCard>
            </div>
        </div>
    </>
  );
}
