
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Smartphone, Monitor, LogOut, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import type { Session } from '@/lib/types';
import { toDate } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function SessionManagement() {
  const [currentSessionId, setCurrentSessionId] = useState('');
  const { toast } = useToast();
  const { firestore, user: authUser } = useFirebase();

  // A simplified way to identify the "current" session. In a real app, this would be more robust.
  useEffect(() => {
    setCurrentSessionId(navigator.userAgent);
  }, []);
  
  const sessionsQuery = useMemoFirebase(() => 
    authUser ? query(collection(firestore, `users/${authUser.uid}/sessions`), orderBy('lastLogin', 'desc')) : null, 
    [authUser, firestore]
  );
  const { data: sessions, isLoading } = useCollection<Session>(sessionsQuery);

  const handleLogoutOtherSessions = () => {
    toast({
        title: "Feature Not Available",
        description: "For security, logging out other sessions requires backend integration which is not available in this demo environment.",
        duration: 8000,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions & Login History</CardTitle>
        <CardDescription>Manage your active sessions and review recent login activity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
            <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        )}
        {!isLoading && sessions?.map(session => {
            const isMobile = /Mobi|Android/i.test(session.userAgent);
            const isCurrent = session.userAgent === currentSessionId;
            return (
                 <Alert key={session.id} variant={isCurrent ? "default" : "destructive"} className={isCurrent ? 'border-primary' : ''}>
                    <div className="flex items-center gap-4">
                        {isMobile ? <Smartphone className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
                        <div className="flex-grow">
                            <AlertTitle className="flex items-center gap-2">
                                {isCurrent ? 'Current Session' : 'Past Session'}
                                {isCurrent && <CheckCircle className="h-4 w-4 text-green-500" />}
                            </AlertTitle>
                            <AlertDescription className="text-xs break-all">
                                {session.userAgent}
                            </AlertDescription>
                            <div className="text-xs text-muted-foreground mt-1">
                                <span>IP: {session.ipAddress}</span> | <span>{toDate(session.lastLogin) ? formatDistanceToNow(toDate(session.lastLogin)!) + ' ago' : 'N/A'}</span>
                            </div>
                        </div>
                        {!isCurrent && (
                            <Button variant="ghost" size="sm" onClick={handleLogoutOtherSessions}>Logout</Button>
                        )}
                    </div>
                </Alert>
            );
        })}
         {!isLoading && !sessions?.length && (
            <p className="text-sm text-center text-muted-foreground py-4">No session history found.</p>
         )}
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <Button variant="outline" onClick={handleLogoutOtherSessions}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out from all other devices
        </Button>
      </CardFooter>
    </Card>
  );
}
