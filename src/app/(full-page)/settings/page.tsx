
import { ProfileSettings } from "@/components/settings/profile-settings";
import { ChangeUsernameForm } from "@/components/settings/change-username-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { ChangeCurrencyForm } from "@/components/settings/change-currency-form";
import { SessionManagement } from "@/components/settings/session-management";
import { BlockedUsersManagement } from "@/components/settings/blocked-users-management";

export default function SettingsPage() {
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
