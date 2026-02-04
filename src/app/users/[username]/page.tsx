'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { User, P2PAd } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { DefaultAvatar } from '@/components/icons';
import { AdCard } from '@/components/p2p/ad-card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Clock, DollarSign, ThumbsUp, ThumbsDown, FileText } from 'lucide-react';
import { toDate } from '@/lib/utils';

function UserStats({ user }: { user: User }) {
  const lastTradeDate = toDate(user.lastTradeAt);
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Statistics</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Trade Volume</p>
            <p className="font-semibold">${parseFloat(user.tradeVolume).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Completed Trades</p>
            <p className="font-semibold">{user.completedTrades}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThumbsUp className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Positive</p>
            <p className="font-semibold">{user.positiveFeedback || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThumbsDown className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Negative</p>
            <p className="font-semibold">{user.negativeFeedback || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Avg. Payment Time</p>
            <p className="font-semibold">{user.avgPaymentTime || 0} min</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Avg. Release Time</p>
            <p className="font-semibold">{user.avgReleaseTime || 0} min</p>
          </div>
        </div>
        <div className="flex items-center gap-3 col-span-2">
          <Clock className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Last Trade</p>
            <p className="font-semibold">{lastTradeDate ? formatDistanceToNow(lastTradeDate) + ' ago' : 'N/A'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default function PublicProfilePage() {
  const params = useParams();
  const { firestore } = useFirebase();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;

  const userQuery = useMemoFirebase(
    () => (firestore && username ? query(collection(firestore, 'users'), where('userId', '==', username), limit(1)) : null),
    [firestore, username]
  );
  const { data: users, isLoading: isUserLoading } = useCollection<User>(userQuery);
  const user = users?.[0];
  
  const adsQuery = useMemoFirebase(
      () => (firestore && user ? query(collection(firestore, "p2p_ads"), where("userId", "==", user.id), where("active", "==", true)) : null),
      [firestore, user]
  );
  const { data: ads, isLoading: areAdsLoading } = useCollection<P2PAd>(adsQuery);


  if (isUserLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Not Found</CardTitle>
          <CardDescription>The user "{username}" does not exist.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const createdDate = toDate(user.createdAt);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardContent className="pt-6 flex flex-col items-center text-center">
                    <Avatar className="h-32 w-32 mb-4 border-4 border-secondary shadow-lg">
                        {user.photoURL ? (
                            <Image src={user.photoURL} alt={user.userId} width={128} height={128} className="object-cover"/>
                        ) : (
                            <AvatarFallback className="bg-transparent">
                                <DefaultAvatar />
                            </AvatarFallback>
                        )}
                    </Avatar>
                    <h1 className="text-2xl font-bold">{user.userId}</h1>
                     <div className="flex gap-2 mt-2">
                        {user.isBanned && <Badge variant="destructive">Banned</Badge>}
                        {user.isOnHold && <Badge variant="secondary" className="bg-yellow-500 text-white">On Hold</Badge>}
                        {!user.isBanned && !user.isOnHold && <Badge className="bg-green-500">Verified</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Joined {createdDate ? formatDistanceToNow(createdDate) + ' ago' : 'N/A'}
                    </p>
                </CardContent>
            </Card>
            <UserStats user={user} />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Ads</CardTitle>
              <CardDescription>
                P2P ads currently run by {user.userId}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {areAdsLoading && <Skeleton className="h-32 w-full" />}
              {!areAdsLoading && ads && ads.length > 0 ? (
                ads.map(ad => <AdCard key={ad.id} ad={ad} />)
              ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Active Ads</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{user.userId} does not have any active ads right now.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
