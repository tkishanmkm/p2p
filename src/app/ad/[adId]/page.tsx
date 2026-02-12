

'use client';

import { useParams, useRouter } from "next/navigation";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, getDocs, collectionGroup, orderBy, limit } from "firebase/firestore";
import type { P2PAd, User, Feedback, Trade, UserWallet } from "@/lib/types";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FeedbackCard } from "@/components/p2p/feedback-card";
import { DefaultAvatar, BtcLogo, EthLogo, LtcLogo, UsdtLogo } from "@/components/icons";

import { useToast } from "@/hooks/use-toast";
import { usePrices } from "@/context/price-context";
import { initiateTrade } from "@/lib/wallet";

import { cn, toDate } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { Clock, ThumbsUp, ThumbsDown, Loader2, AlertTriangle, Lock, UserCheck, Power } from "lucide-react";
import { FlagIcon } from "@/components/ui/flag-icon";

const CryptoLogo = ({ crypto, className }: { crypto: string; className?: string }) => {
    switch (crypto) {
        case 'BTC': return <BtcLogo className={className} />;
        case 'ETH': return <EthLogo className={className} />;
        case 'LTC': return <LtcLogo className={className} />;
        case 'USDT': return <UsdtLogo className={className} />;
        default: return null;
    }
}


