'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// This is a placeholder type. You would replace this with your actual transaction type.
type Transaction = {
  id: string;
  type: 'deposit' | 'withdrawal' | 'swap' | 'transfer';
  amount: string;
  date: string;
  status: string;
};

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="capitalize">{tx.type}</TableCell>
            <TableCell>{tx.amount}</TableCell>
            <TableCell>{tx.date}</TableCell>
            <TableCell>{tx.status}</TableCell>
          </TableRow>
        ))}
         {transactions.length === 0 && (
            <TableRow>
                <TableCell colSpan={4} className="text-center">No transactions yet.</TableCell>
            </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
