"use client";

import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
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

export default function AdminSupportPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const ticketsQuery = useMemoFirebase(
      () => firestore ? query(collection(firestore, "support_tickets"), orderBy("createdAt", "desc")) : null,
      [firestore]
  );
  const { data: tickets, isLoading } = useCollection<SupportTicket>(ticketsQuery);

  const handleStatusChange = async (ticketId: string, status: SupportTicket['status']) => {
    if (!firestore) return;
    try {
        await updateSupportTicketStatus(firestore, ticketId, status);
        toast({ title: 'Ticket Updated', description: `Status set to ${status}` });
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
