"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreateAdForm } from "@/components/p2p/create-ad-form";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountStatusAlert } from "@/components/p2p/account-status-alert";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FileWarning } from 'lucide-react';


function CreateAdPageContent() {
  const { firestore, user: authUser, isUserLoading: isAuthLoading } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const adType = searchParams.get('type') as 'buy' | 'sell' | null;

  useEffect(() => {
    if (!isAuthLoading && !authUser) {
      const redirectPath = adType ? `/ads/create?type=${adType}` : '/ads/create';
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [authUser, isAuthLoading, router, adType]);

  const userRef = useMemoFirebase(() => (authUser ? doc(firestore, "users", authUser.uid) : null), [firestore, authUser]);
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);

  if (isAuthLoading || !authUser) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!adType) {
     return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Invalid Ad Type</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Please specify whether you want to create a 'buy' or a 'sell' ad. You can do this by visiting the main Buy or Sell pages.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
     )
  }
  
  const title = adType === 'buy' ? 'Create a Buy Ad' : 'Create a Sell Ad';
  const description = adType === 'buy'
    ? 'This ad will be shown to users who want to sell their crypto to you.'
    : 'This ad will be shown to users who want to buy crypto from you.';


  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">{title}</h1>
      </div>
       <p className="text-muted-foreground mb-4">{description}</p>
      <div className="flex-1 rounded-lg">
        {isUserLoading && <Skeleton className="h-[600px] w-full" />}
        {!isUserLoading && user && (user.isBanned || user.isOnHold) ? (
            <div className="mt-4">
                 <AccountStatusAlert user={user} />
            </div>
        ) : (
          <CreateAdForm adType={adType} />
        )}
      </div>
    </>
  );
}

export default function CreateAdPage() {
    return (
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}>
            <CreateAdPageContent />
        </Suspense>
    )
}
