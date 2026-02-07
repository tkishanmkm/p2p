
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
  FileText,
  LogOut,
  User,
  Settings,
  Send,
  Globe, 
  ChevronDown, 
  BookOpen, 
  Shield, 
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { DefaultAvatar } from "../icons";
import { Badge } from "../ui/badge";
import { collection, doc, orderBy, query, updateDoc } from "firebase/firestore";
import type { UserWallet, Notification, User as AppUser } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { cn, toDate } from "@/lib/utils";
import { usePrices } from "@/context/price-context";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES } from "@/lib/constants";
import { FlagIcon } from "../ui/flag-icon";


const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/buy", label: "Buy Coin", icon: ArrowDownToLine },
  { href: "/sell", label: "Sell Coin", icon: ArrowUpFromLine },
  { href: "/transfer", label: "Transfer", icon: Send },
  { href: "/ads/create", label: "Create Ad", icon: PlusCircle },
  { href: "/my-ads", label: "My Ads", icon: FileText },
  { href: "/trades", label: "My Trades", icon: ArrowLeftRight },
  { href: "/contact", label: "Support", icon: LifeBuoy },
];

export function DashboardHeader() {
  const { user: authUser, isUserLoading, firestore, auth } = useFirebase();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { prices, fiatRates } = usePrices();
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);

  const userDocRef = useMemoFirebase(() => authUser ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: userData } = useDoc<AppUser>(userDocRef);

  const walletsRef = useMemoFirebase(() => authUser ? collection(firestore, "users", authUser.uid, "wallets") : null, [firestore, authUser]);
  const { data: wallets } = useCollection<UserWallet>(walletsRef);
  
  const notificationsRef = useMemoFirebase(() => authUser ? collection(firestore, "users", authUser.uid, "notifications") : null, [firestore, authUser]);
  const notificationsQuery = useMemoFirebase(() => notificationsRef ? query(notificationsRef, orderBy("createdAt", "desc")) : null, [notificationsRef]);
  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  
  const totalWalletValueUSD = wallets?.reduce((acc, wallet) => {
    const value = (wallet.balance || 0) * (prices[wallet.crypto] || 0);
    return acc + value;
  }, 0) || 0;

  const preferredCurrency = userData?.preferredCurrency || 'USD';
  const exchangeRate = fiatRates[preferredCurrency] || 1;
  const totalWalletValueConverted = totalWalletValueUSD * exchangeRate;


  const handleMarkAsRead = async (notificationId: string) => {
    if (!firestore || !authUser) return;
    const notifRef = doc(firestore, "users", authUser.uid, "notifications", notificationId);
    await updateDoc(notifRef, { isRead: true });
  }

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Failed", description: "An error occurred during logout." });
    }
  };

  const handleLanguageSelect = (language: { name: string; code: string; nativeName: string; }) => {
    setSelectedLanguage(language);
    toast({
      title: `Language set to ${language.name}`,
      description: "Full app translation is a feature coming soon.",
    });
  };

  // Loading State
  if (isUserLoading) {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 justify-between">
            <Link href="/buy" className="flex items-center gap-2 text-lg font-semibold md:text-base"><Logo /></Link>
            <div className="flex items-center gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /></div>
        </header>
    );
  }

  // Unauthenticated State
  if (!authUser) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="mr-8 flex">
            <Link href="/buy">
              <Logo />
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="hidden md:flex items-center gap-6 text-sm">
               <Link href="/buy" className="font-medium text-foreground/80 transition-colors hover:text-foreground">Buy</Link>
               <Link href="/sell" className="font-medium text-foreground/80 transition-colors hover:text-foreground">Sell</Link>
               <Link href="/contact" className="font-medium text-foreground/80 transition-colors hover:text-foreground">Support</Link>
            </nav>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <Button variant="ghost" asChild className="text-foreground/80 px-2 font-semibold"><Link href="/login">Log in</Link></Button>
              <Button asChild><Link href="/signup">Join us</Link></Button>
            </div>
          </div>
        </div>
      </header>
    );
  }
  
  // Authenticated State
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 justify-between">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Desktop nav */}
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
              className={cn(
                "flex items-center gap-2 transition-colors hover:text-foreground",
                pathname === item.href
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 md:hidden">
            <Sheet>
                <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
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
            <Link href="/dashboard" className="flex items-center font-semibold">
                <Logo />
            </Link>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <ModeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4" />
              <span>{selectedLanguage.code.toUpperCase()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem key={lang.code} onClick={() => handleLanguageSelect(lang)}>
                <div className="flex flex-col">
                    <span className="font-medium">{lang.nativeName}</span>
                    <span className="text-xs text-muted-foreground">{lang.name}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center">
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
                                    <p className="text-xs text-muted-foreground mt-1">{toDate(n.createdAt)?.toLocaleString() ?? 'Invalid Date'}</p>
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
                <Button variant="ghost" className="flex shrink-0 items-center gap-2 p-1 h-auto rounded-md">
                    {userData?.country && <FlagIcon countryCode={userData.country} className="w-5 h-auto rounded-sm" />}
                    <Avatar className="h-8 w-8 shrink-0">
                        {authUser?.photoURL ? (
                        <AvatarImage src={authUser.photoURL} alt={authUser.displayName || "User Avatar"} />
                        ) : (
                        <AvatarFallback className="bg-transparent">
                            <DefaultAvatar />
                        </AvatarFallback>
                        )}
                    </Avatar>
                    <div className="flex-shrink min-w-0 text-left hidden sm:block">
                        {authUser?.displayName ? <p className="font-semibold text-xs truncate">{authUser.displayName}</p> : <Skeleton className="h-5 w-20" />}
                        <p className="text-[10px] text-muted-foreground truncate">{totalWalletValueConverted.toLocaleString(undefined, { style: 'currency', currency: preferredCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{authUser?.displayName || "My Account"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                <Link href="/trades">
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    <span>My Trades</span>
                </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
