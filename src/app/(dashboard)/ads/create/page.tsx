"use client";

import { CreateAdForm } from "@/components/p2p/create-ad-form";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountStatusAlert } from "@/components/p2p/account-status-alert";

export default function CreateAdPage() {
  const { firestore, user: authUser } = useFirebase();
  const userRef = useMemoFirebase(() => (authUser ? doc(firestore, "users", authUser.uid) : null), [firestore, authUser]);
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Create Ad</h1>
      </div>
      <div className="flex-1 rounded-lg">
        {isUserLoading && <Skeleton className="h-96 w-full" />}
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
