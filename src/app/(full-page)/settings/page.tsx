
'use client';

import { ProfileSettings } from "@/components/settings/profile-settings";
import { ChangeUsernameForm } from "@/components/settings/change-username-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { ChangeCurrencyForm } from "@/components/settings/change-currency-form";
import { SessionManagement } from "@/components/settings/session-management";
import { BlockedUsersManagement } from "@/components/settings/blocked-users-management";
import { useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { user, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">Settings</h1>
      </div>
      <div className="max-w-3xl mx-auto space-y-8">
        <ProfileSettings />
        <ChangeUsernameForm />
        <ChangePasswordForm />
        <ChangeCurrencyForm />
        <SessionManagement />
        <BlockedUsersManagement />
      </div>
    </>
  );
}
