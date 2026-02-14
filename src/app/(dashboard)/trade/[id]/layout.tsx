"use client";

import { DashboardHeader } from "@/components/dashboard/header";

export default function TradePageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen w-full">
      <DashboardHeader />
      <main className="flex-1 flex flex-col p-2 sm:p-4 lg:p-6 bg-secondary/30 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
