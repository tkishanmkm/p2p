// This is a new file
"use client";

import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
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
import { Badge } from "@/components/ui/badge";
import type { Trade } from "@/lib/types";
import { cn, toDate } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAdminStatus } from "@/hooks/use-admin-status";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<Trade['status'], string> = {
  active: "border-blue-500/50 text-blue-600 bg-blue-50",
  paid: "border-yellow-500/50 text-yellow-600 bg-yellow-50",
  released: "border-green-500/50 text-green-600 bg-green-50",
  cancelled: "border-gray-500/50 text-gray-600 bg-gray-50",
  disputed: "border-red-500/50 text-red-600 bg-red-50",
  expired: "border-orange-500/50 text-orange-600 bg-orange-50",
};

export default function AdminTradesPage() {
  const { firestore } = useFirebase();
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus();

  const tradesQuery = useMemoFirebase(() => {
    // Guard: Only create the query if the user is a confirmed admin.
    if (!firestore || !isAdmin) return null;
    return query(collection(firestore, "trades"), orderBy("createdAt", "desc"));
  }, [firestore, isAdmin]);

  const { data: trades, isLoading: areTradesLoading } = useCollection<Trade>(tradesQuery);
  const isLoading = isAdminLoading || areTradesLoading;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Trade History</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Trades</CardTitle>
          <CardDescription>
            A log of all trades that have occurred on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade ID</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    <Skeleton className="h-4 w-1/4 mx-auto" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && trades?.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-mono text-xs">{trade.tradeId}</TableCell>
                  <TableCell>
                    <Link href={`/users/${trade.buyer.userId}`} className="hover:underline font-medium">
                        {trade.buyer.userId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/users/${trade.seller.userId}`} className="hover:underline font-medium">
                        {trade.seller.userId}
                    </Link>
                  </TableCell>
                  <TableCell>{trade.amount.toFixed(6)} {trade.crypto}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", statusColors[trade.status])}>
                      {trade.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{toDate(trade.createdAt)?.toLocaleString() ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/trade/${trade.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !trades?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No trades found.
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
