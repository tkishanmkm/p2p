
'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle, DatabaseZap } from 'lucide-react';
import { SUPPORTED_CRYPTOS } from '@/lib/constants';
import { Progress } from '@/components/ui/progress';
import { User } from '@/lib/types';


export default function BackfillWalletsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    const handleBackfill = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Firestore not available' });
            return;
        }
        setIsProcessing(true);
        setProgress(0);
        setLogs(['Starting process...']);
        
        try {
            const usersRef = collection(firestore, 'users');
            const usersSnapshot = await getDocs(usersRef);
            const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            
            if (allUsers.length === 0) {
                setLogs(prev => [...prev, 'No users found. Nothing to do.']);
                setIsProcessing(false);
                return;
            }

            let walletsCreated = 0;

            for (let i = 0; i < allUsers.length; i++) {
                const user = allUsers[i];
                
                setLogs(prev => [...prev, `Processing user: ${user.userId} (${i + 1}/${allUsers.length})`]);

                // Use batches for each user's wallets
                const batch = writeBatch(firestore);
                let batchHasWrites = false;

                for (const crypto of SUPPORTED_CRYPTOS) {
                    for (const chain of crypto.chains) {
                        const walletId = `${crypto.name}-${chain}`;
                        const walletRef = doc(firestore, `users/${user.id}/wallets/${walletId}`);
                        
                        try {
                            const walletDoc = await getDoc(walletRef);
                            if (!walletDoc.exists()) {
                                batch.set(walletRef, {
                                    id: walletId,
                                    userId: user.id,
                                    crypto: crypto.name,
                                    chain: chain,
                                    balance: 0,
                                    lockedBalance: 0,
                                    updatedAt: new Date().toISOString(),
                                });
                                batchHasWrites = true;
                                walletsCreated++;
                                setLogs(prev => [...prev, `  - Queued ${walletId} wallet for ${user.userId}`]);
                            }
                        } catch (e) {
                             setLogs(prev => [...prev, `  - ERROR checking wallet ${walletId} for ${user.userId}: ${(e as Error).message}`]);
                        }
                    }
                }
                
                if (batchHasWrites) {
                   await batch.commit();
                   setLogs(prev => [...prev, `  - Committed wallets for ${user.userId}`]);
                }

                setProgress(((i + 1) / allUsers.length) * 100);
            }

            toast({ title: 'Success', description: `Backfill complete. Created ${walletsCreated} new wallets.` });
            setLogs(prev => [...prev, '---', `Backfill complete. Created ${walletsCreated} new wallets.`]);
        } catch (error: any) {
            console.error("Wallet backfill failed:", error);
            toast({ variant: 'destructive', title: 'Backfill Failed', description: error.message });
            setLogs(prev => [...prev, 'ERROR: ' + error.message]);
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
                            This tool scans all user accounts and creates missing wallets for each supported coin and network (e.g., USDT-ERC20, USDT-TRC20) with a zero balance. This is essential for ensuring all users can deposit and withdraw correctly. This operation is safe to run multiple times.
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isProcessing && (
                         <div className="space-y-4">
                            <Progress value={progress} />
                            <div className="w-full h-64 bg-muted rounded-md p-4 overflow-y-auto">
                                <pre className="text-xs font-mono">
                                    {logs.map((log, i) => <div key={i}>{log}</div>)}
                                </pre>
                            </div>
                        </div>
                    )}
                </CardContent>
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
                                    This will scan all users and create any missing wallets for all supported chains. This is a safe operation but may take a while for a large number of users.
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
