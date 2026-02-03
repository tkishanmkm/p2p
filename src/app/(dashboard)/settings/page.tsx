import { ProfileSettings } from "@/components/settings/profile-settings";

export default function SettingsPage() {
  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Settings</h1>
      </div>
      <div className="flex flex-1 rounded-lg max-w-2xl mx-auto">
        <ProfileSettings />
      </div>
    </>
  );
}

    