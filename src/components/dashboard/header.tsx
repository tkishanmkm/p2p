
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { Logo } from '@/components/logo';
import { ModeToggle } from '@/components/mode-toggle';
import { DefaultAvatar } from '../icons';
import { Badge } from '../ui/badge';
import { collection, doc, orderBy, query, updateDoc } from 'firebase/firestore';
import type { UserWallet, Notification, User as AppUser, Language } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { cn, toDate } from '@/lib/utils';
import { usePrices } from '@/context/price-context';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { LANGUAGES } from '@/lib/constants';
import { FlagIcon } from '../ui/flag-icon';
import { useI18n } from '@/context/i18n-context';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wallets', label: 'Wallets', icon: Wallet },
  { href: '/buy', label: 'Buy Coin', icon: ArrowDownToLine },
  { href: '/sell', label: 'Sell Coin', icon: ArrowUpFromLine },
  { href: '/transfer', label: 'Transfer', icon: Send },
];

const mobileNavItems = [
    ...navItems,
    { href: '/ads/create', label: 'Create Ad', icon: PlusCircle },
    { href: '/my-ads', label: 'My Ads', icon: FileText },
    { href: '/trades', label: 'My Trades', icon: ArrowLeftRight },
    { href: '/contact', label: 'Support', icon: LifeBuoy },
];

