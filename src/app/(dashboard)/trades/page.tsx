// This is a new file
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import type { User, Trade } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { DollarSign, CheckCircle, Percent, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

function DashboardCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-20 mt-2" />
      </CardContent>
    </Card>
  );
}

const statusColors: Record<Trade['status'], string> = {
  active: "border-blue-500/50 text-blue-600 bg-blue-50",
  paid: "border-yellow-500/50 text-yellow-600 bg-yellow-50",
  released: "border-green-500/50 text-green-600 bg-green-50",
  cancelled: "border-gray-500/50 text-gray-600 bg-gray-50",
  disputed: "border-red-500/50 text-red-600 bg-red-50",
  expired: "border-orange-500/50 text-orange-600 bg-orange-50",
};


export default function MyTradesPage() {
  const { firestore, user: authUser } = useFirebase();
  
  const userRef = useMemoFirebase(() => authUser ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);

  const tradesAsBuyerQuery = useMemoFirebase(() => authUser ? query(collection(firestore, 'trades'), where('buyerId', '==', authUser.uid), orderBy('createdAt', 'desc')) : null, [firestore, authUser]);
  const tradesAsSellerQuery = useMemoFirebase(() => authUser ? query(collection(firestore, 'trades'), where('sellerId', '==', authUser.uid), orderBy('createdAt', 'desc')) : null, [firestore, authUser]);

  const { data: buyerTrades, isLoading: buyerTradesLoading } = useCollection<Trade>(tradesAsBuyerQuery);
  const { data: sellerTrades, isLoading: sellerTradesLoading } = useCollection<Trade>(tradesAsSellerQuery);

  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const isLoadingTrades = buyerTradesLoading || sellerTradesLoading;

  useEffect(() => {
    const combined = [...(buyerTrades || []), ...(sellerTrades || [])];
    const uniqueTrades = Array.from(new Map(combined.map(trade => [trade.id, trade])).values());
    uniqueTrades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setAllTrades(uniqueTrades);
  }, [buyerTrades, sellerTrades]);

  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">My Trades & Statistics</h1>
      </div>

       <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3 mb-8">
        {isUserLoading ? <DashboardCardSkeleton /> : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${parseFloat(user?.tradeVolume || '0').toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
        {isUserLoading ? <DashboardCardSkeleton /> : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Trades</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user?.completedTrades || 0}</div>
            </CardContent>
          </Card>
        )}
        {isUserLoading ? <DashboardCardSkeleton /> : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feedback Score</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user?.feedbackScore || 100}%</div>
              <Progress value={user?.feedbackScore || 100} className="h-2 mt-2" />
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>A log of all your past and active trades.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTrades && <TableRow><TableCell colSpan={7} className="text-center">Loading trades...</TableCell></TableRow>}
              {!isLoadingTrades && allTrades.map((trade) => {
                const isBuyer = trade.buyerId === authUser?.uid;
                const partner = isBuyer ? trade.seller : trade.buyer;
                return (
                  <TableRow key={trade.id}>
                    <TableCell className="font-mono text-xs">{trade.tradeId}</TableCell>
                    <TableCell>
                      <Badge variant={isBuyer ? 'default' : 'secondary'}>{isBuyer ? 'Buyer' : 'Seller'}</Badge>
                    </TableCell>
                    <TableCell>{partner.userId}</TableCell>
                    <TableCell>{trade.amount.toFixed(6)} {trade.crypto}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize", statusColors[trade.status])}>
                        {trade.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(trade.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/trade/${trade.id}`}><ArrowLeftRight className="mr-2 h-3 w-3"/>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {!isLoadingTrades && !allTrades.length && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    You have no trades yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
