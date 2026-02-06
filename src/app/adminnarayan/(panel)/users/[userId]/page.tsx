
'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, orderBy, documentId, limit } from 'firebase/firestore';
import type { User, P2PAd, Trade, UserWallet, Deposit, Withdrawal, AdminLog, Session } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AdjustBalanceDialog } from '@/components/admin/adjust-balance-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { DefaultAvatar } from '@/components/icons';
import { AdCard } from '@/components/p2p/ad-card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SlidersHorizontal, Calendar, CheckCircle, Clock, DollarSign, FileText, User as UserIcon, UserCheck, KeyRound, Wallet, ArrowLeftRight, ThumbsUp, ThumbsDown, Globe, Smartphone, Monitor } from 'lucide-react';
import { cn, toDate } from '@/lib/utils';
import Link from 'next/link';
import { useAdminStatus } from '@/hooks/use-admin-status';
import { useToast } from '@/hooks/use-toast';
import { adminUnblockUser } from '@/lib/admin';
import { countries } from '@/lib/countries';
import { FlagIcon } from '@/components/ui/flag-icon';

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number | undefined }) {
    if (!value && value !== 0) return null;
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
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus();
  const [isAdjustBalanceOpen, setIsAdjustBalanceOpen] = useState(false);
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const { toast } = useToast();

  const userRef = useMemoFirebase(
    () => (firestore && userId ? doc(firestore, 'users', userId) : null),
    [firestore, userId]
  );
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);
  
  // Data states
  const [ads, setAds] = useState<P2PAd[] | null>(null);
  const [wallets, setWallets] = useState<UserWallet[] | null>(null);
  const [deposits, setDeposits] = useState<Deposit[] | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[] | null>(null);
  const [allTrades, setAllTrades] = useState<Trade[] | null>(null);
  const [adminLogs, setAdminLogs] = useState<AdminLog[] | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<User[] | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  
  // Loading states
  const [areAdsLoading, setAreAdsLoading] = useState(true);
  const [areWalletsLoading, setAreWalletsLoading] = useState(true);
  const [areDepositsLoading, setAreDepositsLoading] = useState(true);
  const [areWithdrawalsLoading, setAreWithdrawalsLoading] = useState(true);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  const [areLogsLoading, setAreLogsLoading] = useState(true);
  const [areBlockedUsersLoading, setAreBlockedUsersLoading] = useState(true);
  const [areSessionsLoading, setAreSessionsLoading] = useState(true);


  useEffect(() => {
    if (!isAdmin || !firestore || !userId) {
      if (!isAdminLoading) { // Only set loading to false if we are sure the user is not an admin
          setAreAdsLoading(false);
          setAreWalletsLoading(false);
          setAreDepositsLoading(false);
          setAreWithdrawalsLoading(false);
          setIsLoadingTrades(false);
          setAreLogsLoading(false);
          setAreSessionsLoading(false);
      }
      return;
    };

    const fetchAllData = async () => {
      // Ads
      try {
        const adsQuery = query(collection(firestore, "p2p_ads"), where("userId", "==", userId));
        const adsSnapshot = await getDocs(adsQuery);
        setAds(adsSnapshot.docs.map(d => ({...d.data(), id: d.id } as P2PAd)));
      } catch (e) { console.error("Failed to fetch ads", e); setAds([]); }
      finally { setAreAdsLoading(false); }

      // Wallets
      try {
        const walletsQuery = query(collection(firestore, `users/${userId}/wallets`));
        const walletsSnapshot = await getDocs(walletsQuery);
        setWallets(walletsSnapshot.docs.map(d => ({...d.data(), id: d.id } as UserWallet)));
      } catch (e) { console.error("Failed to fetch wallets", e); setWallets([]); }
      finally { setAreWalletsLoading(false); }
      
      // Deposits
      try {
        const depositsQuery = query(collection(firestore, "deposits"), where("userId", "==", userId));
        const depositsSnapshot = await getDocs(depositsQuery);
        const depositsData = depositsSnapshot.docs.map(d => ({...d.data(), id: d.id } as Deposit));
        depositsData.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
        setDeposits(depositsData);
      } catch (e) { console.error("Failed to fetch deposits", e); setDeposits([]); }
      finally { setAreDepositsLoading(false); }
      
      // Withdrawals
      try {
        const withdrawalsQuery = query(collection(firestore, `users/${userId}/withdrawals`), orderBy('createdAt', 'desc'));
        const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
        setWithdrawals(withdrawalsSnapshot.docs.map(d => ({...d.data(), id: d.id } as Withdrawal)));
      } catch (e) { console.error("Failed to fetch withdrawals", e); setWithdrawals([]); }
      finally { setAreWithdrawalsLoading(false); }

      // Trades
      try {
        const tradesAsBuyerQuery = query(collection(firestore, 'trades'), where('buyerId', '==', userId));
        const tradesAsSellerQuery = query(collection(firestore, 'trades'), where('sellerId', '==', userId));
        
        const [buyerSnapshot, sellerSnapshot] = await Promise.all([
          getDocs(tradesAsBuyerQuery),
          getDocs(tradesAsSellerQuery)
        ]);

        const buyerTrades = buyerSnapshot.docs.map(d => ({...d.data(), id: d.id} as Trade));
        const sellerTrades = sellerSnapshot.docs.map(d => ({...d.data(), id: d.id} as Trade));
        
        const combined = [...buyerTrades, ...sellerTrades];
        const uniqueTrades = Array.from(new Map(combined.map(trade => [trade.id, trade])).values());
        uniqueTrades.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
        setAllTrades(uniqueTrades);
      } catch (e) { console.error("Failed to fetch trades", e); setAllTrades([]); }
      finally { setIsLoadingTrades(false); }

      // Admin Logs
      try {
        const logsQuery = query(collection(firestore, 'admin_logs'), where('targetId', '==', userId));
        const logsSnapshot = await getDocs(logsQuery);
        const logsData = logsSnapshot.docs.map(d => ({...d.data(), id: d.id } as AdminLog));
        logsData.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
        setAdminLogs(logsData);
      } catch(e) { console.error("failed to fetch admin logs", e); setAdminLogs([]); }
      finally { setAreLogsLoading(false); }
      
      // Session History
      try {
        const sessionsQuery = query(collection(firestore, `users/${userId}/sessions`), orderBy('lastLogin', 'desc'), limit(10));
        const sessionsSnapshot = await getDocs(sessionsQuery);
        setSessions(sessionsSnapshot.docs.map(d => ({...d.data(), id: d.id } as Session)));
      } catch(e) { console.error("failed to fetch sessions", e); setSessions([]); }
      finally { setAreSessionsLoading(false); }
    };

    fetchAllData();
  }, [firestore, userId, isAdmin, isAdminLoading]);
  
  useEffect(() => {
    if (!user || !firestore) {
      setAreBlockedUsersLoading(false);
      return;
    }

    const fetchBlockedUsers = async () => {
      if (user.blockedUsers && user.blockedUsers.length > 0) {
        setAreBlockedUsersLoading(true);
        try {
          const blockedUsersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', user.blockedUsers));
          const blockedUsersSnapshot = await getDocs(blockedUsersQuery);
          setBlockedUsers(blockedUsersSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as User)));
        } catch (e) {
          console.error("Failed to fetch blocked users", e);
          setBlockedUsers([]);
        } finally {
          setAreBlockedUsersLoading(false);
        }
      } else {
        setBlockedUsers([]);
        setAreBlockedUsersLoading(false);
      }
    };
    fetchBlockedUsers();
  }, [user, firestore]);

  const handleAdminUnblock = async (targetUserId: string, targetUsername: string) => {
    if (!firestore || !user) return;
    if (!confirm(`Are you sure you want to force ${user.userId} to unblock ${targetUsername}?`)) return;

    try {
      await adminUnblockUser(firestore, user.id, targetUserId);
      toast({ title: 'User Unblocked', description: `${targetUsername} has been removed from ${user.userId}'s block list.` });
      setBlockedUsers(current => current?.filter(u => u.id !== targetUserId) || null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not unblock the user.' });
    }
  };

  const isLoading = isUserLoading || isAdminLoading;
  
  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-48 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!user) {
    return <Card><CardHeader><CardTitle>User Not Found</CardTitle><CardDescription>The user with ID "{userId}" does not exist.</CardDescription></CardHeader></Card>;
  }
  
  const getCountryName = (code?: string) => code ? countries.find(c => c.code === code)?.name : 'N/A';

  const dobDate = toDate(user.dob);
  const createdDate = toDate(user.createdAt);
  const lastTradeDate = toDate(user.lastTradeAt);

  return (
    <>
        <AdjustBalanceDialog 
            open={isAdjustBalanceOpen} 
            onOpenChange={setIsAdjustBalanceOpen}
            userId={user.id}
            userDisplayName={user.userId}
        />
        <div className="flex items-center justify-between mb-6">
             <h1 className="text-lg font-semibold md:text-2xl">User Details</h1>
             <Button onClick={() => setIsAdjustBalanceOpen(true)}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Manage Wallet Balance
             </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <Avatar className="h-32 w-32 mb-4 border-4 border-secondary shadow-lg">
                            {user.photoURL ? <Image src={user.photoURL} alt={user.userId} width={128} height={128} className="object-cover"/> : <AvatarFallback className="bg-transparent"><DefaultAvatar /></AvatarFallback>}
                        </Avatar>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold">{user.userId}</h2>
                            {user.country && <FlagIcon countryCode={user.country} className="w-6 h-auto" />}
                        </div>
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
                        <DetailItem icon={<Globe size={20} />} label="Origin Country" value={getCountryName(user.country)} />
                        <DetailItem icon={<Globe size={20} />} label="IP-Based Country" value={getCountryName(user.ipBasedCountry)} />
                        <DetailItem icon={<Clock size={20} />} label="Member Since" value={createdDate ? `${format(createdDate, "PP")} (${formatDistanceToNow(createdDate)} ago)` : 'N/A'} />
                        <DetailItem icon={<DollarSign size={20} />} label="Preferred Currency" value={user.preferredCurrency || 'USD'} />
                        <DetailItem icon={<KeyRound size={20} />} label="Security Question" value={user.securityQuestion} />
                        <DetailItem icon={<KeyRound size={20} />} label="Security Answer" value={user.securityAnswer} />
                     </div>
                </SectionCard>
                 <SectionCard title="User Statistics">
                    <div className="space-y-4">
                        <DetailItem icon={<DollarSign size={20} />} label="Total Trade Volume" value={`$${user.tradeVolume.toLocaleString()}`} />
                        <DetailItem icon={<CheckCircle size={20} />} label="Completed Trades" value={user.completedTrades} />
                        <DetailItem icon={<ThumbsUp size={20} />} label="Positive Feedback" value={user.positiveFeedback || 0} />
                        <DetailItem icon={<ThumbsDown size={20} />} label="Negative Feedback" value={user.negativeFeedback || 0} />
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
                <SectionCard title="Session History">
                    {areSessionsLoading ? <Skeleton className="h-24 w-full" /> : (
                        <div className="space-y-2">
                           {sessions?.length ? sessions.map(session => {
                                const isMobile = /Mobi|Android/i.test(session.userAgent);
                                return (
                                    <div key={session.id} className="flex items-start gap-4 p-2 border-b last:border-b-0">
                                        {isMobile ? <Smartphone className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" /> : <Monitor className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />}
                                        <div>
                                            <p className="text-sm font-medium leading-none">{session.ipAddress}</p>
                                            <p className="text-xs text-muted-foreground break-all">{session.userAgent}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{toDate(session.lastLogin) ? formatDistanceToNow(toDate(session.lastLogin)!) + ' ago' : 'N/A'}</p>
                                        </div>
                                    </div>
                                )
                           }) : <p className="text-center text-muted-foreground py-4">No session history found</p>}
                        </div>
                    )}
                </SectionCard>
                <SectionCard title="Blocked Users">
                    {areBlockedUsersLoading ? <Skeleton className="h-24 w-full" /> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {blockedUsers?.length ? blockedUsers.map(bu => (
                                <TableRow key={bu.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                {bu.photoURL ? <AvatarImage src={bu.photoURL} alt={bu.userId} /> : <AvatarFallback><DefaultAvatar /></AvatarFallback>}
                                            </Avatar>
                                            <Link href={`/adminnarayan/users/${bu.id}`} className="font-medium hover:underline">{bu.userId}</Link>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleAdminUnblock(bu.id, bu.userId)}>
                                            Unblock
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                )) : <TableRow><TableCell colSpan={2} className="text-center">This user has not blocked anyone.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    )}
                </SectionCard>
                 <SectionCard title="Admin Actions Log">
                    {areLogsLoading ? <Skeleton className="h-24 w-full" /> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Action & Reason</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {adminLogs?.length ? adminLogs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{toDate(log.createdAt)?.toLocaleString()}</TableCell>
                                        <TableCell>{log.action}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={2} className="text-center">No actions logged</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    )}
                </SectionCard>
                <SectionCard title="Deposit History">
                    {areDepositsLoading ? <Skeleton className="h-24 w-full" /> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {deposits?.length ? deposits.map(d => (
                                    <TableRow key={d.id}>
                                        <TableCell className="font-mono text-xs max-w-[100px] truncate">{d.id}</TableCell>
                                        <TableCell>{d.amount} {d.crypto}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize">{d.status.replace(/_/g, ' ')}</Badge></TableCell>
                                        <TableCell>{toDate(d.createdAt)?.toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center">No deposits</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    )}
                </SectionCard>
                <SectionCard title="Withdrawal History">
                    {areWithdrawalsLoading ? <Skeleton className="h-24 w-full" /> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {withdrawals?.length ? withdrawals.map(w => (
                                    <TableRow key={w.id}>
                                        <TableCell className="font-mono text-xs max-w-[100px] truncate">{w.id}</TableCell>
                                        <TableCell>{w.amount} {w.crypto}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize">{w.status}</Badge></TableCell>
                                        <TableCell>{toDate(w.createdAt)?.toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center">No withdrawals</TableCell></TableRow>}
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
                                 {allTrades?.length ? allTrades.map(t => (
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
