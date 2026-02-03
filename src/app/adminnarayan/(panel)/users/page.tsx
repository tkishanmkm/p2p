"use client";

import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
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
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { setUserBanStatus, setUserHoldStatus } from "@/lib/admin";
import { cn } from "@/lib/utils";

export default function AdminUsersPage() {
  const { firestore, user: adminUser } = useFirebase();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: users, isLoading } = useCollection<User>(usersQuery);

  const handleBanToggle = async (user: User, isBanned: boolean) => {
    if (!firestore || !adminUser) return;
    try {
      await setUserBanStatus(firestore, user.id, isBanned);
      toast({ title: "User Updated", description: `${user.userId} has been ${isBanned ? 'banned' : 'unbanned'}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    }
  };
  
  const handleHoldToggle = async (user: User, isOnHold: boolean) => {
    if (!firestore || !adminUser) return;
    try {
      await setUserHoldStatus(firestore, user.id, isOnHold);
      toast({ title: "User Updated", description: `Account for ${user.userId} has been put ${isOnHold ? 'on hold' : 'off hold'}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">User Management</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>View and manage all user accounts on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6}>Loading users...</TableCell></TableRow>}
              {!isLoading && users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div>{user.userId}</div>
                    {user.oldUserId && <div className="text-xs text-muted-foreground">(was {user.oldUserId})</div>}
                  </TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.dob}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                        {user.isBanned && <Badge variant="destructive">Banned</Badge>}
                        {user.isOnHold && <Badge variant="secondary" className="bg-yellow-500 text-white">On Hold</Badge>}
                        {!user.isBanned && !user.isOnHold && <Badge className="bg-green-500">Active</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                        <div className="flex gap-4 justify-end">
                            <Tooltip>
                                <TooltipTrigger>
                                    <Switch
                                        checked={user.isOnHold}
                                        onCheckedChange={(checked) => handleHoldToggle(user, checked)}
                                        aria-label="Toggle Account Hold"
                                        className="data-[state=checked]:bg-yellow-500"
                                    />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Place Account on Hold</p>
                                </TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger>
                                     <Switch
                                        checked={user.isBanned}
                                        onCheckedChange={(checked) => handleBanToggle(user, checked)}
                                        aria-label="Toggle Account Ban"
                                    />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Ban User</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !users?.length && <TableRow><TableCell colSpan={6} className="text-center">No users found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
