
"use client";

import { useFirebase } from "@/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus();
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isAdminLoading) {
      setIsLoading(true);
      return;
    }
    if (!isAdmin || !firestore) {
      setIsLoading(false);
      return;
    }
    
    const fetchTrades = async () => {
      setIsLoading(true);
      try {
        const tradesRef = collection(firestore, "trades");
        const q = query(tradesRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const tradesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Trade));
        setTrades(tradesData);
      } catch (error) {
        console.error("Failed to fetch trades for admin:", error);
        setTrades([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrades();

  }, [firestore, isAdmin, isAdminLoading]);

  const filteredTrades = useMemo(() => {
    if (!trades) return null;
    if (!searchTerm.trim()) return trades;
    const lower = searchTerm.toLowerCase();
    return trades.filter(t => 
        t.tradeId.toLowerCase().includes(lower) ||
        t.buyer.userId.toLowerCase().includes(lower) ||
        t.seller.userId.toLowerCase().includes(lower) ||
        t.crypto.toLowerCase().includes(lower)
    );
  }, [trades, searchTerm]);

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
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by Trade ID, buyer, seller, or asset..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
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
                {!isLoading && filteredTrades?.map((trade) => (
                    <TableRow key={trade.id} onClick={() => router.push(`/trade/${trade.id}`)} className="cursor-pointer">
                    <TableCell className="font-mono text-xs">{trade.tradeId}</TableCell>
                    <TableCell>
                        <Link href={`/users/${trade.buyer.userId}`} className="hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
                            {trade.buyer.userId}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <Link href={`/users/${trade.seller.userId}`} className="hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
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
                        <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                            <Link href={`/trade/${trade.id}`}>View</Link>
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                {!isLoading && !filteredTrades?.length && (
                    <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        No trades found.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
          <div className="grid gap-4 md:hidden">
              {isLoading && <p className="text-center text-sm text-muted-foreground py-4">Loading trades...</p>}
              {!isLoading && filteredTrades?.map((trade) => (
                  <Card key={trade.id} onClick={() => router.push(`/trade/${trade.id}`)} className="cursor-pointer">
                      <CardHeader>
                          <CardTitle className="text-base">{trade.amount.toFixed(4)} {trade.crypto}</CardTitle>
                          <CardDescription className="font-mono">{trade.tradeId}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Buyer</span>
                            <span className="font-medium">{trade.buyer.userId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Seller</span>
                            <span className="font-medium">{trade.seller.userId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date</span>
                            <span className="font-medium">{toDate(trade.createdAt)?.toLocaleDateString() ?? 'N/A'}</span>
                          </div>
                      </CardContent>
                      <CardFooter>
                          <Badge variant="outline" className={cn("capitalize", statusColors[trade.status])}>
                            {trade.status}
                          </Badge>
                      </CardFooter>
                  </Card>
              ))}
               {!isLoading && !filteredTrades?.length && <p className="text-center text-sm text-muted-foreground py-8">No trades found.</p>}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
