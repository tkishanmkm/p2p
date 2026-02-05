
"use client";

import { useState, useEffect, useMemo } from "react";
import { useFirebase } from "@/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
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
import { MoreHorizontal, Check, X, Copy, Search } from "lucide-react";
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
import { cn, toDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminStatus } from "@/hooks/use-admin-status";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const statusColors: Record<Deposit['status'], string> = {
  pending: "border-gray-500/50 text-gray-600 bg-gray-50",
  awaiting_confirmation: "border-yellow-500/50 text-yellow-600 bg-yellow-50",
  approved: "border-green-500/50 text-green-600 bg-green-50",
  declined: "border-red-500/50 text-red-600 bg-red-50",
  expired: "border-orange-500/50 text-orange-600 bg-orange-50",
};

function DepositsTable({ status, searchTerm }: { status?: Deposit['status'], searchTerm: string }) {
    const { firestore, user: adminUser } = useFirebase();
    const { isAdmin, isLoading: isAdminLoading } = useAdminStatus();
    const { toast } = useToast();
    const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
    const [isApproveAlertOpen, setIsApproveAlertOpen] = useState(false);
    const [isDeclineAlertOpen, setIsDeclineAlertOpen] = useState(false);
    const [editableAmount, setEditableAmount] = useState('');
    
    const [deposits, setDeposits] = useState<Deposit[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isAdminLoading) {
            setIsLoading(true);
            return;
        }

        if (!isAdmin || !firestore) {
            setIsLoading(false);
            setDeposits([]);
            return;
        }

        const fetchDeposits = async () => {
            setIsLoading(true);
            try {
                const depositsRef = collection(firestore, "deposits");
                let q;
                if (status) {
                    q = query(depositsRef, where("status", "==", status));
                } else {
                    q = query(depositsRef);
                }
                const querySnapshot = await getDocs(q);
                let depositsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Deposit));

                // Sort on the client to avoid composite index requirements
                depositsData.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));

                setDeposits(depositsData);
            } catch (error) {
                console.error("Failed to fetch deposits:", error);
                toast({
                    variant: "destructive",
                    title: "Error fetching deposits",
                    description: (error as Error).message,
                });
                setDeposits([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDeposits();
    }, [firestore, status, isAdmin, isAdminLoading, toast]);
    
    const filteredDeposits = useMemo(() => {
        if (!deposits) return null;
        if (!searchTerm.trim()) return deposits;

        const lowercasedFilter = searchTerm.toLowerCase();
        return deposits.filter(d => 
            d.id.toLowerCase().includes(lowercasedFilter) ||
            d.userDisplayName.toLowerCase().includes(lowercasedFilter) ||
            d.txId?.toLowerCase().includes(lowercasedFilter) ||
            d.amount.toString().includes(lowercasedFilter)
        );
    }, [deposits, searchTerm]);


    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
    };

    const handleApprove = async () => {
        if (!firestore || !selectedDeposit || !adminUser) return;
        
        const finalAmount = parseFloat(editableAmount);
        if (isNaN(finalAmount) || finalAmount <= 0) {
            toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid positive number." });
            return;
        }

        try {
            await approveDeposit(firestore, selectedDeposit, finalAmount, adminUser.uid);
            toast({ title: "Deposit Approved", description: `User ${selectedDeposit.userDisplayName}'s balance has been updated.` });
            setDeposits(deposits?.filter(d => d.id !== selectedDeposit.id) || null);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Approval Failed", description: e.message });
        }
        setIsApproveAlertOpen(false);
        setSelectedDeposit(null);
    };

    const handleDecline = async () => {
        if (!firestore || !selectedDeposit || !adminUser) return;
        try {
            await declineDeposit(firestore, selectedDeposit, adminUser.uid);
            toast({ title: "Deposit Declined" });
            setDeposits(deposits?.filter(d => d.id !== selectedDeposit.id) || null);
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
                    <TableHead>Crypto Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>TxID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow>}
                {!isLoading && filteredDeposits?.map((deposit) => (
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
                    <TableCell>{toDate(deposit.createdAt)?.toLocaleString() ?? 'N/A'}</TableCell>
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
                                <DropdownMenuItem onClick={() => { 
                                    setSelectedDeposit(deposit); 
                                    setEditableAmount(deposit.amount.toString());
                                    setIsApproveAlertOpen(true); 
                                    }}>
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
                {!isLoading && !filteredDeposits?.length && <TableRow><TableCell colSpan={7} className="text-center h-24">No deposits found.</TableCell></TableRow>}
                </TableBody>
            </Table>

            <AlertDialog open={isApproveAlertOpen} onOpenChange={setIsApproveAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve Deposit?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 text-sm pt-2">
                                <p>
                                    You are about to approve a deposit for user <strong className="text-foreground">{selectedDeposit?.userDisplayName}</strong>. This will credit their wallet. This action cannot be undone.
                                </p>
                                <div className="p-4 border rounded-md space-y-3 bg-secondary/50 text-foreground">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">User:</span>
                                        <span className="font-semibold">{selectedDeposit?.userDisplayName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Requested Amount:</span>
                                        <span className="font-semibold">{selectedDeposit?.amount} {selectedDeposit?.crypto}</span>
                                    </div>
                                     <div className="flex justify-between items-center gap-2">
                                        <span className="text-muted-foreground">TxID:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs bg-muted p-1 rounded max-w-[180px] truncate">{selectedDeposit?.txId || 'N/A'}</span>
                                            {selectedDeposit?.txId && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(selectedDeposit.txId!)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="approved-amount">Approved Amount ({selectedDeposit?.crypto})</Label>
                                    <Input 
                                        id="approved-amount"
                                        type="number"
                                        step="any"
                                        value={editableAmount}
                                        onChange={(e) => setEditableAmount(e.target.value)}
                                        className="bg-background"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        You can correct the amount here if the user sent a different amount than requested.
                                    </p>
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
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Deposit Requests</h1>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Filter & Search</CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by Deposit ID, User ID, TxID, or amount..." 
                            className="pl-10" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
            </Card>
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
                           <DepositsTable status="awaiting_confirmation" searchTerm={searchTerm} />
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
                           <DepositsTable status="pending" searchTerm={searchTerm} />
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
                           <DepositsTable searchTerm={searchTerm}/>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}
