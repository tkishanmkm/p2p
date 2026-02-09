"use client";

import { CreateAdForm } from "@/components/p2p/create-ad-form";

export default function CreateSellAdPage() {
  return (
    <>
      <div className="flex-1 rounded-lg">
        <CreateAdForm adType="sell" />
      </div>
    </>
  );
}
