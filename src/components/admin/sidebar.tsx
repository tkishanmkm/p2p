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
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  LifeBuoy,
  LogOut,
  ShieldAlert,
  Wallet,
  Settings,
  FileText,
  Brush,
  ArrowDownToLine,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  { href: "/adminnarayan/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "#", label: "Users", icon: Users },
  { href: "#", label: "Trades", icon: ArrowLeftRight },
  { href: "/adminnarayan/deposits", label: "Deposits", icon: ArrowDownToLine, badge: 3 },
  { href: "#", label: "Withdrawals", icon: Wallet, badge: 1 },
  { href: "#", label: "Ads", icon: FileText },
  { href: "/adminnarayan/support", label: "Support", icon: LifeBuoy, badge: 2 },
  { href: "#", label: "Disputes", icon: ShieldAlert, badge: 1 },
];

const settingsItems = [
    { href: "/adminnarayan/appearance", label: "Appearance", icon: Brush },
    { href: "/adminnarayan/settings/wallet", label: "Wallet Settings", icon: Wallet },
    { href: "#", label: "Security Logs", icon: FileText },
]

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Logo />
        <Badge variant="destructive">ADMIN</Badge>
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
                  <span className="flex-grow">{item.label}</span>
                  {item.badge && <Badge variant="destructive" className="ml-auto">{item.badge}</Badge>}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarGroup>
            <SidebarGroupLabel className="flex items-center">
                <Settings className="mr-2" />
                Settings
            </SidebarGroupLabel>
             <SidebarMenu>
                {settingsItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                    <Link href={item.href}>
                        <SidebarMenuButton
                        isActive={pathname === item.href}
                        icon={<item.icon />}
                        tooltip={item.label}
                        >
                        <span className="flex-grow">{item.label}</span>
                        </SidebarMenuButton>
                    </Link>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <Separator />
      <SidebarFooter>
         <div className="flex items-center gap-3 p-2">
          <Avatar className="h-10 w-10">
              <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
            <p className="font-semibold truncate">Narayanharihari</p>
            <p className="text-xs text-muted-foreground truncate">Super Administrator</p>
          </div>
        </div>
        <SidebarMenu>
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
    