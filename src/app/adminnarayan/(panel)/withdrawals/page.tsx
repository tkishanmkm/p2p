
"use client";

import { useState, useEffect } from "react";
import { useFirebase } from "@/firebase";
import { collectionGroup, query, where, orderBy, getDocs } from "firebase/firestore";
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
import type { Withdrawal } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { approveWithdrawal, declineWithdrawal } from "@/lib/admin";
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
import { cn, toDate } from "@/lib/utils";
import { useAdminStatus } from "@/hooks/use-admin-status";

const statusColors: Record<Withdrawal['status'], string> = {
  pending: "border-yellow-500/50 text-yellow-600 bg-yellow-50",
  approved: "border-green-500/50 text-green-600 bg-green-50",
  declined: "border-red-500/50 text-red-600 bg-red-50",
  cancelled: "border-gray-500/50 text-gray-600 bg-gray-50",
};

export default function AdminWithdrawalsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus();
  const [showAll, setShowAll] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [isApproveAlertOpen, setIsApproveAlertOpen] = useState(false);
  const [isDeclineAlertOpen, setIsDeclineAlertOpen] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdminLoading) return;
    if (!isAdmin || !firestore) {
      setIsLoading(false);
      return;
    }

    const fetchWithdrawals = async () => {
      setIsLoading(true);
      try {
        const withdrawalsRef = collectionGroup(firestore, "withdrawals");
        let q;
        if (showAll) {
          q = query(withdrawalsRef);
        } else {
          q = query(withdrawalsRef, where("status", "==", "pending"));
        }
        const snapshot = await getDocs(q);
        const withdrawalsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Withdrawal));
        
        // Sort on client
        withdrawalsData.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
        
        setWithdrawals(withdrawalsData);
      } catch (error) {
        console.error("Error fetching withdrawals:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch withdrawals." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWithdrawals();
  }, [isAdmin, isAdminLoading, firestore, showAll, toast]);

  const handleApprove = async () => {
    if (!firestore || !selectedWithdrawal || !user) return;
    try {
      await approveWithdrawal(firestore, selectedWithdrawal, user.uid);
      toast({ title: "Withdrawal Approved", description: `User ${selectedWithdrawal.userDisplayName}'s locked balance has been debited.` });
      // Optimistically update UI
      if (!showAll) {
        setWithdrawals(withdrawals => withdrawals?.filter(w => w.id !== selectedWithdrawal.id) || null);
      } else {
        setWithdrawals(withdrawals => withdrawals?.map(w => w.id === selectedWithdrawal.id ? {...w, status: 'approved'} : w) || null);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Approval Failed", description: e.message });
    }
    setIsApproveAlertOpen(false);
    setSelectedWithdrawal(null);
  };
  
  const handleDecline = async () => {
    if (!firestore || !selectedWithdrawal || !user) return;
    try {
      await declineWithdrawal(firestore, selectedWithdrawal, user.uid);
      toast({ title: "Withdrawal Declined", description: `Funds have been returned to user ${selectedWithdrawal.userDisplayName}.` });
      // Optimistically update UI
       if (!showAll) {
        setWithdrawals(withdrawals => withdrawals?.filter(w => w.id !== selectedWithdrawal.id) || null);
      } else {
        setWithdrawals(withdrawals => withdrawals?.map(w => w.id === selectedWithdrawal.id ? {...w, status: 'declined'} : w) || null);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Decline Failed", description: e.message });
    }
    setIsDeclineAlertOpen(false);
    setSelectedWithdrawal(null);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Withdrawal Requests</h1>
        <Button variant="outline" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show Pending Only" : "Show All"}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage Withdrawals</CardTitle>
          <CardDescription>Review, approve, or decline user withdrawal requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>}
              {!isLoading && withdrawals?.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.userDisplayName}</TableCell>
                  <TableCell>{w.amount.toFixed(8)} {w.crypto}</TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-[150px]">{w.address}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", statusColors[w.status])}>
                      {w.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{toDate(w.createdAt)?.toLocaleString() ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    {w.status === 'pending' && (
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setSelectedWithdrawal(w); setIsApproveAlertOpen(true); }}>
                                <Check className="mr-2 h-4 w-4" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedWithdrawal(w); setIsDeclineAlertOpen(true); }}>
                                <X className="mr-2 h-4 w-4" /> Decline
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !withdrawals?.length && <TableRow><TableCell colSpan={6} className="text-center h-24">No withdrawals found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={isApproveAlertOpen} onOpenChange={setIsApproveAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Approve Withdrawal?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will mark the withdrawal as complete and debit the locked funds from the user's wallet. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleApprove}>Confirm & Approve</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={isDeclineAlertOpen} onOpenChange={setIsDeclineAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Decline Withdrawal?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will cancel the request and return the locked funds to the user's available balance. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDecline} className="bg-destructive hover:bg-destructive/90">Confirm & Decline</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    
