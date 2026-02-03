import Link from "next/link";
import { Globe, Menu, ChevronDown, ArrowDownToLine, ArrowUpFromLine, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES } from "@/lib/constants";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ModeToggle } from "../mode-toggle";

const mobileNavLinks = [
  { href: "/buy", label: "Buy Coin" },
  { href: "/sell", label: "Sell Coin" },
  { href: "/wallets", label: "Wallet" },
  { href: "/support", label: "Support" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-8 flex">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
                <SheetHeader className="border-b pb-6 mb-6">
                    <SheetTitle asChild>
                        <Link href="/">
                            <Logo />
                        </Link>
                    </SheetTitle>
                    <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
                </SheetHeader>
              <nav className="flex flex-col gap-4">
                {mobileNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium text-foreground hover:text-accent-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="font-medium text-foreground/80 transition-colors hover:text-foreground px-0">
                    Trade
                    <ChevronDown className="relative top-[1px] ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href="/buy">
                            <ArrowDownToLine />
                            Buy Coin
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/sell">
                            <ArrowUpFromLine />
                            Sell Coin
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/ads/create">
                            <PlusCircle />
                            Create Ad
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
             <Link
                href="/wallets"
                className="font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                Wallet
              </Link>
             <Link
                href="/support"
                className="font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                Support
              </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ModeToggle />
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
                  <Globe className="h-5 w-5 text-foreground/80" />
                  <span className="sr-only">Select language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem key={lang.code}>{lang.name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" asChild className="text-foreground/80 px-2 font-semibold">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Join us</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
