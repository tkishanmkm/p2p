// This is a new file
"use client";

import { CreateAdForm } from "@/components/p2p/create-ad-form";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { P2PAd } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";

export default function EditAdPage() {
  const { firestore } = useFirebase();
  const params = useParams();
  const adId = Array.isArray(params.adId) ? params.adId[0] : params.adId;

  const adRef = useMemoFirebase(() => (adId ? doc(firestore, "p2p_ads", adId) : null), [firestore, adId]);
  const { data: ad, isLoading: isAdLoading } = useDoc<P2PAd>(adRef);

  return (
    <>
      <div className="flex-1 rounded-lg">
        {isAdLoading && <Skeleton className="h-[600px] w-full" />}
        {!isAdLoading && ad && (
            <CreateAdForm ad={ad} isAdmin={true} />
        )}
         {!isAdLoading && !ad && (
            <p>Ad not found.</p>
        )}
      </div>
    </>
  );
}
