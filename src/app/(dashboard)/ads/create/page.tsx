"use client";

import { Suspense } from 'react';
import { CreateAdForm } from "@/components/p2p/create-ad-form";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountStatusAlert } from "@/components/p2p/account-status-alert";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function CreateAdPageContent() {
  const { firestore, user: authUser, isUserLoading: isAuthLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !authUser) {
      router.push(`/login?redirect=/ads/create`);
    }
  }, [authUser, isUserLoading, router]);

  const userRef = useMemoFirebase(() => (authUser ? doc(firestore, "users", authUser.uid) : null), [firestore, authUser]);
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);

  if (isAuthLoading || !authUser) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <>
      <div className="flex-1 rounded-lg">
        {isUserLoading && <Skeleton className="h-[600px] w-full" />}
        {!isUserLoading && user && (user.isBanned || user.isOnHold) ? (
            <div className="mt-4">
                 <AccountStatusAlert user={user} />
            </div>
        ) : (
          <CreateAdForm />
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
