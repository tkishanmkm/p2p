"use client";

import { useFirebase } from "@/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { SupportTicket } from "@/lib/types";
import { updateSupportTicketStatus } from "@/lib/admin";
import { useToast } from "@/hooks/use-toast";
import { toDate } from "@/lib/utils";
import { useAdminStatus } from "@/hooks/use-admin-status";
import { useState, useEffect } from "react";

export default function AdminSupportPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdminLoading) return;
    if (!isAdmin || !firestore) {
      setIsLoading(false);
      return;
    }

    const fetchTickets = async () => {
      setIsLoading(true);
      try {
        const ticketsRef = collection(firestore, "support_tickets");
        const q = query(ticketsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setTickets(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SupportTicket)));
      } catch (error) {
        console.error("Error fetching support tickets:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch support tickets." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [isAdmin, isAdminLoading, firestore, toast]);

  const handleStatusChange = async (ticketId: string, status: SupportTicket['status']) => {
    if (!firestore) return;
    try {
        await updateSupportTicketStatus(firestore, ticketId, status);
        toast({ title: 'Ticket Updated', description: `Status set to ${status}` });
        // Optimistically update UI
        setTickets(currentTickets => currentTickets?.map(t => t.id === ticketId ? {...t, status} : t) || null);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    }
  };

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Support Requests</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage Support Tickets</CardTitle>
          <CardDescription>
            View and respond to user-submitted support requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="text-center">Loading tickets...</TableCell></TableRow>}
              {!isLoading && tickets && tickets.length > 0 ? tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.userId || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={
                        ticket.status === 'Open' ? 'destructive' : 
                        ticket.status === 'In Progress' ? 'default' : 
                        'outline'
                    }>
                      {ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{toDate(ticket.createdAt)?.toLocaleString() ?? 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'In Progress')}>Mark as In Progress</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'Closed')}>Close Ticket</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                        No support tickets found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
