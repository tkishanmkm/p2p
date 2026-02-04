
"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function FullPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
   const { user, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Render the layout shell immediately.
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <DashboardHeader />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {isUserLoading || !user ? (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
            children
        )}
      </main>
    </div>
  );
}
