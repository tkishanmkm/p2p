"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { useFirebase } from "@/firebase";
import { useRouter }from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
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

  // Render the layout shell immediately, and only show a loader for the main content area
  // while the user is being authenticated. This provides a better perceived performance.
  return (
    <div className="flex flex-col min-h-screen w-full">
      <DashboardHeader />
      <main className="flex flex-1 flex-col gap-4 p-2 sm:p-4 lg:p-6 bg-secondary/20">
        {isUserLoading || !user ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
