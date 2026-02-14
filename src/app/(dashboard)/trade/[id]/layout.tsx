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
      <main className="flex flex-1 flex-col gap-4 p-2 sm:p-4 lg:p-6 bg-secondary/30 overflow-hidden">
        {children}
      </main>
      {/* No Footer here to provide a focused trading experience */}
    </div>
  );
}
