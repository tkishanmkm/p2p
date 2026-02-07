
"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { Footer } from "@/components/layout/footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <DashboardHeader />
      <main className="flex flex-1 flex-col gap-4 p-2 sm:p-4 lg:p-6 bg-secondary/30">
        {children}
      </main>
      <Footer />
    </div>
  );
}
