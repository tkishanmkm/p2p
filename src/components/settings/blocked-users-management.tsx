// This is a new file
"use client";

import { useState, useMemo } from 'react';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, documentId } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { blockUser, unblockUser } from '@/lib/users';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DefaultAvatar } from '@/components/icons';
import { Loader2, UserX, UserPlus, XCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export function BlockedUsersManagement() {
  const { firestore, user: authUser } = useFirebase();
  const { toast } = useToast();
  const [usernameToBlock, setUsernameToBlock] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  const currentUserRef = useMemoFirebase(() => authUser ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: currentUserData, isLoading: isCurrentUserLoading } = useDoc<User>(currentUserRef);
  
  const blockedUserIds = useMemo(() => currentUserData?.blockedUsers || [], [currentUserData]);
  
  const blockedUsersQuery = useMemoFirebase(() => 
    (firestore && blockedUserIds.length > 0) 
      ? query(collection(firestore, 'users'), where(documentId(), 'in', blockedUserIds))
      : null
  , [firestore, blockedUserIds]);

  const { data: blockedUsers, isLoading: areBlockedUsersLoading } = useCollection<User>(blockedUsersQuery);

  const handleBlockUser = async () => {
    if (!firestore || !authUser || !usernameToBlock) return;
    if (usernameToBlock === currentUserData?.userId) {
        toast({ variant: 'destructive', title: 'Error', description: "You cannot block yourself." });
        return;
    }
    setIsBlocking(true);
    try {
      await blockUser(firestore, authUser.uid, usernameToBlock);
      toast({ title: 'User Blocked', description: `${usernameToBlock} has been added to your block list.` });
      setUsernameToBlock('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockUser = async (targetUserId: string) => {
    if (!firestore || !authUser) return;
    try {
      await unblockUser(firestore, authUser.uid, targetUserId);
      toast({ title: 'User Unblocked' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };
  
  const isLoading = isCurrentUserLoading || areBlockedUsersLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blocked Users</CardTitle>
        <CardDescription>Manage users you have blocked. They will not be able to trade with you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-2">Block a new user</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Enter username to block"
              value={usernameToBlock}
              onChange={(e) => setUsernameToBlock(e.target.value)}
            />
            <Button onClick={handleBlockUser} disabled={isBlocking || !usernameToBlock}>
              {isBlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">Currently Blocked Users</h3>
          <div className="space-y-2 rounded-md border p-2 min-h-[80px]">
            {isLoading && <Skeleton className="h-12 w-full" />}
            {!isLoading && blockedUsers && blockedUsers.length > 0 ? (
              blockedUsers.map((blockedUser) => (
                <div key={blockedUser.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {blockedUser.photoURL ? <AvatarImage src={blockedUser.photoURL} alt={blockedUser.userId} /> : <AvatarFallback><DefaultAvatar /></AvatarFallback>}
                    </Avatar>
                    <span className="font-medium">{blockedUser.userId}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleUnblockUser(blockedUser.id)}>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">You haven't blocked any users.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
