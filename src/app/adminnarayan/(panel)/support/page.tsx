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

export default function AdminSupportPage() {
  const { firestore } = useFirebase();
  const ticketsQuery = useMemoFirebase(
      () => firestore ? query(collection(firestore, "support_tickets"), orderBy("createdAt", "desc")) : null,
      [firestore]
  );
  const { data: tickets, isLoading } = useCollection<SupportTicket>(ticketsQuery);

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
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center">Loading tickets...</TableCell></TableRow>}
              {!isLoading && tickets && tickets.length > 0 ? tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.userId}</TableCell>
                  <TableCell>{ticket.email}</TableCell>
                  <TableCell>
                    <Badge variant={
                        ticket.status === 'Open' ? 'destructive' : 
                        ticket.status === 'In Progress' ? 'default' : 
                        'outline'
                    }>
                      {ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(ticket.createdAt).toLocaleString()}</TableCell>
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
                        <DropdownMenuItem>Mark as In Progress</DropdownMenuItem>
                        <DropdownMenuItem>Close Ticket</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
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

    