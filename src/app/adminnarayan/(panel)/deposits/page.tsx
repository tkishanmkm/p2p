"use client";

import { useState } from "react";
import { useFirebase, useCollection } from "@/firebase";
import { collectionGroup, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
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
import { MoreHorizontal, Check, X } from "lucide-react";
import type { Deposit } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { approveDeposit, declineDeposit } from "@/lib/admin";
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

const statusColors: Record<Deposit['status'], string> = {
  pending: "border-yellow-500/50 text-yellow-600 bg-yellow-50",
  approved: "border-green-500/50 text-green-600 bg-green-50",
  declined: "border-red-500/50 text-red-600 bg-red-50",
  expired: "border-gray-500/50 text-gray-600 bg-gray-50",
};

export default function AdminDepositsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [isApproveAlertOpen, setIsApproveAlertOpen] = useState(false);

  const depositsRef = firestore ? collectionGroup(firestore, "deposits") : null;
  const depositsQuery = depositsRef 
    ? query(
        depositsRef, 
        showAll ? orderBy("createdAt", "desc") : where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      ) 
    : null;

  const { data: deposits, isLoading } = useCollection<Deposit>(depositsQuery);

  const handleApprove = async () => {
    if (!firestore || !selectedDeposit) return;
    try {
      await approveDeposit(firestore, selectedDeposit);
      toast({ title: "Deposit Approved", description: `User ${selectedDeposit.userDisplayName}'s balance has been updated.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Approval Failed", description: e.message });
    }
    setIsApproveAlertOpen(false);
    setSelectedDeposit(null);
  };
  
  const handleDecline = async (deposit: Deposit) => {
    if (!firestore) return;
     if (!confirm("Are you sure you want to decline this deposit? This action cannot be undone.")) return;
    try {
      await declineDeposit(firestore, deposit);
      toast({ title: "Deposit Declined" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Decline Failed", description: e.message });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Deposit Requests</h1>
        <Button variant="outline" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show Pending Only" : "Show All"}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage Deposits</CardTitle>
          <CardDescription>Review, approve, or decline user deposit requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>TxID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>}
              {!isLoading && deposits?.map((deposit) => (
                <TableRow key={deposit.id}>
                  <TableCell className="font-medium">{deposit.userDisplayName}</TableCell>
                  <TableCell>{deposit.amount} {deposit.crypto}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", statusColors[deposit.status])}>
                      {deposit.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-[100px]">{deposit.txId || 'N/A'}</TableCell>
                  <TableCell>{new Date(deposit.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {deposit.status === 'pending' && (
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setSelectedDeposit(deposit); setIsApproveAlertOpen(true); }}>
                                <Check className="mr-2 h-4 w-4" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDecline(deposit)}>
                                <X className="mr-2 h-4 w-4" /> Decline
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !deposits?.length && <TableRow><TableCell colSpan={6} className="text-center">No deposits found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={isApproveAlertOpen} onOpenChange={setIsApproveAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Approve Deposit?</AlertDialogTitle>
                <AlertDialogDescription>
                    You are about to approve a deposit of <span className="font-bold">{selectedDeposit?.amount} {selectedDeposit?.crypto}</span> for user <span className="font-bold">{selectedDeposit?.userDisplayName}</span>. This will credit their wallet balance. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleApprove}>Confirm & Approve</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    