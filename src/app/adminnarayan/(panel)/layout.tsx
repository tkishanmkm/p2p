"use client";

import { AdminSidebar } from "@/components/admin/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAdminStatus } from "@/hooks/use-admin-status";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, isLoading } = useAdminStatus();
  const router = useRouter();

  useEffect(() => {
    // If the check is complete (`!isLoading`) and the user is not an admin, redirect them.
    if (!isLoading && !isAdmin) {
      router.push("/adminnarayan/login");
    }
  }, [isAdmin, isLoading, router]);

  // While the admin check is in progress, or if the user is not an admin (and is about to be redirected), show a loader.
  // This prevents flashing the dashboard content to non-admin users.
  if (isLoading || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  // If the checks have passed, render the admin dashboard layout.
  return (
    <SidebarProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted/40 md:block">
          <AdminSidebar />
        </div>
        <div className="flex flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-secondary/20">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
