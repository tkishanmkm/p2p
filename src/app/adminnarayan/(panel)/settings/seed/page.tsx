
'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle } from 'lucide-react';
import { mockUsers, mockP2PAds, mockTrade, mockTradeChatMessages, mockSupportTickets, mockFeedbacks } from '@/lib/mock-data';


export default function SeedDataPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);

    const handleSeedDatabase = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Firestore not available' });
            return;
        }
        setIsSeeding(true);
        toast({ title: 'Seeding Database', description: 'This may take a moment...' });

        try {
            const batch = writeBatch(firestore);

            // Seed Users
            mockUsers.forEach(user => {
                const userRef = doc(firestore, "users", user.id);
                // Ensure blockedUsers is an array, even if empty
                const userData = { ...user, blockedUsers: user.blockedUsers || [] };
                batch.set(userRef, userData);
            });

            // Seed Ads
            mockP2PAds.forEach(ad => {
                const adRef = doc(firestore, "p2p_ads", ad.id);
                batch.set(adRef, ad);
            });
            
            if (mockTrade) {
                 const tradeRef = doc(firestore, "trades", mockTrade.id);
                 batch.set(tradeRef, mockTrade);
            }
            
            mockTradeChatMessages.forEach(msg => {
                const msgRef = doc(firestore, "trades", msg.tradeId, "messages", msg.id);
                batch.set(msgRef, msg);
            });

            mockSupportTickets.forEach(ticket => {
                const ticketRef = doc(firestore, "support_tickets", ticket.id);
                batch.set(ticketRef, ticket);
            });

            mockFeedbacks.forEach(feedback => {
                 const feedbackRef = doc(firestore, "trades", feedback.tradeId, "feedback", feedback.id);
                 batch.set(feedbackRef, feedback);
            });


            await batch.commit();
            toast({ title: 'Success', description: 'Database has been seeded with mock users and ads.' });
        } catch (error: any) {
            console.error("Database seeding failed:", error);
            toast({ variant: 'destructive', title: 'Seeding Failed', description: error.message });
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className="grid gap-6">
             <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Seed Data</h1>
            </div>
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle>Seed Database with Mock Data</CardTitle>
                    <CardDescription className="flex items-start gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                        <div>
                            <span className="font-bold">Warning:</span> This action will overwrite existing documents in the 'users' and 'p2p_ads' collections if their IDs match the mock data. This can be useful for development and testing.
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" disabled={isSeeding}>
                                {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Seed Database
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will add mock users and P2P ads to your database. Existing documents with the same IDs will be overwritten. This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleSeedDatabase} className="bg-destructive hover:bg-destructive/90">
                                    Yes, Seed the Database
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    );
}
