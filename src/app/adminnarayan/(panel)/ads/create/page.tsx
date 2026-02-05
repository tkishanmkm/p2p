// This is a new file
"use client";

import { CreateAdForm } from "@/components/p2p/create-ad-form";

export default function CreateAdminAdPage() {
  return (
    <>
      <div className="flex-1 rounded-lg">
        <CreateAdForm isAdmin={true} />
      </div>
    </>
  );
}
