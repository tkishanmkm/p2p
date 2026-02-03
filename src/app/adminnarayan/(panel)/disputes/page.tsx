"use client";

import { useState } from "react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collectionGroup, query, where, orderBy, getDoc, doc } from "firebase/firestore";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ShieldCheck } from "lucide-react";
import type { Dispute, Trade } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { resolveDispute } from "@/lib/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";

const statusColors: Record<Dispute['status'], string> = {
  open: "border-red-500/50 text-red-600 bg-red-50",
  resolved: "border-green-500/50 text-green-600 bg-green-50",
  cancelled: "border-gray-500/50 text-gray-600 bg-gray-50",
};

export default function AdminDisputesPage() {
  const { firestore, user: adminUser } = useFirebase();
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [awardTo, setAwardTo] = useState<'buyer' | 'seller' | null>(null);
  const [isResolveAlertOpen, setIsResolveAlertOpen] = useState(false);

  const disputesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const disputesRef = collectionGroup(firestore, "disputes");

    if (showAll) {
        return query(disputesRef, orderBy("createdAt", "desc"));
    } else {
        return query(disputesRef, where("status", "==", "open"), orderBy("createdAt", "desc"));
    }
  }, [firestore, showAll]);

  const { data: disputes, isLoading } = useCollection<Dispute>(disputesQuery);

  const handleResolve = async () => {
    if (!firestore || !selectedDispute || !awardTo || !adminUser) return;
    
    // Fetch the full trade document, as it might not be denormalized
    const tradeRef = doc(firestore, 'trades', selectedDispute.tradeId);
    const tradeSnap = await getDoc(tradeRef);

    if (!tradeSnap.exists()) {
        toast({ variant: "destructive", title: "Resolution Failed", description: "Trade document could not be found." });
        return;
    }
    const trade = tradeSnap.data() as Trade;
    const winnerId = awardTo === 'buyer' ? trade.buyerId : trade.sellerId;

    try {
      await resolveDispute(firestore, trade, selectedDispute, winnerId, adminUser.uid);
      toast({ title: "Dispute Resolved", description: `Trade awarded to the ${awardTo}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Resolution Failed", description: e.message });
    }
    setIsResolveAlertOpen(false);
    setSelectedDispute(null);
    setAwardTo(null);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Dispute Center</h1>
        <Button variant="outline" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show Open Only" : "Show All"}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage Disputes</CardTitle>
          <CardDescription>Review and resolve trade disputes between users.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade ID</TableHead>
                <TableHead>Opened By</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6}>Loading disputes...</TableCell></TableRow>}
              {!isLoading && disputes?.map((dispute) => (
                <TableRow key={dispute.id}>
                  <TableCell>
                    <Button variant="link" asChild className="p-0">
                        <Link href={`/trade/${dispute.tradeId}`} target="_blank">{dispute.tradeId.substring(0,8)}...</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{dispute.openedBy}</TableCell>
                   <TableCell className="max-w-[200px] truncate">{dispute.reason}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", statusColors[dispute.status])}>
                      {dispute.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(dispute.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {dispute.status === 'open' && (
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Resolve</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setSelectedDispute(dispute); setAwardTo('buyer'); setIsResolveAlertOpen(true); }}>
                                Award to Buyer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedDispute(dispute); setAwardTo('seller'); setIsResolveAlertOpen(true); }}>
                                Award to Seller
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !disputes?.length && <TableRow><TableCell colSpan={6} className="text-center">No disputes found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={isResolveAlertOpen} onOpenChange={setIsResolveAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Resolve Dispute?</AlertDialogTitle>
                <AlertDialogDescription>
                    You are about to award the trade to the <span className="font-bold">{awardTo}</span>. This will transfer the escrowed crypto and cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { setAwardTo(null); setSelectedDispute(null); }}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResolve}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Confirm & Resolve
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