function TraderProfileCard({ user, ad, feedback }: { user: User, ad: P2PAd, feedback: Feedback[] | null }) {
    const positiveFeedback = user.positiveFeedback || 0;
    const negativeFeedback = user.negativeFeedback || 0;

    return (
        <Card className="mb-8">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-4 border-background ring-2 ring-primary">
                        <AvatarImage src={user.photoURL} />
                        <AvatarFallback><DefaultAvatar /></AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                             <h2 className="text-2xl font-bold">{user.userId}</h2>
                             {user.country && <FlagIcon countryCode={user.country} className="w-6 h-auto" />}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {user.lastActive && <p>Active {formatDistanceToNow(toDate(user.lastActive)!)} ago</p>}
                        </div>
                    </div>
                </div>
                 <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
                    {user.badges?.includes('verified') && (
                        <Badge variant="outline" className="text-green-600 border-green-500/50 bg-green-50">
                            <UserCheck className="mr-2 h-4 w-4" /> ID Verified
                        </Badge>
                    )}
                     {user.badges?.includes('power') && (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/50 bg-amber-50">
                            <Power className="mr-2 h-4 w-4" /> Power Trader
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-6">
                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Feedback</span>
                    <span className="font-semibold">{user.feedbackScore?.toFixed(1)}%</span>
                </div>
                 <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Avg. Release Time</span>
                    <span className="font-semibold">{user.avgReleaseTime || 0} min</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Total Trades</span>
                    <span className="font-semibold">{user.completedTrades}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Feedback Score</span>
                    <div className="flex gap-2 font-semibold">
                       <span className="text-green-600 flex items-center gap-1"><ThumbsUp className="h-4 w-4"/> {positiveFeedback}</span>
                       <span className="text-red-600 flex items-center gap-1"><ThumbsDown className="h-4 w-4"/> {negativeFeedback}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function TradeForm({ ad }: { ad: P2PAd }) {
    const { user: authUser } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { prices, fiatRates } = usePrices();

    const [fiatAmount, setFiatAmount] = useState('');
    const [cryptoAmount, setCryptoAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const marketPriceUsd = prices[ad.crypto] || 0;
    const exchangeRate = fiatRates[ad.fiatCurrency] || 1;
    const marketPriceInFiat = marketPriceUsd * exchangeRate;
    
    const adPrice = ad.rateType === 'fixed' 
        ? ad.fixedRate! 
        : marketPriceInFiat * (1 + (ad.ratePercent || 0) / 100);

    const pricePremium = marketPriceInFiat > 0 ? (adPrice - marketPriceInFiat) / marketPriceInFiat : 0;
    
    const handleFiatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFiatAmount(value);
        if (value && adPrice > 0) {
            setCryptoAmount((parseFloat(value) / adPrice).toFixed(8));
        } else {
            setCryptoAmount('');
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authUser) {
             router.push(`/login?redirect=/ad/${ad.id}`);
             return;
        }
        if (!fiatAmount || !ad || !firestore) return;
        
        setIsSubmitting(true);
        try {
            const tradeId = await initiateTrade(firestore, authUser.uid, ad, parseFloat(cryptoAmount), parseFloat(fiatAmount), ad.paymentMethods[0]);
            toast({ title: "Trade Initiated!", description: "You are being redirected to the trade room." });
            router.push(`/trade/${tradeId}`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Trade Failed", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardContent className="pt-6 space-y-6">
                 {pricePremium !== 0 && (
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Custom Exchange Rate</AlertTitle>
                        <AlertDescription>
                            This offer uses a custom rate that is {Math.abs(pricePremium * 100).toFixed(2)}% {pricePremium > 0 ? 'above' : 'below'} market.
                        </AlertDescription>
                    </Alert>
                )}
                <div>
                    <Label htmlFor="pay-amount">Pay with {ad.paymentMethods.join(', ')}</Label>
                    <p className="text-xs text-muted-foreground">Range: {ad.minAmount} - {ad.maxAmount} {ad.fiatCurrency}</p>
                    <div className="relative mt-1">
                        <Input id="pay-amount" type="number" placeholder="Amount to pay" value={fiatAmount} onChange={handleFiatChange} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">{ad.fiatCurrency}</span>
                    </div>
                </div>
                <div>
                    <Label htmlFor="receive-amount">Receive {ad.crypto}</Label>
                    <div className="relative mt-1">
                        <Input id="receive-amount" type="number" value={cryptoAmount} readOnly placeholder="Amount to receive" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">{ad.crypto}</span>
                    </div>
                </div>
                <Button type="submit" size="lg" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {authUser ? 'Trade' : 'Join & Trade'}
                </Button>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Lock className="h-3 w-3" />
                    Your funds are protected by escrow for a secure trade.
                </div>
            </CardContent>
        </Card>
    );
}

export default function AdDetailPage() {
    const params = useParams();
    const { firestore } = useFirebase();
    const adId = Array.isArray(params.adId) ? params.adId[0] : params.adId;

    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [isFeedbackLoading, setIsFeedbackLoading] = useState(true);

    const adRef = useMemoFirebase(() => (adId ? doc(firestore, "p2p_ads", adId) : null), [firestore, adId]);
    const { data: ad, isLoading: isAdLoading } = useDoc<P2PAd>(adRef);

    const userRef = useMemoFirebase(() => (ad ? doc(firestore, 'users', ad.userId) : null), [ad]);
    const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);

    useEffect(() => {
        if (!firestore || !user) return;
        
        const getFeedback = async () => {
            setIsFeedbackLoading(true);
            try {
                 const feedbackQuery = query(
                    collectionGroup(firestore, 'feedback'),
                    where('toUser', '==', user.id),
                    orderBy('createdAt', 'desc'),
                    limit(10)
                );
                const snapshot = await getDocs(feedbackQuery);
                setFeedback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Feedback)));
            } catch (error) {
                console.error("Failed to fetch feedback:", error);
            } finally {
                setIsFeedbackLoading(false);
            }
        };
        getFeedback();
    }, [firestore, user]);

    if (isAdLoading || isUserLoading) {
        return <div className="space-y-8"><Skeleton className="h-48 w-full" /><div className="grid md:grid-cols-3 gap-8"><Skeleton className="md:col-span-2 h-96 w-full" /><Skeleton className="h-96 w-full" /></div></div>
    }

    if (!ad || !user) {
        return <Card><CardHeader><CardTitle>Ad Not Found</CardTitle></CardHeader></Card>;
    }

    const titleAction = ad.adType === 'buy' ? 'Sell' : 'Buy';
    const actionColor = titleAction === 'Buy' ? 'text-green-500' : 'text-red-500';
    
    return (
        <div className="space-y-8">
            <div className="bg-card text-card-foreground p-6 md:p-8 rounded-lg shadow-lg">
                 <p className="text-sm text-muted-foreground">
                    {user.country ? <Link href={`/buy?country=${user.country}`} className="hover:underline">{user.country}</Link> : 'Global'} / <Link href={`/${ad.adType === 'sell' ? 'buy' : 'sell'}`} className="hover:underline">{titleAction} {ad.crypto}</Link> / {ad.paymentMethods[0]}
                </p>
                <h1 className="text-3xl md:text-4xl font-bold mt-2 flex items-center gap-2 flex-wrap">
                    <span className={actionColor}>{titleAction}</span>
                    <CryptoLogo crypto={ad.crypto} className="h-8 w-8" />
                    <span>{ad.crypto} with {ad.paymentMethods[0]} from {ad.user.username}</span>
                </h1>
            </div>

            <TraderProfileCard user={user} ad={ad} feedback={feedback} />

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Offer Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {ad.offerLabel && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Offer Label</h4>
                                    <Badge variant="default">{ad.offerLabel}</Badge>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-sm p-3 bg-secondary rounded-md">
                                <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Payment Window</div>
                                <div className="font-semibold">{ad.paymentTimeLimit} min</div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Payment Methods</h4>
                                <div className="flex flex-wrap gap-2">
                                    {ad.paymentMethods.map(pm => <Badge key={pm} variant="secondary">{pm}</Badge>)}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-semibold text-sm">Offer Info</h4>
                                <div className="flex flex-wrap gap-2">
                                     {ad.tags?.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-semibold text-sm">Offer Terms</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ad.terms}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Offer Feedback</CardTitle>
                            <CardDescription>Recent feedback for {user.userId}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isFeedbackLoading ? (
                                <Skeleton className="h-24 w-full" />
                            ) : feedback.length > 0 ? (
                                feedback.map(fb => <FeedbackCard key={fb.id} feedback={fb} />)
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">No feedback yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1">
                    <TradeForm ad={ad} />
                </div>
            </div>
        </div>
    );
}
