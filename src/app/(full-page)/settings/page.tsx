
import { ProfileSettings } from "@/components/settings/profile-settings";
import { ChangeUsernameForm } from "@/components/settings/change-username-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { ChangeCurrencyForm } from "@/components/settings/change-currency-form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { User, Lock, Image, Coins } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">Settings</h1>
      </div>
      <div className="flex-1 rounded-lg max-w-3xl mx-auto">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile"><Image className="mr-2 h-4 w-4" /> Profile Picture</TabsTrigger>
            <TabsTrigger value="username"><User className="mr-2 h-4 w-4" /> Username</TabsTrigger>
            <TabsTrigger value="security"><Lock className="mr-2 h-4 w-4" /> Security</TabsTrigger>
            <TabsTrigger value="currency"><Coins className="mr-2 h-4 w-4" /> Currency</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-6">
            <ProfileSettings />
          </TabsContent>
          <TabsContent value="username" className="mt-6">
            <ChangeUsernameForm />
          </TabsContent>
          <TabsContent value="security" className="mt-6">
            <ChangePasswordForm />
          </TabsContent>
          <TabsContent value="currency" className="mt-6">
            <ChangeCurrencyForm />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
