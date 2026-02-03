
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PlusCircle,
  LifeBuoy,
  Menu,
  ArrowDownToLine,
  ArrowUpFromLine,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { DefaultAvatar } from "../icons";
import { Badge } from "../ui/badge";
import { collection, doc, orderBy, query, updateDoc } from "firebase/firestore";
import type { UserWallet, Notification } from "@/lib/types";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/buy", label: "Buy Crypto", icon: ArrowDownToLine },
  { href: "/sell", label: "Sell Crypto", icon: ArrowUpFromLine },
  { href: "/ads/create", label: "Create Ad", icon: PlusCircle },
  { href: "/trades", label: "My Trades", icon: ArrowLeftRight },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export function DashboardHeader() {
  const { user, firestore } = useFirebase();
  const pathname = usePathname();

  const walletsRef = useMemoFirebase(() => user ? collection(firestore, "users", user.uid, "wallets") : null, [firestore, user]);
  const { data: wallets } = useCollection<UserWallet>(walletsRef);
  
  const notificationsRef = useMemoFirebase(() => user ? collection(firestore, "users", user.uid, "notifications") : null, [firestore, user]);
  const notificationsQuery = useMemoFirebase(() => notificationsRef ? query(notificationsRef, orderBy("createdAt", "desc")) : null, [notificationsRef]);
  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const [prices, setPrices] = useState({ BTC: 65000, ETH: 3500, USDT: 1, LTC: 100 });

  useEffect(() => {
    const interval = setInterval(() => {
        setPrices(prev => ({
            BTC: prev.BTC * (1 + (Math.random() - 0.5) * 0.01),
            ETH: prev.ETH * (1 + (Math.random() - 0.5) * 0.01),
            USDT: 1,
            LTC: prev.LTC * (1 + (Math.random() - 0.5) * 0.01),
        }))
    }, 15000);
    return () => clearInterval(interval);
  }, []);
  
  const totalWalletValue = wallets?.reduce((acc, wallet) => {
    const value = (wallet.balance + wallet.lockedBalance) * (prices[wallet.crypto] || 0);
    return acc + value;
  }, 0) || 0;

  const handleMarkAsRead = async (notificationId: string) => {
    if (!firestore || !user) return;
    const notifRef = doc(firestore, "users", user.uid, "notifications", notificationId);
    await updateDoc(notifRef, { isRead: true });
  }
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-semibold md:text-base"
        >
          <Logo />
          <span className="sr-only">TradeFlow</span>
        </Link>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 transition-colors ${
              pathname === item.href
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="#"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Logo />
              <span className="sr-only">TradeFlow</span>
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 text-base transition-colors ${
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="ml-auto flex-1 sm:flex-initial">
          {/* Search can go here */}
        </div>
        <ModeToggle />
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{unreadCount}</Badge>
                    )}
                    <span className="sr-only">Toggle notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications && notifications.length > 0 ? notifications.map(n => (
                    <DropdownMenuItem key={n.id} asChild className={cn("flex items-start gap-2", !n.isRead && "bg-secondary")}>
                         <Link href={n.link || "#"} onClick={() => handleMarkAsRead(n.id)}>
                            <Mail className="mt-1 h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                                <p className="text-sm leading-snug">{n.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                        </Link>
                    </DropdownMenuItem>
                )) : (
                    <p className="p-4 text-center text-sm text-muted-foreground">No new notifications.</p>
                )}
            </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 p-1 h-auto rounded-full">
                <Avatar className="h-8 w-8">
                    {user?.photoURL ? (
                    <AvatarImage src={user.photoURL} alt={user.displayName || "User Avatar"} />
                    ) : (
                    <AvatarFallback className="bg-transparent">
                        <DefaultAvatar />
                    </AvatarFallback>
                    )}
                </Avatar>
                 <div className="text-left hidden md:block">
                    {user?.displayName ? <p className="font-semibold text-sm">{user.displayName}</p> : <Skeleton className="h-5 w-20" />}
                    <p className="text-xs text-muted-foreground">${totalWalletValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.displayName || "My Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/support">Support</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
