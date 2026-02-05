
"use client";

import Link from 'next/link';
import { useFirebase } from "@/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
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
import { Button } from '@/components/ui/button';
import { useAdminStatus } from '@/hooks/use-admin-status';
import { useState, useEffect } from 'react';

export default function AdminUsersPage() {
  const { firestore, user: adminUser } = useFirebase();
  const { toast } = useToast();
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus();
  const [users, setUsers] = useState<User[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdminLoading) return;
    if (!isAdmin || !firestore) {
        setIsLoading(false);
        return;
    }

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const usersRef = collection(firestore, "users");
            const q = query(usersRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const allUsers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
            // Filter out any user accounts that are flagged as admin accounts
            const regularUsers = allUsers.filter(user => !user.isAdminAccount);
            setUsers(regularUsers);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch users." });
        } finally {
            setIsLoading(false);
        }
    };

    fetchUsers();
  }, [isAdmin, isAdminLoading, firestore, toast]);

  const handleBanToggle = async (user: User, isBanned: boolean) => {
    if (!firestore || !adminUser) return;
    try {
      await setUserBanStatus(firestore, user.id, isBanned);
      toast({ title: "User Updated", description: `${user.userId} has been ${isBanned ? 'banned' : 'unbanned'}.` });
      // Optimistically update UI
      setUsers(currentUsers => currentUsers?.map(u => u.id === user.id ? {...u, isBanned} : u) || null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    }
  };
  
  const handleHoldToggle = async (user: User, isOnHold: boolean) => {
    if (!firestore || !adminUser) return;
    try {
      await setUserHoldStatus(firestore, user.id, isOnHold);
      toast({ title: "User Updated", description: `Account for ${user.userId} has been put ${isOnHold ? 'on hold' : 'off hold'}.` });
       // Optimistically update UI
      setUsers(currentUsers => currentUsers?.map(u => u.id === user.id ? {...u, isOnHold} : u) || null);
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4}>Loading users...</TableCell></TableRow>}
              {!isLoading && users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                     <Button variant="link" asChild className="p-0 h-auto">
                        <Link href={`/adminnarayan/users/${user.id}`}>
                            <div>{user.userId}</div>
                            {user.oldUserId && <div className="text-xs text-muted-foreground">(was {user.oldUserId})</div>}
                        </Link>
                    </Button>
                  </TableCell>
                  <TableCell>{user.fullName}</TableCell>
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
              {!isLoading && !users?.length && <TableRow><TableCell colSpan={4} className="text-center">No users found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