export function DashboardHeader() {
  const { user: authUser, isUserLoading, firestore, auth } = useFirebase();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { prices, fiatRates } = usePrices();
  const { language, setLanguage } = useI18n();
  const selectedLanguage = LANGUAGES.flatMap(l => l.dialects || l).find(l => l.code === language) || LANGUAGES[0];


  const userDocRef = useMemoFirebase(() => (authUser ? doc(firestore, 'users', authUser.uid) : null), [
    firestore,
    authUser,
  ]);
  const { data: userData } = useDoc<AppUser>(userDocRef);

  const walletsRef = useMemoFirebase(
    () => (authUser ? collection(firestore, 'users', authUser.uid, 'wallets') : null),
    [firestore, authUser]
  );
  const { data: wallets } = useCollection<UserWallet>(walletsRef);

  const notificationsRef = useMemoFirebase(
    () => (authUser ? collection(firestore, 'users', authUser.uid, 'notifications') : null),
    [firestore, authUser]
  );
  const notificationsQuery = useMemoFirebase(
    () => (notificationsRef ? query(notificationsRef, orderBy('createdAt', 'desc')) : null),
    [notificationsRef]
  );
  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  const totalWalletValueUSD =
    wallets?.reduce((acc, wallet) => {
      const value = (wallet.balance || 0) * (prices[wallet.crypto] || 0);
      return acc + value;
    }, 0) || 0;

  const preferredCurrency = userData?.preferredCurrency || 'USD';
  const exchangeRate = fiatRates[preferredCurrency] || 1;
  const totalWalletValueConverted = totalWalletValueUSD * exchangeRate;

  const handleMarkAsRead = async (notificationId: string) => {
    if (!firestore || !authUser) return;
    const notifRef = doc(firestore, 'users', authUser.uid, 'notifications', notificationId);
    await updateDoc(notifRef, { isRead: true });
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login');
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Failed", description: "An error occurred during logout." });
    }
  };

  const handleLanguageSelect = (language: Language) => {
    setLanguage(language.code);
  };

  // Loading State
  if (isUserLoading) {
    return (
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </header>
    );
  }

  // Unauthenticated State
  if (!authUser) {
    return (
       <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <Button asChild>
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </header>
    );
  }

  // Authenticated State
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        
        {/* Mobile Header Left */}
        <div className="flex items-center gap-1 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0">
                <nav className="grid gap-6 text-lg font-medium mt-8 px-6">
                  <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
                    <Logo />
                  </Link>
                  {mobileNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-4 text-base transition-colors ${
                        pathname.startsWith(item.href) && item.href !== '/dashboard' || pathname === item.href
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
                 <div className="mt-auto p-6">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                            <Globe className="mr-2 h-4 w-4" />
                            <span>{selectedLanguage.nativeName}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {LANGUAGES.map((lang) =>
                            lang.dialects ? (
                                <DropdownMenuSub key={lang.code}>
                                <DropdownMenuSubTrigger>
                                    <div className="flex flex-col items-start">
                                    <span className="font-medium">{lang.nativeName}</span>
                                    </div>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                    {lang.dialects.map((dialect) => (
                                        <DropdownMenuItem key={dialect.code} onClick={() => handleLanguageSelect(dialect)}>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{dialect.nativeName}</span>
                                        </div>
                                        </DropdownMenuItem>
                                    ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                                </DropdownMenuSub>
                            ) : (
                                <DropdownMenuItem key={lang.code} onClick={() => handleLanguageSelect(lang)}>
                                <div className="flex flex-col">
                                    <span className="font-medium">{lang.nativeName}</span>
                                </div>
                                </DropdownMenuItem>
                            )
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/dashboard">
                <Logo />
            </Link>
        </div>


        {/* Desktop Header Left */}
        <div className="hidden md:flex items-center gap-6">
            <Link href="/dashboard">
                <Logo />
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className={cn(
                    'h-auto px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    (pathname.startsWith(item.href) && item.href !== '/dashboard') || pathname === item.href
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'text-muted-foreground'
                  )}
                >
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              ))}
            </nav>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Globe className="h-4 w-4" />
                <span>{selectedLanguage.code.toUpperCase()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {LANGUAGES.map((lang) =>
                lang.dialects ? (
                  <DropdownMenuSub key={lang.code}>
                    <DropdownMenuSubTrigger>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{lang.nativeName}</span>
                        <span className="text-xs text-muted-foreground">{lang.name}</span>
                      </div>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        {lang.dialects.map(dialect => (
                          <DropdownMenuItem key={dialect.code} onClick={() => handleLanguageSelect(dialect)}>
                            <div className="flex flex-col">
                              <span className="font-medium">{dialect.nativeName}</span>
                              <span className="text-xs text-muted-foreground">{dialect.name}</span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                ) : (
                  <DropdownMenuItem key={lang.code} onClick={() => handleLanguageSelect(lang)}>
                    <div className="flex flex-col">
                        <span className="font-medium">{lang.nativeName}</span>
                        <span className="text-xs text-muted-foreground">{lang.name}</span>
                    </div>
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">
                    {unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Toggle notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications && notifications.length > 0 ? (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    asChild
                    className={cn('flex items-start gap-2', !n.isRead && 'bg-secondary')}
                  >
                    <Link href={n.link || '#'} onClick={() => handleMarkAsRead(n.id)}>
                      <Mail className="mt-1 h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <p className="text-sm leading-snug">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {toDate(n.createdAt)?.toLocaleString() ?? 'Invalid Date'}
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">No new notifications.</p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex shrink-0 items-center gap-1.5 md:gap-2 p-1 h-auto rounded-md">
                {userData?.country && <FlagIcon countryCode={userData.country} className="w-5 h-auto rounded-sm hidden sm:block" />}
                <Avatar className="h-8 w-8 shrink-0">
                  {authUser?.photoURL ? (
                    <AvatarImage src={authUser.photoURL} alt={authUser.displayName || 'User Avatar'} />
                  ) : (
                    <AvatarFallback className="bg-transparent">
                      <DefaultAvatar />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-shrink min-w-0 text-left">
                  {authUser?.displayName ? (
                    <p className="font-semibold text-[11px] md:text-sm leading-tight truncate">{authUser.displayName}</p>
                  ) : (
                    <Skeleton className="h-4 w-16" />
                  )}
                  <p className="text-[9px] md:text-xs leading-tight text-muted-foreground truncate">
                    {totalWalletValueConverted.toLocaleString(undefined, {
                      style: 'currency',
                      currency: preferredCurrency,
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{authUser?.displayName || 'My Account'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
               <DropdownMenuItem asChild>
                <Link href="/my-ads">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>My Ads</span>
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
