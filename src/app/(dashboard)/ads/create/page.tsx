import { CreateAdForm } from "@/components/p2p/create-ad-form";

export default function CreateAdPage() {
  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Create Ad</h1>
      </div>
      <div className="flex-1 rounded-lg">
        <CreateAdForm />
      </div>
    </>
  );
}
