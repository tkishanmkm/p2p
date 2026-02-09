"use client";

import { CreateAdForm } from "@/components/p2p/create-ad-form";

export default function CreateBuyAdPage() {
  return (
    <>
      <div className="flex-1 rounded-lg">
        <CreateAdForm adType="buy" />
      </div>
    </>
  );
}
