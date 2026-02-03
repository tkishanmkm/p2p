"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, ArrowLeftRight, ShieldAlert, DollarSign, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query, where } from "firebase/firestore";
import type { User, Trade, Dispute, Deposit, Withdrawal } from "@/lib/types";

// This will become a real data component
export default function AdminDashboardPage() {
    const { firestore } = useFirebase();

    // Queries for stats
    const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const activeTradesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'trades'), where('status', 'in', ['active', 'paid'])) : null, [firestore]);
    const openDisputesQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'disputes'), where('status', '==', 'open')) : null, [firestore]);
    const pendingDepositsQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'deposits'), where('status', '==', 'pending')) : null, [firestore]);
    const pendingWithdrawalsQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'withdrawals'), where('status', '==', 'pending')) : null, [firestore]);
    
    // Fetch data
    const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);
    const { data: activeTrades, isLoading: tradesLoading } = useCollection<Trade>(activeTradesQuery);
    const { data: openDisputes, isLoading: disputesLoading } = useCollection<Dispute>(openDisputesQuery);
    const { data: pendingDeposits, isLoading: depositsLoading } = useCollection<Deposit>(pendingDepositsQuery);
    const { data: pendingWithdrawals, isLoading: withdrawalsLoading } = useCollection<Withdrawal>(pendingWithdrawalsQuery);

    const stats = [
        { title: "Total Users", value: usersLoading ? "..." : users?.length ?? 0, icon: <Users className="h-4 w-4 text-muted-foreground" /> },
        { title: "Active Trades", value: tradesLoading ? "..." : activeTrades?.length ?? 0, icon: <ArrowLeftRight className="h-4 w-4 text-muted-foreground" /> },
        { title: "Open Disputes", value: disputesLoading ? "..." : openDisputes?.length ?? 0, icon: <ShieldAlert className="h-4 w-4 text-muted-foreground" /> },
        { title: "24h Volume", value: "$...", icon: <DollarSign className="h-4 w-4 text-muted-foreground" />, description: "Calculation not implemented" },
        { title: "Pending Deposits", value: depositsLoading ? "..." : pendingDeposits?.length ?? 0, icon: <ArrowDownToLine className="h-4 w-4 text-muted-foreground" /> },
        { title: "Pending Withdrawals", value: withdrawalsLoading ? "..." : pendingWithdrawals?.length ?? 0, icon: <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" /> },
    ];

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Admin Dashboard</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {stats.map((stat, index) => (
            <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    {stat.icon}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    {stat.description && <p className="text-xs text-muted-foreground">{stat.description}</p>}
                </CardContent>
            </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Overview of recent platform events.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* A log of recent events would go here */}
            <p className="text-muted-foreground text-center py-8">Activity log coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    