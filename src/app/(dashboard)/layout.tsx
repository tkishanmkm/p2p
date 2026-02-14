
"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { Footer } from "@/components/layout/footer";
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isTradePage = pathname.startsWith('/trade/');

  return (
    <div className="flex flex-col min-h-screen w-full">
      <DashboardHeader />
      <main className="flex flex-1 flex-col gap-4 p-2 sm:p-4 lg:p-6 bg-secondary/30">
        {children}
      </main>
      {!isTradePage && <Footer />}
    </div>
  );
}
