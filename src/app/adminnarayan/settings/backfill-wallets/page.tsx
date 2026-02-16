
'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle, DatabaseZap } from 'lucide-react';

export default function BackfillWalletsPage() {
    const { user } = useFirebase();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleBackfill = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to perform this action.' });
            return;
        }
        setIsProcessing(true);
        toast({ title: 'Starting Process...', description: 'The backfill operation has started on the server. This may take a few minutes.' });
        
        try {
            const idToken = await user.getIdToken(true);
            const response = await axios.post('/api/admin/backfill-wallets', {}, {
                headers: { Authorization: `Bearer ${idToken}` }
            });

            toast({ title: 'Success!', description: response.data.message });
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || error.message;
            console.error("Wallet backfill failed:", error);
            toast({ variant: 'destructive', title: 'Backfill Failed', description: errorMessage });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="grid gap-6">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Backfill Wallets</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Ensure All Users Have Wallets</CardTitle>
                    <CardDescription className="flex items-start gap-2 pt-2">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
                        <div>
                            This tool scans all user accounts and creates any missing wallet documents for all supported coin-chain combinations. It is safe to run multiple times, as it will not overwrite existing wallets.
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
                                Start Wallet Backfill
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will scan all users and create any missing wallets. This is a safe operation but may take a while for a large number of users.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBackfill}>
                                    Yes, Start Backfill
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    );
}
