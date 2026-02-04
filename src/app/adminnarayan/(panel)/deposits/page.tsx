"use client";

import { useState } from "react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collectionGroup, query, where, orderBy } from "firebase/firestore";
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
import { MoreHorizontal, Check, X, Copy } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusColors: Record<Deposit['status'], string> = {
  pending: "border-gray-500/50 text-gray-600 bg-gray-50",
  awaiting_confirmation: "border-yellow-500/50 text-yellow-600 bg-yellow-50",
  approved: "border-green-500/50 text-green-600 bg-green-50",
  declined: "border-red-500/50 text-red-600 bg-red-50",
  expired: "border-orange-500/50 text-orange-600 bg-orange-50",
};

function DepositsTable({ status }: { status?: Deposit['status'] }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
    const [isApproveAlertOpen, setIsApproveAlertOpen] = useState(false);
    const [isDeclineAlertOpen, setIsDeclineAlertOpen] = useState(false);

    const depositsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const depositsRef = collectionGroup(firestore, "deposits");
        
        if (status) {
            return query(depositsRef, where("status", "==", status), orderBy("createdAt", "desc"));
        } else {
            return query(depositsRef, orderBy("createdAt", "desc"));
        }
    }, [firestore, status]);

    const { data: deposits, isLoading } = useCollection<Deposit>(depositsQuery);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
    };

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

    const handleDecline = async () => {
        if (!firestore || !selectedDeposit) return;
        try {
            await declineDeposit(firestore, selectedDeposit);
            toast({ title: "Deposit Declined" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Decline Failed", description: e.message });
        }
        setIsDeclineAlertOpen(false);
        setSelectedDeposit(null);
    };

    return (
        <>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Deposit ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>TxID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow>}
                {!isLoading && deposits?.map((deposit) => (
                    <TableRow key={deposit.id}>
                    <TableCell className="font-mono text-xs max-w-[100px] truncate">
                        <Button variant="link" className="p-0 h-auto" onClick={() => copyToClipboard(deposit.id)}>
                            {deposit.id}
                        </Button>
                    </TableCell>
                    <TableCell className="font-medium">{deposit.userDisplayName}</TableCell>
                    <TableCell>{deposit.amount} {deposit.crypto}</TableCell>
                    <TableCell>
                        <Badge variant="outline" className={cn("capitalize", statusColors[deposit.status])}>
                        {deposit.status.replace(/_/g, ' ')}
                        </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[100px]">{deposit.txId || 'N/A'}</TableCell>
                    <TableCell>{new Date(deposit.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                        {deposit.status === 'awaiting_confirmation' && (
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
                                <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedDeposit(deposit); setIsDeclineAlertOpen(true); }}>
                                    <X className="mr-2 h-4 w-4" /> Decline
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </TableCell>
                    </TableRow>
                ))}
                {!isLoading && !deposits?.length && <TableRow><TableCell colSpan={7} className="text-center h-24">No deposits found.</TableCell></TableRow>}
                </TableBody>
            </Table>

            <AlertDialog open={isApproveAlertOpen} onOpenChange={setIsApproveAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve Deposit?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 text-sm pt-2">
                                <p>You are about to approve the following deposit. This will credit the user's wallet and cannot be undone.</p>
                                <div className="p-4 border rounded-md space-y-3 bg-secondary/50 text-foreground">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Deposit ID:</span>
                                        <span className="font-mono text-xs bg-muted p-1 rounded max-w-[180px] truncate">{selectedDeposit?.id}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">User:</span>
                                        <span className="font-semibold">{selectedDeposit?.userDisplayName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Amount:</span>
                                        <span className="font-semibold">{selectedDeposit?.amount} {selectedDeposit?.crypto}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Chain:</span>
                                        <span className="font-semibold">{selectedDeposit?.chain}</span>
                                    </div>
                                    {selectedDeposit?.txId && (
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-muted-foreground">TxID:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs bg-muted p-1 rounded max-w-[180px] truncate">{selectedDeposit.txId}</span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(selectedDeposit.txId!)}>
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedDeposit(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleApprove}>Confirm & Approve</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isDeclineAlertOpen} onOpenChange={setIsDeclineAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Decline Deposit?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to decline the deposit of <span className="font-bold">{selectedDeposit?.amount} {selectedDeposit?.crypto}</span> for user <span className="font-bold">{selectedDeposit?.userDisplayName}</span>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedDeposit(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDecline} className="bg-destructive hover:bg-destructive/90">Confirm & Decline</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function AdminDepositsPage() {
    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Deposit Requests</h1>
            </div>
            <Tabs defaultValue="awaiting_confirmation" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="awaiting_confirmation">Pending Approval</TabsTrigger>
                    <TabsTrigger value="pending">Pending User Action</TabsTrigger>
                    <TabsTrigger value="all">All Deposits</TabsTrigger>
                </TabsList>
                <TabsContent value="awaiting_confirmation">
                    <Card>
                        <CardHeader>
                            <CardTitle>Deposits Pending Approval</CardTitle>
                            <CardDescription>Users have confirmed these transfers. Please verify and approve or decline.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <DepositsTable status="awaiting_confirmation" />
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="pending">
                    <Card>
                        <CardHeader>
                            <CardTitle>Deposits Pending User Action</CardTitle>
                            <CardDescription>Users have initiated these deposits but have not yet confirmed the transfer.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <DepositsTable status="pending" />
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Deposits</CardTitle>
                            <CardDescription>A complete history of all deposit requests on the platform.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <DepositsTable />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}
