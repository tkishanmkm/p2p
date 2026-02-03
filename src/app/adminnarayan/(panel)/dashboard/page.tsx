import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, ArrowLeftRight, ShieldAlert, DollarSign, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

// This will become a real data component
export default function AdminDashboardPage() {
    
    // In a real app, these values would come from Firestore queries.
    // For now, using placeholders.
    const stats = [
        { title: "Total Users", value: "...", icon: <Users className="h-4 w-4 text-muted-foreground" /> },
        { title: "Active Trades", value: "...", icon: <ArrowLeftRight className="h-4 w-4 text-muted-foreground" /> },
        { title: "Open Disputes", value: "...", icon: <ShieldAlert className="h-4 w-4 text-muted-foreground" /> },
        { title: "24h Volume", value: "$...", icon: <DollarSign className="h-4 w-4 text-muted-foreground" /> },
        { title: "Pending Deposits", value: "...", icon: <ArrowDownToLine className="h-4 w-4 text-muted-foreground" /> },
        { title: "Pending Withdrawals", value: "...", icon: <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" /> },
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
            <p className="text-muted-foreground">Activity log coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
