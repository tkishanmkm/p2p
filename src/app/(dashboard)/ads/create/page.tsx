"use client";

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowDown, ArrowUp } from 'lucide-react';
import Link from 'next/link';

export default function CreateAdSelectionPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">Create a New Ad</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Link href="/ads/create-sell-ad">
          <Card className="hover:border-destructive transition-all cursor-pointer h-full">
            <CardHeader className="text-center">
              <div className="mx-auto bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-full w-max">
                <ArrowUp className="h-8 w-8" />
              </div>
              <CardTitle className="mt-4">Create a Sell Ad</CardTitle>
              <CardDescription>
                You want to sell your cryptocurrency to other users for fiat money.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/ads/create-buy-ad">
          <Card className="hover:border-green-500 transition-all cursor-pointer h-full">
            <CardHeader className="text-center">
              <div className="mx-auto bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-full w-max">
                <ArrowDown className="h-8 w-8" />
              </div>
              <CardTitle className="mt-4">Create a Buy Ad</CardTitle>
              <CardDescription>
                You want to buy cryptocurrency from other users using fiat money.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </>
  );
}
