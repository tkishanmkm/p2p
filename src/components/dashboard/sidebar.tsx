"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PlusCircle,
  LifeBuoy,
  LogOut,
  Repeat,
  Settings
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useFirebase } from "@/firebase";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/buy", label: "Buy Coin", icon: Repeat },
  { href: "/sell", label: "Sell Coin", icon: Repeat },
  { href: "/ads/create", label: "Create Ad", icon: PlusCircle },
  { href: "/trades", label: "My Trades", icon: ArrowLeftRight },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useFirebase();

  return (
    <Sidebar>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  icon={<item.icon />}
                  tooltip={item.label}
                >
                  {item.label}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator />
      <SidebarFooter>
         <div className="flex items-center gap-3 p-2">
            <Avatar className="h-10 w-10">
              {user?.photoURL ? (
                <AvatarImage src={user.photoURL} alt={user.displayName || "User Avatar"} />
              ) : (
                <AvatarFallback className="bg-white border text-muted-foreground">
                  {user?.displayName?.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
          <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
            <p className="font-semibold truncate">{user?.displayName || "..."}</p>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/settings">
              <SidebarMenuButton icon={<Settings />} tooltip="Settings">
                Settings
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton icon={<LogOut />} tooltip="Logout">
              Logout
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
