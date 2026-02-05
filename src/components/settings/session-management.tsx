// This is a new file
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Smartphone, Monitor, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SessionManagement() {
  const [userAgent, setUserAgent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setUserAgent(navigator.userAgent);
  }, []);
  
  const isMobile = /Mobi|Android/i.test(userAgent);

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
      <CardContent>
        <Alert>
            <div className="flex items-center gap-4">
                {isMobile ? <Smartphone className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
                <div>
                    <AlertTitle>Current Session</AlertTitle>
                    <AlertDescription className="text-xs break-all">
                        {userAgent}
                    </AlertDescription>
                </div>
            </div>
        </Alert>
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
