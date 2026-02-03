import { SupportForm } from "@/components/support/support-form";

export default function SupportPage() {
    return (
        <>
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Support Center</h1>
            </div>
            <div className="flex-1 rounded-lg">
                <SupportForm />
            </div>
        </>
    );
}
